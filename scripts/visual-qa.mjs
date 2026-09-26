import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
});
const baseUrl = process.env.QA_URL ?? 'http://localhost:5173';
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
page.on('requestfailed', (request) => errors.push(`REQUEST ${request.url()} ${request.failure()?.errorText ?? ''}`));

await mkdir('.artifacts', { recursive: true });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.locator('.app-shell').waitFor({ timeout: 12_000 }).catch(async () => {
  console.log(JSON.stringify({ url: page.url(), body: await page.locator('body').innerText(), errors }, null, 2));
  await page.screenshot({ path: '.artifacts/table-debug.png', fullPage: true });
  throw new Error('App shell did not load');
});
await page.screenshot({ path: '.artifacts/table-betting.png', fullPage: true });
console.log(JSON.stringify({ body: (await page.locator('body').innerText()).slice(0, 1200), htmlLength: (await page.content()).length, errors }, null, 2));

await page.locator('.poker-chip.teal').click({ timeout: 5_000 });
await page.locator('.deal-button').click();
await page.waitForTimeout(1600);
await page.screenshot({ path: '.artifacts/table-playing.png', fullPage: true });

const hit = page.locator('.game-action.primary');
if (await hit.isEnabled()) {
  await hit.click();
  await page.waitForTimeout(900);
}
await page.screenshot({ path: '.artifacts/table-after-hit.png', fullPage: true });

const stand = page.locator('.game-action.secondary').filter({ hasText: 'STAND' });
if (await stand.isEnabled()) await stand.click();
await page.locator('.deal-button').waitFor({ state: 'visible', timeout: 10_000 });
await page.screenshot({ path: '.artifacts/table-settled.png', fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: '.artifacts/table-mobile.png', fullPage: true });

const state = {
  title: await page.title(),
  playerHand: await page.locator('.player-zone .playing-card').count(),
  dealerHand: await page.locator('.dealer-zone .playing-card').count(),
  visibleActions: await page.locator('.game-action:visible').count(),
  settled: await page.locator('.deal-button').innerText(),
  errors,
};
console.log(JSON.stringify(state, null, 2));
await browser.close();
