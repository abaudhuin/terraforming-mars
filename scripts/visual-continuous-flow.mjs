#!/usr/bin/env node

/**
 * A continuous, engine-driven multiplayer journey.
 *
 * This script verifies interaction and temporal behavior. Its screenshots are
 * named transition evidence for human review; it intentionally does not score
 * visual quality, compare pixels, or infer that a screenshot "looks correct".
 */

import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {execFile as execFileCallback} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';

const execFile = promisify(execFileCallback);

const baseURL = (process.env.TM_BASE_URL ?? 'http://localhost:8081').replace(/\/$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(process.env.TM_VISUAL_OUT ?? `/tmp/tm-continuous-flow-${stamp}`);
const headless = process.env.TM_HEADED !== '1';
const slowMo = Number.parseInt(process.env.TM_SLOWMO ?? '0', 10) || 0;
const settleMs = Number.parseInt(process.env.TM_VISUAL_SETTLE_MS ?? '250', 10) || 0;
const transitionTimeoutMs = Number.parseInt(process.env.TM_TRANSITION_TIMEOUT_MS ?? '20000', 10) || 20_000;
const listOnly = process.env.TM_CONTINUOUS_LIST === '1';
const viewport = {
  width: Number.parseInt(process.env.TM_VIEWPORT_WIDTH ?? '1920', 10) || 1920,
  height: Number.parseInt(process.env.TM_VIEWPORT_HEIGHT ?? '1080', 10) || 1080,
};

const capturePlan = [
  'home',
  'two-player-game-configured',
  'game-created-seat-links',
  'alice-initial-setup',
  'alice-corporation-and-project-selected',
  'alice-setup-submitted',
  'bob-initial-setup',
  'bob-corporation-and-project-selected',
  'bob-setup-submitted',
  'active-seat-before-real-action',
  'active-seat-greenery-targets',
  'active-seat-greenery-confirmation',
  'active-seat-after-greenery',
  'active-seat-sell-patents-selected',
  'active-seat-patent-selected',
  'active-seat-after-real-action',
  'waiting-seat-layout-resized-before-handoff',
  'waiting-seat-inspection-preserved-after-live-handoff',
  'waiting-seat-active-after-live-handoff',
  'first-pass-selected',
  'original-seat-active-after-live-handoff',
  'second-pass-selected',
  'generation-two-live-state',
];

const journeyDefinition = [
  'Create a two-player game through the browser UI.',
  'Complete both corporation/setup decisions through each seat UI and retain one project card.',
  'Discover the engine-selected active seat.',
  'Resize the waiting seat layout and keep a card inspection open.',
  'Commit a real greenery standard project by clicking a center-point reachable glowing Mars hex and accepting tile confirmation.',
  'Commit a real Sell patents action through the active seat UI.',
  'Observe the automatic live handoff after the active seat commits its second action.',
  'Observe the other already-open seat become active through live multiplayer polling without navigation, while layout and inspection persist.',
  'Pass that seat through the UI.',
  'Observe the original already-open seat become active through live multiplayer polling.',
  'Pass the original seat through the UI and observe generation 2.',
];

let captureIndex = 1;

function pageURL(pathname) {
  return `${baseURL}${pathname}`;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleText(input) {
  if (typeof input?.title === 'string') return input.title;
  return input?.title?.message ?? '';
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function runGit(args, cwd) {
  try {
    const {stdout} = await execFile('git', args, {cwd});
    return stdout.trim();
  } catch (error) {
    return {error: String(error)};
  }
}

async function collectLocalProvenance() {
  const scriptPath = new URL(import.meta.url).pathname;
  const candidateRoot = path.resolve(path.dirname(scriptPath), '..');
  const discoveredRoot = await runGit(['rev-parse', '--show-toplevel'], candidateRoot);
  const repoRoot = typeof discoveredRoot === 'string' && discoveredRoot.length > 0 ?
    discoveredRoot :
    candidateRoot;
  let packageVersion = null;
  try {
    packageVersion = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8')).version ?? null;
  } catch {
    // Package metadata is useful provenance, but not required to run the flow.
  }
  const [commit, branch, describe, status, trackedDiff] = await Promise.all([
    runGit(['rev-parse', 'HEAD'], repoRoot),
    runGit(['branch', '--show-current'], repoRoot),
    runGit(['describe', '--always', '--dirty', '--tags'], repoRoot),
    runGit(['status', '--porcelain=v1', '--untracked-files=all'], repoRoot),
    runGit(['diff', '--binary', 'HEAD', '--'], repoRoot),
  ]);
  const statusText = typeof status === 'string' ? status : '';
  const untracked = [];
  for (const line of statusText.split('\n').filter((entry) => entry.startsWith('?? '))) {
    const relativePath = line.slice(3);
    try {
      const bytes = await fs.readFile(path.join(repoRoot, relativePath));
      untracked.push({path: relativePath, sha256: sha256(bytes)});
    } catch (error) {
      untracked.push({path: relativePath, error: String(error)});
    }
  }
  let localBuildTime = null;
  try {
    localBuildTime = (await fs.stat(path.join(repoRoot, 'build/styles.css'))).mtime.toISOString();
  } catch {
    // The target can be a dev server or a build from another worktree.
  }
  const dirtyClientSources = [];
  for (const line of statusText.split('\n').filter(Boolean)) {
    const relativePath = line.slice(3);
    if (!/^(src\/client\/|src\/styles\/)/.test(relativePath)) continue;
    try {
      dirtyClientSources.push({
        path: relativePath,
        modifiedAt: (await fs.stat(path.join(repoRoot, relativePath))).mtime.toISOString(),
      });
    } catch {
      // Deleted paths remain represented by git status.
    }
  }
  const newestDirtyClientSource = dirtyClientSources.map((entry) => entry.modifiedAt).sort().at(-1) ?? null;
  const runnerBytes = await fs.readFile(scriptPath);
  const runner = {
    path: scriptPath,
    sha256: sha256(runnerBytes),
    modifiedAt: (await fs.stat(scriptPath)).mtime.toISOString(),
  };
  return {
    collectedAt: new Date().toISOString(),
    repoRoot,
    packageVersion,
    git: {
      commit,
      branch,
      describe,
      dirty: statusText.length > 0,
      status: statusText.length > 0 ? statusText.split('\n') : [],
      dirtyTreeFingerprint: sha256(JSON.stringify({
        status: statusText,
        trackedDiff: typeof trackedDiff === 'string' ? trackedDiff : trackedDiff,
        untracked,
      })),
      untracked,
    },
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
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

async function collectServedProvenance() {
  const response = await fetch(pageURL('/'), {cache: 'no-store'});
  if (!response.ok) {
    throw new Error(`Expected ${baseURL} to return 2xx, got ${response.status}`);
  }
  const html = await response.text();
  const assetReferences = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
    .map((match) => match[1]);
  const uniqueAssetURLs = [...new Set(assetReferences.map((reference) => new URL(reference, `${baseURL}/`).href))]
    .filter((url) => new URL(url).origin === new URL(baseURL).origin);
  const assets = [];
  for (const url of uniqueAssetURLs) {
    try {
      const assetResponse = await fetch(url, {cache: 'no-store'});
      const bytes = Buffer.from(await assetResponse.arrayBuffer());
      assets.push({
        url,
        status: assetResponse.status,
        bytes: bytes.length,
        sha256: sha256(bytes),
        etag: assetResponse.headers.get('etag'),
        lastModified: assetResponse.headers.get('last-modified'),
      });
    } catch (error) {
      assets.push({url, error: String(error)});
    }
  }
  const serverPort = new URL(baseURL).port || null;
  let serverPid = process.env.TM_SERVER_PID ?? null;
  if (serverPid === null && serverPort !== null) {
    try {
      const {stdout} = await execFile('lsof', ['-t', `-iTCP:${serverPort}`, '-sTCP:LISTEN']);
      serverPid = stdout.trim() || null;
    } catch {
      // PID discovery is best-effort; the served hashes still identify the target.
    }
  }
  return {
    baseURL,
    serverPort,
    serverPid,
    fetchedAt: new Date().toISOString(),
    home: {
      status: response.status,
      bytes: Buffer.byteLength(html),
      sha256: sha256(html),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      server: response.headers.get('server'),
    },
    assets,
  };
}

async function capture(page, name, screenshots, details = {}) {
  if (!capturePlan.includes(name)) {
    throw new Error(`Unregistered continuous-flow capture name: ${name}`);
  }
  await page.waitForTimeout(settleMs);
  const filename = `${String(captureIndex).padStart(2, '0')}-${name}.png`;
  captureIndex += 1;
  const file = path.join(outputDir, filename);
  await page.screenshot({path: file, fullPage: true});
  screenshots.push({
    name,
    filename,
    file,
    capturedAt: new Date().toISOString(),
    pageURL: page.url(),
    viewport,
    ...details,
  });
}

function attachDiagnostics(page, label, diagnostics) {
  page.on('pageerror', (error) => {
    const message = error.message;
    if (!message.includes('ServiceWorker') && !message.includes('sw.js')) {
      diagnostics.pageErrors.push({label, message, url: page.url(), at: new Date().toISOString()});
    }
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!text.includes('sw.js') && !text.includes('404')) {
      diagnostics.consoleErrors.push({label, text, url: page.url(), at: new Date().toISOString()});
    }
  });
}

async function setCheckbox(page, selector, checked) {
  const input = page.locator(selector);
  if (await input.count() === 0) return;
  if (await input.isChecked() !== checked) {
    await page.locator(`label[for="${selector.slice(1)}"]`).click();
  }
}

async function fetchPlayer(playerId) {
  const response = await fetch(pageURL(`/api/player?id=${encodeURIComponent(playerId)}`), {cache: 'no-store'});
  if (!response.ok) {
    throw new Error(`Player API returned ${response.status} for ${playerId}`);
  }
  return response.json();
}

function compactPlayerState(model) {
  const self = model.thisPlayer;
  return {
    id: model.id,
    name: self.name,
    color: self.color,
    active: model.players.some((player) => player.name === self.name && player.isActive),
    generation: model.game.generation,
    phase: model.game.phase,
    gameAge: model.game.gameAge,
    step: model.game.step,
    passedPlayers: model.game.passedPlayers,
    waitingFor: model.waitingFor?.type ?? null,
    waitingTitle: titleText(model.waitingFor),
    cardsInHand: model.cardsInHand.length,
    megacredits: self.megacredits,
    plants: self.plants,
    oxygenLevel: model.game.oxygenLevel,
    ownedGreeneryTiles: model.game.spaces.filter((space) => space.tileType === 0 && space.color === self.color).length,
    actionsTakenThisRound: self.actionsTakenThisRound,
    actionsTakenThisGame: self.actionsTakenThisGame,
  };
}

async function snapshotSeats(players) {
  return Promise.all(players.map(async (player) => compactPlayerState(await fetchPlayer(player.id))));
}

async function waitForSeatState(players, description, predicate, timeoutMs = transitionTimeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let latest = [];
  while (Date.now() < deadline) {
    latest = await snapshotSeats(players);
    if (predicate(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${description}. Last engine states: ${JSON.stringify(latest)}`);
}

async function waitForLiveActivePage(page, timeoutMs = transitionTimeoutMs) {
  await page.locator('.player_home_block--actions .wf-root').waitFor({state: 'visible', timeout: timeoutMs});
}

async function browserSeatState(page) {
  return {
    url: page.url(),
    actionRootVisible: await page.locator('.player_home_block--actions .wf-root').isVisible().catch(() => false),
    yourTurnVisible: await page.getByText(/YOUR TURN/i).first().isVisible().catch(() => false),
    generationText: await page.locator('.tm-hud-chip').filter({hasText: /^GEN \d+$/i}).first().textContent().catch(() => null),
    playerRailWidth: await page.locator('.tm-player-rail').evaluate((element) => Math.round(element.getBoundingClientRect().width)).catch(() => null),
    activityRailWidth: await page.locator('.tm-activity-rail').evaluate((element) => Math.round(element.getBoundingClientRect().width)).catch(() => null),
    overlayOpen: await page.locator('.tm-modal').isVisible().catch(() => false),
  };
}

async function resizeAndOpenInspection(page) {
  const handle = page.locator('.tm-layout-resize-handle--activity');
  const box = await handle.boundingBox();
  if (box === null) throw new Error('Activity resize handle is not available');
  const rail = page.locator('.tm-activity-rail');
  const widthBeforeGrab = await rail.evaluate((element) => element.getBoundingClientRect().width);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(60);
  const widthAfterGrab = await rail.evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(widthAfterGrab - widthBeforeGrab) > 1) {
    throw new Error(`Activity rail jumped on pointer-down (${widthBeforeGrab}px to ${widthAfterGrab}px)`);
  }
  await page.mouse.move(box.x - 90, box.y + box.height / 2, {steps: 8});
  await page.mouse.up();
  const widthAfterDrag = await rail.evaluate((element) => element.getBoundingClientRect().width);
  if (widthAfterDrag < widthBeforeGrab + 70) {
    throw new Error(`Activity rail did not follow the drag delta (${widthBeforeGrab}px to ${widthAfterDrag}px)`);
  }

  const playerHandle = page.locator('.tm-layout-resize-handle--player');
  const playerHandleBox = await playerHandle.boundingBox();
  if (playerHandleBox === null) throw new Error('Player resize handle is not available');
  const playerRail = page.locator('.tm-player-rail');
  const playerWidthBeforeGrab = await playerRail.evaluate((element) => element.getBoundingClientRect().width);
  await page.mouse.move(playerHandleBox.x + playerHandleBox.width / 2, playerHandleBox.y + playerHandleBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(60);
  const playerWidthAfterGrab = await playerRail.evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(playerWidthAfterGrab - playerWidthBeforeGrab) > 1) {
    throw new Error(`Player rail jumped on pointer-down (${playerWidthBeforeGrab}px to ${playerWidthAfterGrab}px)`);
  }
  await page.mouse.move(playerHandleBox.x + playerHandleBox.width / 2 + 70, playerHandleBox.y + playerHandleBox.height / 2, {steps: 8});
  await page.mouse.up();
  const playerWidthAfterDrag = await playerRail.evaluate((element) => element.getBoundingClientRect().width);
  if (playerWidthAfterDrag < playerWidthBeforeGrab + 50) {
    throw new Error(`Player rail did not follow the drag delta (${playerWidthBeforeGrab}px to ${playerWidthAfterDrag}px)`);
  }

  const cards = page.locator('.tm-control--cards').first();
  if (!await cards.isVisible()) throw new Error('Cards inspection entry point is not visible');
  await cards.click();
  await page.locator('.tm-modal').waitFor({state: 'visible'});
  return browserSeatState(page);
}

async function createTwoPlayerGame(page, screenshots) {
  await page.goto(pageURL('/'), {waitUntil: 'networkidle'});
  await capture(page, 'home', screenshots, {transition: 'entry'});

  await page.goto(pageURL('/new-game'), {waitUntil: 'networkidle'});
  await page.locator('label[for="2-radio"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.create-game-player-name').length === 2);

  await setCheckbox(page, '#corporateEra-checkbox', true);
  for (const selector of [
    '#allOfficialExpansions-checkbox',
    '#prelude-checkbox',
    '#prelude2-checkbox',
    '#venusNext-checkbox',
    '#colonies-checkbox',
    '#turmoil-checkbox',
    '#promo-checkbox',
    '#ares-checkbox',
    '#communityCards-checkbox',
    '#themoon-checkbox',
    '#pathfinders-checkbox',
    '#ceo-checkbox',
    '#starwars-checkbox',
    '#underworld-checkbox',
    '#deltaProject-checkbox',
  ]) {
    await setCheckbox(page, selector, false);
  }
  await setCheckbox(page, '#draft-checkbox', false);
  await setCheckbox(page, '#initialDraft-checkbox', false);
  await setCheckbox(page, '#randomFirstPlayer-checkbox', false);

  const firstPlayer = page.locator('input[name="firstIndex"][value="0"]');
  if (await firstPlayer.count() === 1 && !await firstPlayer.isChecked()) {
    await firstPlayer.check({force: true});
  }

  const names = page.locator('.create-game-player-name');
  await names.nth(0).fill('Alice');
  await names.nth(1).fill('Bob');
  await capture(page, 'two-player-game-configured', screenshots, {transition: 'creation-configured'});

  await page.getByRole('button', {name: 'Create game'}).click();
  await page.waitForFunction(
    () => location.pathname.endsWith('/game') && new URLSearchParams(location.search).has('id'),
    undefined,
    {timeout: 15_000},
  );
  await capture(page, 'game-created-seat-links', screenshots, {transition: 'game-created'});

  const game = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')].map((link) => ({
      text: link.textContent?.trim() ?? '',
      href: link.href,
    }));
    return {
      title: document.title,
      url: location.href,
      players: links.filter((link) => link.href.includes('/player?id=')).map((link) => ({
        ...link,
        id: new URL(link.href).searchParams.get('id'),
      })),
      spectators: links.filter((link) => link.href.includes('/spectator?id=')),
    };
  });

  if (game.players.length !== 2 || game.players.some((player) => player.id === null)) {
    throw new Error(`Expected two valid player links after game creation, found ${game.players.length}`);
  }
  return game;
}

async function selectCorporationAndProject(page) {
  const cardPools = page.locator('.select-initial-cards .wf-component--select-card');
  if (await cardPools.count() < 2) {
    throw new Error('Initial setup did not expose corporation and project card pools');
  }
  const corporationCards = cardPools.first().locator('label.cardbox');
  const corporationTexts = await corporationCards.allTextContents();
  let corporationIndex = corporationTexts.findIndex((text) => !/\bfirst action\b/i.test(text));
  if (corporationIndex < 0) corporationIndex = 0;
  await corporationCards.nth(corporationIndex).click();

  const projectCards = cardPools.last().locator('label.cardbox');
  if (await projectCards.count() === 0) {
    throw new Error('Initial setup did not expose a project card to retain');
  }
  await projectCards.first().click();

  return {
    corporationCardText: corporationTexts[corporationIndex]?.replace(/\s+/g, ' ').trim() ?? null,
    selectedProjectCards: 1,
  };
}

async function submitInitialSetup(page, seat, screenshots) {
  await page.goto(seat.href, {waitUntil: 'networkidle'});
  const seatSlug = slug(seat.text);
  await page.locator('.select-initial-cards').waitFor({state: 'visible', timeout: 15_000});
  await capture(page, `${seatSlug}-initial-setup`, screenshots, {
    transition: 'setup-opened',
    seat: seat.text,
  });

  const selection = await selectCorporationAndProject(page);
  await capture(page, `${seatSlug}-corporation-and-project-selected`, screenshots, {
    transition: 'setup-selections-made',
    seat: seat.text,
  });

  const start = page.getByRole('button', {name: 'Start'});
  await start.waitFor({state: 'visible', timeout: 10_000});
  if (await start.isDisabled()) {
    throw new Error(`${seat.text}'s setup Start button remained disabled after valid selections`);
  }
  await start.click();
  await page.locator('.select-initial-cards').waitFor({state: 'detached', timeout: 15_000});
  await capture(page, `${seatSlug}-setup-submitted`, screenshots, {
    transition: 'setup-submitted',
    seat: seat.text,
  });

  const engine = compactPlayerState(await fetchPlayer(seat.id));
  return {
    seat: seat.text,
    ...selection,
    engine,
    submitted: engine.waitingFor !== 'initialCards',
  };
}

async function chooseCommand(page, titlePattern, submitPattern, captureName, screenshots, details) {
  const actions = page.locator('.player_home_block--actions');
  const tile = actions.locator('label.wf-command-tile').filter({hasText: titlePattern}).first();
  await tile.waitFor({state: 'visible', timeout: 10_000});
  await tile.click();
  await capture(page, captureName, screenshots, details);

  const selectedSubmit = actions.locator(
    '.wf-command-submit--selected-option .wf-command-inline-submit, .wf-command-submit .wf-command-danger-submit, .wf-command-detail button, button.btn-submit',
  ).filter({hasText: submitPattern}).first();
  await selectedSubmit.waitFor({state: 'visible', timeout: 10_000});
  await selectedSubmit.click();
}

async function performSellPatents(page, player, screenshots) {
  const beforeModel = await fetchPlayer(player.id);
  const before = compactPlayerState(beforeModel);
  if (before.cardsInHand < 1) {
    throw new Error(`${before.name} has no retained project card for the real Sell patents action`);
  }
  if (!/take your action/i.test(before.waitingTitle) && before.waitingFor !== 'or') {
    throw new Error(`${before.name} is not at the ordinary action menu: ${before.waitingFor} / ${before.waitingTitle}`);
  }

  const actions = page.locator('.player_home_block--actions');
  const sellTile = actions.locator('label.wf-command-tile').filter({hasText: /Sell patents/i}).first();
  await sellTile.waitFor({state: 'visible', timeout: 10_000});
  await sellTile.click();
  await capture(page, 'active-seat-sell-patents-selected', screenshots, {
    transition: 'real-action-selected',
    seat: before.name,
    action: 'Sell patents',
  });

  const patentCard = actions.locator('.wf-command-detail .wf-component--select-card label.cardbox').first();
  await patentCard.waitFor({state: 'visible', timeout: 10_000});
  const patentCardSurface = patentCard.locator('.filterDiv.card-container');
  const neutralPatentBox = await patentCardSurface.boundingBox();
  const neutralPatentStyle = await patentCardSurface.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      actionScale: style.getPropertyValue('--tm-action-card-scale').trim(),
      transform: style.transform,
    };
  });
  await patentCard.click();
  const selectedPatentBox = await patentCardSurface.boundingBox();
  const selectedPatentStyle = await patentCardSurface.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      actionScale: style.getPropertyValue('--tm-action-card-scale').trim(),
      transform: style.transform,
    };
  });
  if (
    neutralPatentBox === null ||
    selectedPatentBox === null ||
    Math.abs(neutralPatentBox.width - selectedPatentBox.width) > 1 ||
    Math.abs(neutralPatentBox.height - selectedPatentBox.height) > 1
  ) {
    throw new Error(
      `Sell patents selection changed card geometry: ${JSON.stringify({
        neutralPatentBox,
        selectedPatentBox,
        neutralPatentStyle,
        selectedPatentStyle,
      })}`,
    );
  }
  await capture(page, 'active-seat-patent-selected', screenshots, {
    transition: 'real-action-input-complete',
    seat: before.name,
    action: 'Sell patents',
  });

  const sellButton = actions.locator('.wf-command-detail .wf-component-actions button').filter({hasText: /^Sell\b/i}).first();
  await sellButton.waitFor({state: 'visible', timeout: 10_000});
  await sellButton.click();

  const states = await waitForSeatState(
    [player],
    `${before.name}'s Sell patents action to reach the engine`,
    ([state]) => state.gameAge > before.gameAge && state.cardsInHand === before.cardsInHand - 1,
  );
  const after = states[0];
  await capture(page, 'active-seat-after-real-action', screenshots, {
    transition: 'real-action-committed',
    seat: before.name,
    action: 'Sell patents',
  });
  return {
    kind: 'sell-patents',
    before,
    after,
    handDelta: after.cardsInHand - before.cardsInHand,
    megacreditDelta: after.megacredits - before.megacredits,
    gameAgeDelta: after.gameAge - before.gameAge,
  };
}

async function performGreeneryPlacement(page, player, screenshots) {
  const before = compactPlayerState(await fetchPlayer(player.id));
  if (before.megacredits < 23) {
    throw new Error(`${before.name} cannot afford the greenery standard project with ${before.megacredits} M€`);
  }

  const actions = page.locator('.player_home_block--actions');
  const standardProjects = actions.locator('label.wf-command-tile').filter({hasText: /Standard projects/i}).first();
  await standardProjects.waitFor({state: 'visible', timeout: 10_000});
  await standardProjects.click();

  const greenery = actions.locator('label.tm-project-card-option').filter({hasText: /Greenery/i}).first();
  await greenery.waitFor({state: 'visible', timeout: 10_000});
  await greenery.click();
  const launch = actions.getByRole('button', {name: /Launch standard project/i}).first();
  await launch.waitFor({state: 'visible', timeout: 10_000});
  if (await launch.isDisabled()) {
    throw new Error('Greenery standard project remained disabled after selecting an affordable project');
  }
  await launch.click();

  const target = page.locator('#main_board .board-space--available').first();
  await target.waitFor({state: 'visible', timeout: 10_000});
  const targetBox = await target.boundingBox();
  const targetId = await target.getAttribute('data_space_id');
  if (targetBox === null || targetId === null) {
    throw new Error('A glowing greenery target had no measurable center or space id');
  }
  const center = {x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2};
  const topmost = await target.evaluate((targetElement, {x, y}) => {
    const element = document.elementFromPoint(x, y);
    const owningTarget = element?.closest?.('[data_space_id]');
    return {
      tag: element?.tagName ?? null,
      classes: element?.getAttribute?.('class') ?? null,
      spaceId: owningTarget?.getAttribute('data_space_id') ?? null,
      targetOwnsPoint: element !== null &&
        (targetElement === element || targetElement.contains(element)),
    };
  }, center);
  if (!topmost.targetOwnsPoint || topmost.spaceId !== targetId) {
    throw new Error(`Glowing greenery target ${targetId} was intercepted at its center: ${JSON.stringify(topmost)}`);
  }
  await capture(page, 'active-seat-greenery-targets', screenshots, {
    transition: 'greenery-space-ready',
    seat: before.name,
    targetId,
    centerPointTopmost: topmost,
  });

  await page.mouse.click(center.x, center.y);
  const confirmation = page.locator('dialog').filter({hasText: /Place your tile here/i}).first();
  await confirmation.waitFor({state: 'visible', timeout: 10_000});
  await capture(page, 'active-seat-greenery-confirmation', screenshots, {
    transition: 'greenery-confirmation-visible',
    seat: before.name,
    targetId,
  });
  await confirmation.getByRole('button', {name: /^Yes$/i}).click();

  const [after] = await waitForSeatState(
    [player],
    `${before.name}'s greenery placement to reach the engine`,
    ([state]) => state.gameAge > before.gameAge && state.ownedGreeneryTiles === before.ownedGreeneryTiles + 1,
  );
  await page.locator(`.board-space[data_space_id="${targetId}"]`).first().waitFor({state: 'visible'});
  await capture(page, 'active-seat-after-greenery', screenshots, {
    transition: 'greenery-committed',
    seat: before.name,
    targetId,
  });
  return {
    kind: 'greenery-standard-project',
    before,
    after,
    megacreditDelta: after.megacredits - before.megacredits,
    oxygenDelta: after.oxygenLevel - before.oxygenLevel,
    greeneryDelta: after.ownedGreeneryTiles - before.ownedGreeneryTiles,
    gameAgeDelta: after.gameAge - before.gameAge,
    targetId,
    centerPointTopmost: topmost,
  };
}

async function observeAutomaticHandoff(activePlayer, otherPlayer) {
  const before = await snapshotSeats([activePlayer, otherPlayer]);
  const after = await waitForSeatState(
    [activePlayer, otherPlayer],
    `automatic turn handoff from ${before[0].name} to ${before[1].name}`,
    (states) => states[0].active === false && states[1].active === true,
  );
  return {before, after};
}

async function passSeat(page, player, otherPlayer, captureName, screenshots) {
  const before = await snapshotSeats([player, otherPlayer]);
  const actions = page.locator('.player_home_block--actions');
  const directPass = actions.locator('button.wf-command-pass-action').filter({hasText: /Pass for this generation/i}).first();
  await directPass.waitFor({state: 'visible', timeout: 10_000});
  await capture(page, captureName, screenshots, {
    transition: 'pass-ready',
    seat: before[0].name,
  });
  await directPass.click();
  const color = before[0].color;
  const after = await waitForSeatState(
    [player, otherPlayer],
    `${before[0].name}'s pass to reach the engine`,
    (states) => states.some((state) => state.passedPlayers.includes(color)) || states.some((state) => state.generation > before[0].generation),
  );
  return {
    seat: before[0].name,
    color,
    before,
    after,
    passRecorded: after.some((state) => state.passedPlayers.includes(color)) || after.some((state) => state.generation > before[0].generation),
  };
}

async function main() {
  if (listOnly) {
    console.log(JSON.stringify({
      name: 'continuous-two-player-generation',
      purpose: 'Interaction and temporal verification; screenshots require human visual judgment.',
      journey: journeyDefinition,
      captures: capturePlan,
    }, null, 2));
    return;
  }

  await fs.mkdir(outputDir, {recursive: true});
  const diagnostics = {pageErrors: [], consoleErrors: []};
  const screenshots = [];
  const assertions = {};
  const assertionEvidence = {};
  const transitions = [];
  const setupResults = [];
  const provenance = {
    local: await collectLocalProvenance(),
    served: null,
  };
  let game = null;
  let browser = null;
  let failure = null;

  const recordAssertion = (name, pass, evidence) => {
    assertions[name] = pass === true;
    assertionEvidence[name] = evidence;
  };

  try {
    provenance.served = await collectServedProvenance();
    browser = await chromium.launch({headless, slowMo});
    const context = await browser.newContext({viewport, deviceScaleFactor: 1});

    const createPage = await context.newPage();
    attachDiagnostics(createPage, 'create-game', diagnostics);
    game = await createTwoPlayerGame(createPage, screenshots);
    recordAssertion('createdGameThroughUi', /\/game\?id=/.test(game.url), {gameURL: game.url});
    recordAssertion('createdTwoPlayerSeats', game.players.length === 2, {players: game.players});
    recordAssertion('createdSpectatorLink', game.spectators.length === 1, {spectators: game.spectators});
    await createPage.close();

    const pageByPlayerId = new Map();
    const mainFrameNavigations = new Map();
    for (const player of game.players) {
      const page = await context.newPage();
      attachDiagnostics(page, `seat-${player.text}`, diagnostics);
      mainFrameNavigations.set(player.id, 0);
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          mainFrameNavigations.set(player.id, (mainFrameNavigations.get(player.id) ?? 0) + 1);
        }
      });
      pageByPlayerId.set(player.id, page);
      setupResults.push(await submitInitialSetup(page, player, screenshots));
    }
    recordAssertion(
      'bothSetupsSelectedCorporationAndProject',
      setupResults.length === 2 && setupResults.every((result) => result.selectedProjectCards === 1 && result.corporationCardText),
      setupResults,
    );
    recordAssertion(
      'bothSetupsSubmittedThroughUi',
      setupResults.length === 2 && setupResults.every((result) => result.submitted),
      setupResults.map((result) => ({seat: result.seat, waitingFor: result.engine.waitingFor})),
    );

    const readyStates = await waitForSeatState(
      game.players,
      'a single active seat after both setups',
      (states) => states.filter((state) => state.active).length === 1 && states.every((state) => state.waitingFor !== 'initialCards'),
    );
    const activeState = readyStates.find((state) => state.active);
    const waitingState = readyStates.find((state) => !state.active);
    const activePlayer = game.players.find((player) => player.id === activeState.id);
    const waitingPlayer = game.players.find((player) => player.id === waitingState.id);
    if (!activePlayer || !waitingPlayer) {
      throw new Error(`Could not map engine seats to browser pages: ${JSON.stringify(readyStates)}`);
    }
    recordAssertion('resolvedSingleActiveSeat', true, {active: activeState, waiting: waitingState});

    const activePage = pageByPlayerId.get(activePlayer.id);
    const waitingPage = pageByPlayerId.get(waitingPlayer.id);
    const waitingDomBefore = await browserSeatState(waitingPage);
    const waitingNavigationsBefore = mainFrameNavigations.get(waitingPlayer.id);
    recordAssertion(
      'waitingSeatWasActuallyWaitingInDom',
      waitingDomBefore.actionRootVisible === false && waitingDomBefore.yourTurnVisible === false,
      waitingDomBefore,
    );
    const waitingCustomized = await resizeAndOpenInspection(waitingPage);
    await capture(waitingPage, 'waiting-seat-layout-resized-before-handoff', screenshots, {
      transition: 'waiting-layout-customized',
      seat: waitingState.name,
      state: waitingCustomized,
    });
    await waitForLiveActivePage(activePage);
    await capture(activePage, 'active-seat-before-real-action', screenshots, {
      transition: 'ordinary-action-ready',
      seat: activeState.name,
    });

    const greeneryAction = await performGreeneryPlacement(activePage, activePlayer, screenshots);
    transitions.push({name: 'greenery-placement', ...greeneryAction});
    recordAssertion('committedGreeneryThroughVisibleConfirmation', greeneryAction.gameAgeDelta > 0, greeneryAction);
    recordAssertion(
      'greeneryChangedEngineAndMapState',
      greeneryAction.megacreditDelta === -23 && greeneryAction.oxygenDelta === 1 && greeneryAction.greeneryDelta === 1,
      greeneryAction,
    );
    recordAssertion('greeneryTargetCenterWasReachable', greeneryAction.centerPointTopmost.targetOwnsPoint === true, greeneryAction);

    const realAction = await performSellPatents(activePage, activePlayer, screenshots);
    transitions.push({name: 'real-action', ...realAction});
    recordAssertion('committedRealActionThroughUi', realAction.gameAgeDelta > 0, realAction);
    recordAssertion('realActionChangedEngineResources', realAction.handDelta === -1 && realAction.megacreditDelta === 1, realAction);

    const handoff = await observeAutomaticHandoff(activePlayer, waitingPlayer);
    transitions.push({name: 'seat-handoff', ...handoff});
    await waitForLiveActivePage(waitingPage);
    const waitingDomAfter = await browserSeatState(waitingPage);
    const waitingNavigationsAfter = mainFrameNavigations.get(waitingPlayer.id);
    await capture(waitingPage, 'waiting-seat-inspection-preserved-after-live-handoff', screenshots, {
      transition: 'live-polling-handoff-observed',
      seat: waitingState.name,
    });
    recordAssertion(
      'waitingSeatObservedLiveHandoffWithoutReload',
      handoff.after[0].active === false &&
        handoff.after[1].active === true &&
        waitingDomAfter.actionRootVisible === true &&
        waitingDomAfter.yourTurnVisible === true &&
        waitingDomAfter.url === waitingDomBefore.url &&
        waitingNavigationsAfter === waitingNavigationsBefore,
      {
        engine: handoff,
        dom: {before: waitingDomBefore, after: waitingDomAfter},
        mainFrameNavigations: {before: waitingNavigationsBefore, after: waitingNavigationsAfter},
      },
    );
    recordAssertion(
      'waitingSeatLayoutAndInspectionPersistedAcrossPolling',
      waitingCustomized.overlayOpen === true &&
        waitingDomAfter.overlayOpen === true &&
        waitingCustomized.activityRailWidth !== null &&
        Math.abs(waitingDomAfter.activityRailWidth - waitingCustomized.activityRailWidth) <= 2,
      {before: waitingCustomized, after: waitingDomAfter},
    );
    await waitingPage.keyboard.press('Escape');
    await waitingPage.locator('.tm-modal').waitFor({state: 'hidden'});
    await capture(waitingPage, 'waiting-seat-active-after-live-handoff', screenshots, {
      transition: 'live-polling-handoff-action-visible',
      seat: waitingState.name,
    });

    const firstPass = await passSeat(waitingPage, waitingPlayer, activePlayer, 'first-pass-selected', screenshots);
    transitions.push({name: 'first-pass', ...firstPass});
    recordAssertion('firstSeatPassRecorded', firstPass.passRecorded, firstPass);

    const originalDomBefore = await browserSeatState(activePage);
    const originalNavigationsBefore = mainFrameNavigations.get(activePlayer.id);
    await waitForLiveActivePage(activePage);
    const originalDomAfter = await browserSeatState(activePage);
    const originalNavigationsAfter = mainFrameNavigations.get(activePlayer.id);
    await capture(activePage, 'original-seat-active-after-live-handoff', screenshots, {
      transition: 'live-polling-return-handoff-observed',
      seat: activeState.name,
    });
    const afterFirstPass = await snapshotSeats([activePlayer, waitingPlayer]);
    recordAssertion(
      'originalSeatObservedLiveReturnWithoutReload',
      afterFirstPass[0].active === true &&
        afterFirstPass[1].active === false &&
        originalDomBefore.actionRootVisible === false &&
        originalDomAfter.actionRootVisible === true &&
        originalDomAfter.yourTurnVisible === true &&
        originalDomAfter.url === originalDomBefore.url &&
        originalNavigationsAfter === originalNavigationsBefore,
      {
        engine: afterFirstPass,
        dom: {before: originalDomBefore, after: originalDomAfter},
        mainFrameNavigations: {before: originalNavigationsBefore, after: originalNavigationsAfter},
      },
    );

    const generationBeforeSecondPass = afterFirstPass[0].generation;
    const secondPass = await passSeat(activePage, activePlayer, waitingPlayer, 'second-pass-selected', screenshots);
    transitions.push({name: 'second-pass', ...secondPass});
    recordAssertion('secondSeatPassRecorded', secondPass.passRecorded, secondPass);

    const generationTwoStates = await waitForSeatState(
      game.players,
      `generation ${generationBeforeSecondPass + 1}`,
      (states) => states.every((state) => state.generation >= generationBeforeSecondPass + 1),
    );
    const generationTwoActive = generationTwoStates.find((state) => state.active) ?? generationTwoStates[0];
    const generationTwoPage = pageByPlayerId.get(generationTwoActive.id);
    if (generationTwoActive.active) {
      await waitForLiveActivePage(generationTwoPage);
    }
    await capture(generationTwoPage, 'generation-two-live-state', screenshots, {
      transition: 'generation-advanced',
      seat: generationTwoActive.name,
      generation: generationTwoActive.generation,
    });
    const generationTwoDom = await browserSeatState(generationTwoPage);
    recordAssertion(
      'reachedNextGeneration',
      generationTwoStates.every((state) => state.generation >= generationBeforeSecondPass + 1),
      generationTwoStates,
    );
    recordAssertion(
      'generationTwoVisibleInBrowserDom',
      generationTwoDom.generationText?.trim().toUpperCase() === `GEN ${generationBeforeSecondPass + 1}`,
      {engine: generationTwoStates, dom: generationTwoDom},
    );

    for (const page of pageByPlayerId.values()) {
      await page.close();
    }
  } catch (error) {
    failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  } finally {
    if (browser !== null) await browser.close();
  }

  recordAssertion('noUnexpectedPageErrors', diagnostics.pageErrors.length === 0, diagnostics.pageErrors);
  recordAssertion('noUnexpectedConsoleErrors', diagnostics.consoleErrors.length === 0, diagnostics.consoleErrors);
  const currentLocalProvenance = await collectLocalProvenance();
  const currentRunnerSha = sha256(await fs.readFile(new URL(import.meta.url).pathname));
  recordAssertion(
    'runnerSourceUnchangedDuringJourney',
    provenance.local.runner.sha256 === currentRunnerSha,
    {recorded: provenance.local.runner.sha256, current: currentRunnerSha},
  );
  recordAssertion(
    'worktreeSourceUnchangedDuringJourney',
    provenance.local.git.dirtyTreeFingerprint === currentLocalProvenance.git.dirtyTreeFingerprint,
    {
      recorded: provenance.local.git.dirtyTreeFingerprint,
      current: currentLocalProvenance.git.dirtyTreeFingerprint,
    },
  );
  recordAssertion(
    'localBuildIdentityIsUsable',
    provenance.local.sourceBuildAlignment.status !== 'unknown' &&
      provenance.local.sourceBuildAlignment.status !== 'local-build-older-than-dirty-client-sources',
    provenance.local.sourceBuildAlignment,
  );
  const failedAssertions = Object.entries(assertions).filter(([, pass]) => pass !== true).map(([name]) => name);
  if (failure !== null || failedAssertions.length > 0) {
    for (const assertion of failedAssertions) {
      console.error(`${assertion}: ${JSON.stringify(assertionEvidence[assertion])}`);
    }
    throw new Error(
      failure?.message ??
      `Continuous flow failed assertions: ${failedAssertions.join(', ')}`,
    );
  }
  const nonPngFiles = (await fs.readdir(outputDir, {recursive: true, withFileTypes: true}))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() !== '.png')
    .map((entry) => entry.name);
  if (nonPngFiles.length > 0) {
    throw new Error(`Continuous-flow output directories may contain only PNG screenshots: ${nonPngFiles.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
