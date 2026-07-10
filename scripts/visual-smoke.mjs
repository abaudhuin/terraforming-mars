#!/usr/bin/env node

import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = (process.env.TM_BASE_URL ?? 'http://localhost:8081').replace(/\/$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(process.env.TM_VISUAL_OUT ?? `visual-smoke-artifacts/${stamp}`);
const headless = process.env.TM_HEADED !== '1';
const slowMo = Number.parseInt(process.env.TM_SLOWMO ?? '0', 10) || 0;
const viewport = {
  width: Number.parseInt(process.env.TM_VIEWPORT_WIDTH ?? '1920', 10) || 1920,
  height: Number.parseInt(process.env.TM_VIEWPORT_HEIGHT ?? '1080', 10) || 1080,
};

let screenshotIndex = 1;
const screenshots = [];

async function screenshot(page, name) {
  const file = path.join(outputDir, `${String(screenshotIndex).padStart(2, '0')}-${name}.png`);
  screenshotIndex += 1;
  await page.screenshot({path: file, fullPage: true});
  screenshots.push(file);
  return file;
}

function pageURL(pathname) {
  return `${baseURL}${pathname}`;
}

async function bodyText(page) {
  return page.locator('body').innerText({timeout: 10_000});
}

async function setCheckbox(page, selector, checked) {
  const input = page.locator(selector);
  if (await input.count() === 0) return;
  if (await input.isChecked() !== checked) {
    await page.locator(`label[for="${selector.slice(1)}"]`).click();
  }
}

async function attachDiagnostics(page, label, diagnostics) {
  page.on('pageerror', (error) => {
    const message = error.message;
    if (!message.includes('ServiceWorker') && !message.includes('sw.js')) {
      diagnostics.pageErrors.push({label, message});
    }
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!text.includes('sw.js') && !text.includes('404')) {
      diagnostics.consoleErrors.push({label, text});
    }
  });
}

async function ensureServerReachable() {
  let response;
  try {
    response = await fetch(pageURL('/'));
  } catch (error) {
    throw new Error(`Cannot reach ${baseURL}. Start the app first, for example: PORT=8081 npm start. ${error}`);
  }
  if (!response.ok) {
    throw new Error(`Expected ${baseURL} to return 2xx, got ${response.status}`);
  }
}

async function createTwoPlayerGame(page) {
  await page.goto(pageURL('/'), {waitUntil: 'networkidle'});
  await screenshot(page, 'home');

  await page.goto(pageURL('/new-game'), {waitUntil: 'networkidle'});
  await page.locator('label[for="2-radio"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.create-game-player-name').length === 2);

  await setCheckbox(page, '#draft-checkbox', false);
  await setCheckbox(page, '#initialDraft-checkbox', false);
  await setCheckbox(page, '#randomFirstPlayer-checkbox', false);

  const firstPlayer = page.locator('input[name="firstIndex"][value="1"]');
  if (await firstPlayer.count() === 1 && !await firstPlayer.isChecked()) {
    await firstPlayer.check({force: true});
  }

  const names = page.locator('.create-game-player-name');
  await names.nth(0).fill('Alice');
  await names.nth(1).fill('Bob');
  await screenshot(page, 'two-player-config');

  await Promise.all([
    page.waitForURL(/\/game\?id=/, {timeout: 15_000}),
    page.getByRole('button', {name: 'Create game'}).click(),
  ]);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'created-game-links');

  const game = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')].map((link) => {
      return {
        text: link.textContent?.trim() ?? '',
        href: link.href,
      };
    });
    return {
      title: document.title,
      url: location.href,
      players: links.filter((link) => link.href.includes('/player?id=')),
      spectators: links.filter((link) => link.href.includes('/spectator?id=')),
    };
  });

  if (game.players.length !== 2) {
    throw new Error(`Expected two player links after game creation, found ${game.players.length}`);
  }
  if (game.spectators.length !== 1) {
    throw new Error(`Expected one spectator link after game creation, found ${game.spectators.length}`);
  }
  return game;
}

async function submitInitialSetup(context, player, diagnostics) {
  const page = await context.newPage();
  await attachDiagnostics(page, player.text, diagnostics);
  await page.goto(player.href, {waitUntil: 'networkidle'});
  await screenshot(page, `${player.text.toLowerCase()}-initial-selection`);

  if ((await bodyText(page)).includes('Select initial cards:')) {
    const corporationCards = page.locator('label.cardbox').filter({has: page.locator('.card-title.is-corporation')});
    const corporationCount = await corporationCards.count();
    if (corporationCount === 0) {
      throw new Error(`No corporation cards found for ${player.text}`);
    }

    await corporationCards.first().click();
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('button')]
        .some((button) => button.textContent?.trim() === 'Start' && !button.disabled);
    });
    await screenshot(page, `${player.text.toLowerCase()}-corporation-selected`);
    await page.getByRole('button', {name: 'Start'}).click();
    await page.waitForTimeout(250);

    if ((await bodyText(page)).includes('Continue without buying any project cards?')) {
      await page.getByRole('button', {name: 'Yes'}).click();
    }

    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return !text.includes('Select initial cards:') || text.includes('Your selected cards:');
    }, undefined, {timeout: 15_000});
  }

  await screenshot(page, `${player.text.toLowerCase()}-setup-submitted`);
  const text = await bodyText(page);
  const tableReady = await page.locator('#player-home.tm-player-table:not(.tm-player-table--setup) .tm-card-desk').count() > 0;
  await page.close();
  return {
    player: player.text,
    setupSubmitted: tableReady || text.includes('Your selected cards:') || text.includes('Actions'),
  };
}

async function openPlayer(context, player, diagnostics) {
  const page = await context.newPage();
  await attachDiagnostics(page, player.text, diagnostics);
  await page.goto(player.href, {waitUntil: 'networkidle'});
  return page;
}

async function clickCorporationFirstActionIfPresent(page) {
  const actions = page.locator('.player_home_block--actions');
  if (await actions.count() === 0) return false;

  const buttons = actions.locator('button:not(.tm-hand-open-button):not(.tm-panel-icon-button):not(.tm-section-expand-button)');
  const labels = (await buttons.allTextContents()).map((text) => text.trim());
  const actionIndex = labels.findIndex((text) => text.length > 0 && text !== 'Confirm' && text !== 'Hand');
  if (actionIndex === -1) return false;

  await buttons.nth(actionIndex).click();
  await page.waitForTimeout(1_000);
  return true;
}

async function closeModalIfOpen(page) {
  const close = page.locator('.tm-modal-close').first();
  if (await close.count() === 0) return false;
  await close.click();
  await page.waitForTimeout(300);
  return true;
}

async function resolveMapSelectionIfPresent(page) {
  const text = await bodyText(page);
  if (!text.includes('Select space')) return false;

  const spaces = page.locator('.board-space--available');
  if (await spaces.count() === 0) return false;

  await spaces.first().click({force: true});
  await page.waitForTimeout(250);

  const confirm = page.getByRole('button', {name: 'Yes'});
  if (await confirm.count() > 0) {
    await confirm.click();
  }
  await page.waitForTimeout(1_000);
  return true;
}

async function passForGeneration(page) {
  await closeModalIfOpen(page);
  const actions = page.locator('.player_home_block--actions');
  if (await actions.count() === 0) return false;
  if (!(await bodyText(page)).includes('Pass for this generation')) return false;

  const passTile = actions.locator('label.form-radio').filter({hasText: 'Pass for this generation'}).first();
  await passTile.click();
  await page.waitForTimeout(150);
  const confirm = actions
    .locator('.wf-command-submit--selected-option .wf-command-inline-submit')
    .filter({hasText: /pass/i})
    .first();
  if (await confirm.count() > 0) {
    await confirm.click();
  } else {
    const legacyConfirm = passTile.locator('.wf-command-inline-submit, button.btn-submit');
    if (await legacyConfirm.count() > 0) {
      await legacyConfirm.first().click();
    } else {
      const legacyActionConfirm = actions.locator('button.btn-submit').filter({hasText: /^pass$/i}).first();
      if (await legacyActionConfirm.count() > 0) {
        await legacyActionConfirm.click();
      } else {
        return false;
      }
    }
  }
  await page.waitForTimeout(1_500);
  return true;
}

async function main() {
  await fs.mkdir(outputDir, {recursive: true});
  await ensureServerReachable();

  const diagnostics = {
    consoleErrors: [],
    pageErrors: [],
  };

  const browser = await chromium.launch({headless, slowMo});
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });

  try {
    const createPage = await context.newPage();
    await attachDiagnostics(createPage, 'create-game', diagnostics);
    const game = await createTwoPlayerGame(createPage);
    await createPage.close();

    const setupResults = [];
    for (const player of game.players) {
      setupResults.push(await submitInitialSetup(context, player, diagnostics));
    }

    const alice = game.players.find((player) => player.text === 'Alice') ?? game.players[0];
    const bob = game.players.find((player) => player.text === 'Bob') ?? game.players[1];

    const alicePage = await openPlayer(context, alice, diagnostics);
    await screenshot(alicePage, 'alice-active-after-setup');
    const alicePassed = await passForGeneration(alicePage);
    await screenshot(alicePage, 'alice-after-pass');
    await alicePage.close();

    const bobPage = await openPlayer(context, bob, diagnostics);
    await screenshot(bobPage, 'bob-active-after-alice-pass');
    const bobTookFirstAction = await clickCorporationFirstActionIfPresent(bobPage);
    if (bobTookFirstAction) {
      await screenshot(bobPage, 'bob-after-corporation-first-action');
      if (await resolveMapSelectionIfPresent(bobPage)) {
        await screenshot(bobPage, 'bob-after-map-selection');
      }
    }
    const bobPassed = await passForGeneration(bobPage);
    await screenshot(bobPage, 'bob-after-pass');
    const bobTextAfterPass = await bodyText(bobPage);
    await bobPage.close();

    const finalPage = await openPlayer(context, alice, diagnostics);
    await screenshot(finalPage, 'alice-generation-two');
    const finalText = await bodyText(finalPage);
    await finalPage.close();
    const reachedGenerationTwo = (text) => /\bGEN\s+2\b/.test(text) || /\bGeneration\s+2\b/.test(text);

    const summary = {
      baseURL,
      outputDir,
      gameURL: game.url,
      players: game.players,
      spectators: game.spectators,
      setupResults,
      actions: {
        alicePassed,
        bobTookFirstAction,
        bobPassed,
      },
      assertions: {
        createdTwoPlayers: game.players.length === 2,
        hasSpectatorLink: game.spectators.length === 1,
        submittedBothSetups: setupResults.every((result) => result.setupSubmitted),
        reachedGenerationTwo: reachedGenerationTwo(finalText) || reachedGenerationTwo(bobTextAfterPass),
      },
      diagnostics,
      screenshots,
    };

    const failed = Object.entries(summary.assertions)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

    await fs.writeFile(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

    if (failed.length > 0 || diagnostics.pageErrors.length > 0) {
      console.error(JSON.stringify(summary, null, 2));
      throw new Error(`Visual smoke failed: ${failed.join(', ') || 'page errors captured'}`);
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
