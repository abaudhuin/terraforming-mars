#!/usr/bin/env node

import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

const baseURL = (process.env.TM_BASE_URL ?? 'http://localhost:8081').replace(/\/$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(process.env.TM_VISUAL_OUT ?? `/tmp/tm-visual-test-cases-${stamp}`);
const headless = process.env.TM_HEADED !== '1';
const slowMo = Number.parseInt(process.env.TM_SLOWMO ?? '0', 10) || 0;
const navigationWaitUntil = process.env.TM_NAVIGATION_WAIT_UNTIL ?? 'domcontentloaded';
const visualSettleMs = Number.parseInt(process.env.TM_VISUAL_SETTLE_MS ?? '180', 10) || 0;
const optionalActionTimeoutMs = Number.parseInt(process.env.TM_OPTIONAL_ACTION_TIMEOUT_MS ?? '2500', 10) || 0;
const defaultProjectCardsToKeep = Number.parseInt(process.env.TM_TEST_CASE_PROJECTS ?? '3', 10) || 0;
const selectedPass = process.env.TM_TEST_PASS ?? 'golden';
const selectedTestCaseIds = (process.env.TM_TEST_CASES ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const selectedAreas = (process.env.TM_TEST_AREAS ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const selectedCaptureNames = (process.env.TM_CAPTURES ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

const colors = ['red', 'green', 'yellow', 'blue', 'black'];

const emptyUnits = {
  megacredits: 0,
  steel: 0,
  titanium: 0,
  plants: 0,
  energy: 0,
  heat: 0,
};

const emptyPayment = {
  heat: 0,
  megacredits: 0,
  steel: 0,
  titanium: 0,
  plants: 0,
  microbes: 0,
  floaters: 0,
  lunaArchivesScience: 0,
  spireScience: 0,
  seeds: 0,
  auroraiData: 0,
  graphene: 0,
  kuiperAsteroids: 0,
};

const defaultExpansions = {
  corpera: true,
  promo: false,
  venus: false,
  colonies: false,
  prelude: false,
  prelude2: false,
  turmoil: false,
  community: false,
  ares: false,
  moon: false,
  pathfinders: false,
  ceo: false,
  starwars: false,
  underworld: false,
  deltaProject: false,
};

const moduleHeavyNoTurmoil = {
  ...defaultExpansions,
  promo: true,
  venus: true,
  colonies: true,
  prelude: true,
  prelude2: true,
  community: true,
  ares: true,
  pathfinders: true,
  ceo: true,
  turmoil: false,
};

const allExpansions = Object.fromEntries(Object.keys(defaultExpansions).map((key) => [key, true]));
const heavyWithTurmoil = {...moduleHeavyNoTurmoil, turmoil: true};
const moonUnderworldDelta = {
  ...defaultExpansions,
  promo: true,
  prelude: true,
  turmoil: true,
  moon: true,
  underworld: true,
  deltaProject: true,
};

const viewportCatalog = {
  'desktop-minimum': {name: 'desktop-minimum', width: 1280, height: 720},
  'desktop-primary': {name: 'desktop-primary', width: 1600, height: 900},
  'desktop-compact': {name: 'desktop-compact', width: 1440, height: 900},
  'desktop-standard': {name: 'desktop-standard', width: 1920, height: 1080},
  'desktop-tall': {name: 'desktop-tall', width: 1920, height: 1200},
  'desktop-wide': {name: 'desktop-wide', width: 2560, height: 1440},
};

const fixtureCatalog = {
  'base-early-2p': {
    players: 2,
    projectCards: 8,
    expansions: defaultExpansions,
    fixturePatch: 'core-action-density',
  },
  'base-mid-4p': {
    players: 4,
    projectCards: 8,
    expansions: defaultExpansions,
    fixturePatch: 'primary-heavy-density',
  },
  'primary-mid-4p': {
    players: 4,
    projectCards: 10,
    expansions: moduleHeavyNoTurmoil,
    overrides: {includeFanMA: true, startingCorporations: 2, startingCeos: 3, startingPreludes: 4},
    fixturePatch: 'primary-heavy-density',
  },
  'dense-mid-5p': {
    players: 5,
    projectCards: 8,
    expansions: moduleHeavyNoTurmoil,
    overrides: {includeFanMA: true},
    fixturePatch: 'five-player-density',
  },
  'action-inputs-2p': {
    players: 2,
    projectCards: 6,
    expansions: {...defaultExpansions, promo: true, venus: true, colonies: true, prelude: true},
    fixturePatch: 'action-choice-density',
  },
  'world-government-2p': {
    players: 2,
    projectCards: 6,
    expansions: {...defaultExpansions, promo: true, venus: true, colonies: true, prelude: true},
    overrides: {solarPhaseOption: true},
    fixturePatch: 'action-choice-density',
  },
  'all-modules-mid-4p': {
    players: 4,
    projectCards: 8,
    expansions: allExpansions,
    overrides: {includeFanMA: true, moonStandardProjectVariant: true, altVenusBoard: true},
    fixturePatch: 'global-all-module-density',
  },
  'secondary-modules-3p': {
    players: 3,
    projectCards: 6,
    expansions: moonUnderworldDelta,
    overrides: {includeFanMA: true, moonStandardProjectVariant: true},
    fixturePatch: 'moon-underworld-delta-density',
  },
  'endgame-all-4p': {
    players: 4,
    projectCards: 6,
    expansions: {...allExpansions, starwars: true},
    overrides: {includeFanMA: true, moonStandardProjectVariant: true, altVenusBoard: true},
    fixturePatch: 'endgame-all-scoring',
  },
};

const areaDetailSelectors = {
  layout: '#player-home',
  actions: '.tm-action-workbench',
  cards: '.tm-modal, .tm-card-desk',
  players: '.tm-player-rail, .tm-modal',
  activity: '.tm-activity-rail',
  board: '.tm-board-stage, .tm-modal',
  ma: '.tm-ma-panel, .milestone-award-inline',
  setup: '.player_home_block--setup',
  research: '.tm-action-workbench, .player_home_block--actions',
  colonies: '.tm-table-leaf--colonies, .tm-extension-panel--colonies',
  venus: '.tm-table-leaf--venus, .venus-next-board',
  turmoil: '.tm-extension-panel--turmoil, .turmoil',
  ares: '.tm-mars-board-surface, .board-cont',
  moon: '.tm-extension-panel--moon, #moon_board',
  pathfinders: '.tm-extension-panel--pathfinders',
  underworld: '.tm-extension-panel--underworld, .underworld',
  delta: '.tm-extension-panel--delta, .tm-extension-panel--deltaProject',
  ceo: '.tm-table-leaf--ceo, .card-container',
  endgame: '#game-end, .game_end',
};

const areaUxLaws = {
  setup: ['UX-01', 'UX-02', 'UX-03', 'UX-14', 'UX-15', 'UX-16', 'UX-17'],
  research: ['UX-01', 'UX-02', 'UX-03', 'UX-08', 'UX-14', 'UX-16', 'UX-17'],
  layout: ['UX-02', 'UX-04', 'UX-05', 'UX-06', 'UX-07', 'UX-11', 'UX-14'],
  actions: ['UX-01', 'UX-02', 'UX-03', 'UX-04', 'UX-08', 'UX-14', 'UX-15', 'UX-16'],
  cards: ['UX-02', 'UX-06', 'UX-08', 'UX-14', 'UX-16'],
  players: ['UX-09', 'UX-11', 'UX-12', 'UX-14', 'UX-16'],
  activity: ['UX-09', 'UX-10', 'UX-12', 'UX-15', 'UX-16'],
  board: ['UX-04', 'UX-05', 'UX-14', 'UX-16'],
  ma: ['UX-04', 'UX-12', 'UX-13', 'UX-14', 'UX-16'],
  colonies: ['UX-04', 'UX-12', 'UX-13', 'UX-14', 'UX-16'],
  venus: ['UX-04', 'UX-09', 'UX-13', 'UX-14'],
  turmoil: ['UX-04', 'UX-09', 'UX-12', 'UX-13', 'UX-14', 'UX-16'],
  ares: ['UX-04', 'UX-05', 'UX-13', 'UX-14', 'UX-16'],
  moon: ['UX-04', 'UX-05', 'UX-12', 'UX-13', 'UX-14', 'UX-16'],
  pathfinders: ['UX-04', 'UX-09', 'UX-12', 'UX-13', 'UX-14'],
  underworld: ['UX-04', 'UX-09', 'UX-12', 'UX-13', 'UX-14', 'UX-16'],
  delta: ['UX-04', 'UX-09', 'UX-12', 'UX-13', 'UX-14'],
  ceo: ['UX-08', 'UX-09', 'UX-12', 'UX-14', 'UX-16'],
  endgame: ['UX-04', 'UX-05', 'UX-09', 'UX-10', 'UX-14', 'UX-17'],
};

function defineCase({
  id,
  suite,
  area,
  purpose,
  fixture = 'primary-mid-4p',
  capture,
  viewport = 'desktop-primary',
  perspective = 'active',
  overrides,
  fixturePatch,
  setupState,
  detailSelector,
  inspectFor,
  uxLaws,
  playerTask,
  expectedState,
  interaction,
  invariants,
  advance,
  captureStages,
  source = 'synthetic-static',
  fullPage = false,
}) {
  const base = fixtureCatalog[fixture] ?? fixtureCatalog['primary-mid-4p'];
  return {
    ...base,
    id,
    suite,
    area,
    purpose,
    fixture,
    source,
    perspective,
    viewport,
    overrides: {...(base.overrides ?? {}), ...(overrides ?? {})},
    captures: Array.isArray(capture) ? capture : [capture],
    fixturePatch: fixturePatch === null ? undefined : (fixturePatch ?? base.fixturePatch),
    setupState,
    detailSelector: detailSelector ?? (suite === 'detail' ? areaDetailSelectors[area] : undefined),
    inspectFor,
    uxLaws,
    playerTask: playerTask ?? `Use the ${area} surface to understand the current state and identify the next safe action.`,
    expectedState: expectedState ?? purpose,
    interaction: interaction ?? `Reach the named "${Array.isArray(capture) ? capture.join(', ') : capture}" state without committing it.`,
    invariants: invariants ?? inspectFor,
    advance: advance ?? ['generation2'],
    captureStages: captureStages ?? (area === 'research' ? ['generation2'] : (area === 'setup' || area === 'create' ? [] : ['post-setup'])),
    captureSetup: setupState !== undefined,
    fullPage,
  };
}

const golden = (id, area, purpose, capture, options = {}) => defineCase({
  id: `golden/${id}`,
  suite: 'golden',
  area,
  purpose,
  capture,
  inspectFor: options.inspectFor ?? [
    'The player can immediately identify the current task and the next safe action.',
    'No overlap, clipping, duplicated instruction, unstable alignment, or ambiguous control role is visible.',
  ],
  uxLaws: options.uxLaws ?? areaUxLaws[area],
  invariants: options.invariants ?? [
    `The rendered UI visibly matches the named state: ${purpose}`,
    'The player can immediately identify the current task and the next safe action.',
    'No overlap, clipping, duplicated instruction, unstable alignment, or ambiguous control role is visible.',
  ],
  ...options,
});

const detail = (id, area, purpose, capture, options = {}) => defineCase({
  id: `detail/${id}`,
  suite: 'detail',
  area,
  purpose,
  capture,
  inspectFor: options.inspectFor ?? [
    'Judge the component at original pixels and in its full-table context.',
    'Check hierarchy, spacing, alignment, density, states, labels, controls, and relationship to adjacent surfaces.',
  ],
  uxLaws: options.uxLaws ?? areaUxLaws[area],
  invariants: options.invariants ?? [
    `The rendered UI visibly matches the named state: ${purpose}`,
    'Judge the component at original pixels and in its full-table context.',
    'Check hierarchy, spacing, alignment, density, states, labels, controls, and relationship to adjacent surfaces.',
  ],
  ...options,
});

const builtInTestCases = [
  golden('create/heavy-options', 'setup', 'Four-player creation form with the primary module set, complete option surface, and visible Create action.', 'create-heavy-options', {source: 'ui-configured-static', fixturePatch: null, fullPage: true}),
  golden('setup/heavy-initial', 'setup', 'Heavy initial selection before the player has chosen anything.', 'setup-initial', {fixture: 'primary-mid-4p', setupState: 'initial', fixturePatch: null}),
  golden('setup/heavy-partial', 'setup', 'Heavy initial selection with corporation and project choices partially resolved.', 'setup-partial', {fixture: 'primary-mid-4p', setupState: 'partial', fixturePatch: null}),
  golden('research/normal-offer', 'research', 'Generation research with four offered cards and a partial purchase selection.', 'research-offer-selected', {fixture: 'base-early-2p', fixturePatch: null, advance: ['generation2'], source: 'engine-reached'}),
  golden('table/active-neutral', 'layout', 'Primary four-player table from the active seat with no command selected.', 'table-active'),
  golden('table/active-neutral-compact', 'layout', 'The principal table golden at the compact supported desktop size.', 'table-active', {viewport: 'desktop-compact'}),
  golden('table/waiting', 'layout', 'The same table from a waiting player who still needs inspection and planning tools.', 'table-waiting', {perspective: 'waiting'}),
  golden('action/project-card-options', 'actions', 'Project-card action before selection with multiple playable card types and no implied selection.', 'action-play-card-payment', {fixture: 'action-inputs-2p'}),
  golden('action/payment-exact', 'actions', 'Project-card payment with an exact mixed steel/M€ allocation and enabled commit.', 'action-play-card-payment-mixed-exact', {fixture: 'action-inputs-2p', fixturePatch: 'action-choice-density'}),
  golden('action/pass-direct', 'actions', 'Pass is a single explicit destructive action anchored at the bottom of the workbench.', 'action-pass-direct', {fixture: 'action-inputs-2p'}),
  golden('board/crowded-overlay', 'board', 'Crowded Mars board overlay with owners, hazards, special tiles, and globals readable.', 'overlay-board'),
  golden('cards/dense-overlay', 'cards', 'Dense hand and tableau overlay with mixed card families and card resources.', 'overlay-cards', {fixturePatch: 'card-filter-density'}),
  golden('player/opponent-dossier', 'players', 'Opponent dossier with dense tableau, tags, public module data, and history.', 'overlay-player-opponent'),
  golden('activity/card-and-placement', 'activity', 'Focus keeps one coherent card, resource, placement, and global-parameter story above an always-on card browser.', 'activity-focus-browser', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-complex-action'}),
  golden('colonies/common-open', 'colonies', 'Four colonies, colonies on three tiles, visitor ships on three, and mixed track positions.', 'colonies-open', {fixturePatch: 'colonies-four-occupied-three-ships'}),
  golden('milestones-awards/common-open', 'ma', 'Common milestone and award panel with claimed, claimable, funded, and close standings.', 'milestones-awards-open', {fixturePatch: 'ma-common'}),
  golden('venus/common-track', 'venus', 'Mid Venus scale with threshold, current value, and related global context.', 'venus-track', {fixturePatch: 'venus-mid'}),
  golden('turmoil/common-open', 'turmoil', 'Common Turmoil state with current events, ruling/dominant parties, and delegates.', 'turmoil-open', {fixture: 'all-modules-mid-4p', fixturePatch: 'turmoil-baseline'}),
  golden('ares/common-board', 'ares', 'Common mixed Ares board with mild hazards and ordinary owned tiles.', 'ares-hazards', {fixture: 'all-modules-mid-4p', fixturePatch: 'ares-mixed'}),
  golden('moon/common-open', 'moon', 'Common populated Moon board with all three rates and owned tile families.', 'moon-open', {fixture: 'secondary-modules-3p', fixturePatch: 'moon-populated'}),
  golden('pathfinders/common-open', 'pathfinders', 'Common uneven Pathfinders competition with tracks, pawns, and rewards.', 'pathfinders-open', {fixturePatch: 'pathfinders-uneven'}),
  golden('underworld/common-open', 'underworld', 'Common Underworld player summary with multiple claimed tokens and visible corruption context.', 'underworld-open', {fixture: 'secondary-modules-3p', fixturePatch: 'underworld-revealed'}),
  golden('delta/common-open', 'delta', 'Common Delta state with a visible leader, tie, and remaining progression.', 'delta-open', {fixture: 'secondary-modules-3p', fixturePatch: 'delta-leader-tie'}),
  golden('ceo/common-dossier', 'ceo', 'Common CEO card and action state inside a player dossier.', 'ceo-cards', {fixturePatch: 'ceo-unused'}),
  golden('endgame/complete-results', 'endgame', 'One deterministic four-player result captured at standard and compact desktop sizes.', 'endgame-results', {fixture: 'endgame-all-4p', viewport: ['desktop-standard', 'desktop-compact']}),

  detail('layout/base-sparse-2p', 'layout', 'Sparse early table must remain purposeful without oversized empty chrome.', 'table-active', {fixture: 'base-early-2p'}),
  detail('layout/primary-dense-4p', 'layout', 'Normal primary midgame table and default panel proportions.', 'table-active'),
  detail('layout/dense-5p', 'layout', 'Five-player density with every opponent reachable.', 'table-active', {fixture: 'dense-mid-5p'}),
  detail('layout/bottom-tray-compressed', 'layout', 'Compressed action tray preserves the pending decision.', 'bottom-tray-compressed'),
  detail('layout/activity-collapsed', 'layout', 'Collapsed activity rail restores board space without orphan chrome.', 'activity-rail-collapsed'),
  detail('layout/primary-wide', 'layout', 'Wide desktop uses extra space intentionally without stretching decisions.', 'table-active', {viewport: 'desktop-wide'}),
  detail('layout/resize-handles-hover', 'layout', 'Horizontal and vertical resize handles remain visible and untinted on hover without moving their panels.', 'resize-handles-hover', {detailSelector: '#player-home'}),
  detail('layout/resize-minimums-1280', 'layout', 'At the minimum supported desktop size, both side rails and the bottom tray can contract enough to return useful space to the board.', 'resized-layout-minimums', {viewport: 'desktop-minimum', detailSelector: '#player-home'}),
  detail('layout/player-rail-enlarged-1280', 'layout', 'At the minimum supported desktop size, the player rail has a materially useful enlargement range while the board remains reachable.', 'player-rail-enlarged', {viewport: 'desktop-minimum', detailSelector: '#player-home'}),
  detail('layout/activity-rail-enlarged-1280', 'layout', 'At the minimum supported desktop size, the activity rail has a materially useful enlargement range while the board remains reachable.', 'activity-rail-enlarged-maximum', {viewport: 'desktop-minimum', detailSelector: '#player-home'}),
  detail('layout/bottom-tray-enlarged-1280', 'layout', 'At the minimum supported desktop size, the bottom tray has a materially useful enlargement range without hiding the current board.', 'bottom-tray-enlarged-maximum', {viewport: 'desktop-minimum', detailSelector: '#player-home'}),

  detail('actions/top-level-neutral', 'actions', 'All ordinary action families visible with none implied as selected.', 'action-neutral-contract', {fixture: 'action-inputs-2p'}),
  detail('actions/top-level-keyboard-focus', 'actions', 'Keyboard focus is visible without changing layout.', 'action-keyboard-focus', {fixture: 'action-inputs-2p'}),
  detail('actions/colony-trade-keyboard-focus', 'actions', 'Colony trade keeps its transport symbol legible under keyboard focus.', 'action-colony-trade-keyboard-focus', {fixture: 'action-inputs-2p'}),
  detail('actions/colony-trade-hover', 'actions', 'Colony trade keeps its transport symbol legible under pointer hover.', 'action-colony-trade-hover', {fixture: 'action-inputs-2p'}),
  detail('actions/project-card-none-selected', 'actions', 'Multiple playable project-card options before selection, with no card implied as chosen.', 'action-play-card-payment', {fixture: 'action-inputs-2p'}),
  detail('actions/project-card-hover', 'actions', 'Project-card pointer hover is card-bound, clearly visible, and does not move the browser.', 'action-play-card-hover', {fixture: 'action-inputs-2p', detailSelector: '.tm-project-card-chooser'}),
  detail('actions/project-card-selected', 'actions', 'Selected project card keeps the strip position and surrounding composition stable.', 'action-play-card-card-selected', {fixture: 'action-inputs-2p', detailSelector: '.tm-project-card-chooser'}),
  detail('actions/project-card-single-selected', 'actions', 'A lone centered project card does not move when its right-side payment review opens.', 'action-play-card-single-selected', {fixture: 'action-inputs-2p', fixturePatch: 'action-single-project', detailSelector: '.tm-project-payment'}),
  detail('actions/payment-partial', 'actions', 'Incomplete payment makes its unresolved cost legible beside the commit control.', 'action-play-card-payment-partial', {fixture: 'action-inputs-2p'}),
  detail('actions/payment-exact', 'actions', 'Exact mixed-resource payment exposes an enabled, specific commit.', 'action-play-card-payment-mixed-exact', {fixture: 'action-inputs-2p', detailSelector: '.tm-project-payment-side'}),
  detail('actions/blue-card-options', 'actions', 'Played-card actions are visible as an uncommitted nested choice.', 'action-blue-card', {fixture: 'action-inputs-2p'}),
  detail('actions/blue-card-hover', 'actions', 'Played-card action hover uses the same card-bound treatment as project and purchase choices.', 'action-blue-card-hover', {fixture: 'action-inputs-2p'}),
  detail('actions/blue-card-selected', 'actions', 'A chosen played-card action uses the shared selected treatment before commitment.', 'action-blue-card-selected', {fixture: 'action-inputs-2p'}),
  detail('actions/nested-production-neutral', 'actions', 'A compact multi-option production choice begins neutral in the same decision spine used after selection.', 'action-blue-card-choice', {fixture: 'action-inputs-2p'}),
  detail('actions/nested-production-selected', 'actions', 'Selecting one compact production option preserves the neutral choice footprint and adds its adjacent commit.', 'action-blue-card-choice-selected', {fixture: 'action-inputs-2p'}),
  detail(
    'actions/world-government-options',
    'actions',
    'The exact mixed World Government choice keeps one footprint when neutral, after a simple parameter choice, and while targeting an ocean space.',
    ['world-government-neutral', 'world-government-simple-selected', 'world-government-ocean-selected'],
    {
      fixture: 'world-government-2p',
      perspective: 'worldGovernment',
      captureStages: ['world-government'],
    },
  ),
  detail('actions/claim-milestone-options', 'actions', 'Claimable milestones are comparable before a milestone is selected.', 'action-claim-milestone', {fixture: 'action-inputs-2p'}),
  detail('actions/fund-award-options', 'actions', 'Fundable awards and current standings are comparable before selection.', 'action-fund-award', {fixture: 'action-inputs-2p'}),
  detail('actions/standard-project-options', 'actions', 'Standard projects are comparable before a project is selected.', 'action-standard-projects', {fixture: 'action-inputs-2p'}),
  detail('actions/standard-project-selected', 'actions', 'Selected standard project and its review/commit region.', 'action-standard-project-selected', {fixture: 'action-inputs-2p'}),
  detail('actions/sell-patents-options', 'actions', 'Sell-patents card choices and value summary are visible before selection.', 'action-sell-patents', {fixture: 'action-inputs-2p'}),
  detail('actions/sell-patents-selected', 'actions', 'Selected patents use the shared card-bound treatment without changing card size.', 'action-sell-patents-selected', {fixture: 'action-inputs-2p'}),
  detail('actions/pass-direct', 'actions', 'Irreversible pass is a single bottom-anchored destructive action without a second confirmation control.', 'action-pass-direct', {fixture: 'action-inputs-2p'}),
  detail('actions/input-error-dialog', 'actions', 'An action error uses the centered application dialog, leaves the table visibly contextual, and provides one clear dismissal action.', 'input-error-dialog', {fixture: 'action-inputs-2p', viewport: 'desktop-minimum', detailSelector: '.alert-dialog'}),
  detail('actions/convert-plants-greenery-targets', 'actions', 'The exact Convert plants route exposes center-point reachable glowing greenery spaces.', 'action-convert-plants-targets', {fixture: 'action-inputs-2p', viewport: 'desktop-minimum', detailSelector: '.tm-board-stage'}),
  detail('actions/convert-plants-confirmation-fallback', 'actions', 'Convert plants remains visibly confirmable when a browser exposes dialog without a callable showModal.', 'action-convert-plants-confirmation-fallback', {fixture: 'action-inputs-2p', viewport: 'desktop-minimum', detailSelector: '.confirm-dialog'}),
  detail('actions/convert-plants-committed', 'actions', 'Accepting Convert plants spends eight plants, places owned greenery, and raises oxygen through the real engine.', 'action-convert-plants-committed', {fixture: 'action-inputs-2p', viewport: 'desktop-minimum', detailSelector: '.tm-board-stage'}),

  detail('cards/hand-dense-mixed', 'cards', 'Dense mixed hand with requirements, warnings, discounts, and card resources.', 'overlay-cards', {fixturePatch: 'card-filter-density'}),
  detail('cards/hand-empty', 'cards', 'An empty hand is explicit and keeps filters, tabs, and dismissal usable.', 'overlay-cards', {fixturePatch: 'card-hand-empty'}),
  detail('cards/search-no-results', 'cards', 'Intentional empty search state remains understandable and reversible.', 'cards-search-no-results', {fixturePatch: 'card-filter-density'}),
  detail('cards/filter-playable', 'cards', 'Playable filter reads as filter rather than navigation or sorting.', 'cards-filter-playable', {fixturePatch: 'card-filter-density'}),
  detail('cards/overlay-after-refresh', 'cards', 'Open cards overlay retains useful state across a model refresh.', 'overlay-cards-refresh-preserved', {fixturePatch: 'card-filter-density'}),

  detail('players/rail-2p', 'players', 'Two-player rail remains compact without looking unfinished.', 'table-active', {fixture: 'base-early-2p', detailSelector: '.tm-player-rail'}),
  detail('players/rail-5p-dense', 'players', 'Five-player rail keeps all opponents reachable and statuses legible.', 'player-rail-scrolled', {fixture: 'dense-mid-5p', detailSelector: '.tm-player-rail'}),
  detail('players/rail-large-values-wrapped', 'players', 'Three-digit stocks, signed production, and large summary values wrap into readable rows without shrinking the numerals.', 'table-active', {fixture: 'dense-mid-5p', fixturePatch: 'player-large-values', viewport: 'desktop-minimum', detailSelector: '.tm-player-rail'}),
  detail('players/resource-feedback', 'players', 'Stock and production changes form one legible line beside the affected player identity, using resource and production iconography.', 'player-resource-feedback', {fixture: 'base-early-2p', detailSelector: '.player-info--self'}),
  detail('players/dossier-opponent', 'players', 'Opponent public information is coherent and clearly scoped.', 'overlay-player-opponent'),
  detail('players/dossier-module-stats', 'players', 'Dossier integrates module statistics without fragmenting the player identity.', 'overlay-player-opponent', {fixture: 'all-modules-mid-4p'}),
  detail('players/dossier-tag-scoring', 'players', 'Conditional VP-per-tag scoring is omitted from the compact rail and presented as a labeled detail in the dossier.', 'overlay-player-opponent', {fixturePatch: 'player-vp-tag-detail', detailSelector: '.tm-player-dossier-summary'}),

  detail('activity/draw-two-browser', 'activity', 'Two-card draw connects its explanation to the always-on horizontal card browser.', 'activity-focus-browser', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-draw'}),
  detail('activity/play-and-draw-browser', 'activity', 'A card play that draws another card keeps both game objects visible in the same action browser.', 'activity-focus-browser', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-play-and-draw'}),
  detail('activity/draw-four-browser', 'activity', 'Four-card inspection remains usable without resizing the board or activity rail.', 'activity-focus-browser', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-multi-draw'}),
  detail('activity/draw-four-browser-scrolled', 'activity', 'The always-on card browser exposes later cards through its stable horizontal scroll owner.', 'activity-focus-browser-scrolled', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-multi-draw'}),
  detail('activity/reveal-selection-browser', 'activity', 'A played card and nine revealed candidates identify the played, kept, and discarded outcomes without duplicate cards.', 'activity-focus-browser', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-reveal-selection'}),
  detail('activity/reveal-selection-browser-scrolled', 'activity', 'Later outcomes in a nine-card reveal remain readable through the native horizontal scrollbar.', 'activity-focus-browser-scrolled', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-reveal-selection'}),
  detail('activity/colony-browser', 'activity', 'A colony event renders as one complete stable tile in the always-on browser.', 'activity-focus-browser', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-colony'}),
  detail('activity/text-only', 'activity', 'Resource-only feedback uses no empty card-preview space.', 'activity-focus-browser', {fixture: 'base-early-2p', fixturePatch: 'activity-focus-text-action'}),
  detail('activity/history-current-generation', 'activity', 'History initially shows the complete current generation rather than a recent-message slice, with long messages wrapping in the rail.', 'activity-focus-history', {fixture: 'primary-mid-4p'}),
  detail('activity/history-current-generation-scrolled', 'activity', 'The complete current-generation history remains reachable through the rail scroll owner.', 'activity-scrolled', {fixture: 'primary-mid-4p'}),

  detail('board/early-sparse', 'board', 'Sparse Mars map remains centered and readable.', 'overlay-board', {fixture: 'base-early-2p'}),
  detail('board/global-feedback', 'board', 'Temperature, oxygen, ocean, and Venus changes attach to their live board positions instead of the activity rail.', 'board-global-feedback', {fixture: 'primary-mid-4p', detailSelector: '.tm-board-stage'}),
  detail('board/crowded-owned-tiles', 'board', 'Crowded board preserves tile identity, owner, hazards, and adjacency.', 'overlay-board'),
  detail('board/hellas-special-spaces', 'board', 'Alternate board and unfamiliar milestone/award labels remain coherent.', 'overlay-board', {fixture: 'base-mid-4p', board: 'hellas', overrides: {includeFanMA: true, randomMA: 'Full random', shuffleMapOption: true}}),

  detail('ma/none-claimed-funded', 'ma', 'Unclaimed/unfunded starting state communicates availability.', 'milestones-awards-open', {fixture: 'base-early-2p', fixturePatch: 'ma-none'}),
  detail('ma/one-claimed-one-funded', 'ma', 'Common midgame state balances availability, ownership, cost, and standings.', 'milestones-awards-open', {fixturePatch: 'ma-common'}),
  detail('ma/fan-long-labels', 'ma', 'Long unfamiliar names do not distort controls or standings.', 'milestones-awards-open', {fixture: 'base-mid-4p', overrides: {includeFanMA: true, randomMA: 'Full random'}}),

  detail('setup/heavy-initial', 'setup', 'Heavy setup before selection supports comparison rather than form scanning.', 'setup-initial', {setupState: 'initial', fixturePatch: null}),
  detail('setup/heavy-partial', 'setup', 'Partial setup distinguishes resolved and unresolved categories.', 'setup-partial', {setupState: 'partial', fixturePatch: null}),
  detail('setup/heavy-ready', 'setup', 'All required setup categories are selected and the final commitment is visibly ready.', 'setup-ready', {setupState: 'ready', fixturePatch: null}),
  detail('setup/heavy-project-mulligan-preserved', 'setup', 'A real project-pool mulligan response keeps corporation, Prelude, and CEO choices while replacing only the project pool.', 'setup-mulligan-preserved', {
    setupState: 'mulligan-preserved',
    fixturePatch: null,
    overrides: {mulligan: {project: true, corporation: true, prelude: true, ceo: true}},
  }),
  detail('research/normal-neutral', 'research', 'Research offer before selection presents four comparable cards and no implied purchase.', 'research-offer-neutral', {fixture: 'base-early-2p', fixturePatch: null, source: 'engine-reached'}),
  detail('research/normal-hover', 'research', 'Research-card hover uses the shared stable card-bound treatment before purchase.', 'research-offer-hover', {fixture: 'base-early-2p', fixturePatch: null, source: 'engine-reached'}),
  detail('research/normal-selected', 'research', 'Research offer with partial purchase selection and clear total.', 'research-offer-selected', {fixture: 'base-early-2p', fixturePatch: null, source: 'engine-reached'}),

  detail('colonies/three-empty-no-ships', 'colonies', 'Exactly three sparse colony tiles with no ownership or visitor ships.', 'colonies-open', {fixturePatch: 'colonies-three-empty-no-ships'}),
  detail('colonies/four-occupied-three-ships', 'colonies', 'Canonical four-tile module state with mixed ownership and three visitor ships.', 'colonies-open', {fixturePatch: 'colonies-four-occupied-three-ships'}),
  detail('colonies/full-tile-max-track', 'colonies', 'A full colony tile at maximum track position remains readable in the open module.', 'colonies-open', {fixturePatch: 'colonies-full-tile-max-track'}),
  detail('colonies/many-tiles-scrolled', 'colonies', 'Seven tiles at a meaningful middle scroll position retain continuation cues.', 'colonies-scrolled', {fixturePatch: 'colonies-many-tiles'}),
  detail('colonies/trade-choice-neutral', 'colonies', 'The colony-trade fixture before selection preserves the same board and reserved decision envelope as the selected state.', 'action-neutral-contract', {fixture: 'action-inputs-2p', fixturePatch: 'colonies-four-occupied-three-ships', detailSelector: '.tm-action-workbench'}),
  detail('colonies/trade-choice', 'colonies', 'Selected colony trade target keeps fleet, payment, target, selected state, and enabled commit in one decision spine.', 'action-trade-colony-ready', {fixture: 'action-inputs-2p', fixturePatch: 'colonies-four-occupied-three-ships', detailSelector: '.tm-action-workbench'}),
  detail('colonies/fleets-expanded', 'colonies', 'Multiple fleets and used/available ships remain associated with their players.', 'colonies-open', {fixturePatch: 'colonies-fleets-expanded'}),

  detail('venus/scale-zero', 'venus', 'Zero Venus scale state does not look broken or empty.', 'venus-track', {fixturePatch: 'venus-zero'}),
  detail('venus/scale-mid', 'venus', 'Mid-scale threshold and relevant values are legible.', 'venus-track', {fixturePatch: 'venus-mid'}),
  detail('venus/scale-max', 'venus', 'Completed Venus scale has a clear terminal state.', 'venus-track', {fixturePatch: 'venus-max'}),

  detail('turmoil/baseline-populated', 'turmoil', 'Events, delegates, ruling party, dominant party, and reserve form one readable state.', 'turmoil-open', {fixture: 'all-modules-mid-4p', fixturePatch: 'turmoil-baseline'}),
  detail('turmoil/crowded-party', 'turmoil', 'Crowded party, leader, chairman, lobby, and reserve remain scannable.', 'turmoil-open', {fixture: 'all-modules-mid-4p', fixturePatch: 'turmoil-crowded'}),
  detail('turmoil/policy-used', 'turmoil', 'Used policy action is unmistakably different from available actions.', 'turmoil-open', {fixture: 'all-modules-mid-4p', fixturePatch: 'turmoil-policy-used'}),

  detail('ares/no-hazards', 'ares', 'Ares-enabled board with no hazards retains the normal map hierarchy.', 'overlay-board', {fixture: 'all-modules-mid-4p', fixturePatch: 'ares-none'}),
  detail('ares/mixed-hazards', 'ares', 'All hazard families coexist with ordinary owned tiles.', 'ares-hazards', {fixture: 'all-modules-mid-4p', fixturePatch: 'ares-mixed'}),
  detail('ares/crowded-map', 'ares', 'Hazards, underground tokens, owners, and bonuses remain distinguishable.', 'overlay-board', {fixture: 'all-modules-mid-4p', fixturePatch: 'ares-crowded'}),

  detail('moon/empty-board', 'moon', 'Empty Moon board and zero rates remain purposeful.', 'moon-open', {fixture: 'secondary-modules-3p', fixturePatch: 'moon-empty'}),
  detail('moon/populated-midgame', 'moon', 'Roads, mines, habitats, ownership, and uneven rates are readable together.', 'moon-open', {fixture: 'secondary-modules-3p', fixturePatch: 'moon-populated'}),
  detail('moon/crowded-near-max', 'moon', 'Crowded Moon and near-max rates remain usable.', 'moon-open', {fixture: 'secondary-modules-3p', fixturePatch: 'moon-crowded'}),

  detail('pathfinders/all-zero', 'pathfinders', 'All-zero tracks still communicate direction and rewards.', 'pathfinders-open', {fixturePatch: 'pathfinders-zero'}),
  detail('pathfinders/uneven-competition', 'pathfinders', 'Uneven track competition keeps every pawn and reward readable.', 'pathfinders-open', {fixturePatch: 'pathfinders-uneven'}),
  detail('pathfinders/near-max', 'pathfinders', 'Near-max tracks and rewards stay grouped without excessive travel.', 'pathfinders-scrolled', {fixturePatch: 'pathfinders-near-max'}),

  detail('underworld/all-hidden', 'underworld', 'Underworld-enabled board with no revealed tokens remains readable and does not imply revealed information.', 'overlay-board', {fixture: 'secondary-modules-3p', fixturePatch: 'underworld-hidden', detailSelector: '.tm-modal .board-cont, .tm-modal .tm-board-stage'}),
  detail('underworld/revealed-mixed', 'underworld', 'Multiple claimed Underworld tokens remain distinguishable in the player summary.', 'underworld-open', {fixture: 'secondary-modules-3p', fixturePatch: 'underworld-revealed'}),
  detail('underworld/high-corruption', 'underworld', 'Claims, active/protected tokens, corruption, and negative VP remain coherent.', 'overlay-player-opponent', {fixture: 'secondary-modules-3p', fixturePatch: 'underworld-high-corruption', detailSelector: '.tm-modal'}),

  detail('delta/all-start', 'delta', 'All players at the start of Delta remain readable.', 'delta-open', {fixture: 'secondary-modules-3p', fixturePatch: 'delta-start'}),
  detail('delta/leader-and-tie', 'delta', 'Leader and tied players can be compared immediately.', 'delta-open', {fixture: 'secondary-modules-3p', fixturePatch: 'delta-leader-tie'}),
  detail('delta/jovian-bonus', 'delta', 'Jovian bonus state is attached to the correct player and step.', 'delta-open', {fixture: 'secondary-modules-3p', fixturePatch: 'delta-jovian'}),

  detail('ceo/action-unused', 'ceo', 'Available CEO action reads as actionable without dominating the table.', 'ceo-cards', {fixturePatch: 'ceo-unused'}),
  detail('ceo/action-used', 'ceo', 'Used CEO action has an unmistakable exhausted state.', 'ceo-cards', {fixturePatch: 'ceo-used'}),
  detail('ceo/dense-tableau', 'ceo', 'A long CEO card remains identifiable and contained beside a dense tableau.', 'ceo-cards', {fixturePatch: 'ceo-dense'}),

  detail('endgame/standard-close-score', 'endgame', 'Close standard scoring keeps winner, ranking, and categories clear.', 'endgame-results', {fixture: 'endgame-all-4p'}),
  detail('endgame/all-module-scoring', 'endgame', 'Every module score category remains aligned and attributable.', 'endgame-vp-details', {fixture: 'endgame-all-4p'}),
  detail('endgame/final-board', 'endgame', 'Final Mars and Moon boards remain inspectable after scoring.', 'endgame-final-board', {fixture: 'endgame-all-4p'}),
  detail('endgame/final-log', 'endgame', 'Final activity history stays usable for reconstructing the finish.', 'endgame-final-log', {fixture: 'endgame-all-4p'}),
];

const builtInTestCaseById = new Map(builtInTestCases.map((testCase) => [testCase.id, testCase]));
const viewportOverride = (process.env.TM_VIEWPORTS ?? '')
  .split(',')
  .map((item) => {
    const [width, height] = item.split('x').map((value) => Number.parseInt(value, 10));
    return {name: `${width}x${height}`, width, height};
  })
  .filter((viewport) => Number.isFinite(viewport.width) && Number.isFinite(viewport.height));

function viewportsForTestCase(testCase) {
  if (viewportOverride.length > 0) return viewportOverride;
  const names = Array.isArray(testCase.viewport) ? testCase.viewport : [testCase.viewport];
  return names.map((name) => {
    const viewport = viewportCatalog[name];
    if (viewport === undefined) {
      throw new Error(`Unknown viewport "${name}" for ${testCase.id}`);
    }
    return viewport;
  });
}

function pageURL(pathname) {
  return `${baseURL}${pathname}`;
}

async function loadTestCaseConfig() {
  const configPath = process.env.TM_TEST_CASE_CONFIG;
  if (configPath === undefined || configPath.trim() === '') {
    return builtInTestCases;
  }
  const raw = await fs.readFile(path.resolve(configPath), 'utf8');
  const config = JSON.parse(raw);
  if (!Array.isArray(config.testCases)) {
    throw new Error('TM_TEST_CASE_CONFIG must contain a top-level testCases array.');
  }
  return config.testCases.map(resolveConfiguredTestCase);
}

function resolveConfiguredTestCase(testCase) {
  const base = testCase.extends === undefined ? {} : builtInTestCaseById.get(testCase.extends);
  if (testCase.extends !== undefined && base === undefined) {
    throw new Error(`Unknown testCase extension "${testCase.extends}". Available: ${[...builtInTestCaseById.keys()].join(', ')}`);
  }
  return {
    ...base,
    ...testCase,
    expansions: {...defaultExpansions, ...(base.expansions ?? {}), ...(testCase.expansions ?? {})},
    overrides: {...(base.overrides ?? {}), ...(testCase.overrides ?? {})},
    advance: testCase.advance ?? base.advance ?? [],
  };
}

async function fetchJson(pathname, options = {}) {
  const response = await fetch(pageURL(pathname), options);
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function reloadGameFromDatabase(gameId) {
  return fetchJson('/load_game', {
    method: 'PUT',
    body: JSON.stringify({gameId, rollbackCount: 0}),
    headers: {'Content-Type': 'application/json'},
  });
}

function mutateSqliteGame(gameId, mutator) {
  const dbPath = path.resolve('db/game.db');
  if (!existsSync(dbPath)) return {applied: false, reason: 'db/game.db not found'};
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (error) {
    return {applied: false, reason: `better-sqlite3 unavailable: ${error}`};
  }

  const db = new Database(dbPath);
  try {
    const row = db.prepare('SELECT save_id, game FROM games WHERE game_id = ? ORDER BY save_id DESC LIMIT 1').get(gameId);
    if (row === undefined) return {applied: false, reason: `game ${gameId} not present in SQLite database`};
    const serialized = JSON.parse(row.game);
    mutator(serialized);
    const nextSaveId = Number(row.save_id) + 1;
    serialized.lastSaveId = nextSaveId;
    const status = serialized.phase === 'end' ? 'finished' : 'running';
    db.prepare('INSERT INTO games (game_id, players, save_id, game, status) VALUES (?, ?, ?, ?, ?)')
      .run(serialized.id, serialized.players.length, nextSaveId, JSON.stringify(serialized), status);
    return {applied: true, storage: 'sqlite', saveId: nextSaveId};
  } finally {
    db.close();
  }
}

function mutateLocalFilesystemGame(gameId, mutator) {
  const file = path.resolve('db/files', `${gameId}.json`);
  if (!existsSync(file)) return {applied: false, reason: `local filesystem game ${file} not found`};
  const serialized = JSON.parse(readFileSync(file, 'utf8'));
  mutator(serialized);
  serialized.lastSaveId = Number(serialized.lastSaveId ?? 0) + 1;
  writeFileSync(file, JSON.stringify(serialized, null, 2));
  const historyDir = path.resolve('db/files/history');
  mkdirSync(historyDir, {recursive: true});
  writeFileSync(path.join(historyDir, `${gameId}-${String(serialized.lastSaveId).padStart(5, '0')}.json`), JSON.stringify(serialized, null, 2));
  return {applied: true, storage: 'local-filesystem', saveId: serialized.lastSaveId};
}

async function mutateSerializedGame(gameId, mutator) {
  const sqlite = mutateSqliteGame(gameId, mutator);
  if (sqlite.applied) {
    await reloadGameFromDatabase(gameId);
    return sqlite;
  }
  const localFs = mutateLocalFilesystemGame(gameId, mutator);
  if (localFs.applied) {
    await reloadGameFromDatabase(gameId);
    return localFs;
  }
  return {applied: false, reason: `${sqlite.reason}; ${localFs.reason}`};
}

function playerName(index) {
  if (index === 0) return 'TestCase You';
  return `TestCase ${index + 1}`;
}

const TILE = {
  GREENERY: 0,
  OCEAN: 1,
  CITY: 2,
  CAPITAL: 3,
  COMMERCIAL_DISTRICT: 4,
  ECOLOGICAL_ZONE: 5,
  INDUSTRIAL_CENTER: 6,
  LAVA_FLOWS: 7,
  NATURAL_PRESERVE: 11,
  NUCLEAR_ZONE: 12,
  DUST_STORM_MILD: 23,
  DUST_STORM_SEVERE: 24,
  EROSION_MILD: 25,
  EROSION_SEVERE: 26,
  MOON_MINE: 29,
  MOON_HABITAT: 30,
  MOON_ROAD: 31,
};

const corporationNames = ['Inventrix', 'Mining Guild', 'Ecoline', 'Tharsis Republic', 'Helion'];
const ceoNames = ['Asimov', 'Huan', 'Quill', 'Oscar', 'Shara'];
const denseHandCards = [
  'Ironworks',
  'Nuclear Zone',
  'Nuclear Power',
  'Earth Catapult',
  'AI Central',
  'Pets',
  'Birds',
  'Tardigrades',
  'Security Fleet',
  'Ants',
  'Livestock',
  'Fish',
  'Robotic Workforce',
  'Mars University',
  'Protected Habitats',
  'Asteroid',
  'Comet',
  'Noctis City',
  'Research Outpost',
  'Space Elevator',
  'Acquired Company',
  'Media Group',
  'Business Network',
  'Imported Hydrogen',
  'Ganymede Colony',
  'Physics Complex',
  'Regolith Eaters',
  'Decomposers',
  'Predators',
  'Farming',
  'Mining Area',
  'Mining Rights',
];

const densePlayedCards = [
  {name: 'Earth Catapult'},
  {name: 'Mars University'},
  {name: 'AI Central'},
  {name: 'Pets', resourceCount: 5},
  {name: 'Birds', resourceCount: 3},
  {name: 'Security Fleet', resourceCount: 4},
  {name: 'Tardigrades', resourceCount: 6},
  {name: 'Regolith Eaters', resourceCount: 4},
  {name: 'Decomposers', resourceCount: 5},
  {name: 'Ants', resourceCount: 2},
  {name: 'Robotic Workforce', bonusResource: 'steel'},
  {name: 'Protected Habitats'},
  {name: 'Media Group'},
  {name: 'Space Elevator'},
  {name: 'Acquired Company'},
  {name: 'Research Outpost'},
  {name: 'Mining Area', bonusResource: 'steel'},
  {name: 'Mining Rights', bonusResource: 'titanium'},
  {name: 'Noctis City'},
  {name: 'Commercial District'},
  {name: 'Nuclear Zone'},
  {name: 'Imported Hydrogen'},
  {name: 'Ganymede Colony'},
  {name: 'Physics Complex', resourceCount: 2},
];

function rotateItems(items, offset, count) {
  return Array.from({length: count}, (_, index) => items[(offset + index) % items.length]);
}

function visualLog(message, playerId, index) {
  return {
    message,
    data: [],
    timestamp: Date.now() + index,
    ...(playerId === undefined ? {} : {playerId}),
  };
}

function patchPlayersForDensity(serialized, options = {}) {
  const playerIds = serialized.players.map((player) => player.id);
  serialized.players.forEach((player, index) => {
    const corporation = corporationNames[index % corporationNames.length];
    player.pickedCorporationCard = corporation;
    player.dealtCorporationCards = [];
    player.dealtPreludeCards = [];
    player.dealtCeoCards = [];
    player.dealtProjectCards = [];
    player.pendingInitialActions = [];
    player.preludeCardsInHand = [];
    player.ceoCardsInHand = [];
    player.cardsInHand = rotateItems(denseHandCards, index * 5, options.handCount ?? 12);
    player.playedCards = [
      {name: corporation},
      ...(serialized.gameOptions?.ceoExtension || serialized.gameOptions?.ceo ? [{name: ceoNames[index % ceoNames.length], opgActionIsActive: index % 2 === 0}] : []),
      ...rotateItems(densePlayedCards, index * 4, options.playedCount ?? 14),
    ];
    player.megaCredits = 32 + index * 8;
    player.megaCreditProduction = 4 + index;
    player.steel = 5 + index * 2;
    player.steelProduction = 1 + index;
    player.titanium = 2 + index;
    player.titaniumProduction = index % 3;
    player.plants = index === 0 ? 9 : 3 + index;
    player.plantProduction = index;
    player.energy = 2 + index;
    player.energyProduction = 1 + index;
    player.heat = 8 + index * 3;
    player.heatProduction = 2 + index;
    player.steelValue = index === 0 ? 3 : 2;
    player.titaniumValue = index === 1 ? 4 : 3;
    player.cardCost = 3;
    player.cardDiscount = index % 2;
    player.terraformRating = index === 0 ? 36 : 23 + index * 3;
    player.actionsTakenThisGame = 8 + index * 3;
    player.actionsTakenThisRound = index === 0 ? 0 : 1;
    player.actionsThisGeneration = index === 0 ? ['Acquired Company'] : ['Sell Patents'];
    player.lastCardPlayed = player.playedCards[Math.min(3, player.playedCards.length - 1)]?.name;
    player.fleetSize = serialized.gameOptions?.coloniesExtension || serialized.gameOptions?.colonies ? 2 + (index % 2) : player.fleetSize;
    player.tradesThisGeneration = index % 2;
    player.scienceTagCount = 2 + index;
    player.plantTagCount = index;
    player.jovianTagCount = index % 2;
    player.victoryPointsByGeneration = [20, 22 + index, 25 + index * 2, 31 + index * 3];
    player.globalParameterSteps = {
      oceans: index,
      oxygen: 1 + index,
      temperature: 2 + index,
      venus: index % 3,
      'moon-habitat': index % 2,
      'moon-mining': index % 3,
      'moon-logistic': index % 2,
    };
    player.underworldData = {
      corruption: index,
      activeBonus: index === 0 ? 'plant2pertemp' : undefined,
      tokens: [
        {token: index % 2 === 0 ? 'card1' : 'steel1production', shelter: false, active: true},
        {token: index % 2 === 0 ? 'corruption1' : 'oceanrequirementmod', shelter: index === 1, active: false},
      ],
    };
    player.deltaProject = {position: Math.min(9, index * 2 + 1), jovianBonus: index % 2 === 0};
    player.alliedParty = index === 0 ? {partyName: 'Scientists', agenda: {bonusId: 'sb01', policyId: 'sp01'}} : player.alliedParty;
    player.totalDelegatesPlaced = 2 + index;
  });
  serialized.activePlayer = playerIds[0];
  serialized.passedPlayers = options.includePassed ? playerIds.slice(-1) : serialized.passedPlayers ?? [];
}

function patchBoardForDensity(serialized, options = {}) {
  const playerIds = serialized.players.map((player) => player.id);
  const spaces = serialized.board?.spaces ?? [];
  if (options.overwriteTiles) {
    for (const space of spaces) {
      delete space.tile;
      delete space.player;
      delete space.undergroundResource;
      delete space.excavator;
    }
  }
  const tiles = [
    {tileType: TILE.OCEAN},
    {tileType: TILE.CITY, player: playerIds[0]},
    {tileType: TILE.GREENERY, player: playerIds[0]},
    {tileType: TILE.CITY, player: playerIds[1] ?? playerIds[0]},
    {tileType: TILE.GREENERY, player: playerIds[1] ?? playerIds[0]},
    {tileType: TILE.NUCLEAR_ZONE, player: playerIds[0]},
    {tileType: TILE.NATURAL_PRESERVE, player: playerIds[2] ?? playerIds[0]},
    {tileType: TILE.COMMERCIAL_DISTRICT, player: playerIds[2] ?? playerIds[0]},
    {tileType: TILE.DUST_STORM_MILD},
    {tileType: TILE.EROSION_MILD},
    {tileType: TILE.DUST_STORM_SEVERE},
    {tileType: TILE.EROSION_SEVERE},
    {tileType: TILE.GREENERY, player: playerIds[3] ?? playerIds[0]},
    {tileType: TILE.CITY, player: playerIds[3] ?? playerIds[0]},
  ];
  let index = 0;
  for (const space of spaces) {
    if (index >= tiles.length) break;
    if (space.tile !== undefined && !options.overwriteTiles) continue;
    const patch = tiles[index++];
    space.tile = {tileType: patch.tileType};
    if (patch.player !== undefined) space.player = patch.player;
    if (index % 3 === 0) {
      space.undergroundResource = ['card1', 'corruption1', 'steel1production', 'oceanrequirementmod'][index % 4];
      space.excavator = playerIds[index % playerIds.length];
    }
  }
  serialized.oxygenLevel = Math.max(serialized.oxygenLevel ?? 0, options.endgame ? 14 : 10);
  serialized.temperature = Math.max(serialized.temperature ?? -30, options.endgame ? 8 : 0);
  serialized.venusScaleLevel = Math.max(serialized.venusScaleLevel ?? 0, options.endgame ? 30 : 16);
  serialized.globalsPerGeneration = serialized.globalsPerGeneration?.length ? serialized.globalsPerGeneration : [];
  serialized.globalsPerGeneration.push({oceans: 2, oxygen: 3, temperature: 4, venus: 2, 'moon-habitat': 1, 'moon-mining': 1, 'moon-logistic': 1});
}

function patchColoniesForDensity(serialized) {
  if (!(serialized.gameOptions?.coloniesExtension || serialized.gameOptions?.colonies)) return;
  const playerIds = serialized.players.map((player) => player.id);
  serialized.colonies = ['Luna', 'Ceres', 'Titan', 'Enceladus', 'Pluto', 'Io', 'Ganymede', 'Europa', 'Miranda'].map((name, index) => ({
    name,
    colonies: playerIds.slice(0, Math.min(playerIds.length, (index % 4) + 1)),
    isActive: index !== 7,
    trackPosition: Math.min(6, index + 1),
    visitor: index % 2 === 0 ? playerIds[index % playerIds.length] : undefined,
  }));
}

function patchMoonForDensity(serialized) {
  if (!(serialized.gameOptions?.moonExpansion || serialized.gameOptions?.moon)) return;
  if (serialized.moonData === undefined) return;
  const playerIds = serialized.players.map((player) => player.id);
  const spaces = serialized.moonData.moon?.spaces ?? [];
  [TILE.MOON_ROAD, TILE.MOON_MINE, TILE.MOON_HABITAT, TILE.MOON_ROAD, TILE.MOON_MINE].forEach((tileType, index) => {
    const space = spaces[index];
    if (space === undefined) return;
    space.tile = {tileType};
    space.player = playerIds[index % playerIds.length];
  });
  serialized.moonData.habitatRate = 5;
  serialized.moonData.miningRate = 6;
  serialized.moonData.logisticRate = 4;
  serialized.moonData.lunaFirstPlayerId = playerIds[0];
}

function patchPathfindersForDensity(serialized) {
  if (!(serialized.gameOptions?.pathfindersExpansion || serialized.gameOptions?.pathfinders)) return;
  const playerIds = serialized.players.map((player) => player.id);
  serialized.pathfindersData = {
    venus: 9,
    earth: 12,
    mars: 10,
    jovian: 8,
    moon: 11,
    vps: playerIds.flatMap((id, index) => [
      {id, tag: 'venus', points: index === 0 ? 2 : 0},
      {id, tag: 'earth', points: index === 1 ? 2 : 0},
      {id, tag: 'mars', points: index === 2 ? 2 : 0},
    ]),
  };
}

function patchAresForDensity(serialized) {
  if (!(serialized.gameOptions?.aresExtension || serialized.gameOptions?.ares)) return;
  serialized.aresData = {
    includeHazards: true,
    hazardData: {
      erosionOceanCount: {threshold: 3, available: true},
      removeDustStormsOceanCount: {threshold: 6, available: false},
      severeErosionTemperature: {threshold: -12, available: true},
      severeDustStormOxygen: {threshold: 8, available: true},
    },
    milestoneResults: serialized.players.map((player, index) => ({
      id: player.id,
      networkerCount: 3 + index,
      purifierCount: 1 + index,
    })),
  };
}

function patchTurmoilForDensity(serialized) {
  if (!(serialized.gameOptions?.turmoilExtension || serialized.gameOptions?.turmoil) || serialized.turmoil === undefined) return;
  const playerIds = serialized.players.map((player) => player.id);
  serialized.turmoil.rulingParty = 'Scientists';
  serialized.turmoil.dominantParty = 'Greens';
  serialized.turmoil.chairman = playerIds[0];
  serialized.turmoil.delegateReserve = ['NEUTRAL', 'NEUTRAL', playerIds[1] ?? playerIds[0], playerIds[2] ?? playerIds[0]];
  serialized.turmoil.usedFreeDelegateAction = [playerIds[0]];
  serialized.turmoil.playersInfluenceBonus = playerIds.map((id, index) => [id, index % 3]);
  serialized.turmoil.distantGlobalEvent = 'Global Dust Storm';
  serialized.turmoil.comingGlobalEvent = 'Sponsored Projects';
  serialized.turmoil.currentGlobalEvent = 'Successful Organisms';
  serialized.turmoil.parties = ['Mars First', 'Scientists', 'Unity', 'Kelvinists', 'Reds', 'Greens'].map((name, index) => ({
    name,
    delegates: [playerIds[index % playerIds.length], index % 2 === 0 ? 'NEUTRAL' : playerIds[(index + 1) % playerIds.length]],
    partyLeader: playerIds[index % playerIds.length],
  }));
}

function patchGameLogForDensity(serialized, options = {}) {
  const playerIds = serialized.players.map((player) => player.id);
  const names = serialized.players.map((player) => player.name);
  const messages = [
    `${names[0]} played Earth Catapult and reduced future card costs.`,
    `${names[1] ?? names[0]} placed a city and gained placement bonuses.`,
    `${names[0]} increased oxygen, temperature, and Venus this generation.`,
    `${names[2] ?? names[0]} traded with Luna and used a fleet.`,
    `${names[0]} added resources to Pets, Birds, and Security Fleet.`,
    `${names[1] ?? names[0]} funded an award while ${names[0]} was close behind.`,
    `${names[0]} revealed an underground token and gained corruption.`,
    `${names[2] ?? names[0]} advanced a planetary track.`,
    `${names[0]} placed a Moon mine and advanced mining rate.`,
    `${names[3] ?? names[0]} passed for this generation.`,
  ];
  const dense = Array.from({length: options.longLog ? 72 : 16}, (_, index) => visualLog(messages[index % messages.length], playerIds[index % playerIds.length], index));
  const generationMarker = {
    type: 1,
    message: 'Generation ${0}',
    data: [{type: 1, value: String(serialized.generation ?? 1)}],
    timestamp: Date.now() - 1,
  };
  serialized.gameLog = [...(serialized.gameLog ?? []), generationMarker, ...dense];
  serialized.gameAge = (serialized.gameAge ?? 0) + dense.length;
}

function patchActionChoiceForDensity(serialized) {
  const player = serialized.players[0];
  if (player === undefined) return;
  serialized.activePlayer = player.id;
  serialized.phase = 'action';
  serialized.generation = Math.max(serialized.generation ?? 1, 2);
  serialized.passedPlayers = [];
  player.pickedCorporationCard = 'Robinson Industries';
  player.dealtCorporationCards = [];
  player.dealtPreludeCards = [];
  player.dealtCeoCards = [];
  player.dealtProjectCards = [];
  player.pendingInitialActions = [];
  player.preludeCardsInHand = [];
  player.ceoCardsInHand = [];
  player.playedCards = [
    {name: 'Robinson Industries'},
    {name: 'Noctis Farming'},
    {name: 'Ecology Experts'},
    {name: 'Business Empire'},
  ];
  player.cardsInHand = [
    'Supercapacitors',
    'Atmo Collectors',
    'Neptunian Power Consultants',
  ];
  player.megaCredits = 86;
  player.megaCreditProduction = 2;
  player.steel = 6;
  player.steelProduction = 0;
  player.titanium = 4;
  player.titaniumProduction = 0;
  player.plants = 8;
  player.plantProduction = 0;
  player.energy = 6;
  player.energyProduction = 0;
  player.heat = 12;
  player.heatProduction = 0;
  player.steelValue = 2;
  player.titaniumValue = 3;
  player.cardCost = 3;
  player.cardDiscount = 0;
  player.actionsThisGeneration = [];
  player.actionsTakenThisRound = 0;
  player.tradesThisGeneration = 0;
  player.fleetSize = 1;
  player.terraformRating = Math.max(player.terraformRating ?? 20, 24);
  serialized.players.slice(1).forEach((other) => {
    other.passed = false;
    other.actionsThisGeneration = [];
  });
  patchColoniesForDensity(serialized);
}

function patchActivityFocusLog(serialized, patchName) {
  const player = serialized.players[0];
  if (player === undefined) return;
  const timestamp = Date.now() + 10_000;
  const actor = {type: 2, value: player.color};
  let messages;

  if (patchName === 'activity-focus-draw' || patchName === 'activity-focus-multi-draw') {
    const cards = patchName === 'activity-focus-multi-draw' ?
      ['Plantation', 'Subterranean Reservoir', 'Artificial Lake', 'Earth Catapult'] :
      ['Plantation', 'Subterranean Reservoir'];
    messages = [{
      message: '${0} drew ${1}',
      data: [
        actor,
        {type: 14, value: cards},
      ],
      timestamp,
      playerId: player.id,
    }];
  } else if (patchName === 'activity-focus-play-and-draw') {
    messages = [
      {
        message: '${0} played ${1}',
        data: [actor, {type: 3, value: 'SF Memorial'}],
        timestamp,
        playerId: player.id,
      },
      ...Array.from({length: 6}, (_, index) => ({
        message: '${0} resolved effect ' + (index + 1),
        data: [actor],
        timestamp: timestamp + index + 1,
        playerId: player.id,
      })),
      {
        message: '${0} drew ${1}',
        data: [actor, {type: 3, value: 'Mining Expedition'}],
        timestamp: timestamp + 7,
        playerId: player.id,
      },
    ];
  } else if (patchName === 'activity-focus-reveal-selection') {
    const revealed = [
      'Plantation',
      'Subterranean Reservoir',
      'Artificial Lake',
      'Earth Catapult',
      'Algae',
      'Birds',
      'Celestic',
      'Mining Expedition',
      'Security Fleet',
    ];
    messages = [
      {
        message: '${0} played ${1}',
        data: [actor, {type: 3, value: 'SF Memorial'}],
        timestamp,
        playerId: player.id,
      },
      {
        message: '${0} revealed ${1}',
        data: [actor, {type: 14, value: revealed}],
        timestamp: timestamp + 1,
        playerId: player.id,
      },
      {
        message: 'You drew ${0}',
        data: [{type: 14, value: ['Earth Catapult', 'Birds', 'Security Fleet']}],
        timestamp: timestamp + 2,
        playerId: player.id,
      },
    ];
  } else if (patchName === 'activity-focus-colony') {
    messages = [{
      message: '${0} removed a colony tile: ${1}',
      data: [
        actor,
        {type: 6, value: 'Titan'},
      ],
      timestamp,
      playerId: player.id,
    }];
  } else if (patchName === 'activity-focus-complex-action') {
    messages = [
      {
        message: '${0} played ${1}',
        data: [actor, {type: 3, value: 'Artificial Lake'}],
        timestamp,
        playerId: player.id,
      },
      {
        message: '${0} placed an ocean tile at ${1}',
        data: [actor, {type: 13, value: '12'}],
        timestamp: timestamp + 1,
        playerId: player.id,
      },
      {
        message: '${0} spent 12 M€ and gained 2 plants',
        data: [actor],
        timestamp: timestamp + 2,
        playerId: player.id,
      },
      {
        message: '${0} increased oxygen to 10%',
        data: [actor],
        timestamp: timestamp + 3,
        playerId: player.id,
      },
    ];
  } else {
    messages = [{
      message: '${0} converted 8 heat to raise temperature',
      data: [actor],
      timestamp,
      playerId: player.id,
    }];
  }

  serialized.gameLog = [{
    type: 1,
    message: 'Generation ${0}',
    data: [{type: 1, value: String(serialized.generation ?? 1)}],
    timestamp: timestamp - 1,
  }, ...messages];
  serialized.gameAge = (serialized.gameAge ?? 0) + messages.length;
}

function validateFixturePatch(serialized, patchName) {
  const fail = (message) => {
    throw new Error(`Fixture "${patchName}" failed its defining postcondition: ${message}`);
  };
  const hazardTypes = [TILE.DUST_STORM_MILD, TILE.DUST_STORM_SEVERE, TILE.EROSION_MILD, TILE.EROSION_SEVERE];
  const hazardCount = () => (serialized.board?.spaces ?? []).filter((space) => hazardTypes.includes(space.tile?.tileType)).length;
  const moonTileCount = () => (serialized.moonData?.moon?.spaces ?? []).filter((space) => space.tile !== undefined).length;

  if (patchName === 'colonies-three-empty-no-ships' &&
      (serialized.colonies.length !== 3 || serialized.colonies.some((colony) => colony.colonies.length > 0 || colony.visitor !== undefined))) {
    fail('expected exactly three empty colonies with no visitor ships');
  }
  if (patchName === 'colonies-four-occupied-three-ships' &&
      (serialized.colonies.length !== 4 ||
       serialized.colonies.filter((colony) => colony.colonies.length > 0).length !== 3 ||
       serialized.colonies.filter((colony) => colony.visitor !== undefined).length !== 3)) {
    fail('expected four colonies, three occupied tiles, and three visitor ships');
  }
  if (patchName === 'colonies-full-tile-max-track' &&
      !serialized.colonies.some((colony) => colony.colonies.length >= 3 && colony.trackPosition === 6)) {
    fail('expected a full colony at maximum track position');
  }
  if (patchName === 'colonies-many-tiles' && serialized.colonies.length !== 7) fail('expected seven colony tiles');
  if (patchName === 'colonies-fleets-expanded' &&
      serialized.players.some((player) => player.fleetSize !== 3)) fail('expected three fleets for every player');

  if (patchName === 'venus-zero' && serialized.venusScaleLevel !== 0) fail('expected Venus at 0%');
  if (patchName === 'venus-mid' && serialized.venusScaleLevel !== 16) fail('expected Venus at 16%');
  if (patchName === 'venus-max' && serialized.venusScaleLevel !== 30) fail('expected Venus at 30%');

  if (patchName === 'moon-empty' && (moonTileCount() !== 0 ||
      serialized.moonData?.habitatRate !== 0 ||
      serialized.moonData?.miningRate !== 0 ||
      serialized.moonData?.logisticRate !== 0)) fail('expected empty Moon and zero rates');
  if (patchName === 'moon-populated' && moonTileCount() < 5) fail('expected at least five owned Moon tiles');
  if (patchName === 'moon-crowded' && moonTileCount() < 12) fail('expected at least twelve Moon tiles');

  if (patchName === 'pathfinders-zero' &&
      ['venus', 'earth', 'mars', 'jovian', 'moon'].some((track) => serialized.pathfindersData?.[track] !== 0)) fail('expected all tracks at zero');
  if (patchName === 'pathfinders-near-max' &&
      ['venus', 'earth', 'mars', 'jovian', 'moon'].some((track) => serialized.pathfindersData?.[track] !== 13)) fail('expected all tracks near maximum');
  if (patchName === 'pathfinders-uneven') {
    const values = ['venus', 'earth', 'mars', 'jovian', 'moon'].map((track) => serialized.pathfindersData?.[track]);
    if (new Set(values).size < 3) fail('expected at least three distinct track positions');
  }

  if (patchName === 'ares-none' && hazardCount() !== 0) fail('expected zero hazards');
  if (patchName === 'ares-mixed' && hazardCount() !== 2) fail('expected exactly two mild hazards');
  if (patchName === 'ares-crowded' && hazardCount() < 8) fail('expected at least eight hazards');

  if (patchName === 'turmoil-baseline' &&
      (serialized.turmoil?.usedFreeDelegateAction?.length !== 0 ||
       Math.max(...(serialized.turmoil?.parties ?? []).map((party) => party.delegates.length), 0) > 2)) fail('expected moderate unused-policy state');
  if (patchName === 'turmoil-crowded' &&
      Math.max(...(serialized.turmoil?.parties ?? []).map((party) => party.delegates.length), 0) < 5) fail('expected a crowded party');
  if (patchName === 'turmoil-policy-used' &&
      serialized.turmoil?.usedFreeDelegateAction?.length !== 1) fail('expected one used policy action');

  if (patchName === 'underworld-hidden' &&
      serialized.players.some((player) => (player.underworldData?.tokens?.length ?? 0) > 0)) fail('expected hidden/empty player token state');
  if (patchName === 'underworld-revealed' &&
      serialized.players.every((player) => (player.underworldData?.tokens?.length ?? 0) === 0)) fail('expected revealed player tokens');
  if (patchName === 'underworld-high-corruption' &&
      serialized.players.some((player) => (player.underworldData?.corruption ?? 0) < 6)) fail('expected high corruption');

  if (patchName === 'delta-start' &&
      serialized.players.some((player) => player.deltaProject?.position !== 0)) fail('expected all Delta pawns at start');
  if (patchName === 'delta-leader-tie' &&
      serialized.players.filter((player) => player.deltaProject?.position === 7).length !== 2) fail('expected a two-player tie at the lead');
  if (patchName === 'delta-jovian' && serialized.players[0]?.deltaProject?.jovianBonus !== true) fail('expected active Jovian bonus');

  if (patchName === 'ceo-unused' &&
      !(serialized.players[0]?.playedCards ?? []).some((card) => ceoNames.includes(card.name) && card.opgActionIsActive === true)) fail('expected an unused CEO action');
  if (patchName === 'ceo-used' &&
      !(serialized.players[0]?.playedCards ?? []).some((card) => ceoNames.includes(card.name) && card.opgActionIsActive === false)) fail('expected a used CEO action');
  if (patchName === 'ceo-dense' && (serialized.players[0]?.playedCards?.length ?? 0) < 20) fail('expected a dense CEO tableau');

  if (patchName === 'ma-none' && ((serialized.claimedMilestones?.length ?? 0) !== 0 || (serialized.fundedAwards?.length ?? 0) !== 0)) fail('expected no claims or funding');
  if (patchName === 'ma-common' && ((serialized.claimedMilestones?.length ?? 0) !== 1 || (serialized.fundedAwards?.length ?? 0) !== 1)) fail('expected one claimed milestone and one funded award');
  if (patchName === 'card-hand-empty' &&
      serialized.players.some((player) => (player.cardsInHand?.length ?? 0) !== 0)) fail('expected every player hand to be empty');
  if (patchName === 'player-vp-tag-detail' &&
      !(serialized.players[1]?.playedCards ?? []).some((card) => card.name === 'Water Import From Europa')) {
    fail('expected the opponent dossier to include a VP-per-Jovian-tag card');
  }

  if (patchName === 'activity-focus-complex-action') {
    const log = JSON.stringify(serialized.gameLog.slice(-4));
    if (!log.includes('played') || !log.includes('placed') || !log.includes('spent') || !log.includes('oxygen')) {
      fail('expected card, placement, resource, and global-parameter consequences');
    }
  }
  if (patchName === 'activity-focus-reveal-selection') {
    const revealed = serialized.gameLog.find((message) => message.message.includes('revealed'));
    const retained = serialized.gameLog.find((message) => message.message.includes('drew'));
    if (revealed?.data?.find((datum) => datum.type === 14)?.value?.length !== 9 ||
        retained?.data?.find((datum) => datum.type === 14)?.value?.length !== 3) {
      fail('expected one played card, nine revealed candidates, and three retained cards');
    }
  }
  if (patchName === 'endgame-all-scoring' &&
      serialized.players[0]?.terraformRating !== 40) fail('expected deterministic endgame player ratings');
}

function applyFixturePatch(serialized, patchName) {
  const endgame = patchName === 'endgame-all-scoring';
  const includePassed = patchName === 'turn-mode-density' || patchName === 'five-player-density' || endgame;
  serialized.name = `Visual Fixture - ${patchName}`;
  serialized.generation = Math.max(serialized.generation ?? 1, endgame ? 12 : 5);
  serialized.phase = endgame ? 'end' : 'action';
  serialized.undoCount = Math.max(serialized.undoCount ?? 0, 2);
  patchPlayersForDensity(serialized, {
    includePassed,
    handCount: patchName === 'card-hand-empty' ? 0 : (patchName === 'card-filter-density' ? 18 : 12),
    playedCount: patchName === 'card-filter-density' || endgame ? 22 : 14,
  });
  if (patchName === 'player-large-values') {
    serialized.players.forEach((player, index) => {
      player.megaCredits = 987 - index * 111;
      player.megaCreditProduction = index === 0 ? -5 : 123 - index;
      player.steel = 876 - index * 101;
      player.steelProduction = 98 - index;
      player.titanium = 765 - index * 91;
      player.titaniumProduction = -3 + index;
      player.plants = 654 - index * 81;
      player.plantProduction = 76 - index;
      player.energy = 543 - index * 71;
      player.energyProduction = -2 + index;
      player.heat = 432 - index * 61;
      player.heatProduction = 54 - index;
      player.terraformRating = 321 - index * 17;
      player.victoryPointsByGeneration = [111, 222, 333, 444 - index];
    });
  }
  patchBoardForDensity(serialized, {endgame, overwriteTiles: endgame});
  patchColoniesForDensity(serialized);
  patchMoonForDensity(serialized);
  patchPathfindersForDensity(serialized);
  patchAresForDensity(serialized);
  patchTurmoilForDensity(serialized);
  patchGameLogForDensity(serialized, {longLog: patchName !== 'core-action-density'});
  if (patchName === 'action-choice-density' || patchName === 'action-single-project') {
    patchActionChoiceForDensity(serialized);
    if (patchName === 'action-single-project' && serialized.players[0] !== undefined) {
      serialized.players[0].cardsInHand = ['Supercapacitors'];
    }
  }
  if (patchName.startsWith('activity-focus-')) {
    patchActivityFocusLog(serialized, patchName);
  }
  if (patchName === 'player-vp-tag-detail' && serialized.players[1] !== undefined) {
    serialized.players[1].playedCards = [
      ...(serialized.players[1].playedCards ?? []),
      {name: 'Water Import From Europa'},
    ];
  }
  const playerIds = serialized.players.map((player) => player.id);
  if (patchName === 'colonies-three-empty-no-ships') {
    serialized.colonies = ['Luna', 'Ceres', 'Titan'].map((name, index) => ({
      name,
      colonies: [],
      isActive: true,
      trackPosition: [1, 3, 5][index],
      visitor: undefined,
    }));
  }
  if (patchName === 'colonies-four-occupied-three-ships') {
    serialized.colonies = ['Luna', 'Ceres', 'Titan', 'Enceladus'].map((name, index) => ({
      name,
      colonies: index < 3 ? [playerIds[index % playerIds.length]] : [],
      isActive: true,
      trackPosition: [1, 3, 5, 6][index],
      visitor: index < 3 ? playerIds[index % playerIds.length] : undefined,
    }));
  }
  if (patchName === 'colonies-full-tile-max-track') {
    serialized.colonies = ['Luna', 'Ceres', 'Titan', 'Enceladus'].map((name, index) => ({
      name,
      colonies: index === 0 ? playerIds.slice(0, 3) : playerIds.slice(0, index % 2),
      isActive: true,
      trackPosition: index === 0 ? 6 : index + 1,
      visitor: index === 0 ? playerIds[0] : undefined,
    }));
  }
  if (patchName === 'colonies-many-tiles') {
    serialized.colonies = ['Luna', 'Ceres', 'Titan', 'Enceladus', 'Pluto', 'Io', 'Ganymede'].map((name, index) => ({
      name,
      colonies: playerIds.slice(0, index % 3),
      isActive: true,
      trackPosition: Math.min(6, index + 1),
      visitor: index % 2 === 0 ? playerIds[index % playerIds.length] : undefined,
    }));
  }
  if (patchName === 'colonies-fleets-expanded') {
    serialized.players.forEach((player, index) => {
      player.fleetSize = 3;
      player.tradesThisGeneration = index % 3;
    });
  }
  if (patchName === 'venus-zero') serialized.venusScaleLevel = 0;
  if (patchName === 'venus-mid') serialized.venusScaleLevel = 16;
  if (patchName === 'venus-max') serialized.venusScaleLevel = 30;
  if (patchName === 'moon-empty' && serialized.moonData !== undefined) {
    serialized.moonData.habitatRate = 0;
    serialized.moonData.miningRate = 0;
    serialized.moonData.logisticRate = 0;
    for (const space of serialized.moonData.moon?.spaces ?? []) {
      delete space.tile;
      delete space.player;
    }
  }
  if (patchName === 'moon-crowded' && serialized.moonData !== undefined) {
    serialized.moonData.habitatRate = 7;
    serialized.moonData.miningRate = 8;
    serialized.moonData.logisticRate = 7;
    const moonTiles = [TILE.MOON_ROAD, TILE.MOON_MINE, TILE.MOON_HABITAT];
    (serialized.moonData.moon?.spaces ?? []).slice(0, 12).forEach((space, index) => {
      space.tile = {tileType: moonTiles[index % moonTiles.length]};
      space.player = playerIds[index % playerIds.length];
    });
  }
  if (patchName === 'pathfinders-zero' && serialized.pathfindersData !== undefined) {
    Object.assign(serialized.pathfindersData, {venus: 0, earth: 0, mars: 0, jovian: 0, moon: 0, vps: []});
  }
  if (patchName === 'pathfinders-near-max' && serialized.pathfindersData !== undefined) {
    Object.assign(serialized.pathfindersData, {venus: 13, earth: 13, mars: 13, jovian: 13, moon: 13});
  }
  if (patchName === 'ares-none' && serialized.aresData !== undefined) {
    serialized.aresData.includeHazards = true;
    for (const space of serialized.board?.spaces ?? []) {
      if ([TILE.DUST_STORM_MILD, TILE.DUST_STORM_SEVERE, TILE.EROSION_MILD, TILE.EROSION_SEVERE].includes(space.tile?.tileType)) {
        delete space.tile;
        delete space.player;
      }
    }
  }
  if (patchName === 'ares-mixed') {
    const hazards = [TILE.DUST_STORM_MILD, TILE.EROSION_MILD];
    let hazardIndex = 0;
    for (const space of serialized.board?.spaces ?? []) {
      if ([TILE.DUST_STORM_MILD, TILE.DUST_STORM_SEVERE, TILE.EROSION_MILD, TILE.EROSION_SEVERE].includes(space.tile?.tileType)) {
        if (hazardIndex < hazards.length) {
          space.tile = {tileType: hazards[hazardIndex++]};
        } else {
          delete space.tile;
          delete space.player;
        }
      }
    }
  }
  if (patchName === 'ares-crowded') {
    const hazards = [TILE.DUST_STORM_MILD, TILE.EROSION_MILD, TILE.DUST_STORM_SEVERE, TILE.EROSION_SEVERE];
    let index = 0;
    for (const space of serialized.board?.spaces ?? []) {
      if (index >= 12) break;
      if (space.tile === undefined || hazards.includes(space.tile.tileType)) {
        space.tile = {tileType: hazards[index % hazards.length]};
        delete space.player;
        index += 1;
      }
    }
  }
  if (patchName === 'underworld-hidden') {
    for (const space of serialized.board?.spaces ?? []) {
      delete space.undergroundResource;
      delete space.excavator;
    }
    serialized.players.forEach((player) => {
      player.underworldData = {corruption: 0, tokens: []};
    });
  }
  if (patchName === 'underworld-high-corruption') {
    serialized.players.forEach((player, index) => {
      player.underworldData = {...player.underworldData, corruption: 6 + index};
    });
  }
  if (patchName === 'delta-start') {
    serialized.players.forEach((player) => {
      player.deltaProject = {position: 0, jovianBonus: false};
    });
  }
  if (patchName === 'delta-leader-tie') {
    serialized.players.forEach((player, index) => {
      player.deltaProject = {position: index < 2 ? 7 : 3, jovianBonus: false};
    });
  }
  if (patchName === 'delta-jovian') {
    serialized.players[0].deltaProject = {position: 8, jovianBonus: true};
  }
  if (patchName === 'ceo-unused' || patchName === 'ceo-used') {
    serialized.players.forEach((player) => {
      for (const card of player.playedCards ?? []) {
        if (ceoNames.includes(card.name)) card.opgActionIsActive = patchName === 'ceo-unused';
      }
    });
  }
  if (patchName === 'ceo-dense') {
    const player = serialized.players[0];
    if (player !== undefined) {
      player.playedCards = [
        {name: ceoNames[0], opgActionIsActive: true},
        ...rotateItems(densePlayedCards, 0, 22),
      ];
    }
  }
  if (patchName === 'turmoil-policy-used' && serialized.turmoil !== undefined) {
    serialized.turmoil.usedFreeDelegateAction = [playerIds[0]];
  }
  if (patchName === 'turmoil-baseline' && serialized.turmoil !== undefined) {
    serialized.turmoil.usedFreeDelegateAction = [];
    serialized.turmoil.delegateReserve = ['NEUTRAL', playerIds[1] ?? playerIds[0]];
    serialized.turmoil.parties = serialized.turmoil.parties.map((party, index) => ({
      ...party,
      delegates: index < 2 ? party.delegates.slice(0, 2) : party.delegates.slice(0, 1),
    }));
  }
  if (patchName === 'turmoil-crowded' && serialized.turmoil !== undefined) {
    serialized.turmoil.usedFreeDelegateAction = [];
    serialized.turmoil.delegateReserve = ['NEUTRAL', 'NEUTRAL', ...playerIds, ...playerIds.slice(0, 2)];
    serialized.turmoil.parties = serialized.turmoil.parties.map((party, index) => ({
      ...party,
      delegates: [...playerIds, 'NEUTRAL', index % 2 === 0 ? 'NEUTRAL' : playerIds[0]],
    }));
  }
  if (patchName === 'ma-none') {
    serialized.claimedMilestones = [];
    serialized.fundedAwards = [];
  }
  if (patchName === 'ma-common') {
    serialized.claimedMilestones = serialized.milestones?.[0] === undefined ? [] : [{
      name: serialized.milestones[0],
      playerId: playerIds[0],
    }];
    serialized.fundedAwards = serialized.awards?.[0] === undefined ? [] : [{
      name: serialized.awards[0],
      playerId: playerIds[1] ?? playerIds[0],
    }];
  }
  if (endgame) {
    serialized.passedPlayers = serialized.players.map((player) => player.id);
    serialized.donePlayers = serialized.players.map((player) => player.id);
    serialized.oxygenLevel = 14;
    serialized.temperature = 8;
    serialized.venusScaleLevel = 30;
    serialized.players.forEach((player, index) => {
      player.terraformRating = [40, 29, 30, 31][index] ?? 25;
    });
  }
  validateFixturePatch(serialized, patchName);
}

async function applyFixturePatchIfNeeded(game, testCase) {
  if (testCase.fixturePatch === undefined) {
    return {applied: false, reason: 'testCase has no fixturePatch'};
  }
  const result = await mutateSerializedGame(game.id, (serialized) => applyFixturePatch(serialized, testCase.fixturePatch));
  if (!result.applied) {
    throw new Error(`Could not apply fixture "${testCase.fixturePatch}" for ${testCase.id}: ${result.reason ?? 'unknown reason'}`);
  }
  return {...result, patch: testCase.fixturePatch, visualOnly: true};
}

async function applyCanonicalSetupFixture(game) {
  const corporationCards = ['Inventrix', 'Mining Guild'];
  const preludeCards = ['Allied Bank', 'Business Empire', 'Io Research Outpost', 'Nitrogen Shipment'];
  const ceoCards = ['Quill', 'Stefan', 'Huan'];
  const projectCards = denseHandCards.slice(0, 10);
  const result = await mutateSerializedGame(game.id, (serialized) => {
    serialized.players.forEach((player) => {
      player.pickedCorporationCard = undefined;
      player.dealtCorporationCards = [...corporationCards];
      player.dealtPreludeCards = [...preludeCards];
      player.dealtCeoCards = [...ceoCards];
      player.dealtProjectCards = [...projectCards];
      player.cardsInHand = [];
      player.preludeCardsInHand = [];
      player.ceoCardsInHand = [];
    });
  });
  if (!result.applied) throw new Error(`Could not apply canonical setup fixture: ${result.reason}`);
  return result;
}

async function applyCanonicalResearchDeck(game) {
  const offers = [
    'Sponsors',
    'Local Heat Trapping',
    'Restricted Area',
    'Moss',
    'Power Grid',
    'Advanced Ecosystems',
    'Space Hotels',
    'Protected Habitats',
  ];
  const result = await mutateSerializedGame(game.id, (serialized) => {
    const offerSet = new Set(offers);
    serialized.projectDeck.drawPile = [
      ...serialized.projectDeck.drawPile.filter((name) => !offerSet.has(name)),
      ...offers,
    ];
  });
  if (!result.applied) throw new Error(`Could not apply canonical research deck: ${result.reason}`);
  return result;
}

function newGameConfig(testCase) {
  return {
    players: Array.from({length: testCase.players}, (_, index) => ({
      name: playerName(index),
      color: colors[index],
      beginner: false,
      handicap: 0,
      first: index === 0,
    })),
    expansions: {...defaultExpansions, ...testCase.expansions},
    board: testCase.board ?? 'tharsis',
    seed: testCase.seed ?? 0.42,
    randomFirstPlayer: false,
    clonedGamedId: undefined,
    undoOption: false,
    showTimers: true,
    fastModeOption: false,
    showOtherPlayersVP: false,
    aresExtremeVariant: false,
    politicalAgendasExtension: 'Standard',
    solarPhaseOption: false,
    removeNegativeGlobalEventsOption: false,
    modularMA: false,
    draftVariant: false,
    initialDraft: false,
    preludeDraftVariant: false,
    ceosDraftVariant: false,
    startingCorporations: 2,
    shuffleMapOption: false,
    randomMA: 'No randomization',
    includeFanMA: false,
    soloTR: false,
    customCorporationsList: [],
    bannedCards: [],
    includedCards: [],
    customColoniesList: [],
    customPreludes: [],
    requiresMoonTrackCompletion: false,
    requiresVenusTrackCompletion: false,
    moonStandardProjectVariant: false,
    moonStandardProjectVariant1: false,
    altVenusBoard: false,
    escapeVelocity: undefined,
    twoCorpsVariant: false,
    customCeos: [],
    startingCeos: 3,
    startingPreludes: 4,
    ...(testCase.overrides ?? {}),
  };
}

async function createGame(testCase) {
  const model = await fetchJson('/api/creategame', {
    method: 'POST',
    body: JSON.stringify(newGameConfig(testCase)),
    headers: {'Content-Type': 'application/json'},
  });
  return {
    ...model,
    players: model.players.map((player) => ({
      ...player,
      href: pageURL(`/player?id=${player.id}`),
    })),
  };
}

async function getPlayer(playerId) {
  return fetchJson(`/api/player?id=${playerId}`);
}

async function postInput(playerId, input) {
  return fetchJson(`/player/input?id=${playerId}`, {
    method: 'POST',
    body: JSON.stringify(input),
    headers: {'Content-Type': 'application/json'},
  });
}

function titleText(input) {
  if (typeof input?.title === 'string') return input.title;
  return input?.title?.message ?? '';
}

function normalizedTitle(input) {
  return titleText(input).toLowerCase();
}

function hasOptionMatching(input, pattern) {
  if (input === undefined) return false;
  if (pattern.test(normalizedTitle(input))) return true;
  if (Array.isArray(input.options)) return input.options.some((option) => hasOptionMatching(option, pattern));
  return false;
}

function selectCards(input, count) {
  return {
    type: 'card',
    cards: input.cards.slice(0, Math.max(0, count)).map((card) => card.name),
  };
}

function cardCost(card) {
  return Math.max(0, card.calculatedCost ?? card.cost ?? 0);
}

function initialCardsResponse(input, testCase) {
  const projectCount = testCase.projectCards ?? defaultProjectCardsToKeep;
  return {
    type: 'initialCards',
    responses: input.options.map((option) => {
      const title = normalizedTitle(option);
      if (option.type !== 'card') {
        return responseFor(option, {preferPass: false});
      }
      if (title.includes('project')) {
        return selectCards(option, Math.min(projectCount, option.max, option.cards.length));
      }
      return selectCards(option, Math.min(option.max, Math.max(option.min, 1), option.cards.length));
    }),
  };
}

function responseFor(input, options = {}) {
  switch (input.type) {
  case 'option':
    return {type: 'option'};
  case 'or': {
    const preferredPatterns = [
      options.preferPass ? /pass for this generation/ : undefined,
      /skip this action/,
      /skip/,
      /do nothing/,
    ].filter(Boolean);
    let index = -1;
    for (const pattern of preferredPatterns) {
      index = input.options.findIndex((option) => pattern.test(normalizedTitle(option)));
      if (index >= 0) break;
    }
    if (index < 0) {
      index = input.initialIdx ?? 0;
    }
    return {type: 'or', index, response: responseFor(input.options[index], options)};
  }
  case 'and':
    return {type: 'and', responses: input.options.map((option) => responseFor(option, options))};
  case 'initialCards':
    throw new Error('initialCards requires testCase-aware response');
  case 'card':
    return selectCards(input, input.min);
  case 'projectCard': {
    const card = input.cards.find((candidate) => candidate.isDisabled !== true);
    if (card === undefined) throw new Error(`No enabled project card is available for "${titleText(input)}"`);
    return {type: 'projectCard', card: card.name, payment: {...emptyPayment, megacredits: cardCost(card)}};
  }
  case 'space':
    return {type: 'space', spaceId: input.spaces[0]};
  case 'player':
    return {type: 'player', player: input.players[0]};
  case 'party':
    return {type: 'party', partyName: input.parties[0]};
  case 'delegate':
    return {type: 'delegate', player: input.players[0]};
  case 'colony':
    return {type: 'colony', colonyName: input.coloniesModel[0].name};
  case 'amount':
    return {type: 'amount', amount: input.maxByDefault ? input.max : input.min};
  case 'payment':
    return {type: 'payment', payment: {...emptyPayment, megacredits: input.amount}};
  case 'productionToLose': {
    const units = {...emptyUnits};
    let remaining = input.payProduction.cost;
    for (const resource of ['megacredits', 'steel', 'titanium', 'plants', 'energy', 'heat']) {
      const available = resource === 'megacredits' ?
        Math.max(0, input.payProduction.units.megacredits + 5) :
        Math.max(0, input.payProduction.units[resource]);
      const selected = Math.min(remaining, available);
      units[resource] = selected;
      remaining -= selected;
    }
    if (remaining !== 0) {
      throw new Error(`Cannot satisfy production loss of ${input.payProduction.cost} from ${JSON.stringify(input.payProduction.units)}`);
    }
    return {type: 'productionToLose', units};
  }
  case 'aresGlobalParameters':
    return {type: 'aresGlobalParameters', response: {lowOceanDelta: 0, highOceanDelta: 0, temperatureDelta: 0, oxygenDelta: 0}};
  case 'globalEvent':
    return {type: 'globalEvent', globalEventName: input.globalEventNames[0]};
  case 'policy':
    return {type: 'policy', policyId: input.policies?.[0] ?? input.policyIds?.[0]};
  case 'deltaProject':
    return {type: 'deltaProject', amount: input.validSteps[0]};
  case 'resource':
    return {type: 'resource', resource: input.include[0]};
  case 'resources':
    return {type: 'resources', units: {...emptyUnits}};
  case 'claimedUndergroundToken':
    return {type: 'claimedUndergroundToken', selected: input.tokens.slice(0, input.min).map((token) => token.id)};
  default:
    throw new Error(`Unsupported input type ${input.type}`);
  }
}

function isOrdinaryActionInput(input) {
  return input?.type === 'or' && hasOptionMatching(input, /pass for this generation|standard projects|fund an award|claim a milestone|play project card/);
}

function isResearchInput(input) {
  return /select card\(s\) to buy|research/i.test(titleText(input));
}

async function captureSetup(context, testCase, game, viewport) {
  const setupCaptures = [];
  const player = game.players[0];
  const page = await context.newPage();
  const diagnostics = bindPageDiagnostics(page);
  try {
    await page.goto(player.href, {waitUntil: navigationWaitUntil});
    await waitForVisualShell(page);
    await page.waitForTimeout(visualSettleMs);
    if (testCase.setupState === 'partial' || testCase.setupState === 'ready' || testCase.setupState === 'mulligan-preserved') {
      const corporation = page.locator('label.cardbox').filter({has: page.locator('.card-title.is-corporation')}).first();
      if (await corporation.count() === 0) {
        throw new Error(`Required corporation choice is not visible for ${testCase.setupState} setup evidence`);
      }
      await corporation.click();
      const projectCards = page.locator('.wf-component')
        .filter({has: page.locator('.wf-component-title', {hasText: /Select initial cards to buy/i})})
        .locator('label.cardbox');
      const selectedCount = Math.min(2, await projectCards.count());
      if (selectedCount === 0) {
        throw new Error('Required project-card choices are not visible for partial setup evidence');
      }
      for (let index = 0; index < selectedCount; index++) {
        await projectCards.nth(index).click();
      }
      if (testCase.setupState === 'ready' || testCase.setupState === 'mulligan-preserved') {
        const selectRequiredCards = async (titlePattern, requiredCount) => {
          const cards = page.locator('.wf-component')
            .filter({has: page.locator('.wf-component-title', {hasText: titlePattern})})
            .locator('label.cardbox');
          const available = await cards.count();
          if (available < requiredCount) {
            throw new Error(`Expected ${requiredCount} setup choices for ${titlePattern}, got ${available}`);
          }
          for (let index = 0; index < requiredCount; index++) {
            await cards.nth(index).click();
          }
        };
        await selectRequiredCards(/Prelude/i, 2);
        await selectRequiredCards(/CEO/i, 1);

        if (testCase.setupState === 'mulligan-preserved') {
          const projectMulligan = page.locator('.initial-card-mulligan__button').filter({hasText: /10 → 9/});
          if (await projectMulligan.count() !== 1) {
            throw new Error('Expected one project-pool mulligan action before the real response');
          }
          setupCaptures.push({
            ...await captureEvidence(page, testCase, viewport, 'setup-mulligan-before', diagnostics),
            status: 'captured',
          });
          const response = page.waitForResponse((candidate) => (
            candidate.request().method() === 'POST' &&
            candidate.url().includes('/player/input') &&
            candidate.ok()
          ));
          await projectMulligan.click();
          await response;
          await page.waitForFunction(() => {
            const summaries = Array.from(document.querySelectorAll('.select-initial-cards__summary-main strong'))
              .map((node) => node.textContent?.trim());
            return summaries.includes('1/1') &&
              summaries.includes('2/2') &&
              summaries.includes('0') &&
              !Array.from(document.querySelectorAll('.initial-card-mulligan__button'))
                .some((button) => button.textContent?.includes('10 → 9'));
          });
          const selectedCount = async (titlePattern) => page.locator('.wf-component')
            .filter({has: page.locator('.wf-component-title', {hasText: titlePattern})})
            .locator('input:checked')
            .count();
          const preserved = {
            corporation: await selectedCount(/Corporation/i),
            prelude: await selectedCount(/Prelude/i),
            ceo: await selectedCount(/CEO/i),
            project: await selectedCount(/Select initial cards to buy/i),
          };
          if (preserved.corporation !== 1 || preserved.prelude !== 2 || preserved.ceo !== 1 || preserved.project !== 0) {
            throw new Error(`Mulligan response did not preserve only the unrelated setup pools: ${JSON.stringify(preserved)}`);
          }
        } else {
          const commit = page.getByRole('button', {name: /Start|Begin/i}).last();
          if (await commit.count() !== 1 || await commit.isDisabled()) {
            throw new Error('Completed setup selections did not expose an enabled final commitment');
          }
        }
      } else {
        // Clicking a setup card can trigger a reactive scroll after the click
        // handler returns. Let that settle, then position the *actual setup
        // scroller* on the next unresolved decision for useful evidence.
        await page.waitForTimeout(250);
        const preludeSection = page.locator('.wf-component')
          .filter({has: page.locator('.wf-component-title', {hasText: /Prelude/i})})
          .first();
        if (await preludeSection.count() === 1) {
          await preludeSection.evaluate((section) => {
            const scroller = section.closest('.player_home_block--setup');
            if (!(scroller instanceof HTMLElement)) return;
            const summary = scroller.querySelector('.select-initial-cards__summary');
            const summaryHeight = summary instanceof HTMLElement ? summary.getBoundingClientRect().height : 0;
            const top = scroller.scrollTop +
              section.getBoundingClientRect().top -
              scroller.getBoundingClientRect().top -
              summaryHeight -
              12;
            scroller.scrollTo({top: Math.max(0, top), behavior: 'instant'});
          });
        }
      }
      await page.waitForTimeout(100);
      const setupCardSizes = await page.locator('.player_home_block--setup .wf-component--select-card > label.cardbox').evaluateAll((labels) => (
        labels.map((label) => {
          const card = label.querySelector('.card-container');
          const rect = card?.getBoundingClientRect();
          return {
            selected: label.querySelector('input:checked') !== null,
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
          };
        }).filter((entry) => entry.width > 0 && entry.height > 0)
      ));
      const widths = setupCardSizes.map((entry) => entry.width);
      if (widths.length > 1 &&
          Math.max(...widths) - Math.min(...widths) > 1) {
        throw new Error(`Setup hover or selection changed card geometry: ${JSON.stringify(setupCardSizes)}`);
      }
    }
    setupCaptures.push({
      ...await captureEvidence(page, testCase, viewport, `setup-${testCase.setupState}`, diagnostics),
      status: 'captured',
    });
  } finally {
    await page.close();
  }
  return setupCaptures;
}

async function completeInitialSetup(game, testCase) {
  const setup = [];
  for (const player of game.players) {
    let model = await getPlayer(player.id);
    if (model.waitingFor?.type !== 'initialCards') {
      setup.push({player: player.name, skipped: true, waitingFor: model.waitingFor?.type});
      continue;
    }
    const input = initialCardsResponse(model.waitingFor, testCase);
    try {
      await postInput(player.id, input);
    } catch (error) {
      throw new Error(
        `Initial setup submission failed for ${testCase.id}/${player.name}; requested selections were not silently changed: ${String(error)}`,
      );
    }
    model = await getPlayer(player.id);
    setup.push({
      player: player.name,
      corporation: input.responses.find((response) => response.type === 'card')?.cards?.[0],
      selectedCards: input.responses.reduce((sum, response) => sum + (response.cards?.length ?? 0), 0),
      waitingFor: model.waitingFor?.type ?? null,
    });
  }
  return setup;
}

async function stabilizePostSetup(game, testCase) {
  const steps = [];
  for (let idx = 0; idx < 80; idx++) {
    let progressed = false;
    for (const player of game.players) {
      const model = await getPlayer(player.id);
      const waitingFor = model.waitingFor;
      if (waitingFor === undefined || isOrdinaryActionInput(waitingFor) || isResearchInput(waitingFor)) {
        continue;
      }
      const response = waitingFor.type === 'initialCards' ? initialCardsResponse(waitingFor, testCase) : responseFor(waitingFor, {preferPass: false});
      try {
        await postInput(player.id, response);
      } catch (error) {
        throw new Error(
          `Post-setup stabilization failed for ${testCase.id}/${model.thisPlayer.name} at ${waitingFor.type} "${titleText(waitingFor)}": ${String(error)}`,
        );
      }
      steps.push({player: model.thisPlayer.name, input: waitingFor.type, title: titleText(waitingFor)});
      progressed = true;
    }
    if (!progressed) break;
  }
  for (const player of game.players) {
    const model = await getPlayer(player.id);
    const waitingFor = model.waitingFor;
    if (waitingFor !== undefined && !isOrdinaryActionInput(waitingFor) && !isResearchInput(waitingFor)) {
      throw new Error(
        `Post-setup stabilization ended with unresolved input for ${testCase.id}/${model.thisPlayer.name}: ${waitingFor.type} "${titleText(waitingFor)}"`,
      );
    }
  }
  return steps;
}

async function advanceToGeneration(game, generation) {
  const steps = [];
  for (let idx = 0; idx < 80; idx++) {
    const states = [];
    for (const player of game.players) {
      states.push(await getPlayer(player.id));
    }
    if (states.some((state) => state.game.generation >= generation)) {
      break;
    }
    const active = states.find((state) => state.players.some((publicPlayer) => publicPlayer.name === state.thisPlayer.name && publicPlayer.isActive));
    if (active === undefined || active.waitingFor === undefined) {
      break;
    }
    try {
      await postInput(active.id, responseFor(active.waitingFor, {preferPass: true}));
    } catch (error) {
      throw new Error(
        `Could not advance ${active.thisPlayer.name} to generation ${generation} at ${active.waitingFor.type} "${titleText(active.waitingFor)}": ${String(error)}`,
      );
    }
    steps.push({
      player: active.thisPlayer.name,
      input: active.waitingFor.type,
      title: titleText(active.waitingFor),
      options: active.waitingFor.options?.map((option) => titleText(option)),
    });
  }
  const finalStates = await Promise.all(game.players.map((player) => getPlayer(player.id)));
  if (!finalStates.some((state) => state.game.generation >= generation)) {
    throw new Error(`Engine did not reach generation ${generation}; latest generations: ${finalStates.map((state) => state.game.generation).join(', ')}`);
  }
  return steps;
}

async function advanceToWorldGovernment(game) {
  const steps = [];
  const expected = ['Increase temperature', 'Increase oxygen', 'Add an ocean', 'Increase Venus scale'];
  for (let idx = 0; idx < 80; idx++) {
    const states = await Promise.all(game.players.map((player) => getPlayer(player.id)));
    const worldGovernment = states.find((state) => {
      const titles = state.waitingFor?.options?.map((option) => titleText(option)) ?? [];
      return titles.length === expected.length && expected.every((title) => titles.includes(title));
    });
    if (worldGovernment !== undefined) {
      const titles = worldGovernment.waitingFor.options?.map((option) => titleText(option)) ?? [];
      if (titles.length !== expected.length || expected.some((title) => !titles.includes(title))) {
        throw new Error(`World Government did not expose the exact four expected choices: ${JSON.stringify(titles)}`);
      }
      return steps;
    }
    const active = states.find((state) => state.players.some(
      (publicPlayer) => publicPlayer.name === state.thisPlayer.name && publicPlayer.isActive,
    ));
    if (active === undefined || active.waitingFor === undefined) {
      break;
    }
    try {
      await postInput(active.id, responseFor(active.waitingFor, {preferPass: true}));
    } catch (error) {
      throw new Error(
        `Could not advance ${active.thisPlayer.name} to World Government Terraforming at ${active.waitingFor.type} "${titleText(active.waitingFor)}": ${String(error)}`,
      );
    }
    steps.push({
      player: active.thisPlayer.name,
      input: active.waitingFor.type,
      title: titleText(active.waitingFor),
      options: active.waitingFor.options?.map((option) => titleText(option)),
    });
  }
  const finalStates = await Promise.all(game.players.map((player) => getPlayer(player.id)));
  throw new Error(
    `Engine did not reach World Government Terraforming; steps: ${JSON.stringify(steps)}; latest inputs: ${finalStates.map((state) => `${state.thisPlayer.name}:${titleText(state.waitingFor)}`).join(', ')}`,
  );
}

async function findSeats(game) {
  const states = [];
  for (const player of game.players) {
    const state = await getPlayer(player.id);
    states.push({
      id: player.id,
      name: state.thisPlayer.name,
      href: player.href,
      waitingFor: state.waitingFor?.type ?? null,
      waitingTitle: titleText(state.waitingFor),
      waitingOptionTitles: state.waitingFor?.options?.map((option) => titleText(option)) ?? [],
      generation: state.game.generation,
      phase: state.game.phase,
      active: state.players.some((publicPlayer) => publicPlayer.name === state.thisPlayer.name && publicPlayer.isActive),
    });
  }
  const active = states.find((state) => state.active) ?? states[0];
  const waiting = states.find((state) => state.id !== active.id) ?? active;
  const worldGovernment = states.find((state) => {
    const expected = ['Increase temperature', 'Increase oxygen', 'Add an ocean', 'Increase Venus scale'];
    return state.waitingOptionTitles.length === expected.length &&
      expected.every((title) => state.waitingOptionTitles.includes(title));
  });
  return {states, active, waiting, worldGovernment};
}

function safeFilename(input) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function waitForVisualShell(page) {
  await page.waitForSelector('#player-home, #game-end, .game_end', {timeout: 10000});
  await page.waitForFunction(() => {
    const background = getComputedStyle(document.body).backgroundColor;
    const hasStylesheet = document.querySelectorAll('link[rel="stylesheet"], style').length > 0;
    const hasKnownShell = document.querySelector('#player-home, #game-end, .game_end') !== null;
    return hasKnownShell &&
      hasStylesheet &&
      background !== 'rgba(0, 0, 0, 0)' &&
      background !== 'rgb(255, 255, 255)';
  }, undefined, {timeout: 5000}).catch(() => {});
}

function bindPageDiagnostics(page) {
  const diagnostics = {
    pageErrors: [],
    consoleErrors: [],
  };
  page.on('pageerror', (error) => {
    const message = String(error);
    if (!isKnownNonFatalServiceWorkerError(message)) {
      diagnostics.pageErrors.push(message);
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !isKnownNonFatalServiceWorkerError(message.text())) {
      diagnostics.consoleErrors.push(message.text());
    }
  });
  return diagnostics;
}

function isKnownNonFatalServiceWorkerError(message) {
  return message.includes('Failed to register a ServiceWorker') ||
    message.includes('/sw.js') ||
    message.includes('sw.js') ||
    message.includes('A bad HTTP response code (404) was received when fetching the script');
}

function cloneDiagnostics(diagnostics) {
  return {
    pageErrors: [...diagnostics.pageErrors],
    consoleErrors: [...diagnostics.consoleErrors],
  };
}

async function captureEvidence(page, testCase, viewport, captureName, diagnostics = {pageErrors: [], consoleErrors: []}) {
  const artifactDir = path.join(outputDir, testCase.id, viewport.name, safeFilename(captureName));
  await fs.mkdir(artifactDir, {recursive: true});
  const contextFile = path.join(artifactDir, 'context.png');
  await page.screenshot({path: contextFile, fullPage: testCase.fullPage === true});
  let detailFile;
  let detailViewport;
  if (testCase.suite === 'detail' && testCase.detailSelector !== undefined) {
    const detailTarget = await firstVisible(page.locator(testCase.detailSelector));
    if (detailTarget === undefined) {
      throw new Error(`Required detail selector is not visible: ${testCase.detailSelector}`);
    }
    detailViewport = await detailTarget.evaluate((element) => {
      const nodes = [element, ...element.querySelectorAll('*')];
      const scrollOwners = nodes.flatMap((node) => {
        const style = getComputedStyle(node);
        const horizontal = node.scrollWidth - node.clientWidth > 4 && /^(auto|scroll)$/.test(style.overflowX);
        const vertical = node.scrollHeight - node.clientHeight > 4 && /^(auto|scroll)$/.test(style.overflowY);
        if (!horizontal && !vertical) return [];
        const label = node === element ?
          ':scope' :
          `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${[...node.classList].map((name) => `.${name}`).join('')}`;
        return [{
          label,
          clientWidth: node.clientWidth,
          clientHeight: node.clientHeight,
          scrollWidth: node.scrollWidth,
          scrollHeight: node.scrollHeight,
          scrollLeft: node.scrollLeft,
          scrollTop: node.scrollTop,
          horizontal,
          vertical,
        }];
      }).slice(0, 12);
      return {
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
        hasHorizontalOverflow: scrollOwners.some((owner) => owner.horizontal),
        hasVerticalOverflow: scrollOwners.some((owner) => owner.vertical),
        scrollOwners,
      };
    });
    detailFile = path.join(artifactDir, 'detail.png');
    await detailTarget.screenshot({path: detailFile});
  }
  return {
    capture: captureName,
    viewport: viewport.name,
    artifacts: {context: contextFile, detail: detailFile},
    detailViewport,
    diagnostics: cloneDiagnostics(diagnostics),
  };
}

async function firstVisible(locator) {
  const count = await locator.count();
  for (let idx = 0; idx < count; idx++) {
    const item = locator.nth(idx);
    if (await item.isVisible().catch(() => false)) {
      return item;
    }
  }
  return undefined;
}

async function clickIfPresent(page, selector, options = {}) {
  const locator = await firstVisible(page.locator(selector));
  if (locator === undefined) return false;
  await locator.click({timeout: optionalActionTimeoutMs, ...options});
  await page.waitForTimeout(350);
  return true;
}

async function clickButtonText(page, container, text) {
  const locator = await firstVisible(page.locator(container).getByRole('button', {name: new RegExp(text, 'i')}));
  if (locator === undefined) return false;
  await locator.click({timeout: optionalActionTimeoutMs});
  await page.waitForTimeout(350);
  return true;
}

async function selectAction(page, text) {
  const tile = await firstVisible(page.locator('.tm-action-workbench label, .tm-action-workbench button, .tm-action-workbench .wf-command-tile').filter({hasText: new RegExp(text, 'i')}));
  if (tile === undefined) return false;
  await tile.click({timeout: optionalActionTimeoutMs});
  await page.waitForTimeout(450);
  return true;
}

async function openModal(page, name) {
  return clickButtonText(page, '.tm-top-tools', name);
}

async function hoverIfPresent(page, selector) {
  const locator = await firstVisible(page.locator(selector));
  if (locator === undefined) return false;
  await locator.hover({timeout: 2500});
  await page.waitForTimeout(250);
  return true;
}

function assertStableBounds(label, before, after, tolerance = 1) {
  if (before === null || after === null) {
    throw new Error(`Expected ${label} to remain measurable`);
  }
  const changed = ['x', 'y', 'width', 'height'].some(
    (property) => Math.abs(before[property] - after[property]) > tolerance,
  );
  if (changed) {
    throw new Error(
      `${label} changed bounds from ${JSON.stringify(before)} to ${JSON.stringify(after)}`,
    );
  }
}

async function firstVisibleInViewport(page, locator) {
  const viewport = page.viewportSize();
  const count = await locator.count();
  for (let idx = 0; idx < count; idx++) {
    const item = locator.nth(idx);
    if (!await item.isVisible().catch(() => false)) continue;
    const box = await item.boundingBox();
    if (box === null || viewport === null) continue;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue;
    const receivesPointer = await item.evaluate((element, point) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return hit !== null && (element === hit || element.contains(hit));
    }, {x, y}).catch(() => false);
    if (receivesPointer) return {locator: item, x, y};
  }
  return undefined;
}

async function hoverCardAndTrackScroll(page, targetSelector, scrollRootSelectors, options = {}) {
  const initialScrollLeft = options.initialScrollLeft ?? 72;
  await page.evaluate(({selectors, initialScrollLeft}) => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) continue;
      const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
      const maxLeft = Math.max(0, element.scrollWidth - element.clientWidth);
      if (maxTop > 0) element.scrollTop = Math.min(maxTop, 48);
      if (maxLeft > 0) element.scrollLeft = Math.min(maxLeft, initialScrollLeft);
    }
  }, {selectors: scrollRootSelectors, initialScrollLeft});
  await page.waitForTimeout(120);

  const target = await firstVisibleInViewport(page, page.locator(targetSelector));
  if (target === undefined) return false;
  const beforeBounds = await target.locator.boundingBox();

  const snapshot = async () => target.locator.evaluate((element, selectors) => {
    const roots = [];
    const add = (candidate, selector) => {
      if (!(candidate instanceof HTMLElement) || roots.some((item) => item.element === candidate)) return;
      roots.push({element: candidate, selector});
    };
    add(document.scrollingElement, 'document');
    for (const selector of selectors) add(element.closest(selector) ?? document.querySelector(selector), selector);
    return roots.map(({element: root, selector}) => ({
      selector,
      scrollTop: root.scrollTop,
      scrollLeft: root.scrollLeft,
      overflowX: getComputedStyle(root).overflowX,
      overflowY: getComputedStyle(root).overflowY,
    }));
  }, scrollRootSelectors);

  const before = await snapshot();
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(320);
  const after = await snapshot();
  const afterBounds = await target.locator.boundingBox();
  if (options.requireStableBounds === true) {
    if (beforeBounds === null || afterBounds === null) {
      throw new Error(`Expected ${targetSelector} to remain measurable while hovered`);
    }
    const changed = ['x', 'y', 'width', 'height'].some(
      (property) => Math.abs(beforeBounds[property] - afterBounds[property]) > 1,
    );
    if (changed) {
      throw new Error(
        `Hover changed card bounds from ${JSON.stringify(beforeBounds)} to ${JSON.stringify(afterBounds)}`,
      );
    }
  }
  await page.evaluate(({targetSelector, before, after}) => {
    const delta = after.map((item, index) => ({
      selector: item.selector,
      scrollTop: item.scrollTop - (before[index]?.scrollTop ?? item.scrollTop),
      scrollLeft: item.scrollLeft - (before[index]?.scrollLeft ?? item.scrollLeft),
      overflowChanged: item.overflowX !== before[index]?.overflowX || item.overflowY !== before[index]?.overflowY,
    }));
    globalThis.__tmVisualHoverScrollStability = {targetSelector, before, after, delta};
  }, {targetSelector, before, after});
  return true;
}

async function refreshCardsOverlayAndTrackState(page, _seat, _testCase, game) {
  if (!await openCardsOverlay(page)) return false;
  const gallery = await firstVisible(page.locator('.tm-modal .tm-card-gallery'));
  if (gallery === undefined) return false;
  const before = await page.evaluate(() => {
    const setTrackedScroll = (element, top, left) => {
      if (!(element instanceof HTMLElement)) return null;
      const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
      const maxLeft = Math.max(0, element.scrollWidth - element.clientWidth);
      element.scrollTop = Math.min(maxTop, top);
      element.scrollLeft = Math.min(maxLeft, left);
      return {scrollTop: element.scrollTop, scrollLeft: element.scrollLeft};
    };
    return {
      gallery: setTrackedScroll(document.querySelector('.tm-modal .tm-card-gallery'), 80, 120),
      cardStrip: setTrackedScroll(document.querySelector('.tm-card-strip'), 0, 120),
    };
  });
  const response = page
    .waitForResponse((candidate) => new URL(candidate.url()).pathname.endsWith('/api/player'), {timeout: 8000})
    .catch(() => undefined);
  const mutation = await mutateSerializedGame(game.id, (serialized) => {
    serialized.gameAge = Number(serialized.gameAge ?? 0) + 1;
  });
  if (!mutation.applied) return false;
  if (await response === undefined) return false;
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const modal = document.querySelector('.tm-modal');
    const gallery = document.querySelector('.tm-modal .tm-card-gallery');
    const cardStrip = document.querySelector('.tm-card-strip');
    return {
      overlayOpen: modal !== null,
      gallery: gallery instanceof HTMLElement ? {scrollTop: gallery.scrollTop, scrollLeft: gallery.scrollLeft} : null,
      cardStrip: cardStrip instanceof HTMLElement ? {scrollTop: cardStrip.scrollTop, scrollLeft: cardStrip.scrollLeft} : null,
    };
  });
  await page.evaluate(({before, after}) => {
    globalThis.__tmVisualStatePreservation = {
      before,
      after,
      scrollUnchanged:
        after.gallery?.scrollTop === before.gallery?.scrollTop &&
        after.gallery?.scrollLeft === before.gallery?.scrollLeft &&
        after.cardStrip?.scrollTop === before.cardStrip?.scrollTop &&
        after.cardStrip?.scrollLeft === before.cardStrip?.scrollLeft,
    };
  }, {before, after});
  return true;
}

async function clickFirstMatching(page, selectors) {
  for (const selector of selectors) {
    const locator = await firstVisible(page.locator(selector));
    if (locator !== undefined) {
      await locator.click({timeout: optionalActionTimeoutMs});
      await page.waitForTimeout(350);
      return true;
    }
  }
  return false;
}

async function fillFirstMatching(page, selectors, value) {
  for (const selector of selectors) {
    const locator = await firstVisible(page.locator(selector));
    if (locator !== undefined) {
      await locator.fill(value, {timeout: optionalActionTimeoutMs});
      await page.waitForTimeout(300);
      return true;
    }
  }
  return false;
}

async function clickTextIfPresent(page, text, selectors = ['button', 'label', '[role="button"]', 'summary']) {
  for (const selector of selectors) {
    const locator = await firstVisible(page.locator(selector).filter({hasText: new RegExp(text, 'i')}));
    if (locator !== undefined) {
      await locator.click({timeout: optionalActionTimeoutMs});
      await page.waitForTimeout(350);
      return true;
    }
  }
  return false;
}

async function openCardsOverlay(page) {
  if (await openModal(page, 'Cards')) return true;
  if (await clickIfPresent(page, '.tm-card-desk .tm-panel-icon-button, .tm-hand-open-button')) return true;
  if (await clickIfPresent(page, '.tm-utility-menu > summary')) {
    return clickIfPresent(page, '.tm-utility-panel .tm-hand-open-button');
  }
  return false;
}

async function openLogOverlay(page) {
  if (await openModal(page, 'Log')) return true;
  return clickIfPresent(page, '.tm-activity-rail .tm-icon-control--eye');
}

async function openBoardOverlay(page) {
  return openModal(page, 'Board');
}

async function openPlayersOverlay(page) {
  return openModal(page, 'Players');
}

async function closeModal(page) {
  await clickIfPresent(page, '.tm-modal-close');
}

async function scrollSelector(page, selector, direction = 'bottom') {
  const locator = page.locator(selector).first();
  if (await locator.count() === 0) return false;
  const movement = await locator.evaluate((element, dir) => {
    const before = {top: element.scrollTop, left: element.scrollLeft};
    if (dir === 'top' || dir === 'bottom') {
      element.scrollTop = dir === 'top' ? 0 : element.scrollHeight;
    }
    if (dir === 'left' || dir === 'right') {
      element.scrollLeft = dir === 'left' ? 0 : element.scrollWidth;
    }
    return {
      before,
      after: {top: element.scrollTop, left: element.scrollLeft},
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  }, direction);
  await page.waitForTimeout(200);
  const vertical = direction === 'top' || direction === 'bottom';
  if (vertical && (movement.scrollHeight <= movement.clientHeight || movement.after.top === movement.before.top)) {
    throw new Error(`Expected ${selector} to scroll vertically: ${JSON.stringify(movement)}`);
  }
  if (!vertical && (movement.scrollWidth <= movement.clientWidth || movement.after.left === movement.before.left)) {
    throw new Error(`Expected ${selector} to scroll horizontally: ${JSON.stringify(movement)}`);
  }
  return true;
}

async function scrollColoniesWithWheel(page) {
  const opened = await openExtensionSummary(page, ['.tm-table-leaf--colonies > summary', '.tm-extension-panel--colonies > summary', 'details:has-text("Colonies") > summary']);
  if (!opened) return false;
  const locator = page.locator('.player_home_colony_cont:visible').first();
  if (await locator.count() === 0) return false;
  const before = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    scrollLeft: element.scrollLeft,
  }));
  await locator.hover();
  await page.mouse.wheel(0, 480);
  await page.waitForTimeout(250);
  const after = await locator.evaluate((element) => element.scrollLeft);
  await page.evaluate((result) => {
    globalThis.__tmVisualColonyWheelScroll = result;
  }, {...before, after});
  return before.scrollWidth <= before.clientWidth || after > before.scrollLeft;
}

async function resizeLayout(page) {
  const activityHandle = await page.locator('.tm-layout-resize-handle--activity').boundingBox();
  if (activityHandle !== null) {
    await page.mouse.move(activityHandle.x + activityHandle.width / 2, activityHandle.y + activityHandle.height / 2);
    await page.mouse.down();
    await page.mouse.move(activityHandle.x - 90, activityHandle.y + activityHandle.height / 2, {steps: 8});
    await page.mouse.up();
  }
  const bottomHandle = await page.locator('.tm-layout-resize-handle--bottom').boundingBox();
  if (bottomHandle !== null) {
    await page.mouse.move(bottomHandle.x + bottomHandle.width / 2, bottomHandle.y + bottomHandle.height / 2);
    await page.mouse.down();
    await page.mouse.move(bottomHandle.x + bottomHandle.width / 2, bottomHandle.y - 60, {steps: 8});
    await page.mouse.up();
  }
  await page.waitForTimeout(350);
  return activityHandle !== null || bottomHandle !== null;
}

async function resizeBottomTray(page, deltaY) {
  const bottomHandle = await page.locator('.tm-layout-resize-handle--bottom').boundingBox();
  if (bottomHandle === null) return false;
  await page.mouse.move(bottomHandle.x + bottomHandle.width / 2, bottomHandle.y + bottomHandle.height / 2);
  await page.mouse.down();
  await page.mouse.move(bottomHandle.x + bottomHandle.width / 2, bottomHandle.y + deltaY, {steps: 8});
  await page.mouse.up();
  await page.waitForTimeout(300);
  return true;
}

async function resizeActivityRail(page, deltaX) {
  const activityHandle = await page.locator('.tm-layout-resize-handle--activity').boundingBox();
  if (activityHandle === null) return false;
  await page.mouse.move(activityHandle.x + activityHandle.width / 2, activityHandle.y + activityHandle.height / 2);
  await page.mouse.down();
  await page.mouse.move(activityHandle.x + deltaX, activityHandle.y + activityHandle.height / 2, {steps: 8});
  await page.mouse.up();
  await page.waitForTimeout(300);
  return true;
}

async function resizePlayerRail(page, deltaX) {
  const playerHandle = await page.locator('.tm-layout-resize-handle--player').boundingBox();
  if (playerHandle === null) return false;
  await page.mouse.move(playerHandle.x + playerHandle.width / 2, playerHandle.y + playerHandle.height / 2);
  await page.mouse.down();
  await page.mouse.move(playerHandle.x + deltaX, playerHandle.y + playerHandle.height / 2, {steps: 12});
  await page.mouse.up();
  await page.waitForTimeout(300);
  return true;
}

async function resizeLayoutMinimums(page) {
  const before = await page.evaluate(() => ({
    player: document.querySelector('.tm-player-rail')?.getBoundingClientRect().width ?? 0,
    activity: document.querySelector('.tm-activity-rail')?.getBoundingClientRect().width ?? 0,
    bottom: document.querySelector('.tm-bottom-tray')?.getBoundingClientRect().height ?? 0,
  }));
  const results = [
    await resizePlayerRail(page, -900),
    await resizeActivityRail(page, 900),
  ];
  results.push(await resizeBottomTray(page, 900));
  const after = await page.evaluate(() => ({
    player: document.querySelector('.tm-player-rail')?.getBoundingClientRect().width ?? 0,
    activity: document.querySelector('.tm-activity-rail')?.getBoundingClientRect().width ?? 0,
    bottom: document.querySelector('.tm-bottom-tray')?.getBoundingClientRect().height ?? 0,
    identityWidth: document.querySelector('.tm-player-rail .player-info-name')?.getBoundingClientRect().width ?? 0,
  }));
  if (before.player - after.player < 90 || before.activity - after.activity < 100 || before.bottom - after.bottom < 70 || after.identityWidth < 80) {
    throw new Error(`Minimum resize ranges or player identity are unusable: ${JSON.stringify({before, after})}`);
  }
  return results.some(Boolean);
}

async function assertBoardUsableAtResizeExtremum(page, label) {
  const result = await page.evaluate(() => {
    const space = document.querySelector('#main_board .board-space-selectable');
    const box = space?.getBoundingClientRect();
    const expand = document.querySelector('.tm-board-expand-button');
    const pass = document.querySelector('.wf-command-pass-action');
    return {
      spaceWidth: box?.width ?? 0,
      spaceHeight: box?.height ?? 0,
      expandVisible: expand instanceof HTMLElement && expand.getBoundingClientRect().width > 0,
      passVisible: pass instanceof HTMLElement && pass.getBoundingClientRect().height > 0,
    };
  });
  if (result.spaceWidth < 14 || result.spaceHeight < 14 || !result.expandVisible || !result.passVisible) {
    throw new Error(`${label} made the board or current action unreachable: ${JSON.stringify(result)}`);
  }
}

async function resizePlayerRailToMaximum(page) {
  const before = await page.locator('.tm-player-rail').evaluate((element) => element.getBoundingClientRect().width);
  if (!await resizePlayerRail(page, 900)) return false;
  const after = await page.locator('.tm-player-rail').evaluate((element) => element.getBoundingClientRect().width);
  if (after - before < 110) throw new Error(`Player rail enlargement was only ${after - before}px`);
  await assertBoardUsableAtResizeExtremum(page, 'Maximum player rail');
  return true;
}

async function resizeActivityRailToMaximum(page) {
  const before = await page.locator('.tm-activity-rail').evaluate((element) => element.getBoundingClientRect().width);
  if (!await resizeActivityRail(page, -900)) return false;
  const after = await page.locator('.tm-activity-rail').evaluate((element) => element.getBoundingClientRect().width);
  if (after - before < 110) throw new Error(`Activity rail enlargement was only ${after - before}px`);
  await assertBoardUsableAtResizeExtremum(page, 'Maximum activity rail');
  return true;
}

async function resizeBottomTrayToMaximum(page) {
  const before = await page.locator('.tm-bottom-tray').evaluate((element) => element.getBoundingClientRect().height);
  if (!await resizeBottomTray(page, -900)) return false;
  const after = await page.locator('.tm-bottom-tray').evaluate((element) => element.getBoundingClientRect().height);
  if (after - before < 60) throw new Error(`Bottom tray enlargement was only ${after - before}px`);
  await assertBoardUsableAtResizeExtremum(page, 'Maximum bottom tray');
  return true;
}

async function showInputErrorDialog(page) {
  return await page.evaluate(() => {
    const dialog = document.querySelector('#alert-dialog');
    const title = document.querySelector('#alert-dialog-title');
    const message = document.querySelector('#alert-dialog-message');
    if (!(dialog instanceof HTMLDialogElement) || title === null || message === null) return false;
    title.textContent = 'Could not place greenery';
    message.textContent = 'That space is no longer available. Choose another glowing space and try again.';
    dialog.showModal();
    return dialog.open;
  });
}

function greeneryCount(model) {
  const color = model.thisPlayer.color;
  return model.game.spaces.filter((space) => space.tileType === TILE.GREENERY && space.color === color).length;
}

async function beginConvertPlantsPlacement(page) {
  const playerId = new URL(page.url()).searchParams.get('id');
  if (playerId === null) throw new Error('Convert plants test has no player id');
  const before = await getPlayer(playerId);
  if (before.thisPlayer.plants < 8) {
    throw new Error(`Convert plants fixture has only ${before.thisPlayer.plants} plants`);
  }
  if (!await selectAction(page, 'Convert .*plants')) {
    throw new Error('Convert plants action was not available in the ordinary action menu');
  }
  // SelectSpace has no painted inline body when nested in the command board;
  // its attached component owns the glowing map targets and confirmation.
  await page.locator('.select_space_cont').waitFor({state: 'attached', timeout: 5000});
  const selectedTitle = await page.locator('label.wf-command-tile--selected .wf-command-option-title').textContent();
  if (!/Convert 8 plants into greenery/i.test(selectedTitle ?? '')) {
    throw new Error(`Unexpected selected Convert plants action: ${JSON.stringify(selectedTitle)}`);
  }
  const target = page.locator('#main_board .board-space--available').first();
  await target.waitFor({state: 'visible', timeout: 5000});
  const targetBox = await target.boundingBox();
  const targetId = await target.getAttribute('data_space_id');
  if (targetBox === null || targetId === null) throw new Error('Convert plants target was not measurable');
  const center = {x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2};
  const topmost = await target.evaluate((targetElement, point) => {
    const element = document.elementFromPoint(point.x, point.y);
    const owningSpace = element?.closest?.('[data_space_id]');
    return {
      spaceId: owningSpace?.getAttribute('data_space_id') ?? null,
      targetOwnsPoint: element !== null &&
        (targetElement === element || targetElement.contains(element)),
    };
  }, center);
  if (!topmost.targetOwnsPoint || topmost.spaceId !== targetId) {
    throw new Error(`Convert plants target ${targetId} was intercepted: ${JSON.stringify(topmost)}`);
  }
  return {playerId, before, targetId, center};
}

async function prepareConvertPlants(page, stage) {
  const placement = await beginConvertPlantsPlacement(page);
  if (stage === 'targets') return true;

  if (stage === 'fallback') {
    await page.locator('.confirm-dialog').evaluate((dialog) => {
      dialog.showModal = undefined;
    });
  }
  const clickHandlerBefore = await page.locator(`#main_board [data_space_id="${placement.targetId}"]`).evaluate((space) => typeof space.onclick);
  await page.mouse.click(placement.center.x, placement.center.y);
  const confirmation = page.locator('.confirm-dialog:visible');
  try {
    await confirmation.waitFor({state: 'visible', timeout: 5000});
  } catch (error) {
    const spaceDiagnostic = await page.locator(`#main_board [data_space_id="${placement.targetId}"]`).evaluate((space) => ({
      classes: space.className,
      clickHandlerAfter: typeof space.onclick,
    }));
    const dialogDiagnostic = await page.locator('.confirm-dialog').evaluate((dialog) => {
      const box = dialog.getBoundingClientRect();
      const style = getComputedStyle(dialog);
      return {
        open: dialog.hasAttribute('open'),
        classes: dialog.className,
        box: {x: box.x, y: box.y, width: box.width, height: box.height},
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
      };
    });
    throw new Error(`Convert plants click did not open confirmation: ${JSON.stringify({clickHandlerBefore, spaceDiagnostic, dialogDiagnostic})}; ${String(error)}`);
  }
  if (stage === 'fallback') {
    if (!await confirmation.evaluate((dialog) => dialog.hasAttribute('open') && dialog.classList.contains('confirm-dialog--fallback-open'))) {
      throw new Error('Partial-dialog Convert plants confirmation did not use the visible in-app fallback');
    }
    return true;
  }

  const [inputResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/player/input') && response.request().method() === 'POST', {timeout: 10_000}),
    confirmation.getByRole('button', {name: /^Yes$/i}).click(),
  ]);
  if (!inputResponse.ok()) {
    throw new Error(`Convert plants input returned HTTP ${inputResponse.status()}`);
  }
  const deadline = Date.now() + 10_000;
  let after;
  while (Date.now() < deadline) {
    after = await getPlayer(placement.playerId);
    if (greeneryCount(after) === greeneryCount(placement.before) + 1) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (after === undefined ||
      after.thisPlayer.plants !== placement.before.thisPlayer.plants - 8 ||
      after.game.oxygenLevel !== placement.before.game.oxygenLevel + 1 ||
      greeneryCount(after) !== greeneryCount(placement.before) + 1 ||
      after.game.gameAge <= placement.before.game.gameAge) {
    throw new Error(`Convert plants did not commit expected engine state: ${JSON.stringify({
      before: {
        plants: placement.before.thisPlayer.plants,
        oxygen: placement.before.game.oxygenLevel,
        greenery: greeneryCount(placement.before),
        gameAge: placement.before.game.gameAge,
      },
      after: after === undefined ? null : {
        plants: after.thisPlayer.plants,
        oxygen: after.game.oxygenLevel,
        greenery: greeneryCount(after),
        gameAge: after.game.gameAge,
      },
    })}`);
  }
  await page.locator(`#main_board [data_space_id="${placement.targetId}"] .board-space-tile--greenery`).waitFor({state: 'visible', timeout: 5000});
  return true;
}

async function selectFirstVisibleCard(page) {
  return clickFirstMatching(page, [
    '.tm-action-workbench label.cardbox',
    '.tm-action-workbench .cardbox',
    '.tm-action-workbench .card',
    '.tm-card-gallery label.cardbox',
    '.tm-card-gallery .cardbox',
    '.tm-card-strip label.cardbox',
  ]);
}

async function verifyNeutralActionContract(page) {
  const selectedChoices = await page.locator('.tm-action-workbench .wf-command-radio:checked').count();
  const visibleDetails = await page.locator('.tm-action-workbench .wf-command-detail:visible').count();
  if (selectedChoices !== 0 || visibleDetails !== 0) {
    throw new Error(`neutral action contract failed: ${selectedChoices} selected choice(s), ${visibleDetails} visible detail region(s)`);
  }
  return true;
}

async function focusFirstActionChoice(page) {
  const choice = page.locator('.tm-action-workbench .wf-command-radio:not(:disabled)').first();
  if (await choice.count() === 0) return false;
  await choice.focus();
  await page.waitForTimeout(250);
  return true;
}

async function focusActionChoice(page, text) {
  const tile = await firstVisible(page.locator('.tm-action-workbench .wf-command-tile').filter({hasText: new RegExp(text, 'i')}));
  if (tile === undefined) return false;
  const choice = tile.locator('.wf-command-radio:not(:disabled)').first();
  if (await choice.count() === 0) return false;
  await choice.focus();
  await page.waitForTimeout(250);
  return true;
}

async function hoverActionChoice(page, text) {
  const tile = await firstVisible(page.locator('.tm-action-workbench .wf-command-tile').filter({hasText: new RegExp(text, 'i')}));
  if (tile === undefined) return false;
  await tile.hover();
  await page.waitForTimeout(250);
  return true;
}

async function openAndVerifyExclusiveModule(page, selectors) {
  if (!await openExtensionSummary(page, selectors)) return false;
  await page.waitForTimeout(250);
  const state = await page.evaluate(() => {
    const stage = document.querySelector('.tm-board-stage');
    const openPanels = stage?.querySelectorAll('details[open]').length ?? 0;
    const workbench = document.querySelector('.tm-action-workbench');
    const workbenchPointerEvents = workbench === null ? 'missing' : getComputedStyle(workbench).pointerEvents;
    return {openPanels, workbenchPointerEvents};
  });
  if (state.openPanels !== 1 || state.workbenchPointerEvents !== 'none') {
    throw new Error(`exclusive module contract failed: ${JSON.stringify(state)}`);
  }
  return true;
}

async function prepareCardsSearch(page, query) {
  if (!await openCardsOverlay(page)) return false;
  return fillFirstMatching(page, [
    '.tm-modal input[type="search"]',
    '.tm-modal input[placeholder*="Search" i]',
    '.tm-modal input[placeholder*="Filter" i]',
    '.tm-modal input.filter',
    '.tm-modal .cards-filter input',
    '.tm-card-desk input[type="search"]',
    '.tm-card-desk input[placeholder*="Search" i]',
    '.tm-card-desk input[placeholder*="Filter" i]',
  ], query);
}

async function prepareCardsFilter(page, label) {
  if (!await openCardsOverlay(page)) return false;
  return clickTextIfPresent(page, label, [
    '.tm-modal button',
    '.tm-modal label',
    '.tm-modal [role="button"]',
    '.tm-modal select option',
    '.tm-card-desk button',
    '.tm-card-desk label',
  ]);
}

async function hoverBoardSpace(page) {
  return hoverIfPresent(page, '.board-space, .board-space-selectable, .board-space-tile, .hex');
}

async function showVenusTrack(page, _seat, testCase) {
  const expectedByPatch = {
    'venus-zero': '0',
    'venus-mid': '16',
    'venus-max': '30',
  };
  const expected = expectedByPatch[testCase.fixturePatch];
  const marker = page.locator('.global-numbers-venus .val-is-active').first();
  if (await marker.count() !== 1 || !await marker.isVisible()) return false;
  const actual = (await marker.textContent())?.trim();
  if (expected !== undefined && actual !== expected) {
    throw new Error(`Expected visible Venus marker ${expected} for ${testCase.id}, got ${actual ?? 'missing'}`);
  }
  return true;
}

async function showAresHazards(page) {
  return hoverIfPresent(page, [
    '.board-space-tile--dust-storm-mild',
    '.board-space-tile--dust-storm-severe',
    '.board-space-tile--erosion-mild',
    '.board-space-tile--erosion-severe',
    '.global-ares-erosions-icon',
    '.global-ares-severe-erosions',
    '.global-ares-severe-dust-storms',
  ].join(', '));
}

async function showCeoCards(page) {
  if (!await openPlayersOverlay(page)) return false;
  const locator = page.locator('.tm-modal .tm-player-dossier-cards .cardbox').filter({hasText: /CEO|Asimov|Huan|Quill|Oscar|Shara/i}).first();
  return await locator.count() > 0;
}

async function openUnderworldSurface(page) {
  if (!await openExtensionSummary(page, ['.tm-extension-panel--underworld > summary', 'details:has-text("Underworld") > summary'])) return false;
  const panel = page.locator('.tm-extension-panel--underworld[open]').first();
  if (await panel.count() !== 1 || !await panel.isVisible()) return false;
  const tokenCount = await panel.locator('.underground-token-style--player-home').count();
  if (tokenCount < 2) {
    throw new Error(`Expected multiple claimed Underworld tokens in the open module panel, got ${tokenCount}`);
  }
  return true;
}

async function openExtensionSummary(page, selectors) {
  for (const selector of selectors) {
    if (await clickIfPresent(page, selector)) return true;
  }
  return false;
}

async function waitForEndgameShell(page) {
  await page.waitForSelector('#game-end, .game_end', {timeout: 10000});
  await page.waitForTimeout(500);
}

async function openEndgamePage(page, seat) {
  const isEndgame = await page.evaluate(() => location.pathname.includes('/the-end')).catch(() => false);
  if (!isEndgame) {
    await page.goto(pageURL(`/the-end?id=${seat.id}`), {waitUntil: navigationWaitUntil});
  }
  await waitForEndgameShell(page);
  return true;
}

async function scrollIntoViewIfPresent(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count() === 0) continue;
    await locator.evaluate((element) => element.scrollIntoView({block: 'center', inline: 'center'}));
    await page.waitForTimeout(350);
    return true;
  }
  return false;
}

async function showGlobalParameterFeedback(page) {
  const result = await page.locator('#player-home').evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    const queue = [app?._instance, app?._container?._vnode?.component].filter(Boolean);
    const visited = new Set();
    let playerHome;
    const enqueueVNodes = (value) => {
      if (value === null || value === undefined || typeof value !== 'object') return;
      if (value.component !== null && value.component !== undefined) queue.push(value.component);
      if (Array.isArray(value.children)) value.children.forEach(enqueueVNodes);
      if (value.suspense?.activeBranch !== undefined) enqueueVNodes(value.suspense.activeBranch);
    };
    while (queue.length > 0) {
      const component = queue.shift();
      if (component === undefined || component === null || visited.has(component)) continue;
      visited.add(component);
      if (typeof component.proxy?.applyActionFeedback === 'function') {
        playerHome = component.proxy;
        break;
      }
      enqueueVNodes(component.subTree);
    }
    if (typeof playerHome?.applyActionFeedback !== 'function') {
      return {
        applied: false,
        hasApp: app !== undefined,
        visited: visited.size,
      };
    }
    playerHome.applyActionFeedback({
      resources: [],
      globals: [
        {parameter: 'temperature', amount: 2},
        {parameter: 'oxygen', amount: 1},
        {parameter: 'oceans', amount: 1},
        {parameter: 'venus', amount: 2},
      ],
      spaces: [],
      colonies: [],
    });
    if (playerHome.feedbackClearTimer !== undefined) {
      window.clearTimeout(playerHome.feedbackClearTimer);
      playerHome.feedbackClearTimer = undefined;
    }
    return {applied: true};
  });
  if (!result.applied) {
    throw new Error(`Could not locate PlayerHome.applyActionFeedback from the table root: ${JSON.stringify(result)}`);
  }
  await page.waitForTimeout(500);
  const changes = page.locator('.tm-board-stage .tm-global-change:visible');
  if (await changes.count() !== 4) {
    throw new Error(`Expected four board-anchored global feedback badges, got ${await changes.count()}`);
  }
  if (await page.locator('.tm-action-spotlight .tm-action-delta--global:visible').count() !== 0) {
    throw new Error('Global feedback remained in the activity spotlight');
  }
  return true;
}

async function showPlayerResourceFeedback(page) {
  const result = await page.locator('#player-home').evaluate(() => {
    const beforeHeights = Array.from(document.querySelectorAll('.tm-player-rail .player-info')).map((element) => ({
      color: element.getAttribute('data-player-color'),
      height: element.getBoundingClientRect().height,
    }));
    const app = document.querySelector('#app')?.__vue_app__;
    const queue = [app?._instance, app?._container?._vnode?.component].filter(Boolean);
    const visited = new Set();
    let playerHome;
    const enqueueVNodes = (value) => {
      if (value === null || value === undefined || typeof value !== 'object') return;
      if (value.component !== null && value.component !== undefined) queue.push(value.component);
      if (Array.isArray(value.children)) value.children.forEach(enqueueVNodes);
      if (value.suspense?.activeBranch !== undefined) enqueueVNodes(value.suspense.activeBranch);
    };
    while (queue.length > 0) {
      const component = queue.shift();
      if (component === undefined || component === null || visited.has(component)) continue;
      visited.add(component);
      if (typeof component.proxy?.applyActionFeedback === 'function') {
        playerHome = component.proxy;
        break;
      }
      enqueueVNodes(component.subTree);
    }
    const player = playerHome?.playerView?.thisPlayer;
    const opponent = playerHome?.playerView?.players?.find((candidate) => candidate.color !== player?.color);
    if (typeof playerHome?.applyActionFeedback !== 'function' || player === undefined) {
      return {
        applied: false,
        hasApp: app !== undefined,
        hasPlayer: player !== undefined,
        visited: visited.size,
      };
    }
    playerHome.applyActionFeedback({
      resources: [
        {playerColor: player.color, playerName: player.name, resource: 'megacredits', amount: 3, production: 2},
        ...(opponent === undefined ? [] : [
          {playerColor: opponent.color, playerName: opponent.name, resource: 'plants', amount: 2, production: 1},
        ]),
      ],
      globals: [],
      spaces: [],
      colonies: [],
    });
    if (playerHome.feedbackClearTimer !== undefined) {
      window.clearTimeout(playerHome.feedbackClearTimer);
      playerHome.feedbackClearTimer = undefined;
    }
    return {applied: true, beforeHeights, expectedPlayers: opponent === undefined ? 1 : 2};
  });
  if (!result.applied) {
    throw new Error(`Could not inject player resource feedback: ${JSON.stringify(result)}`);
  }
  await page.waitForTimeout(500);

  const feedback = page.locator('.tm-player-rail .player-info .tm-resource-change-list:visible');
  if (await feedback.count() !== result.expectedPlayers) {
    throw new Error(`Expected feedback for ${result.expectedPlayers} changed players, got ${await feedback.count()}`);
  }
  if (await feedback.locator('.tm-resource-change-group').count() !== result.expectedPlayers) {
    throw new Error('Expected one changed resource in every affected player feedback line');
  }
  if (await feedback.locator('.tm-resource-change-production-box').count() !== result.expectedPlayers) {
    throw new Error('Expected a card-style production box in every affected player feedback line');
  }
  if (await page.locator('.resource_item .tm-resource-change-list, .resource_item .tm-resource-change-token').count() !== 0) {
    throw new Error('Resource feedback leaked back into an individual resource tile');
  }

  const afterHeights = await page.locator('.tm-player-rail .player-info').evaluateAll((elements) => elements.map((element) => ({
    color: element.getAttribute('data-player-color'),
    height: element.getBoundingClientRect().height,
  })));
  const changedHeight = result.beforeHeights.some((before) => {
    const after = afterHeights.find((entry) => entry.color === before.color);
    return after === undefined || Math.abs(after.height - before.height) > 1;
  });
  if (changedHeight) {
    throw new Error(`Player feedback changed rail row height: ${JSON.stringify({before: result.beforeHeights, after: afterHeights})}`);
  }

  const geometry = await page.locator('.player-info--self .player-info-details').evaluate((header) => {
    const name = header.querySelector('.player-info-name');
    const feedback = header.querySelector('.tm-resource-change-list')?.getBoundingClientRect();
    const button = header.querySelector('.tm-player-view-button')?.getBoundingClientRect();
    if (!(name instanceof HTMLElement) || feedback === undefined || button === undefined) return {valid: false};
    const nameBounds = name.getBoundingClientRect();
    return {
      valid: true,
      nameClipped: name.scrollWidth > name.clientWidth + 1,
      nameRight: nameBounds.right,
      nameTop: nameBounds.top,
      feedbackLeft: feedback.left,
      feedbackTop: feedback.top,
      feedbackRight: feedback.right,
      buttonLeft: button.left,
      headerRight: header.getBoundingClientRect().right,
    };
  });
  if (!geometry.valid ||
      geometry.nameClipped ||
      geometry.feedbackLeft < geometry.nameRight - 1 ||
      Math.abs(geometry.feedbackTop - geometry.nameTop) > 5 ||
      geometry.feedbackRight > geometry.buttonLeft + 1 ||
      geometry.feedbackRight > geometry.headerRight + 1) {
    throw new Error(`Player feedback clips the player name or escapes the identity/control row: ${JSON.stringify(geometry)}`);
  }
  return true;
}

const allCaptureDefinitions = [
  {name: 'research-offer-neutral', seat: 'active', prepare: async (page) => {
    const title = page.locator('.wf-component-title, .player_home_block--actions').filter({hasText: /research|select card\(s\) to buy/i}).first();
    if (await title.count() === 0) return false;
    const visibleCards = page.locator('.player_home_block--actions label.cardbox:visible, .wf-root label.cardbox:visible');
    const selectedCards = page.locator('.player_home_block--actions input:checked, .wf-root label.cardbox input:checked');
    if (await visibleCards.count() < 4 || await selectedCards.count() !== 0) {
      throw new Error(`Expected a neutral four-card research offer; found ${await visibleCards.count()} visible and ${await selectedCards.count()} selected`);
    }
    return true;
  }, reviewTags: ['research', 'neutral-selection', 'card-comparison']},
  {name: 'research-offer-hover', seat: 'active', prepare: (page) => hoverCardAndTrackScroll(
    page,
    '.player_home_block--actions label.tm-selectable-card > .card-container, .wf-root label.tm-selectable-card > .card-container',
    ['.player_home_block--actions .wf-component--select-card', '.wf-root .wf-component--select-card'],
    {initialScrollLeft: 0},
  ), reviewTags: ['research', 'card-hover', 'shared-selection', 'scroll-stability']},
  {name: 'research-offer-selected', seat: 'active', prepare: async (page) => {
    const title = page.locator('.wf-component-title, .player_home_block--actions').filter({hasText: /research|select card\(s\) to buy/i}).first();
    if (await title.count() === 0) return false;
    const cards = page.locator('.player_home_block--actions label.cardbox, .wf-root label.cardbox');
    let selected = 0;
    for (let index = 0; index < await cards.count() && selected < 2; index++) {
      const card = cards.nth(index);
      if (await card.isVisible().catch(() => false)) {
        await card.click();
        selected += 1;
      }
    }
    if (selected === 0) return false;
    const summary = page.locator('.wf-card-purchase-summary:visible').first();
    const commit = page.locator('.wf-component--select-card > .wf-component-actions .btn:visible').last();
    const [summaryBox, commitBox] = await Promise.all([summary.boundingBox(), commit.boundingBox()]);
    if (summaryBox === null || commitBox === null || Math.abs(summaryBox.height - commitBox.height) > 1) {
      throw new Error(`Research purchase controls do not share one height: ${JSON.stringify({summaryBox, commitBox})}`);
    }
    return true;
  }, reviewTags: ['research', 'partial-selection', 'cost-summary']},
  {name: 'table-active', seat: 'active', reviewTags: ['active-turn', 'table-layout', 'no-overlay']},
  {name: 'resize-handles-hover', seat: 'active', prepare: async (page) => {
    const selectors = [
      '.tm-layout-resize-handle--player:visible',
      '.tm-layout-resize-handle--activity:visible',
      '.tm-layout-resize-handle--bottom:visible',
    ];
    const table = page.locator('#player-home').first();
    const tableBefore = await table.boundingBox();
    for (const selector of selectors) {
      const handle = page.locator(selector).first();
      const box = await handle.boundingBox();
      if (box === null) throw new Error(`Required resize handle is not measurable: ${selector}`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(100);
      const background = await handle.evaluate((element) => getComputedStyle(element).backgroundColor);
      if (background !== 'rgba(0, 0, 0, 0)') {
        throw new Error(`Resize handle has a tinted hover background: ${selector}=${background}`);
      }
    }
    assertStableBounds('table while hovering resize handles', tableBefore, await table.boundingBox());
    return true;
  }, reviewTags: ['layout', 'resize-handles', 'hover', 'transparent-hit-area', 'stable-bounds']},
  {name: 'table-waiting', seat: 'waiting', reviewTags: ['waiting-turn', 'table-layout', 'opponent-active']},
  {name: 'waiting-card-hover', seat: 'waiting', prepare: (page) => hoverCardAndTrackScroll(
    page,
    '.tm-card-strip .cardbox > .card-container',
    ['.tm-card-desk', '.tm-card-strip'],
  ), reviewTags: ['waiting-turn', 'card-hover', 'scroll-stability', 'chromium']},
  {name: 'action-idle', seat: 'active', reviewTags: ['action-panel', 'active-idle']},
  {name: 'action-neutral-contract', seat: 'active', prepare: verifyNeutralActionContract, reviewTags: ['action-panel', 'neutral-selection', 'interaction-contract']},
  {name: 'action-keyboard-focus', seat: 'active', prepare: focusFirstActionChoice, reviewTags: ['action-panel', 'keyboard-focus', 'focus-visible', 'accessibility']},
  {name: 'action-colony-trade-keyboard-focus', seat: 'active', prepare: (page) => focusActionChoice(page, 'Trade with a colony tile'), reviewTags: ['action-panel', 'colony-trade', 'keyboard-focus', 'focus-visible', 'accessibility']},
  {name: 'action-colony-trade-hover', seat: 'active', prepare: (page) => hoverActionChoice(page, 'Trade with a colony tile'), reviewTags: ['action-panel', 'colony-trade', 'pointer-hover']},
  {name: 'action-blue-card', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Perform an action from a played card')) return false;
    await page.waitForTimeout(300);
    return true;
  }, reviewTags: ['action-selected', 'blue-action', 'nested-choice', 'production-choice']},
  {name: 'action-blue-card-hover', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Perform an action from a played card')) return false;
    return hoverCardAndTrackScroll(
      page,
      '.tm-action-workbench .wf-component--blue-card-action > label.tm-selectable-card > .card-container',
      ['.tm-action-workbench .wf-component--blue-card-action'],
      {initialScrollLeft: 0},
    );
  }, reviewTags: ['action-selected', 'blue-action', 'card-hover', 'shared-selection', 'scroll-stability']},
  {name: 'action-blue-card-selected', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Perform an action from a played card')) return false;
    if (!await selectFirstVisibleCard(page)) return false;
    return await page.locator('.tm-action-workbench .wf-component--blue-card-action > label.tm-selectable-card--selected:visible').count() === 1;
  }, reviewTags: ['action-selected', 'blue-action', 'card-selected', 'shared-selection']},
  {name: 'action-blue-card-choice', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Perform an action from a played card')) return false;
    if (!await selectFirstVisibleCard(page)) return false;
    if (!await clickButtonText(page, '.tm-action-workbench', 'use selected card action') &&
        !await clickButtonText(page, '.tm-action-workbench', 'take action')) return false;
    await page.waitForTimeout(500);
    return true;
  }, reviewTags: ['action-selected', 'blue-action', 'nested-choice', 'production-choice', 'confirm-placement']},
  {name: 'action-blue-card-choice-selected', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Perform an action from a played card')) return false;
    if (!await selectFirstVisibleCard(page)) return false;
    if (!await clickButtonText(page, '.tm-action-workbench', 'use selected card action') &&
        !await clickButtonText(page, '.tm-action-workbench', 'take action')) return false;
    await page.waitForTimeout(500);
    const choiceSpine = page.locator(
      '.tm-action-workbench > div:not(.tm-panel-heading) > .wf-root > .wf-options--command-board',
    ).first();
    const neutralBox = await choiceSpine.boundingBox();
    const firstChoice = await firstVisible(choiceSpine.locator('.wf-command-tile:not(.wf-command-tile--disabled)'));
    if (firstChoice === undefined) return false;
    await firstChoice.click();
    await page.waitForTimeout(300);
    const selectedBox = await choiceSpine.boundingBox();
    if (neutralBox === null || selectedBox === null) {
      throw new Error('Expected the nested production choice to remain measurable after selection');
    }
    if (Math.abs(neutralBox.width - selectedBox.width) > 1) {
      throw new Error(
        `Nested selection changed the decision-spine width from ${neutralBox.width}px to ${selectedBox.width}px`,
      );
    }
    return true;
  }, reviewTags: ['action-selected', 'blue-action', 'nested-choice', 'production-choice', 'selected-footprint']},
  {name: 'world-government-neutral', seat: 'active', prepare: async (page) => {
    const choiceSpine = page.locator(
      '.tm-action-workbench > div:not(.tm-panel-heading) > .wf-root > .wf-options--command-board',
    ).first();
    const titles = await choiceSpine.locator('.wf-command-option-title').allTextContents();
    const expected = ['Increase temperature', 'Increase oxygen', 'Add an ocean', 'Increase Venus scale'];
    if (titles.length !== expected.length || expected.some((title) => !titles.includes(title))) {
      throw new Error(`Expected exact World Government choices ${JSON.stringify(expected)}, got ${JSON.stringify(titles)}`);
    }
    if (await choiceSpine.locator('.wf-command-tile--selected').count() !== 0) {
      throw new Error('World Government neutral capture must not imply a selected option');
    }
    return true;
  }, reviewTags: ['world-government', 'mixed-choice-types', 'neutral-selection', 'stable-footprint']},
  {name: 'world-government-simple-selected', seat: 'active', prepare: async (page) => {
    const choiceSpine = page.locator(
      '.tm-action-workbench > div:not(.tm-panel-heading) > .wf-root > .wf-options--command-board',
    ).first();
    const neutralBounds = await choiceSpine.boundingBox();
    const choice = await firstVisible(choiceSpine.locator('.wf-command-tile').filter({hasText: /^Increase temperature$/}));
    if (choice === undefined) return false;
    await choice.click();
    await page.waitForTimeout(300);
    assertStableBounds('World Government simple selection spine', neutralBounds, await choiceSpine.boundingBox());
    if (await choiceSpine.locator('.wf-command-tile--selected').count() !== 1) {
      throw new Error('Expected one selected World Government parameter');
    }
    return true;
  }, reviewTags: ['world-government', 'select-option', 'selected-footprint', 'confirm-placement']},
  {name: 'world-government-ocean-selected', seat: 'active', prepare: async (page) => {
    const choiceSpine = page.locator(
      '.tm-action-workbench > div:not(.tm-panel-heading) > .wf-root > .wf-options--command-board',
    ).first();
    const neutralBounds = await choiceSpine.boundingBox();
    const choice = await firstVisible(choiceSpine.locator('.wf-command-tile').filter({hasText: /^Add an ocean$/}));
    if (choice === undefined) return false;
    await choice.click();
    await page.waitForTimeout(300);
    assertStableBounds('World Government ocean-targeting spine', neutralBounds, await choiceSpine.boundingBox());
    if (await choiceSpine.locator('.wf-command-tile--selected').count() !== 1 ||
        await choiceSpine.locator('.select_space_cont').count() !== 1) {
      throw new Error('Expected Add an ocean to remain selected with its map-target input active');
    }
    return true;
  }, reviewTags: ['world-government', 'select-space', 'ocean-targeting', 'selected-footprint']},
  {name: 'action-play-card-payment', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    const visibleCards = page.locator('.tm-action-workbench .tm-project-card-option:visible, .tm-action-workbench label.cardbox:visible');
    const count = await visibleCards.count();
    if (count < 3) throw new Error(`Expected at least three visible project-card options, got ${count}`);
    const selected = page.locator('.tm-action-workbench .tm-project-card-option--selected, .tm-action-workbench label.cardbox:has(input:checked)');
    if (await selected.count() !== 0) throw new Error('Project-card options case must begin with no selected card');
    return true;
  }, reviewTags: ['action-selected', 'play-card', 'payment', 'project-card-input', 'none-selected']},
  {name: 'action-play-card-hover', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    return hoverCardAndTrackScroll(
      page,
      '.tm-action-workbench .tm-project-card-option > .card-container',
      ['.tm-action-workbench .tm-project-card-chooser'],
      {initialScrollLeft: 0},
    );
  }, reviewTags: ['action-selected', 'play-card', 'card-hover', 'shared-selection', 'scroll-stability']},
  {name: 'action-play-card-card-selected', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    const chooser = page.locator('.tm-action-workbench .tm-project-card-chooser').first();
    const card = await firstVisible(chooser.locator('.tm-project-card-option'));
    if (card === undefined) return false;
    const beforeCard = await card.boundingBox();
    const beforeChooser = await chooser.boundingBox();
    const beforeScroll = await chooser.evaluate((element) => element.scrollLeft);
    await card.click();
    await page.waitForTimeout(300);
    assertStableBounds('selected project card', beforeCard, await card.boundingBox());
    const afterChooser = await chooser.boundingBox();
    if (beforeChooser === null || afterChooser === null ||
        Math.abs(beforeChooser.x - afterChooser.x) > 1 ||
        Math.abs(beforeChooser.y - afterChooser.y) > 1 ||
        await chooser.evaluate((element) => element.scrollLeft) !== beforeScroll) {
      throw new Error(`Project-card browser origin or scroll changed after selection: ${JSON.stringify({beforeChooser, afterChooser, beforeScroll})}`);
    }
    const payment = page.locator('.tm-project-payment-side:visible').first();
    const paymentBox = await payment.boundingBox();
    if (paymentBox === null || afterChooser.x + afterChooser.width > paymentBox.x + 1) {
      throw new Error(`Multi-card browser overlaps payment review: ${JSON.stringify({afterChooser, paymentBox})}`);
    }
    return true;
  }, reviewTags: ['action-selected', 'card-selected', 'payment', 'confirmation', 'stable-card-bounds', 'no-overlap']},
  {name: 'action-play-card-single-selected', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    const chooser = page.locator('.tm-action-workbench .tm-project-card-chooser--single').first();
    const card = await firstVisible(chooser.locator('.tm-project-card-option'));
    if (card === undefined) return false;
    const beforeCard = await card.boundingBox();
    const beforeChooser = await chooser.boundingBox();
    await card.click();
    await page.waitForTimeout(300);
    assertStableBounds('single selected project card', beforeCard, await card.boundingBox());
    assertStableBounds('single-card full-width browser', beforeChooser, await chooser.boundingBox());
    const paymentBox = await page.locator('.tm-project-payment-side:visible').first().boundingBox();
    const cardBox = await card.boundingBox();
    if (paymentBox === null || cardBox === null || cardBox.x + cardBox.width > paymentBox.x + 1) {
      throw new Error(`Single selected card overlaps payment review: ${JSON.stringify({cardBox, paymentBox})}`);
    }
    return true;
  }, reviewTags: ['action-selected', 'single-card', 'payment', 'stable-card-bounds', 'floating-review', 'no-overlap']},
  {name: 'action-play-card-payment-mixed-exact', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    if (!await selectFirstVisibleCard(page)) return false;
    const steelInput = page.locator('.tm-payment-form [data-test="steel"] .payments_input');
    const steelMinus = page.locator('.tm-payment-form [data-test="steel"] .btn-minus');
    if (await steelInput.count() !== 1 || Number(await steelInput.inputValue()) < 2 || await steelMinus.count() !== 1) return false;
    await steelMinus.click();
    const moneyInput = page.locator('.tm-payment-form [data-test="megacredits"] .payments_input');
    if (await moneyInput.count() !== 1) return false;
    const steel = Number(await steelInput.inputValue());
    const money = Number(await moneyInput.inputValue());
    const commit = page.getByRole('button', {name: /Play selected card/i});
    const inputAppearance = await steelInput.evaluate((element) => getComputedStyle(element).appearance);
    if (inputAppearance !== 'textfield') {
      throw new Error(`Payment input still exposes native number controls: appearance=${inputAppearance}`);
    }
    if (steel !== 1 || money !== 2 || await commit.count() !== 1 || await commit.isDisabled()) {
      throw new Error(`Expected exact mixed payment (1 steel + 2 M€), got steel=${steel}, M€=${money}`);
    }
    return true;
  }, reviewTags: ['action-selected', 'card-selected', 'payment-mixed-exact', 'commit-enabled']},
  {name: 'action-play-card-payment-partial', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    if (!await selectFirstVisibleCard(page)) return false;
    const inputs = page.locator('.tm-payment-resource-row .payments_input');
    for (let index = 0; index < await inputs.count(); index++) {
      const input = inputs.nth(index);
      if (Number(await input.inputValue()) > 0) {
        const minus = input.locator('xpath=ancestor::*[contains(@class, "tm-payment-resource-row")][1]').locator('.btn-minus');
        if (await minus.count() === 0) return false;
        await minus.click();
        const moneyMinus = page.locator('.tm-payment-form [data-test="megacredits"] .btn-minus');
        if (await moneyMinus.count() > 0 && Number(await page.locator('.tm-payment-form [data-test="megacredits"] .payments_input').inputValue()) > 0) {
          await moneyMinus.click();
        }
        const steel = Number(await page.locator('.tm-payment-form [data-test="steel"] .payments_input').inputValue());
        const money = Number(await page.locator('.tm-payment-form [data-test="megacredits"] .payments_input').inputValue());
        if (steel * 2 + money >= 4) {
          throw new Error(`Expected incomplete payment below 4 M€, got steel=${steel}, M€=${money}`);
        }
        return true;
      }
    }
    return false;
  }, reviewTags: ['action-selected', 'card-selected', 'payment-partial', 'commit-readiness']},
  {name: 'action-pass-direct', seat: 'active', prepare: async (page) => {
    const actionSpine = page.locator(
      '.tm-action-workbench > div:not(.tm-panel-heading) > .wf-root > .wf-options--command-board',
    ).first();
    const pass = actionSpine.locator(':scope > .wf-command-pass-action:visible');
    if (await pass.count() !== 1) return false;
    if (await actionSpine.locator('.wf-command-tile--pass, .wf-command-danger-submit').count() !== 0) {
      throw new Error('Pass still exposes a selectable tile or second confirmation control');
    }
    const spineBox = await actionSpine.boundingBox();
    const passBox = await pass.boundingBox();
    if (spineBox === null || passBox === null ||
        Math.abs((spineBox.y + spineBox.height) - (passBox.y + passBox.height)) > 8) {
      throw new Error(`Direct pass is not anchored to the bottom of the action spine: ${JSON.stringify({spineBox, passBox})}`);
    }
    return true;
  }, reviewTags: ['pass-action', 'direct-commit', 'destructive', 'bottom-anchored']},
  {name: 'action-with-overlay-open', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    return openLogOverlay(page);
  }, reviewTags: ['action-panel', 'overlay-open', 'log']},
  {name: 'action-fund-award', seat: 'active', prepare: (page) => selectAction(page, 'Fund an award'), reviewTags: ['fund-award', 'milestones-awards', 'action-selected']},
  {name: 'action-claim-milestone', seat: 'active', prepare: (page) => selectAction(page, 'Claim a milestone'), reviewTags: ['claim-milestone', 'milestones-awards', 'action-selected']},
  {name: 'action-trade-colony', seat: 'active', prepare: (page) => selectAction(page, 'Trade with a colony tile'), reviewTags: ['colony-trade', 'action-selected', 'extension-choice']},
  {name: 'action-trade-colony-ready', seat: 'active', prepare: async (page) => {
    const boardStage = page.locator('.tm-board-stage').first();
    const neutralBoardBox = await boardStage.boundingBox();
    if (!await selectAction(page, 'Trade with a colony tile')) return false;
    const paymentChoices = page.locator('.wf-command-detail .wf-command-radio');
    const paymentChoiceCount = await paymentChoices.count();
    if (paymentChoiceCount === 1) {
      if (!await paymentChoices.first().isChecked()) {
        throw new Error('sole colony trade payment prerequisite was not selected');
      }
    } else if (paymentChoiceCount > 1) {
      await paymentChoices.first().locator('xpath=..').click();
    }
    const colony = page.locator('.tm-colony-card-option').first();
    if (await colony.count() === 0) return false;
    await colony.click();
    const trade = page.getByRole('button', {name: /^Trade$/i});
    if (await trade.count() === 0 || await trade.isDisabled()) {
      throw new Error('colony trade did not become ready after selecting a colony');
    }
    const selectedBoardBox = await boardStage.boundingBox();
    if (neutralBoardBox === null || selectedBoardBox === null) {
      throw new Error('Expected the board stage to remain measurable while selecting a colony trade');
    }
    const boardMoved = ['x', 'y', 'width', 'height'].some(
      (property) => Math.abs(neutralBoardBox[property] - selectedBoardBox[property]) > 1,
    );
    if (boardMoved) {
      throw new Error(
        `Colony selection changed board bounds from ${JSON.stringify(neutralBoardBox)} to ${JSON.stringify(selectedBoardBox)}`,
      );
    }
    return true;
  }, reviewTags: ['colony-trade', 'payment-prerequisite', 'colony-selected', 'confirmation-ready']},
  {name: 'action-trade-colony-hover', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Trade with a colony tile')) return false;
    return hoverIfPresent(page, '.tm-colony-card-option');
  }, reviewTags: ['colony-trade', 'hover-focus', 'colony-card-zoom']},
  {name: 'action-standard-projects', seat: 'active', prepare: (page) => selectAction(page, 'Standard projects'), reviewTags: ['standard-projects', 'action-selected']},
  {name: 'action-standard-project-selected', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Standard projects')) return false;
    return selectFirstVisibleCard(page);
  }, reviewTags: ['standard-projects', 'project-selected', 'payment-review', 'specific-commit-verb']},
  {name: 'standard-project-hover', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Standard projects')) return false;
    return hoverCardAndTrackScroll(
      page,
      '.tm-project-card-option--standard > .card-container, .tm-project-card-option--standard .card-container',
      ['.tm-project-card-chooser', '.tm-action-workbench'],
      {initialScrollLeft: 0, requireStableBounds: true},
    );
  }, reviewTags: ['standard-projects', 'hover-focus', 'two-row-layout', 'scroll-stability']},
  {name: 'action-sell-patents', seat: 'active', prepare: (page) => selectAction(page, 'Sell patents'), reviewTags: ['sell-patents', 'card-selection', 'action-selected']},
  {name: 'action-sell-patents-selected', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Sell patents')) return false;
    if (!await selectFirstVisibleCard(page)) return false;
    return await page.locator('.tm-action-workbench label.tm-selectable-card--selected:visible').count() === 1;
  }, reviewTags: ['sell-patents', 'card-selected', 'shared-selection', 'selection-summary']},
  {name: 'milestones-awards-hover', seat: 'active', prepare: (page) => hoverIfPresent(page, '.tm-ma-panel-summary, .tm-ma-panel button, .milestone-award-inline'), reviewTags: ['milestones-awards', 'hover-focus', 'button-affordance']},
  {name: 'milestones-awards-open', seat: 'active', prepare: (page) => clickIfPresent(page, '.tm-ma-panel-summary') || clickTextIfPresent(page, 'Milestones'), reviewTags: ['milestones-awards', 'compact-open', 'claimed-funded-state']},
  {name: 'colonies-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-table-leaf--colonies > summary', '.tm-extension-panel--colonies > summary', 'details:has-text("Colonies") > summary']), reviewTags: ['colonies', 'compact-open', 'extension-panel']},
  {name: 'colonies-scrolled', seat: 'active', prepare: scrollColoniesWithWheel, reviewTags: ['colonies', 'horizontal-scroll', 'chrome-wheel', 'extension-panel']},
  {name: 'venus-track', seat: 'active', prepare: showVenusTrack, reviewTags: ['venus', 'global-parameter', 'venus-track']},
  {name: 'ares-hazards', seat: 'active', prepare: showAresHazards, reviewTags: ['ares', 'hazards', 'global-parameter']},
  {name: 'ceo-cards', seat: 'active', prepare: showCeoCards, reviewTags: ['ceos', 'cards', 'tableau', 'ceo-action-state']},
  {name: 'pathfinders-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-extension-panel--pathfinders > summary', 'details:has-text("Pathfinders") > summary']), reviewTags: ['pathfinders', 'planetary-tracks', 'extension-panel']},
  {name: 'pathfinders-scrolled', seat: 'active', prepare: async (page) => {
    const panel = page.locator('.tm-extension-panel--pathfinders').first();
    if (await panel.count() === 0) return false;
    const isOpen = await panel.evaluate((element) => element.hasAttribute('open'));
    if (!isOpen && !await openExtensionSummary(page, ['.tm-extension-panel--pathfinders > summary', 'details:has-text("Pathfinders") > summary'])) return false;
    return scrollSelector(page, '.tm-extension-panel--pathfinders[open] .tm-extension-panel-body--pathfinders');
  }, reviewTags: ['pathfinders', 'planetary-tracks', 'vertical-scroll', 'extension-panel']},
  {name: 'turmoil-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-extension-panel--turmoil > summary', 'details:has-text("Turmoil") > summary']), reviewTags: ['turmoil', 'delegates', 'global-events', 'extension-panel']},
  {name: 'module-exclusive-turmoil', seat: 'active', prepare: (page) => openAndVerifyExclusiveModule(page, ['.tm-extension-panel--turmoil > summary', 'details:has-text("Turmoil") > summary']), reviewTags: ['turmoil', 'exclusive-panel', 'masked-action', 'interaction-contract']},
  {name: 'moon-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-extension-panel--moon > summary', 'details:has-text("Moon") > summary']), reviewTags: ['moon', 'moon-board', 'moon-rates', 'extension-panel']},
  {name: 'underworld-open', seat: 'active', prepare: openUnderworldSurface, reviewTags: ['underworld', 'underground-tokens', 'corruption', 'board-tokens', 'player-tokens']},
  {name: 'delta-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-extension-panel--delta > summary', '.tm-extension-panel--deltaProject > summary', 'details:has-text("Delta") > summary']), reviewTags: ['delta-project', 'extension-panel']},
  {name: 'tools-open', seat: 'active', prepare: (page) => clickIfPresent(page, '.tm-utility-menu > summary'), reviewTags: ['tools-menu', 'utility-panel']},
  {name: 'activity-focus-browser', seat: 'active', prepare: async (page) => {
    await page.locator('.tm-action-spotlight-messages li').first().waitFor({state: 'visible', timeout: 5000});
    const fittedObject = page.locator('.tm-action-spotlight-object .log-panel-card > :is(.card-container, .colony-card):visible').first();
    if (await fittedObject.count() === 0) return true;
    const before = await fittedObject.boundingBox();
    if (before === null) throw new Error('Focus object is not measurable');
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.waitForTimeout(220);
    const after = await fittedObject.boundingBox();
    if (after === null ||
        ['x', 'y', 'width', 'height'].some((property) => Math.abs(before[property] - after[property]) > 1)) {
      throw new Error(`Focus object changed geometry on hover: ${JSON.stringify({before, after})}`);
    }
    return true;
  }, reviewTags: ['activity-focus', 'always-on-card-browser', 'latest-action', 'hover-stability']},
  {name: 'activity-focus-browser-scrolled', seat: 'active', prepare: async (page) => {
    await page.locator('.tm-action-spotlight-object').first().waitFor({state: 'visible', timeout: 5000});
    return scrollSelector(page, '.tm-action-spotlight-object', 'right');
  }, reviewTags: ['activity-focus', 'always-on-card-browser', 'horizontal-scroll']},
  {name: 'activity-focus-history', seat: 'active', prepare: (page) => clickTextIfPresent(page, 'History'), reviewTags: ['activity-focus', 'history', 'mode-switch']},
  {name: 'activity-scrolled', seat: 'active', prepare: async (page) => {
    await clickTextIfPresent(page, 'History');
    await page.waitForTimeout(180);
    return scrollSelector(page, '.tm-activity-rail .log-panel > .panel-body', 'bottom');
  }, reviewTags: ['log', 'compact-log', 'scrolled-list']},
  {name: 'player-rail-scrolled', seat: 'active', prepare: (page) => scrollSelector(page, '.tm-player-rail'), reviewTags: ['player-rail', 'scrolled-list', 'five-players']},
  {name: 'player-resource-feedback', seat: 'active', prepare: showPlayerResourceFeedback, reviewTags: ['player-rail', 'resource-feedback', 'production', 'placed-feedback']},
  {name: 'resized-layout', seat: 'active', prepare: resizeLayout, reviewTags: ['resizing', 'activity-rail', 'cards-tray', 'layout-mechanics']},
  {name: 'bottom-tray-enlarged', seat: 'active', prepare: (page) => resizeBottomTray(page, -120), reviewTags: ['cards-tray', 'resizing']},
  {name: 'bottom-tray-compressed', seat: 'active', prepare: (page) => resizeBottomTray(page, 140), reviewTags: ['board', 'cards-tray', 'resizing', 'action-panel']},
  {name: 'activity-rail-enlarged', seat: 'active', prepare: (page) => resizeActivityRail(page, -120), reviewTags: ['activity-rail', 'resizing', 'log']},
  {name: 'resized-layout-minimums', seat: 'active', prepare: resizeLayoutMinimums, reviewTags: ['resizing', 'minimum-desktop', 'board-space', 'layout-extrema']},
  {name: 'player-rail-enlarged', seat: 'active', prepare: resizePlayerRailToMaximum, reviewTags: ['player-rail', 'resizing', 'minimum-desktop', 'layout-extrema']},
  {name: 'activity-rail-enlarged-maximum', seat: 'active', prepare: resizeActivityRailToMaximum, reviewTags: ['activity-rail', 'resizing', 'minimum-desktop', 'layout-extrema']},
  {name: 'bottom-tray-enlarged-maximum', seat: 'active', prepare: resizeBottomTrayToMaximum, reviewTags: ['cards-tray', 'resizing', 'minimum-desktop', 'layout-extrema']},
  {name: 'activity-rail-collapsed', seat: 'active', prepare: async (page) => {
    const toggled = await clickIfPresent(page, '.tm-icon-control--activity-toggle');
    if (toggled) await page.waitForTimeout(300);
    return toggled;
  }, reviewTags: ['activity-rail', 'collapsed', 'toggle']},
  {name: 'board-space-hover', seat: 'active', prepare: hoverBoardSpace, reviewTags: ['board-interaction', 'hover-focus', 'space-detail']},
  {name: 'board-global-feedback', seat: 'active', prepare: showGlobalParameterFeedback, reviewTags: ['board', 'global-parameter', 'placed-feedback', 'temperature', 'oxygen', 'oceans', 'venus']},
  {name: 'input-error-dialog', seat: 'active', prepare: showInputErrorDialog, reviewTags: ['input-error', 'dialog', 'blocking-state', 'dismissal']},
  {name: 'action-convert-plants-targets', seat: 'active', prepare: (page) => prepareConvertPlants(page, 'targets'), reviewTags: ['convert-plants', 'space-input', 'center-hit-test', 'glowing-targets']},
  {name: 'action-convert-plants-confirmation-fallback', seat: 'active', prepare: (page) => prepareConvertPlants(page, 'fallback'), reviewTags: ['convert-plants', 'partial-dialog-support', 'confirmation', 'blocking-state']},
  {name: 'action-convert-plants-committed', seat: 'active', prepare: (page) => prepareConvertPlants(page, 'committed'), reviewTags: ['convert-plants', 'engine-commit', 'greenery', 'oxygen', 'plants']},
  {name: 'overlay-board', seat: 'active', prepare: openBoardOverlay, reviewTags: ['board', 'full-overlay', 'mars-map']},
  {name: 'overlay-board-ma-open', seat: 'active', prepare: async (page) => {
    if (!await openBoardOverlay(page)) return false;
    const summary = page.locator('.tm-modal .tm-ma-panel-summary:visible').first();
    if (await summary.count() > 0) {
      await summary.click();
      await page.waitForTimeout(300);
    }
    return true;
  }, reviewTags: ['board', 'full-overlay', 'milestones-awards']},
  {name: 'overlay-cards', seat: 'active', prepare: openCardsOverlay, reviewTags: ['cards', 'full-overlay', 'hand', 'tableau']},
  {name: 'overlay-cards-scrolled', seat: 'active', prepare: async (page) => {
    if (!await openCardsOverlay(page)) return false;
    return scrollSelector(page, '.tm-card-gallery', 'right');
  }, reviewTags: ['cards', 'full-overlay', 'scrolled-list', 'dense-tableau']},
  {name: 'overlay-cards-refresh-preserved', seat: 'waiting', prepare: refreshCardsOverlayAndTrackState, reviewTags: ['cards', 'full-overlay', 'refresh', 'state-preservation', 'scroll-stability', 'waiting-turn']},
  {name: 'cards-search-results', seat: 'active', prepare: (page) => prepareCardsSearch(page, 'Mars'), reviewTags: ['cards', 'search', 'search-results']},
  {name: 'cards-search-no-results', seat: 'active', prepare: (page) => prepareCardsSearch(page, 'zzzz-no-card'), reviewTags: ['cards', 'search', 'no-results-empty-state']},
  {name: 'cards-filter-playable', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Playable'), reviewTags: ['cards', 'filter-playable']},
  {name: 'cards-filter-affordable', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Affordable'), reviewTags: ['cards', 'filter-affordable']},
  {name: 'cards-filter-type', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Type'), reviewTags: ['cards', 'filter-type']},
  {name: 'cards-filter-tag', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Tag'), reviewTags: ['cards', 'filter-tag']},
  {name: 'cards-filter-warnings', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Warning'), reviewTags: ['cards', 'filter-warning']},
  {name: 'cards-sort-cost', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Cost'), reviewTags: ['cards', 'sort-cost']},
  {name: 'overlay-log', seat: 'active', prepare: openLogOverlay, reviewTags: ['log', 'full-overlay']},
  {name: 'overlay-log-scrolled', seat: 'active', prepare: async (page) => {
    if (!await openLogOverlay(page)) return false;
    return scrollSelector(page, '.tm-modal .log-panel > .panel-body');
  }, reviewTags: ['log', 'full-overlay', 'scrolled-list', 'dense-log']},
  {name: 'overlay-players', seat: 'active', prepare: openPlayersOverlay, reviewTags: ['players', 'full-overlay', 'player-dossier']},
  {name: 'overlay-player-opponent', seat: 'active', prepare: async (page) => {
    const buttons = page.locator('.tm-player-rail .tm-player-view-button');
    if (await buttons.count() === 0) return false;
    if (await page.locator('.tm-player-rail .points-per-tag').count() !== 0) {
      throw new Error('Compact player rail still exposes VP-per-tag detail');
    }
    await buttons.first().click();
    await page.waitForTimeout(400);
    const dossier = page.locator('.tm-player-dossier:visible').first();
    const modalBody = page.locator('.tm-modal--player .tm-modal-body:visible').first();
    const handle = page.locator('.tm-player-dossier-resize-handle:visible').first();
    const [dossierBox, modalBodyBox, handleBox] = await Promise.all([
      dossier.boundingBox(),
      modalBody.boundingBox(),
      handle.boundingBox(),
    ]);
    if (dossierBox === null || modalBodyBox === null || handleBox === null) {
      throw new Error('Player dossier, modal body, or cards/logs resize handle is not measurable');
    }
    const bottomInset = (modalBodyBox.y + modalBodyBox.height) - (dossierBox.y + dossierBox.height);
    if (bottomInset < 0 || bottomInset > 14) {
      throw new Error(`Player dossier does not fill the modal body: ${JSON.stringify({dossierBox, modalBodyBox})}`);
    }
    await handle.hover();
    const hoveredBackground = await handle.evaluate((element) => getComputedStyle(element).backgroundColor);
    if (hoveredBackground !== 'rgba(0, 0, 0, 0)') {
      throw new Error(`Dossier resize handle has a tinted hover background: ${hoveredBackground}`);
    }
    const log = page.locator('.tm-player-dossier-log:visible').first();
    const logBefore = await log.boundingBox();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    const logOnGrab = await log.boundingBox();
    if (logBefore === null || logOnGrab === null || Math.abs(logBefore.width - logOnGrab.width) > 1) {
      throw new Error(`Dossier split jumped on grab: ${JSON.stringify({logBefore, logOnGrab})}`);
    }
    await page.mouse.move(handleBox.x + handleBox.width / 2 - 32, handleBox.y + handleBox.height / 2, {steps: 4});
    await page.mouse.up();
    await page.waitForTimeout(120);
    const logAfter = await log.boundingBox();
    if (logAfter === null || logAfter.width < logBefore.width + 28) {
      throw new Error(`Dossier split did not resize continuously: ${JSON.stringify({logBefore, logAfter})}`);
    }
    const movedHandleBox = await handle.boundingBox();
    if (movedHandleBox === null) throw new Error('Dossier resize handle disappeared after resize');
    await page.mouse.move(movedHandleBox.x + movedHandleBox.width / 2, movedHandleBox.y + movedHandleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(movedHandleBox.x + movedHandleBox.width / 2 + 32, movedHandleBox.y + movedHandleBox.height / 2, {steps: 4});
    await page.mouse.up();
    await page.waitForTimeout(120);
    const scoringDetail = page.locator('.tm-player-dossier-summary .points-per-tag:visible');
    if (await scoringDetail.count() > 0) {
      const labels = await scoringDetail.allTextContents();
      if (labels.some((label) => !label.includes('VP'))) {
        throw new Error(`Dossier VP-per-tag detail is not explicitly labeled: ${JSON.stringify(labels)}`);
      }
    }
    return true;
  }, reviewTags: ['players', 'opponent-dossier', 'full-overlay', 'resizable-split', 'conditional-vp-detail']},
  {name: 'endgame-results', seat: 'active', prepare: openEndgamePage, reviewTags: ['endgame', 'vp-table', 'winner', 'score-breakdown']},
  {name: 'endgame-vp-details', seat: 'active', prepare: async (page, seat) => {
    await openEndgamePage(page, seat);
    return scrollIntoViewIfPresent(page, ['.game-end-flexrow', '.game-end-winer-scorebreak-player-title', '.game_end_victory_points']);
  }, reviewTags: ['endgame', 'vp-details', 'card-vp', 'module-scoring']},
  {name: 'endgame-charts', seat: 'active', prepare: async (page, seat) => {
    await openEndgamePage(page, seat);
    return scrollIntoViewIfPresent(page, ['#victory-point-chart', '#global-parameter-chart']);
  }, reviewTags: ['endgame', 'vp-chart', 'global-parameter-chart']},
  {name: 'endgame-final-board', seat: 'active', prepare: async (page, seat) => {
    await openEndgamePage(page, seat);
    return scrollIntoViewIfPresent(page, ['#main_board', '#moon_board', '.board-cont']);
  }, reviewTags: ['endgame', 'final-board', 'mars-map', 'moon-board']},
  {name: 'endgame-final-log', seat: 'active', prepare: async (page, seat) => {
    await openEndgamePage(page, seat);
    return scrollIntoViewIfPresent(page, ['.log-panel > .panel-body', '.log-panel', '.logpanel']);
  }, reviewTags: ['endgame', 'final-log', 'dense-log']},
];

const allCaptureDefinitionByName = new Map(allCaptureDefinitions.map((capture) => [capture.name, capture]));

function captureDefinitionsForTestCase(testCase) {
  const names = selectedCaptureNames.length === 0 ? testCase.captures : selectedCaptureNames;
  if (!Array.isArray(names) || names.length === 0) return allCaptureDefinitions;
  return names
    .map((name) => allCaptureDefinitionByName.get(name))
    .filter(Boolean);
}

async function captureShot(context, testCase, viewport, seats, capture, game) {
  const seat = seats[testCase.perspective] ?? seats[capture.seat] ?? seats.active;
  const page = await context.newPage();
  const diagnostics = bindPageDiagnostics(page);
  const result = {
    capture: capture.name,
    viewport: viewport.name,
    player: seat?.name,
    status: 'failed',
    reason: undefined,
    artifacts: undefined,
    diagnostics,
  };
  try {
    await page.goto(seat.href, {waitUntil: navigationWaitUntil});
    await waitForVisualShell(page);
    await page.waitForTimeout(visualSettleMs);
    if (capture.prepare !== undefined && await capture.prepare(page, seat, testCase, game) === false) {
      throw new Error(`Required preparation failed for "${capture.baseName ?? capture.name}"`);
    }
    const evidence = await captureEvidence(page, testCase, viewport, capture.name, diagnostics);
    result.status = 'captured';
    result.artifacts = evidence.artifacts;
    result.detailViewport = evidence.detailViewport;
    result.diagnostics = evidence.diagnostics;
    await closeModal(page);
  } catch (error) {
    result.reason = String(error);
    result.diagnostics = cloneDiagnostics(diagnostics);
  } finally {
    await page.close();
  }
  return result;
}

async function runCreateFormCase(browser, testCase) {
  const viewport = viewportsForTestCase(testCase)[0];
  const context = await browser.newContext({viewport, deviceScaleFactor: 1});
  const page = await context.newPage();
  const diagnostics = bindPageDiagnostics(page);
  try {
    await page.goto(pageURL('/new-game'), {waitUntil: 'networkidle'});
    await page.locator('label[for="4-radio"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.create-game-player-name').length === 4);
    for (const selector of ['#corporateEra-checkbox', '#prelude-checkbox', '#venusNext-checkbox', '#colonies-checkbox', '#turmoil-checkbox']) {
      const checkbox = page.locator(selector);
      if (await checkbox.count() !== 1) {
        throw new Error(`Required create-game option is missing: ${selector}`);
      }
      if (!await checkbox.isChecked()) {
        await checkbox.evaluate((element) => {
          element.checked = true;
          element.dispatchEvent(new Event('change', {bubbles: true}));
        });
      }
    }
    const createButton = page.getByRole('button', {name: 'Create game'});
    if (await createButton.count() !== 1) {
      throw new Error('Required Create game control is missing');
    }
    await createButton.scrollIntoViewIfNeeded();
    const evidence = await captureEvidence(page, testCase, viewport, 'create-heavy-options', diagnostics);
    return {
      id: testCase.id,
      suite: testCase.suite,
      area: testCase.area,
      purpose: testCase.purpose,
      playerTask: testCase.playerTask,
      expectedState: testCase.expectedState,
      interaction: testCase.interaction,
      invariants: testCase.invariants,
      source: testCase.source,
      viewport: testCase.viewport,
      inspectFor: testCase.inspectFor,
      uxLaws: testCase.uxLaws,
      gameId: null,
      players: [],
      fixturePatch: undefined,
      captures: [{...evidence, status: 'captured'}],
    };
  } finally {
    await context.close();
  }
}

async function runTestCase(browser, testCase) {
  if (testCase.id === 'golden/create/heavy-options') return runCreateFormCase(browser, testCase);

  const game = await createGame(testCase);
  const summary = {
    id: testCase.id,
    suite: testCase.suite,
    area: testCase.area,
    purpose: testCase.purpose,
    playerTask: testCase.playerTask,
    expectedState: testCase.expectedState,
    interaction: testCase.interaction,
    invariants: testCase.invariants,
    source: testCase.source,
    perspective: testCase.perspective,
    viewport: testCase.viewport,
    inspectFor: testCase.inspectFor,
    uxLaws: testCase.uxLaws,
    gameId: game.id,
    players: game.players.map((player) => ({name: player.name, id: player.id, href: player.href})),
    fixturePatch: testCase.fixturePatch === undefined ? undefined : {name: testCase.fixturePatch, result: undefined},
    setup: [],
    stabilization: [],
    captures: [],
    transitions: [],
  };

  if (testCase.captureSetup) {
    summary.setupFixture = await applyCanonicalSetupFixture(game);
    for (const viewport of viewportsForTestCase(testCase)) {
      const context = await browser.newContext({viewport, deviceScaleFactor: 1});
      summary.captures.push(...await captureSetup(context, testCase, game, viewport));
      await context.close();
    }
    return summary;
  }

  summary.setup = await completeInitialSetup(game, testCase);
  if (testCase.area === 'research') {
    summary.researchFixture = await applyCanonicalResearchDeck(game);
  }
  summary.stabilization = await stabilizePostSetup(game, testCase);
  if (testCase.fixturePatch !== undefined) {
    summary.fixturePatch.result = await applyFixturePatchIfNeeded(game, testCase);
  }
  if (testCase.captureStages.includes('post-setup')) {
    await captureStage(browser, testCase, summary, game, 'post-setup');
  }
  if (testCase.captureStages.includes('generation2')) {
    const advance = await advanceToGeneration(game, 2);
    const stabilization = await stabilizePostSetup(game, testCase);
    summary.transitions.push({name: 'advance-generation2', advance, stabilization});
    await captureStage(browser, testCase, summary, game, 'generation2');
  }
  if (testCase.captureStages.includes('world-government')) {
    const advance = await advanceToWorldGovernment(game);
    summary.transitions.push({name: 'advance-world-government', advance});
    await captureStage(browser, testCase, summary, game, 'world-government');
  }
  return summary;
}

async function captureStage(browser, testCase, summary, game, stageName) {
  const seats = await findSeats(game);
  const definitions = captureDefinitionsForTestCase(testCase);
  for (const viewport of viewportsForTestCase(testCase)) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1});
    for (const definition of definitions) {
      const capture = {...definition, baseName: definition.name, name: `${stageName}-${definition.name}`};
      summary.captures.push(await captureShot(context, testCase, viewport, seats, capture, game));
    }
    await context.close();
  }
}

function gitValue(args) {
  try {
    return execFileSync('git', args, {cwd: path.resolve('.'), encoding: 'utf8'}).trim();
  } catch {
    return null;
  }
}

async function collectProvenance() {
  const status = gitValue(['status', '--porcelain=v1', '--untracked-files=all']) ?? '';
  const trackedDiff = gitValue(['diff', '--binary', 'HEAD', '--']) ?? '';
  const untracked = [];
  for (const line of status.split('\n').filter((entry) => entry.startsWith('?? '))) {
    const relativePath = line.slice(3);
    try {
      const bytes = await fs.readFile(path.resolve(relativePath));
      untracked.push({path: relativePath, sha256: createHash('sha256').update(bytes).digest('hex')});
    } catch (error) {
      untracked.push({path: relativePath, error: String(error)});
    }
  }
  let localBuildTime = null;
  try {
    localBuildTime = (await fs.stat(path.resolve('build/styles.css'))).mtime.toISOString();
  } catch {
    // The target can be a dev server or a build from another worktree.
  }
  const dirtyClientSources = [];
  for (const line of status.split('\n').filter(Boolean)) {
    const relativePath = line.slice(3);
    if (!/^(src\/client\/|src\/styles\/)/.test(relativePath)) continue;
    try {
      dirtyClientSources.push({
        path: relativePath,
        modifiedAt: (await fs.stat(path.resolve(relativePath))).mtime.toISOString(),
      });
    } catch {
      // Deleted paths remain represented by git status.
    }
  }
  const newestDirtyClientSource = dirtyClientSources
    .map((entry) => entry.modifiedAt)
    .sort()
    .at(-1) ?? null;
  const runnerPath = new URL(import.meta.url).pathname;
  const runner = {
    path: runnerPath,
    sha256: await fileSha256(runnerPath),
    modifiedAt: (await fs.stat(runnerPath)).mtime.toISOString(),
  };
  const response = await fetch(pageURL('/'), {cache: 'no-store'});
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
    .map((match) => new URL(match[1], `${baseURL}/`).href);
  const assetHashes = [];
  for (const url of [...new Set(assets)]) {
    const assetResponse = await fetch(url, {cache: 'no-store'});
    const bytes = Buffer.from(await assetResponse.arrayBuffer());
    assetHashes.push({url, status: assetResponse.status, sha256: createHash('sha256').update(bytes).digest('hex')});
  }
  const serverPort = new URL(baseURL).port || null;
  let serverPid = process.env.TM_SERVER_PID ?? null;
  if (serverPid === null && serverPort !== null) {
    try {
      serverPid = execFileSync('lsof', ['-t', `-iTCP:${serverPort}`, '-sTCP:LISTEN'], {encoding: 'utf8'}).trim() || null;
    } catch {
      // PID discovery is best-effort; the served hashes still identify the target.
    }
  }
  return {
    commit: gitValue(['rev-parse', 'HEAD']),
    dirty: status.length > 0,
    dirtyTreeFingerprint: createHash('sha256')
      .update(JSON.stringify({status, trackedDiff, untracked}))
      .digest('hex'),
    untracked,
    worktree: gitValue(['rev-parse', '--show-toplevel']),
    baseURL,
    serverPid,
    serverPort,
    localBuildTime,
    sourceBuildAlignment: {
      status: localBuildTime === null ?
        'unknown' :
        (newestDirtyClientSource === null ?
          'local-build-present-no-dirty-client-sources' :
          (newestDirtyClientSource <= localBuildTime ? 'local-build-not-older-than-dirty-client-sources' : 'local-build-older-than-dirty-client-sources')),
      newestDirtyClientSource,
      dirtyClientSources,
    },
    runner,
    generatedAt: new Date().toISOString(),
    homeSha256: createHash('sha256').update(html).digest('hex'),
    assets: assetHashes,
  };
}

function selectTestCases(configured) {
  if (selectedTestCaseIds.length > 0) {
    const requested = new Set(selectedTestCaseIds);
    return configured.filter((testCase) => requested.has(testCase.id));
  }
  return configured.filter((testCase) => {
    const passMatches = selectedPass === 'all' || testCase.suite === selectedPass;
    const areaMatches = selectedAreas.length === 0 || selectedAreas.includes(testCase.area);
    return passMatches && areaMatches;
  });
}

function validateCatalog(configured) {
  const validPasses = new Set(['golden', 'detail', 'all']);
  if (!validPasses.has(selectedPass)) {
    throw new Error(`Unknown TM_TEST_PASS "${selectedPass}". Expected golden, detail, or all.`);
  }
  const ids = configured.map((testCase) => testCase.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) throw new Error(`Duplicate visual test case IDs: ${[...new Set(duplicateIds)].join(', ')}`);
  const knownIds = new Set(ids);
  const unknownIds = selectedTestCaseIds.filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) throw new Error(`Unknown TM_TEST_CASES: ${unknownIds.join(', ')}`);
  const knownAreas = new Set(configured.map((testCase) => testCase.area));
  const unknownAreas = selectedAreas.filter((area) => !knownAreas.has(area));
  if (unknownAreas.length > 0) throw new Error(`Unknown TM_TEST_AREAS: ${unknownAreas.join(', ')}`);
  const knownCaptures = new Set(allCaptureDefinitions.map((capture) => capture.name));
  const unknownSelectedCaptures = selectedCaptureNames.filter((capture) => !knownCaptures.has(capture));
  if (unknownSelectedCaptures.length > 0) throw new Error(`Unknown TM_CAPTURES: ${unknownSelectedCaptures.join(', ')}`);

  for (const testCase of configured) {
    const requiredStrings = ['id', 'suite', 'area', 'purpose', 'playerTask', 'expectedState', 'interaction'];
    for (const field of requiredStrings) {
      if (typeof testCase[field] !== 'string' || testCase[field].trim() === '') {
        throw new Error(`${testCase.id ?? 'Unnamed case'} is missing required string field "${field}"`);
      }
    }
    if (!['golden', 'detail'].includes(testCase.suite) || !testCase.id.startsWith(`${testCase.suite}/`)) {
      throw new Error(`${testCase.id} has an invalid suite/id pairing`);
    }
    if (!Array.isArray(testCase.invariants) || testCase.invariants.length === 0) {
      throw new Error(`${testCase.id} must declare at least one invariant`);
    }
    if (!Array.isArray(testCase.captures) || testCase.captures.length === 0) {
      throw new Error(`${testCase.id} must declare at least one capture`);
    }
    const special = testCase.captureSetup || testCase.id === 'golden/create/heavy-options';
    const unknownCaseCaptures = special ? [] : testCase.captures.filter((capture) => !knownCaptures.has(capture));
    if (unknownCaseCaptures.length > 0) {
      throw new Error(`${testCase.id} references unknown capture definitions: ${unknownCaseCaptures.join(', ')}`);
    }
    const viewportNames = Array.isArray(testCase.viewport) ? testCase.viewport : [testCase.viewport];
    const unknownViewports = viewportNames.filter((name) => viewportCatalog[name] === undefined);
    if (unknownViewports.length > 0) throw new Error(`${testCase.id} references unknown viewports: ${unknownViewports.join(', ')}`);
  }
}

async function fileSha256(file) {
  return createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

function operationalFailures(testCases) {
  return testCases.flatMap((testCase) => testCase.captures.flatMap((capture) => [
    ...(capture.status === 'failed' ? [{
      testCase: testCase.id,
      capture: capture.capture,
      reason: capture.reason,
    }] : []),
    ...(capture.diagnostics?.pageErrors ?? []).map((error) => ({
      testCase: testCase.id,
      capture: capture.capture,
      reason: `Browser page error: ${error}`,
    })),
    ...(capture.diagnostics?.consoleErrors ?? []).map((error) => ({
      testCase: testCase.id,
      capture: capture.capture,
      reason: `Browser console error: ${error}`,
    })),
  ]));
}

async function main() {
  const configured = await loadTestCaseConfig();
  validateCatalog(configured);
  if (process.env.TM_LIST_TEST_CASES === '1') {
    for (const testCase of configured) {
      console.log(`${testCase.id}\t${testCase.area}\t${testCase.purpose}`);
    }
    return;
  }
  await fs.mkdir(outputDir, {recursive: true});

  const testCases = selectTestCases(configured);
  if (testCases.length === 0) {
    throw new Error(`No visual test cases selected for pass "${selectedPass}" and areas "${selectedAreas.join(', ')}"`);
  }
  for (const testCase of testCases) {
    const special = testCase.captureSetup || testCase.id === 'golden/create/heavy-options';
    const unknown = special ? [] : testCase.captures.filter((capture) => !allCaptureDefinitionByName.has(capture));
    if (unknown.length > 0) throw new Error(`${testCase.id} references unknown capture definitions: ${unknown.join(', ')}`);
    if (special && selectedCaptureNames.length > 0) {
      throw new Error(`TM_CAPTURES override is not supported for special case ${testCase.id}`);
    }
  }

  const response = await fetch(pageURL('/'));
  if (!response.ok) throw new Error(`Cannot reach ${baseURL}; got ${response.status}`);
  const provenance = await collectProvenance();
  if (['unknown', 'local-build-older-than-dirty-client-sources'].includes(provenance.sourceBuildAlignment.status)) {
    throw new Error(`Local build identity is not usable: ${provenance.sourceBuildAlignment.status}`);
  }
  const results = [];

  for (const testCase of testCases) {
    let browser;
    try {
      browser = await chromium.launch({headless, slowMo});
      results.push(await runTestCase(browser, testCase));
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  const failures = operationalFailures(results);
  if (failures.length > 0) {
    throw new Error(`Visual capture failed:\n${failures.map((failure) => (
      `${failure.testCase}/${failure.capture}: ${failure.reason}`
    )).join('\n')}`);
  }
  const currentProvenance = await collectProvenance();
  const currentRunnerSha = await fileSha256(new URL(import.meta.url).pathname);
  if (
    provenance.runner.sha256 !== currentRunnerSha ||
    provenance.dirtyTreeFingerprint !== currentProvenance.dirtyTreeFingerprint
  ) {
    throw new Error('The visual runner or worktree changed during capture; discard these screenshots and run again.');
  }
  const nonPngFiles = (await fs.readdir(outputDir, {recursive: true, withFileTypes: true}))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() !== '.png')
    .map((entry) => entry.name);
  if (nonPngFiles.length > 0) {
    throw new Error(`Visual output directories may contain only PNG screenshots: ${nonPngFiles.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
