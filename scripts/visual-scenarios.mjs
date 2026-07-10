#!/usr/bin/env node

import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

const baseURL = (process.env.TM_BASE_URL ?? 'http://localhost:8081').replace(/\/$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(process.env.TM_VISUAL_OUT ?? `/tmp/tm-visual-scenarios-${stamp}`);
const headless = process.env.TM_HEADED !== '1';
const slowMo = Number.parseInt(process.env.TM_SLOWMO ?? '0', 10) || 0;
const navigationWaitUntil = process.env.TM_NAVIGATION_WAIT_UNTIL ?? 'domcontentloaded';
const visualSettleMs = Number.parseInt(process.env.TM_VISUAL_SETTLE_MS ?? '180', 10) || 0;
const optionalActionTimeoutMs = Number.parseInt(process.env.TM_OPTIONAL_ACTION_TIMEOUT_MS ?? '2500', 10) || 0;
const defaultProjectCardsToKeep = Number.parseInt(process.env.TM_SCENARIO_PROJECTS ?? '3', 10) || 0;
const printFullSummary = process.env.TM_PRINT_FULL_SUMMARY === '1';
const captureSetupScreens = process.env.TM_CAPTURE_SETUP !== '0';
const selectedScenarioNames = (process.env.TM_SCENARIOS ?? 'module-heavy-4p-no-turmoil')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const selectAllScenarios = selectedScenarioNames.includes('all');
const selectedShotNames = (process.env.TM_SHOTS ?? '')
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

const primaryExtensionShots = [
  'colonies-open',
  'colonies-selected',
  'venus-track',
  'ares-hazards',
  'pathfinders-open',
  'ceo-cards',
  'tools-open',
];

const coloniesVenusPathfindersShots = [
  'colonies-open',
  'colonies-selected',
  'venus-track',
  'pathfinders-open',
  'overlay-board',
  'overlay-players',
  'overlay-log',
];

const moonUnderworldDeltaShots = [
  'turmoil-open',
  'moon-open',
  'underworld-open',
  'delta-open',
  'overlay-board',
  'overlay-players',
  'overlay-log',
];

const SHOT_GROUPS = {
  core: [
    'table-active',
    'table-waiting',
    'waiting-card-hover',
    'action-idle',
    'action-play-card-payment',
    'action-play-card-card-selected',
    'action-standard-projects',
    'standard-project-hover',
    'action-fund-award',
    'action-claim-milestone',
    'milestones-awards-hover',
    'milestones-awards-open',
    'board-space-hover',
    'activity-scrolled',
    'overlay-log',
    'overlay-cards',
    'overlay-player-opponent',
  ],
  turnModes: [
    'table-active',
    'table-waiting',
    'waiting-card-hover',
    'action-idle',
    'action-pass-selected',
    'action-play-card-payment',
    'action-play-card-card-selected',
    'action-with-overlay-open',
    'activity-scrolled',
    'overlay-log',
    'overlay-log-scrolled',
  ],
  panels: [
    'table-active',
    'milestones-awards-hover',
    'milestones-awards-open',
    ...primaryExtensionShots,
    'overlay-board',
    'overlay-board-ma-open',
    'overlay-cards',
    'overlay-cards-scrolled',
    'overlay-cards-refresh-preserved',
    'overlay-log',
    'overlay-log-scrolled',
    'overlay-players',
    'overlay-player-opponent',
    'resized-layout',
    'bottom-tray-enlarged',
    'bottom-tray-compressed',
    'activity-rail-enlarged',
    'activity-rail-collapsed',
  ],
  cards: [
    'overlay-cards',
    'overlay-cards-scrolled',
    'overlay-cards-refresh-preserved',
    'cards-search-results',
    'cards-search-no-results',
    'cards-filter-playable',
    'cards-filter-affordable',
    'cards-filter-type',
    'cards-filter-tag',
    'cards-filter-warnings',
    'cards-sort-cost',
    'action-play-card-payment',
    'action-play-card-card-selected',
    'standard-project-hover',
  ],
  extensions: [
    ...primaryExtensionShots,
    'turmoil-open',
    ...moonUnderworldDeltaShots,
    ...coloniesVenusPathfindersShots,
  ],
  endgame: [
    'endgame-results',
    'endgame-vp-details',
    'endgame-charts',
    'endgame-final-board',
    'endgame-final-log',
  ],
};

function shots(...groups) {
  return [...new Set(groups.flatMap((group) => SHOT_GROUPS[group] ?? []))];
}

const builtInScenarios = [
  {
    name: 'base-action-core',
    description: 'Core turn loop fixture: active/waiting table states, project-card selection, payment, standard projects, milestones/awards, board hover, and compact/full log/card/player surfaces.',
    players: 2,
    projectCards: 8,
    expansions: defaultExpansions,
    advance: ['generation2'],
    visualPatch: 'core-action-density',
    shots: shots('core'),
    coverageTags: ['base', 'turn-active', 'turn-waiting', 'actions', 'payment', 'standard-projects', 'milestones-awards', 'board-interaction', 'log', 'cards', 'player-dossier'],
  },
  {
    name: 'action-choice-stack',
    description: 'Active-turn action-panel fixture for the stable command rail: blue card action, nested production choices, project-card play, colony trade, standard projects, sell patents, and pass.',
    players: 2,
    projectCards: 4,
    expansions: {
      ...defaultExpansions,
      promo: true,
      venus: true,
      colonies: true,
      prelude: true,
    },
    advance: ['generation2'],
    visualPatch: 'action-choice-density',
    shots: ['action-idle', 'action-blue-card', 'action-play-card-payment', 'action-play-card-card-selected', 'action-trade-colony', 'action-trade-colony-hover', 'action-standard-projects', 'standard-project-hover', 'action-sell-patents'],
    coverageTags: ['actions', 'command-rail', 'blue-action', 'nested-choice', 'project-card-input', 'colony-trade', 'standard-projects', 'sell-patents', 'button-placement'],
  },
  {
    name: 'ux-turn-modes',
    description: 'Same small legal game viewed through active, waiting, selected-action, post-action, pass-oriented, overlay-open, and log feedback states.',
    players: 2,
    projectCards: 8,
    expansions: defaultExpansions,
    advance: ['generation2'],
    visualPatch: 'turn-mode-density',
    shots: shots('turnModes'),
    coverageTags: ['ux-turn-modes', 'active-idle', 'active-selected', 'post-action-feedback', 'waiting-player', 'passed-player', 'confirmation', 'optional-skip', 'undo', 'log-feedback'],
  },
  {
    name: 'ux-panel-mechanics',
    description: 'Primary heavy preset focused on opening, expanding, resizing, and closing major surfaces without nested non-list scroll traps.',
    players: 4,
    projectCards: 8,
    expansions: moduleHeavyNoTurmoil,
    overrides: {
      includeFanMA: true,
      startingCorporations: 2,
      startingCeos: 3,
      startingPreludes: 4,
    },
    advance: ['generation2'],
    visualPatch: 'primary-heavy-density',
    shots: shots('panels'),
    coverageTags: ['panel-mechanics', 'overlay-mechanics', 'resizing', 'primary-heavy', 'colonies', 'venus', 'ares', 'pathfinders', 'ceos', 'player-rail', 'activity-rail', 'cards-tray'],
  },
  {
    name: 'ux-cards-filter-matrix',
    description: 'Dense hand/tableau fixture for hand, played-card review, search, filter, sort, disabled/unplayable cards, warnings, requirements, and card-resource stacks.',
    players: 4,
    projectCards: 10,
    expansions: moduleHeavyNoTurmoil,
    overrides: {
      includeFanMA: true,
      startingCorporations: 2,
      startingCeos: 3,
      startingPreludes: 4,
    },
    advance: ['generation2'],
    visualPatch: 'card-filter-density',
    shots: shots('cards'),
    coverageTags: ['cards', 'hand', 'tableau', 'card-search', 'card-filters', 'card-sort', 'playable-filter', 'affordable-filter', 'tag-filter', 'type-filter', 'card-resources', 'warnings'],
  },
  {
    name: 'primary-heavy-4p',
    description: 'Named version of the user primary preset with dense synthetic visual state for midgame UI coverage.',
    players: 4,
    projectCards: 8,
    expansions: moduleHeavyNoTurmoil,
    overrides: {
      includeFanMA: true,
      startingCorporations: 2,
      startingCeos: 3,
      startingPreludes: 4,
    },
    advance: ['generation2'],
    visualPatch: 'primary-heavy-density',
    shots: shots('core', 'panels', 'cards'),
    coverageTags: ['primary-heavy', 'corporate-era', 'promo', 'venus', 'colonies', 'prelude', 'prelude2', 'community', 'ares', 'pathfinders', 'ceos', 'dense-midgame'],
  },
  {
    name: 'module-heavy-4p-no-turmoil',
    description: 'Primary UX preset: Corporate Era, Promo, Venus, Colonies, Prelude 1/2, Community, Ares, Pathfinders, CEOs, no Turmoil, four players.',
    players: 4,
    projectCards: 6,
    expansions: moduleHeavyNoTurmoil,
    overrides: {
      includeFanMA: true,
      startingCorporations: 2,
      startingCeos: 3,
      startingPreludes: 4,
    },
    advance: ['generation2'],
    visualPatch: 'primary-heavy-density',
    shots: shots('core', 'panels'),
    coverageTags: ['primary-heavy', 'corporate-era', 'promo', 'venus', 'colonies', 'prelude', 'prelude2', 'community', 'ares', 'pathfinders', 'ceos'],
  },
  {
    name: 'primary-heavy-4p-with-turmoil',
    description: 'Primary heavy preset plus Turmoil to exercise delegate, party, event, influence, and policy surfaces alongside the main desktop layout.',
    players: 4,
    projectCards: 8,
    expansions: heavyWithTurmoil,
    overrides: {
      includeFanMA: true,
      startingCorporations: 2,
      startingCeos: 3,
      startingPreludes: 4,
      politicalAgendasExtension: 'Standard',
    },
    advance: ['generation2'],
    visualPatch: 'turmoil-density',
    shots: [...shots('core', 'panels'), 'turmoil-open'],
    coverageTags: ['primary-heavy', 'turmoil', 'delegates', 'parties', 'global-events', 'policy-action', 'influence', 'venus', 'colonies', 'ares', 'pathfinders', 'ceos'],
  },
  {
    name: 'global-all-modules-wide-density',
    description: 'Broad all-module desktop stress fixture: five players, dense cards/resources/logs, every major module enabled, and the full table/panel/card/extension shot set for wide-screen QA.',
    players: 5,
    projectCards: 10,
    expansions: allExpansions,
    overrides: {
      includeFanMA: true,
      startingCorporations: 2,
      startingCeos: 3,
      startingPreludes: 4,
      moonStandardProjectVariant: true,
      altVenusBoard: true,
      politicalAgendasExtension: 'Standard',
    },
    advance: ['generation2'],
    visualPatch: 'global-all-module-density',
    shots: shots('core', 'panels', 'cards', 'extensions'),
    coverageTags: ['global-stress', 'all-modules', 'wide-screen', 'five-players', 'primary-heavy', 'turmoil', 'moon', 'underworld', 'delta-project', 'venus', 'colonies', 'ares', 'pathfinders', 'ceos', 'cards', 'overlays', 'resizing'],
  },
  {
    name: 'base-2p-action',
    description: 'Small base game for tight action/payment/card checks.',
    players: 2,
    projectCards: 6,
    expansions: defaultExpansions,
    advance: ['generation2'],
    visualPatch: 'core-action-density',
    shots: shots('core'),
    coverageTags: ['base', 'actions', 'payment', 'cards', 'milestones-awards'],
  },
  {
    name: 'base-5p-rail',
    description: 'Five-player base game for player rail density and overview checks.',
    players: 5,
    projectCards: 2,
    expansions: defaultExpansions,
    visualPatch: 'five-player-density',
    shots: ['table-active', 'table-waiting', 'player-rail-scrolled', 'overlay-players', 'overlay-player-opponent', 'activity-scrolled'],
    coverageTags: ['five-players', 'player-rail', 'opponent-dossier', 'compact-overview', 'density'],
  },
  {
    name: 'colonies-venus-pathfinders-3p',
    description: 'Focused extension surface for colonies, Venus, Pathfinders tracks, tags, and global parameters.',
    players: 3,
    projectCards: 6,
    expansions: {
      ...defaultExpansions,
      promo: true,
      venus: true,
      colonies: true,
      prelude: true,
      pathfinders: true,
    },
    overrides: {includeFanMA: true},
    advance: ['generation2'],
    visualPatch: 'colonies-venus-pathfinders-density',
    shots: [...coloniesVenusPathfindersShots, ...shots('cards')],
    coverageTags: ['colonies', 'colony-tiles', 'visitor-ship', 'fleet', 'venus', 'floaters', 'pathfinders', 'planetary-tracks'],
  },
  {
    name: 'turmoil-moon-underworld-3p',
    description: 'Secondary extension stress case for modules not in the primary no-Turmoil preset.',
    players: 3,
    projectCards: 2,
    expansions: moonUnderworldDelta,
    overrides: {
      includeFanMA: true,
      moonStandardProjectVariant: true,
    },
    advance: ['generation2'],
    visualPatch: 'moon-underworld-delta-density',
    shots: [...moonUnderworldDeltaShots, 'milestones-awards-open', 'overlay-cards', 'overlay-player-opponent', 'resized-layout'],
    coverageTags: ['turmoil', 'moon', 'underworld', 'delta-project', 'corruption', 'underground-tokens', 'moon-rates', 'moon-board'],
  },
  {
    name: 'moon-underworld-delta',
    description: 'Focused module fixture for Moon, Underworld, Delta Project, and their player/endgame scoring data.',
    players: 3,
    projectCards: 6,
    expansions: moonUnderworldDelta,
    overrides: {
      includeFanMA: true,
      moonStandardProjectVariant: true,
    },
    advance: ['generation2'],
    visualPatch: 'moon-underworld-delta-density',
    shots: [...moonUnderworldDeltaShots, 'milestones-awards-open', 'overlay-cards', 'overlay-player-opponent', 'resized-layout'],
    coverageTags: ['moon', 'underworld', 'delta-project', 'moon-board', 'moon-rates', 'underground-tokens', 'claimed-tokens', 'corruption'],
  },
  {
    name: 'five-player-density',
    description: 'Five-player density fixture for compact player overview, opponent dossier, activity log, and award standings.',
    players: 5,
    projectCards: 6,
    expansions: {
      ...defaultExpansions,
      promo: true,
      prelude: true,
      venus: true,
      colonies: true,
    },
    overrides: {includeFanMA: true},
    advance: ['generation2'],
    visualPatch: 'five-player-density',
    shots: ['table-active', 'table-waiting', 'player-rail-scrolled', 'milestones-awards-open', 'overlay-players', 'overlay-player-opponent', 'overlay-log', 'activity-scrolled'],
    coverageTags: ['five-players', 'density', 'player-rail', 'opponent-dossier', 'milestones-awards', 'log'],
  },
  {
    name: 'board-variants-ma',
    description: 'Board variant and random/fan milestones-awards fixture for unfamiliar MA labels and alternate map layouts.',
    players: 3,
    projectCards: 4,
    board: 'hellas',
    expansions: {
      ...defaultExpansions,
      promo: true,
      prelude: true,
    },
    overrides: {
      includeFanMA: true,
      randomMA: 'Full random',
      shuffleMapOption: true,
    },
    advance: ['generation2'],
    visualPatch: 'board-variant-density',
    shots: ['table-active', 'milestones-awards-hover', 'milestones-awards-open', 'overlay-board', 'overlay-board-ma-open', 'board-space-hover'],
    coverageTags: ['board-variants', 'random-ma', 'fan-ma', 'shuffle-map', 'milestones-awards', 'board-interaction'],
  },
  {
    name: 'endgame-all-scoring',
    description: 'Synthetic visual-only game-end fixture with dense scoring categories, final board, final log, and module scoring surfaces.',
    players: 4,
    projectCards: 6,
    expansions: {
      ...allExpansions,
      starwars: true,
    },
    overrides: {
      includeFanMA: true,
      moonStandardProjectVariant: true,
      altVenusBoard: true,
      escapeVelocity: {
        thresholdMinutes: 0,
        bonusSectionsPerAction: 2,
        penaltyPeriodMinutes: 1,
        penaltyVPPerPeriod: 1,
      },
    },
    advance: ['generation2'],
    visualPatch: 'endgame-all-scoring',
    shots: shots('endgame'),
    coverageTags: ['endgame', 'vp-table', 'vp-chart', 'final-board', 'final-log', 'module-scoring', 'moon-scoring', 'pathfinders-scoring', 'underworld-negative-vp', 'escape-velocity'],
  },
];

const builtInScenarioByName = new Map(builtInScenarios.map((scenario) => [scenario.name, scenario]));
const defaultViewports = '1600x900,1440x900,1920x1080,1920x1200,2048x1536,2560x1440,3440x1440';

const viewports = (process.env.TM_VIEWPORTS ?? defaultViewports)
  .split(',')
  .map((item) => {
    const [width, height] = item.split('x').map((value) => Number.parseInt(value, 10));
    return {name: `${width}x${height}`, width, height};
  })
  .filter((viewport) => Number.isFinite(viewport.width) && Number.isFinite(viewport.height));

function pageURL(pathname) {
  return `${baseURL}${pathname}`;
}

async function loadScenarioConfig() {
  const configPath = process.env.TM_SCENARIO_CONFIG;
  if (configPath === undefined || configPath.trim() === '') {
    return builtInScenarios;
  }
  const raw = await fs.readFile(path.resolve(configPath), 'utf8');
  const config = JSON.parse(raw);
  if (!Array.isArray(config.scenarios)) {
    throw new Error('TM_SCENARIO_CONFIG must contain a top-level scenarios array.');
  }
  return config.scenarios.map(resolveConfiguredScenario);
}

function resolveConfiguredScenario(scenario) {
  const base = scenario.extends === undefined ? {} : builtInScenarioByName.get(scenario.extends);
  if (scenario.extends !== undefined && base === undefined) {
    throw new Error(`Unknown scenario extension "${scenario.extends}". Available: ${[...builtInScenarioByName.keys()].join(', ')}`);
  }
  return {
    ...base,
    ...scenario,
    expansions: {...defaultExpansions, ...(base.expansions ?? {}), ...(scenario.expansions ?? {})},
    overrides: {...(base.overrides ?? {}), ...(scenario.overrides ?? {})},
    advance: scenario.advance ?? base.advance ?? [],
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
  if (index === 0) return 'Scenario You';
  return `Scenario ${index + 1}`;
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
  const dense = Array.from({length: options.longLog ? 36 : 16}, (_, index) => visualLog(messages[index % messages.length], playerIds[index % playerIds.length], index));
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
    'Rad-Chem Factory',
    'Soil Factory',
    'Food Factory',
    'Neptunian Power Consultants',
    'Energy Tapping',
    'Micro-Mills',
    'Floating Refinery',
    'Methane From Titan',
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

function applyVisualPatch(serialized, patchName) {
  const endgame = patchName === 'endgame-all-scoring';
  const includePassed = patchName === 'turn-mode-density' || patchName === 'five-player-density' || endgame;
  serialized.name = `Visual Fixture - ${patchName}`;
  serialized.generation = Math.max(serialized.generation ?? 1, endgame ? 12 : 5);
  serialized.phase = endgame ? 'end' : 'action';
  serialized.undoCount = Math.max(serialized.undoCount ?? 0, 2);
  patchPlayersForDensity(serialized, {
    includePassed,
    handCount: patchName === 'card-filter-density' ? 18 : 12,
    playedCount: patchName === 'card-filter-density' || endgame ? 22 : 14,
  });
  patchBoardForDensity(serialized, {endgame, overwriteTiles: false});
  patchColoniesForDensity(serialized);
  patchMoonForDensity(serialized);
  patchPathfindersForDensity(serialized);
  patchAresForDensity(serialized);
  patchTurmoilForDensity(serialized);
  patchGameLogForDensity(serialized, {longLog: patchName !== 'core-action-density'});
  if (patchName === 'action-choice-density') {
    patchActionChoiceForDensity(serialized);
  }
  if (endgame) {
    serialized.passedPlayers = serialized.players.map((player) => player.id);
    serialized.donePlayers = serialized.players.map((player) => player.id);
    serialized.oxygenLevel = 14;
    serialized.temperature = 8;
    serialized.venusScaleLevel = 30;
  }
}

async function applyVisualPatchIfNeeded(game, scenario) {
  if (scenario.visualPatch === undefined) {
    return {applied: false, reason: 'scenario has no visualPatch'};
  }
  const result = await mutateSerializedGame(game.id, (serialized) => applyVisualPatch(serialized, scenario.visualPatch));
  return {...result, patch: scenario.visualPatch, visualOnly: true};
}

function newGameConfig(scenario) {
  return {
    players: Array.from({length: scenario.players}, (_, index) => ({
      name: playerName(index),
      color: colors[index],
      beginner: false,
      handicap: 0,
      first: index === 0,
    })),
    expansions: {...defaultExpansions, ...scenario.expansions},
    board: scenario.board ?? 'tharsis',
    seed: scenario.seed ?? 0.42,
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
    ...(scenario.overrides ?? {}),
  };
}

async function createGame(scenario) {
  const model = await fetchJson('/api/creategame', {
    method: 'POST',
    body: JSON.stringify(newGameConfig(scenario)),
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

function initialCardsResponse(input, scenario) {
  const projectCount = scenario.projectCards ?? defaultProjectCardsToKeep;
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
    throw new Error('initialCards requires scenario-aware response');
  case 'card':
    return selectCards(input, input.min);
  case 'projectCard': {
    const card = input.cards[0];
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
  case 'productionToLose':
    return {type: 'productionToLose', units: {...emptyUnits}};
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

async function captureSetup(context, scenario, game, viewport) {
  const setupCaptures = [];
  const player = game.players[0];
  const page = await context.newPage();
  const diagnostics = bindPageDiagnostics(page);
  try {
    await page.goto(player.href, {waitUntil: navigationWaitUntil});
    await waitForVisualShell(page);
    await page.waitForTimeout(visualSettleMs);
    setupCaptures.push(await screenshotWithMetrics(page, scenario, viewport, 'setup-initial', diagnostics));

    const corporation = page.locator('label.cardbox').filter({has: page.locator('.card-title.is-corporation')}).first();
    if (await corporation.count() > 0) {
      await corporation.click();
      await page.waitForTimeout(250);
      setupCaptures.push(await screenshotWithMetrics(page, scenario, viewport, 'setup-corporation-selected', diagnostics));
    }

    const setupPanel = page.locator('.player_home_block--setup').first();
    if (await setupPanel.count() > 0) {
      await setupPanel.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await page.waitForTimeout(150);
      setupCaptures.push(await screenshotWithMetrics(page, scenario, viewport, 'setup-scroll-bottom', diagnostics));
    }

    const boardAccordion = page.locator('.player_home_block--setup .board-accordion').first();
    if (await boardAccordion.count() > 0) {
      await boardAccordion.evaluate((element) => {
        element.open = true;
        element.scrollIntoView({block: 'start'});
      });
      await page.waitForTimeout(250);
      setupCaptures.push(await screenshotWithMetrics(page, scenario, viewport, 'setup-board-open', diagnostics));
    }
  } finally {
    await page.close();
  }
  return setupCaptures;
}

async function completeInitialSetup(game, scenario) {
  const setup = [];
  for (const player of game.players) {
    let model = await getPlayer(player.id);
    if (model.waitingFor?.type !== 'initialCards') {
      setup.push({player: player.name, skipped: true, waitingFor: model.waitingFor?.type});
      continue;
    }
    const input = initialCardsResponse(model.waitingFor, scenario);
    try {
      await postInput(player.id, input);
    } catch (error) {
      const fallback = initialCardsResponse(model.waitingFor, {...scenario, projectCards: 0});
      await postInput(player.id, fallback);
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

async function stabilizePostSetup(game, scenario) {
  const steps = [];
  for (let idx = 0; idx < 80; idx++) {
    let progressed = false;
    for (const player of game.players) {
      const model = await getPlayer(player.id);
      const waitingFor = model.waitingFor;
      if (waitingFor === undefined || isOrdinaryActionInput(waitingFor) || isResearchInput(waitingFor)) {
        continue;
      }
      const response = waitingFor.type === 'initialCards' ? initialCardsResponse(waitingFor, scenario) : responseFor(waitingFor, {preferPass: false});
      try {
        await postInput(player.id, response);
        steps.push({player: model.thisPlayer.name, input: waitingFor.type, title: titleText(waitingFor)});
        progressed = true;
      } catch (error) {
        steps.push({player: model.thisPlayer.name, input: waitingFor.type, title: titleText(waitingFor), error: String(error)});
      }
    }
    if (!progressed) break;
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
      steps.push({player: active.thisPlayer.name, input: active.waitingFor.type, title: titleText(active.waitingFor)});
    } catch (error) {
      steps.push({player: active.thisPlayer.name, input: active.waitingFor.type, title: titleText(active.waitingFor), error: String(error)});
      break;
    }
  }
  return steps;
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
      generation: state.game.generation,
      phase: state.game.phase,
      active: state.players.some((publicPlayer) => publicPlayer.name === state.thisPlayer.name && publicPlayer.isActive),
    });
  }
  const active = states.find((state) => state.active) ?? states[0];
  const waiting = states.find((state) => state.id !== active.id) ?? active;
  return {states, active, waiting};
}

function safeFilename(input) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const elementRect = (element) => {
      const r = element.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height)};
    };
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (element === null) return null;
      return elementRect(element);
    };
    const actionRoot = document.querySelector('.tm-action-workbench');
    const cardContentOverflows = actionRoot === null ? [] : [...actionRoot.querySelectorAll('.card-container .card-content:not(.global-event-card-content)')]
      .map((element, index) => {
        const card = element.closest('.card-container');
        const title = card?.querySelector('.card-title, .card-title-main')?.textContent?.trim().replace(/\s+/g, ' ') ?? `card ${index + 1}`;
        return {
          index,
          title,
          rect: elementRect(element),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
        };
      })
      .filter((item) => item.scrollWidth > item.clientWidth + 2 || item.scrollHeight > item.clientHeight + 2);
    const colonyChoiceClipping = actionRoot === null ? [] : [...actionRoot.querySelectorAll('.wf-component--select-card label.cardbox .colony-card')]
      .map((element, index) => {
        const label = element.closest('label.cardbox');
        const component = element.closest('.wf-component--select-card');
        const title = component?.querySelector('.wf-component-title');
        const labelRect = label === null ? null : label.getBoundingClientRect();
        const componentRect = component === null ? null : component.getBoundingClientRect();
        const titleRect = title === undefined || title === null ? null : title.getBoundingClientRect();
        const cardRect = element.getBoundingClientRect();
        const clippedByLabel = labelRect === null ? false : (
          cardRect.left < labelRect.left - 2 ||
          cardRect.top < labelRect.top - 2 ||
          cardRect.right > labelRect.right + 2 ||
          cardRect.bottom > labelRect.bottom + 2
        );
        const clippedByComponent = componentRect === null ? false : (
          cardRect.left < componentRect.left - 2 ||
          cardRect.top < componentRect.top - 2 ||
          cardRect.right > componentRect.right + 2 ||
          cardRect.bottom > componentRect.bottom + 2 ||
          (labelRect !== null && labelRect.bottom > componentRect.bottom + 2)
        );
        const overlapsTitle = titleRect === null ? false : cardRect.top < titleRect.bottom + 4;
        return {
          index,
          title: element.querySelector('.colony-card-title-span')?.textContent?.trim() ?? `colony ${index + 1}`,
          rect: elementRect(element),
          label: label === null ? null : elementRect(label),
          component: component === null ? null : elementRect(component),
          titleRect: titleRect === null ? null : elementRect(title),
          clippedByLabel,
          clippedByComponent,
          overlapsTitle,
        };
      })
      .filter((item) => item.clippedByLabel || item.clippedByComponent || item.overlapsTitle);
    const workflowActionClipping = actionRoot === null ? [] : [...actionRoot.querySelectorAll('.wf-command-detail .wf-action')]
      .map((element, index) => {
        const container = element.closest('.wf-command-detail') ?? actionRoot;
        const elementBounds = element.getBoundingClientRect();
        const containerBounds = container.getBoundingClientRect();
        const clippedByContainer = (
          elementBounds.left < containerBounds.left - 2 ||
          elementBounds.top < containerBounds.top - 2 ||
          elementBounds.right > containerBounds.right + 2 ||
          elementBounds.bottom > containerBounds.bottom + 2
        );
        return {
          index,
          title: element.textContent?.trim().replace(/\s+/g, ' ') || `workflow action ${index + 1}`,
          rect: elementRect(element),
          container: elementRect(container),
          clippedByContainer,
        };
      })
      .filter((item) => item.clippedByContainer);
    const scrollableSelectors = [
      '.tm-player-rail',
      '.tm-activity-rail .log-panel > .panel-body',
      '.tm-action-workbench',
      '.tm-card-desk',
      '.tm-card-strip',
      '.tm-card-gallery',
      '.tm-modal-body',
      '.player_home_colony_cont',
    ];
    const scrollables = scrollableSelectors.flatMap((selector) => {
      return [...document.querySelectorAll(selector)].map((element, index) => ({
        selector,
        index,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
      }));
    });
    return {
      url: location.href,
      title: document.title,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      visualShellStyled: getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        getComputedStyle(document.body).backgroundColor !== 'rgb(255, 255, 255)' &&
        document.querySelectorAll('link[rel="stylesheet"], style').length > 0,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      viewport: {width: window.innerWidth, height: window.innerHeight},
      shell: rect('#player-home, #game-end, .game_end'),
      gameEnd: rect('#game-end, .game_end'),
      boardStage: rect('.tm-board-stage'),
      board: rect('.board-cont'),
      actions: rect('.tm-action-workbench'),
      cards: rect('.tm-card-desk'),
      players: rect('.tm-player-rail'),
      activity: rect('.tm-activity-rail'),
      modal: rect('.tm-modal'),
      cardContentOverflows,
      colonyChoiceClipping,
      workflowActionClipping,
      scrollables,
      hoverScrollStability: globalThis.__tmVisualHoverScrollStability ?? null,
      statePreservation: globalThis.__tmVisualStatePreservation ?? null,
    };
  });
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

async function screenshotWithMetrics(page, scenario, viewport, shotName, diagnostics = {pageErrors: [], consoleErrors: []}) {
  const file = path.join(outputDir, `${safeFilename(scenario.name)}-${viewport.name}-${safeFilename(shotName)}.png`);
  await page.screenshot({path: file, fullPage: false});
  return {shot: shotName, viewport: viewport.name, file, metrics: await collectMetrics(page), diagnostics: cloneDiagnostics(diagnostics)};
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

async function hoverCardAndTrackScroll(page, targetSelector, scrollRootSelectors) {
  await page.evaluate((selectors) => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) continue;
      const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
      const maxLeft = Math.max(0, element.scrollWidth - element.clientWidth);
      if (maxTop > 0) element.scrollTop = Math.min(maxTop, 48);
      if (maxLeft > 0) element.scrollLeft = Math.min(maxLeft, 72);
    }
  }, scrollRootSelectors);
  await page.waitForTimeout(120);

  const target = await firstVisibleInViewport(page, page.locator(targetSelector));
  if (target === undefined) return false;

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

async function refreshCardsOverlayAndTrackState(page, _seat, _scenario, game) {
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
  return clickIfPresent(page, '.tm-activity-rail .tm-panel-icon-button');
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
  await locator.evaluate((element, dir) => {
    element.scrollTop = dir === 'top' ? 0 : element.scrollHeight;
    element.scrollLeft = dir === 'left' ? 0 : element.scrollWidth;
  }, direction);
  await page.waitForTimeout(200);
  return true;
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

async function showVenusTrack(page) {
  return hoverIfPresent(page, '.track-background-venus, .track-tag-venus, .venus-scale, .board-with-venus, .global-alt-venus, .venus-tile, .tag-venus');
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
  const hasTokens = async () => (await page.locator([
    '.player_home_block--underground-tokens',
    '.underground-token-wrapper--board',
    '.underground-token-style--board',
    '.underground-token-style--player-home',
    '.tag-underground-token-count',
    '.tag-corruption',
  ].join(', ')).count()) > 0;
  const before = await hasTokens();
  await clickIfPresent(page, '.tm-utility-menu > summary');
  return before || await hasTokens();
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

const allShotDefinitions = [
  {name: 'table-active', seat: 'active', coverageTags: ['active-turn', 'table-layout', 'no-overlay']},
  {name: 'table-waiting', seat: 'waiting', coverageTags: ['waiting-turn', 'table-layout', 'opponent-active']},
  {name: 'waiting-card-hover', seat: 'waiting', prepare: (page) => hoverCardAndTrackScroll(
    page,
    '.tm-card-strip .cardbox > .card-container',
    ['.tm-card-desk', '.tm-card-strip'],
  ), coverageTags: ['waiting-turn', 'card-hover', 'scroll-stability', 'chromium']},
  {name: 'action-idle', seat: 'active', coverageTags: ['action-panel', 'active-idle']},
  {name: 'action-blue-card', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Perform an action from a played card')) return false;
    await page.waitForTimeout(300);
    return true;
  }, coverageTags: ['action-selected', 'blue-action', 'nested-choice', 'production-choice']},
  {name: 'action-blue-card-choice', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Perform an action from a played card')) return false;
    if (!await selectFirstVisibleCard(page)) return false;
    if (!await clickButtonText(page, '.tm-action-workbench', 'take action')) return false;
    await page.waitForTimeout(500);
    return true;
  }, coverageTags: ['action-selected', 'blue-action', 'nested-choice', 'production-choice', 'confirm-placement']},
  {name: 'action-play-card-payment', seat: 'active', prepare: (page) => selectAction(page, 'Play project card'), coverageTags: ['action-selected', 'play-card', 'payment', 'project-card-input']},
  {name: 'action-play-card-card-selected', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    return selectFirstVisibleCard(page);
  }, coverageTags: ['action-selected', 'card-selected', 'payment', 'confirmation']},
  {name: 'action-pass-selected', seat: 'active', prepare: async (page) => {
    if (await selectAction(page, 'Pass for this generation')) return true;
    return clickTextIfPresent(page, 'Pass');
  }, coverageTags: ['pass-action', 'optional-skip']},
  {name: 'action-with-overlay-open', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Play project card')) return false;
    return openLogOverlay(page);
  }, coverageTags: ['action-panel', 'overlay-open', 'log']},
  {name: 'action-fund-award', seat: 'active', prepare: (page) => selectAction(page, 'Fund an award'), coverageTags: ['fund-award', 'milestones-awards', 'action-selected']},
  {name: 'action-claim-milestone', seat: 'active', prepare: (page) => selectAction(page, 'Claim a milestone'), coverageTags: ['claim-milestone', 'milestones-awards', 'action-selected']},
  {name: 'action-trade-colony', seat: 'active', prepare: (page) => selectAction(page, 'Trade with a colony tile'), coverageTags: ['colony-trade', 'action-selected', 'extension-choice']},
  {name: 'action-trade-colony-hover', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Trade with a colony tile')) return false;
    return hoverIfPresent(page, '.tm-colony-card-option');
  }, coverageTags: ['colony-trade', 'hover-focus', 'colony-card-zoom']},
  {name: 'action-standard-projects', seat: 'active', prepare: (page) => selectAction(page, 'Standard projects'), coverageTags: ['standard-projects', 'action-selected']},
  {name: 'standard-project-hover', seat: 'active', prepare: async (page) => {
    if (!await selectAction(page, 'Standard projects')) return false;
    return hoverCardAndTrackScroll(
      page,
      '.tm-project-card-option--standard > .card-container, .tm-project-card-option--standard .card-container',
      ['.tm-project-card-chooser', '.tm-action-workbench'],
    );
  }, coverageTags: ['standard-projects', 'hover-focus', 'two-row-layout', 'scroll-stability']},
  {name: 'action-sell-patents', seat: 'active', prepare: (page) => selectAction(page, 'Sell patents'), coverageTags: ['sell-patents', 'card-selection', 'action-selected']},
  {name: 'milestones-awards-hover', seat: 'active', prepare: (page) => hoverIfPresent(page, '.tm-ma-panel-summary, .tm-ma-panel button, .milestone-award-inline'), coverageTags: ['milestones-awards', 'hover-focus', 'button-affordance']},
  {name: 'milestones-awards-open', seat: 'active', prepare: (page) => clickIfPresent(page, '.tm-ma-panel-summary') || clickTextIfPresent(page, 'Milestones'), coverageTags: ['milestones-awards', 'compact-open', 'claimed-funded-state']},
  {name: 'colonies-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-table-leaf--colonies > summary', '.tm-extension-panel--colonies > summary', 'details:has-text("Colonies") > summary']), coverageTags: ['colonies', 'compact-open', 'extension-panel']},
  {name: 'colonies-selected', seat: 'active', prepare: async (page) => {
    const opened = await openExtensionSummary(page, ['.tm-table-leaf--colonies > summary', '.tm-extension-panel--colonies > summary', 'details:has-text("Colonies") > summary']);
    if (!opened) return false;
    await clickFirstMatching(page, ['.player_home_colony', '.colony-tile', '.colony', '.tm-extension-panel--colonies button']);
    return true;
  }, coverageTags: ['colonies', 'selected-colony', 'visitor-ship', 'colony-track']},
  {name: 'venus-track', seat: 'active', prepare: showVenusTrack, coverageTags: ['venus', 'global-parameter', 'venus-track']},
  {name: 'ares-hazards', seat: 'active', prepare: showAresHazards, coverageTags: ['ares', 'hazards', 'global-parameter']},
  {name: 'ceo-cards', seat: 'active', prepare: showCeoCards, coverageTags: ['ceos', 'cards', 'tableau', 'ceo-action-state']},
  {name: 'pathfinders-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-extension-panel--pathfinders > summary', 'details:has-text("Pathfinders") > summary']), coverageTags: ['pathfinders', 'planetary-tracks', 'extension-panel']},
  {name: 'turmoil-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-extension-panel--turmoil > summary', 'details:has-text("Turmoil") > summary']), coverageTags: ['turmoil', 'delegates', 'global-events', 'extension-panel']},
  {name: 'moon-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-extension-panel--moon > summary', 'details:has-text("Moon") > summary']), coverageTags: ['moon', 'moon-board', 'moon-rates', 'extension-panel']},
  {name: 'underworld-open', seat: 'active', prepare: openUnderworldSurface, coverageTags: ['underworld', 'underground-tokens', 'corruption', 'board-tokens', 'player-tokens']},
  {name: 'delta-open', seat: 'active', prepare: (page) => openExtensionSummary(page, ['.tm-extension-panel--delta > summary', '.tm-extension-panel--deltaProject > summary', 'details:has-text("Delta") > summary']), coverageTags: ['delta-project', 'extension-panel']},
  {name: 'tools-open', seat: 'active', prepare: (page) => clickIfPresent(page, '.tm-utility-menu > summary'), coverageTags: ['tools-menu', 'utility-panel']},
  {name: 'activity-scrolled', seat: 'active', prepare: (page) => scrollSelector(page, '.tm-activity-rail .log-panel > .panel-body'), coverageTags: ['log', 'compact-log', 'scrolled-list']},
  {name: 'player-rail-scrolled', seat: 'active', prepare: (page) => scrollSelector(page, '.tm-player-rail'), coverageTags: ['player-rail', 'scrolled-list', 'five-players']},
  {name: 'resized-layout', seat: 'active', prepare: resizeLayout, coverageTags: ['resizing', 'activity-rail', 'cards-tray', 'layout-mechanics']},
  {name: 'bottom-tray-enlarged', seat: 'active', prepare: (page) => resizeBottomTray(page, -120), coverageTags: ['cards-tray', 'resizing']},
  {name: 'bottom-tray-compressed', seat: 'active', prepare: (page) => resizeBottomTray(page, 140), coverageTags: ['board', 'cards-tray', 'resizing', 'action-panel']},
  {name: 'activity-rail-enlarged', seat: 'active', prepare: (page) => resizeActivityRail(page, -120), coverageTags: ['activity-rail', 'resizing', 'log']},
  {name: 'activity-rail-collapsed', seat: 'active', prepare: async (page) => {
    const toggled = await clickIfPresent(page, '.tm-icon-control--activity-toggle');
    if (toggled) await page.waitForTimeout(300);
    return toggled;
  }, coverageTags: ['activity-rail', 'collapsed', 'toggle']},
  {name: 'board-space-hover', seat: 'active', prepare: hoverBoardSpace, coverageTags: ['board-interaction', 'hover-focus', 'space-detail']},
  {name: 'overlay-board', seat: 'active', prepare: openBoardOverlay, coverageTags: ['board', 'full-overlay', 'mars-map']},
  {name: 'overlay-board-ma-open', seat: 'active', prepare: async (page) => {
    if (!await openBoardOverlay(page)) return false;
    const summary = page.locator('.tm-modal .tm-ma-panel-summary:visible').first();
    if (await summary.count() > 0) {
      await summary.click();
      await page.waitForTimeout(300);
    }
    return true;
  }, coverageTags: ['board', 'full-overlay', 'milestones-awards']},
  {name: 'overlay-cards', seat: 'active', prepare: openCardsOverlay, coverageTags: ['cards', 'full-overlay', 'hand', 'tableau']},
  {name: 'overlay-cards-scrolled', seat: 'active', prepare: async (page) => {
    if (!await openCardsOverlay(page)) return false;
    return scrollSelector(page, '.tm-card-gallery', 'right');
  }, coverageTags: ['cards', 'full-overlay', 'scrolled-list', 'dense-tableau']},
  {name: 'overlay-cards-refresh-preserved', seat: 'waiting', prepare: refreshCardsOverlayAndTrackState, coverageTags: ['cards', 'full-overlay', 'refresh', 'state-preservation', 'scroll-stability', 'waiting-turn']},
  {name: 'cards-search-results', seat: 'active', prepare: (page) => prepareCardsSearch(page, 'Mars'), coverageTags: ['cards', 'search', 'search-results']},
  {name: 'cards-search-no-results', seat: 'active', prepare: (page) => prepareCardsSearch(page, 'zzzz-no-card'), coverageTags: ['cards', 'search', 'no-results-empty-state']},
  {name: 'cards-filter-playable', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Playable'), coverageTags: ['cards', 'filter-playable']},
  {name: 'cards-filter-affordable', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Affordable'), coverageTags: ['cards', 'filter-affordable']},
  {name: 'cards-filter-type', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Type'), coverageTags: ['cards', 'filter-type']},
  {name: 'cards-filter-tag', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Tag'), coverageTags: ['cards', 'filter-tag']},
  {name: 'cards-filter-warnings', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Warning'), coverageTags: ['cards', 'filter-warning']},
  {name: 'cards-sort-cost', seat: 'active', prepare: (page) => prepareCardsFilter(page, 'Cost'), coverageTags: ['cards', 'sort-cost']},
  {name: 'overlay-log', seat: 'active', prepare: openLogOverlay, coverageTags: ['log', 'full-overlay']},
  {name: 'overlay-log-scrolled', seat: 'active', prepare: async (page) => {
    if (!await openLogOverlay(page)) return false;
    return scrollSelector(page, '.tm-modal .log-panel > .panel-body');
  }, coverageTags: ['log', 'full-overlay', 'scrolled-list', 'dense-log']},
  {name: 'overlay-players', seat: 'active', prepare: openPlayersOverlay, coverageTags: ['players', 'full-overlay', 'player-dossier']},
  {name: 'overlay-player-opponent', seat: 'active', prepare: async (page) => {
    const buttons = page.locator('.tm-player-rail .tm-player-view-button');
    if (await buttons.count() === 0) return false;
    await buttons.first().click();
    await page.waitForTimeout(400);
    return true;
  }, coverageTags: ['players', 'opponent-dossier', 'full-overlay']},
  {name: 'endgame-results', seat: 'active', prepare: openEndgamePage, coverageTags: ['endgame', 'vp-table', 'winner', 'score-breakdown']},
  {name: 'endgame-vp-details', seat: 'active', prepare: async (page, seat) => {
    await openEndgamePage(page, seat);
    return scrollIntoViewIfPresent(page, ['.game-end-flexrow', '.game-end-winer-scorebreak-player-title', '.game_end_victory_points']);
  }, coverageTags: ['endgame', 'vp-details', 'card-vp', 'module-scoring']},
  {name: 'endgame-charts', seat: 'active', prepare: async (page, seat) => {
    await openEndgamePage(page, seat);
    return scrollIntoViewIfPresent(page, ['#victory-point-chart', '#global-parameter-chart']);
  }, coverageTags: ['endgame', 'vp-chart', 'global-parameter-chart']},
  {name: 'endgame-final-board', seat: 'active', prepare: async (page, seat) => {
    await openEndgamePage(page, seat);
    return scrollIntoViewIfPresent(page, ['#main_board', '#moon_board', '.board-cont']);
  }, coverageTags: ['endgame', 'final-board', 'mars-map', 'moon-board']},
  {name: 'endgame-final-log', seat: 'active', prepare: async (page, seat) => {
    await openEndgamePage(page, seat);
    return scrollIntoViewIfPresent(page, ['.log-panel > .panel-body', '.log-panel', '.logpanel']);
  }, coverageTags: ['endgame', 'final-log', 'dense-log']},
];

const allShotDefinitionByName = new Map(allShotDefinitions.map((shot) => [shot.name, shot]));

function shotDefinitionsForScenario(scenario) {
  const names = selectedShotNames.length === 0 ? scenario.shots : selectedShotNames;
  if (!Array.isArray(names) || names.length === 0) return allShotDefinitions;
  return names
    .map((name) => allShotDefinitionByName.get(name))
    .filter(Boolean);
}

async function captureShot(context, scenario, viewport, seats, shot, game) {
  const seat = seats[shot.seat] ?? seats.active;
  const page = await context.newPage();
  const diagnostics = bindPageDiagnostics(page);
  const result = {
    shot: shot.name,
    viewport: viewport.name,
    player: seat?.name,
    skipped: false,
    reason: undefined,
    file: undefined,
    metrics: undefined,
    baseShot: shot.baseName ?? shot.name,
    coverageTags: shot.coverageTags ?? [],
    diagnostics,
  };
  try {
    await page.goto(seat.href, {waitUntil: navigationWaitUntil});
    await waitForVisualShell(page);
    await page.waitForTimeout(visualSettleMs);
    if (shot.prepare !== undefined) {
      const prepared = await shot.prepare(page, seat, scenario, game);
      if (prepared === false) {
        result.skipped = true;
        result.reason = 'selector not present for this scenario/state';
        result.diagnostics = cloneDiagnostics(diagnostics);
        return result;
      }
    }
    const capture = await screenshotWithMetrics(page, scenario, viewport, shot.name, diagnostics);
    result.file = capture.file;
    result.metrics = capture.metrics;
    result.diagnostics = capture.diagnostics;
    await closeModal(page);
  } catch (error) {
    result.skipped = true;
    result.reason = String(error);
    result.diagnostics = cloneDiagnostics(diagnostics);
  } finally {
    await page.close();
  }
  return result;
}

async function runScenario(browser, scenario) {
  const game = await createGame(scenario);
  const captureStages = scenario.captureStages ?? (scenario.visualPatch === undefined ? ['post-setup', 'generation2'] : ['post-setup']);
  const scenarioSummary = {
    name: scenario.name,
    description: scenario.description,
    gameId: game.id,
    players: game.players.map((player) => ({name: player.name, id: player.id, href: player.href})),
    config: newGameConfig(scenario),
    coverageTags: scenario.coverageTags ?? [],
    requestedShots: scenario.shots ?? [],
    requestedStages: captureStages,
    visualPatch: scenario.visualPatch === undefined ? undefined : {name: scenario.visualPatch, result: undefined},
    setupCaptures: [],
    setup: [],
    stabilization: [],
    stages: [],
  };

  if (captureSetupScreens) {
    for (const viewport of viewports) {
      const context = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}, deviceScaleFactor: 1});
      scenarioSummary.setupCaptures.push(...await captureSetup(context, scenario, game, viewport));
      await context.close();
    }
  }

  scenarioSummary.setup = await completeInitialSetup(game, scenario);
  scenarioSummary.stabilization = await stabilizePostSetup(game, scenario);
  if (scenario.visualPatch !== undefined) {
    scenarioSummary.visualPatch.result = await applyVisualPatchIfNeeded(game, scenario);
  }
  if (captureStages.includes('post-setup')) {
    await captureStage(browser, scenario, scenarioSummary, game, 'post-setup');
  }

  if ((scenario.advance ?? []).includes('generation2') && captureStages.includes('generation2')) {
    const advance = await advanceToGeneration(game, 2);
    const stabilization = await stabilizePostSetup(game, scenario);
    scenarioSummary.stages.push({name: 'advance-generation2', advance, stabilization});
    await captureStage(browser, scenario, scenarioSummary, game, 'generation2');
  }
  return scenarioSummary;
}

async function captureStage(browser, scenario, scenarioSummary, game, stageName) {
  const seats = await findSeats(game);
  const stage = {name: stageName, seats, captures: []};
  const stageShotDefinitions = shotDefinitionsForScenario(scenario);
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}, deviceScaleFactor: 1});
    for (const shot of stageShotDefinitions) {
      const namedShot = {...shot, baseName: shot.name, name: `${stageName}-${shot.name}`};
      stage.captures.push(await captureShot(context, scenario, viewport, seats, namedShot, game));
    }
    await context.close();
  }
  scenarioSummary.stages.push(stage);
}

async function writeIndex(summary) {
  const capture = summary.capture;
  const lines = [
    '# Terraforming Mars Visual Scenario Lab',
    '',
    `Base URL: ${summary.baseURL}`,
    `Generated: ${summary.generatedAt}`,
    `Output: \`${summary.outputDir}\``,
    '',
    '## Capture Context',
    '',
    'This is a screenshot manifest, not a pass/fail visual test report.',
    '',
    `- Screenshots captured: ${capture.screenshots}`,
    `- Skipped shots: ${capture.skipped}`,
    `- Browser page errors observed: ${capture.pageErrors.length}`,
    `- Browser console errors observed: ${capture.consoleErrors.length}`,
    `- Visual notes: ${capture.visualNotes.length}`,
    `- Scenario capture errors: ${summary.failures.length}`,
    '',
  ];
  if (summary.failures.length > 0) {
    lines.push('### Scenario Capture Errors', '');
    for (const failure of summary.failures) {
      lines.push(`- ${failure.scenario}: ${failure.error}`);
    }
    lines.push('');
  }
  if (capture.skipped > 0) {
    lines.push('### Skipped Shots', '');
    for (const skipped of capture.skippedShots) {
      lines.push(`- ${skipped.scenario} ${skipped.viewport} ${skipped.shot}: ${skipped.reason}`);
    }
    lines.push('');
  }
  if (capture.visualNotes.length > 0) {
    lines.push('### Visual Notes', '');
    lines.push('These notes are prompts for human/agent inspection of the screenshots, not automatic verdicts.');
    lines.push('');
    for (const note of capture.visualNotes.slice(0, 40)) {
      lines.push(`- ${note.scenario} ${note.viewport} ${note.shot}: ${note.message}`);
    }
    lines.push('');
  }
  if (summary.coverage !== undefined) {
    lines.push('### Coverage Tags', '');
    lines.push(`Coverage tags recorded: ${summary.coverage.tagCount}`);
    lines.push('');
    const tags = Object.keys(summary.coverage.tags);
    for (const tag of tags.slice(0, 80)) {
      const refs = summary.coverage.tags[tag];
      const liveRefs = refs.filter((ref) => ref.skipped !== true).length;
      lines.push(`- ${tag}: ${liveRefs}/${refs.length} non-skipped references`);
    }
    if (tags.length > 80) {
      lines.push(`- ... ${tags.length - 80} more tags in summary.json`);
    }
    lines.push('');
  }
  for (const scenario of summary.scenarios) {
    lines.push(`## ${scenario.name}`, '');
    lines.push(scenario.description ?? '');
    lines.push('');
    lines.push(`Game id: \`${scenario.gameId}\``);
    if (scenario.visualPatch?.name !== undefined) {
      lines.push(`Visual patch: \`${scenario.visualPatch.name}\` (${scenario.visualPatch.result?.applied ? 'applied' : 'not applied'})`);
      if (scenario.visualPatch.result?.reason !== undefined) {
        lines.push(`Visual patch note: ${scenario.visualPatch.result.reason}`);
      }
    }
    if ((scenario.coverageTags ?? []).length > 0) {
      lines.push(`Coverage: ${scenario.coverageTags.map((tag) => `\`${tag}\``).join(', ')}`);
    }
    lines.push('');
    lines.push('### Players');
    for (const player of scenario.players) {
      lines.push(`- ${player.name}: [open seat](${player.href})`);
    }
    lines.push('');
    lines.push('### Setup');
    for (const capture of scenario.setupCaptures) {
      lines.push(`- ${capture.viewport} ${capture.shot}: [png](${path.basename(capture.file)})`);
    }
    for (const stage of scenario.stages.filter((item) => item.captures !== undefined)) {
      lines.push('', `### ${stage.name}`, '');
      for (const capture of stage.captures) {
        const flag = capture.skipped ? ' skipped' : '';
        lines.push(`- ${capture.viewport} ${capture.shot}${flag}: ${capture.file ? `[png](${path.basename(capture.file)})` : capture.reason}`);
      }
    }
    lines.push('');
  }
  await fs.writeFile(path.join(outputDir, 'index.md'), `${lines.join('\n')}\n`);
}

function activeScrollables(metrics) {
  return metrics.scrollables.filter((scrollable) => (
    scrollable.scrollHeight > scrollable.clientHeight + 2 ||
    scrollable.scrollWidth > scrollable.clientWidth + 2
  ));
}

function collectVisualNotes(summary) {
  const notes = [];
  const noteMetric = (scenario, capture) => {
    const metrics = capture.metrics;
    if (metrics === undefined) return;
    const context = {scenario: scenario.name, viewport: capture.viewport, shot: capture.shot};
    const isEndgameShot = capture.baseShot?.startsWith('endgame') || capture.shot.includes('endgame');
    if (metrics.visualShellStyled === false) {
      notes.push({...context, message: `visual shell appears unstyled (body background ${metrics.bodyBackground})`});
    }
    if (metrics.scrollWidth > metrics.viewport.width + 2) {
      notes.push({...context, message: `page has horizontal overflow (${metrics.scrollWidth}px > ${metrics.viewport.width}px)`});
    }
    if (!capture.shot.startsWith('setup-') && !isEndgameShot && metrics.scrollHeight > metrics.viewport.height + 4) {
      notes.push({...context, message: `page has vertical overflow (${metrics.scrollHeight}px > ${metrics.viewport.height}px)`});
    }
    for (const key of ['shell', 'gameEnd', 'boardStage', 'actions', 'cards', 'players', 'activity', 'modal']) {
      const rect = metrics[key];
      if (rect === null) continue;
      if (isEndgameShot && (key === 'shell' || key === 'gameEnd')) continue;
      if (rect.x < -2 || rect.y < -2 || rect.x + rect.width > metrics.viewport.width + 8 || rect.y + rect.height > metrics.viewport.height + 8) {
        notes.push({...context, message: `${key} bounds ${JSON.stringify(rect)} exceed viewport ${JSON.stringify(metrics.viewport)}`});
      }
    }
    const scrollables = activeScrollables(metrics);
    if (scrollables.length > 4) {
      notes.push({...context, message: `${scrollables.length} scrollable regions are active`});
    }
    if ((metrics.cardContentOverflows ?? []).length > 0) {
      const titles = metrics.cardContentOverflows.map((item) => item.title).slice(0, 4).join(', ');
      notes.push({...context, message: `card content overflows inside action panel: ${titles}`});
    }
    if ((metrics.colonyChoiceClipping ?? []).length > 0) {
      const titles = metrics.colonyChoiceClipping.map((item) => item.title).slice(0, 4).join(', ');
      notes.push({...context, message: `colony choices exceed their selectable slots: ${titles}`});
    }
    if ((metrics.workflowActionClipping ?? []).length > 0) {
      const titles = metrics.workflowActionClipping.map((item) => item.title).slice(0, 4).join(', ');
      notes.push({...context, message: `workflow action buttons exceed command detail: ${titles}`});
    }
    const unstableHoverRoots = (metrics.hoverScrollStability?.delta ?? []).filter((item) => (
      Math.abs(item.scrollTop) > 1 || Math.abs(item.scrollLeft) > 1 || item.overflowChanged
    ));
    if (unstableHoverRoots.length > 0) {
      notes.push({...context, message: `card hover changed scroll state: ${JSON.stringify(unstableHoverRoots)}`});
    }
    if (metrics.statePreservation !== null && (
      metrics.statePreservation.after?.overlayOpen !== true || metrics.statePreservation.scrollUnchanged !== true
    )) {
      notes.push({...context, message: `overlay state changed across player refresh: ${JSON.stringify(metrics.statePreservation)}`});
    }
  };

  for (const scenario of summary.scenarios) {
    for (const capture of scenario.setupCaptures) {
      noteMetric(scenario, capture);
    }
    for (const stage of scenario.stages.filter((item) => item.captures !== undefined)) {
      for (const capture of stage.captures) {
        noteMetric(scenario, capture);
      }
    }
  }
  return notes;
}

function summarizeCapture(summary) {
  const captureSummary = {
    screenshots: 0,
    skipped: 0,
    skippedShots: [],
    pageErrors: [],
    consoleErrors: [],
    visualNotes: [],
  };
  const visitCapture = (scenario, capture) => {
    if (capture.file !== undefined) captureSummary.screenshots += 1;
    if (capture.skipped) {
      captureSummary.skipped += 1;
      captureSummary.skippedShots.push({
        scenario: scenario.name,
        viewport: capture.viewport,
        shot: capture.shot,
        reason: capture.reason,
      });
    }
    for (const error of capture.diagnostics?.pageErrors ?? []) {
      captureSummary.pageErrors.push({scenario: scenario.name, viewport: capture.viewport, shot: capture.shot, error});
    }
    for (const error of capture.diagnostics?.consoleErrors ?? []) {
      captureSummary.consoleErrors.push({scenario: scenario.name, viewport: capture.viewport, shot: capture.shot, error});
    }
  };
  for (const scenario of summary.scenarios) {
    for (const capture of scenario.setupCaptures) {
      visitCapture(scenario, capture);
    }
    for (const stage of scenario.stages.filter((item) => item.captures !== undefined)) {
      for (const capture of stage.captures) {
        visitCapture(scenario, capture);
      }
    }
  }
  captureSummary.visualNotes = collectVisualNotes(summary);
  return captureSummary;
}

function summarizeCoverage(summary) {
  const tags = new Map();
  const add = (tag, ref) => {
    if (!tags.has(tag)) tags.set(tag, []);
    tags.get(tag).push(ref);
  };
  for (const scenario of summary.scenarios) {
    for (const tag of scenario.coverageTags ?? []) {
      add(tag, {scenario: scenario.name, source: 'scenario'});
    }
    for (const stage of scenario.stages.filter((item) => item.captures !== undefined)) {
      for (const capture of stage.captures) {
        for (const tag of capture.coverageTags ?? []) {
          add(tag, {scenario: scenario.name, stage: stage.name, shot: capture.shot, skipped: capture.skipped});
        }
      }
    }
  }
  return {
    tagCount: tags.size,
    tags: Object.fromEntries([...tags.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

async function writeSummaryAndIndex(summary) {
  summary.capture = summarizeCapture(summary);
  summary.coverage = summarizeCoverage(summary);
  await fs.writeFile(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await writeIndex(summary);
}

function printableSummary(summary) {
  return {
    outputDir: summary.outputDir,
    scenarios: summary.scenarios.map((scenario) => ({
      name: scenario.name,
      gameId: scenario.gameId,
      players: scenario.players,
    })),
    failures: summary.failures,
    capture: summary.capture,
    coverage: {tagCount: summary.coverage?.tagCount},
  };
}

async function main() {
  await fs.mkdir(outputDir, {recursive: true});
  const configuredScenarios = await loadScenarioConfig();
  if (process.env.TM_LIST_SCENARIOS === '1') {
    console.log(configuredScenarios.map((scenario) => scenario.name).join('\n'));
    return;
  }

  const response = await fetch(pageURL('/'));
  if (!response.ok) {
    throw new Error(`Cannot reach ${baseURL}; got ${response.status}`);
  }

  const scenarios = configuredScenarios
    .filter((scenario) => selectAllScenarios || selectedScenarioNames.includes(scenario.name));

  if (scenarios.length === 0) {
    throw new Error(`No scenarios selected. Available: ${configuredScenarios.map((scenario) => scenario.name).join(', ')}`);
  }
  for (const scenario of scenarios) {
    const unknownScenarioShots = (scenario.shots ?? []).filter((shot) => !allShotDefinitionByName.has(shot));
    if (unknownScenarioShots.length > 0) {
      throw new Error(`Scenario ${scenario.name} references unknown shots: ${unknownScenarioShots.join(', ')}`);
    }
  }
  if (selectedShotNames.length > 0) {
    const availableShots = allShotDefinitions.map((shot) => shot.name);
    const missingShots = selectedShotNames.filter((shot) => !availableShots.includes(shot));
    if (missingShots.length > 0) {
      throw new Error(`Unknown TM_SHOTS: ${missingShots.join(', ')}. Available: ${availableShots.join(', ')}`);
    }
  }

  const summary = {baseURL, outputDir, generatedAt: new Date().toISOString(), viewports, scenarios: [], failures: []};
  for (const scenario of scenarios) {
    let browser;
    try {
      browser = await chromium.launch({headless, slowMo});
      summary.scenarios.push(await runScenario(browser, scenario));
    } catch (error) {
      summary.failures.push({
        scenario: scenario.name,
        error: String(error),
        stack: error?.stack,
      });
    } finally {
      if (browser !== undefined) {
        await browser.close().catch(() => {});
      }
      await writeSummaryAndIndex(summary);
    }
  }
  if (printFullSummary) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(JSON.stringify(printableSummary(summary), null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
