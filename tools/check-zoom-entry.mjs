import assert from 'node:assert/strict';
import { URL } from 'node:url';

// Use a separately installed Playwright; no browser tooling ships with the game.
const { chromium } = await import(process.argv[2] ?? 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
const errors = [];
try {
  for (const portrait of [false, true]) {
    const context = await browser.newContext({
      viewport: portrait ? { width: 375, height: 812 } : { width: 812, height: 375 },
      isMobile: true, hasTouch: true,
    });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.argv[4] ?? 'http://127.0.0.1:4193');
    await page.waitForFunction(() => globalThis.game?.scene.isActive('MainMenuScene'));
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    assert.doesNotMatch(viewportMeta, /maximum-scale|user-scalable/);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    await page.waitForFunction(() => globalThis.visualViewport.scale === 2);
    assert.equal(await page.locator('#landing, #start-game').count(), 0);
    assert.equal(await page.evaluate(() => globalThis.getComputedStyle(globalThis.document.body).touchAction), 'auto');
    // The menu retains its existing keyboard entry at any zoom level.
    await page.keyboard.press('Space');
    await page.waitForFunction(() => globalThis.game?.scene.getScene('GameScene')?.player);
    if (portrait) await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForFunction(() => globalThis.game.scene.isActive('GameScene'));
    await page.waitForFunction(() => {
      const rect = globalThis.document.querySelector('canvas').getBoundingClientRect();
      const v = globalThis.visualViewport;
      return rect.width > 0 && rect.height > 0
        && Math.abs(rect.left - v.offsetLeft) < 1 && Math.abs(rect.top - v.offsetTop) < 1
        && rect.right <= v.offsetLeft + v.width + 0.01
        && rect.bottom <= v.offsetTop + v.height + 0.01;
    }, null, { timeout: 5000 });
    const state = await page.evaluate(() => {
      const game = globalThis.game;
      const scene = game.scene.getScene('GameScene');
      const rect = game.canvas.getBoundingClientRect();
      const v = globalThis.visualViewport;
      const visible = rect => rect.left >= v.offsetLeft - 1 && rect.top >= v.offsetTop - 1
        && rect.right <= v.offsetLeft + v.width + 1 && rect.bottom <= v.offsetTop + v.height + 1;
      const inCanvas = bounds => bounds.left >= 0 && bounds.top >= 0
        && bounds.right <= game.scale.width && bounds.bottom <= game.scale.height;
      return {
        scale: v.scale, width: v.width, height: v.height,
        canvas: { width: rect.width, height: rect.height },
        playerVisible: scene.player.visible && inCanvas(scene.player.getBounds()),
        joystickVisible: scene.touch.base.visible && inCanvas(scene.touch.base.getBounds()),
        buttonsVisible: scene.touch.buttons.every(({ circle }) => circle.visible && inCanvas(circle.getBounds())),
        fullscreenVisible: visible(globalThis.document.querySelector('#fullscreen-btn').getBoundingClientRect()),
      };
    });
    assert.ok(state.playerVisible && state.joystickVisible && state.buttonsVisible && state.fullscreenVisible,
      JSON.stringify(state));
    console.log(`PASS: ${portrait ? 'portrait entry then rotation' : 'landscape entry'} from 2x zoom`, state);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await page.waitForFunction(() => {
      const rect = globalThis.game.canvas.getBoundingClientRect();
      return rect.width === 812 && rect.height === 375 && rect.x === 0 && rect.y === 0;
    });
    await page.locator('#fullscreen-btn').click();
    await page.waitForFunction(() => globalThis.document.fullscreenElement?.id === 'game-root');
    await page.evaluate(() => globalThis.document.exitFullscreen());
    console.log('PASS: unzoomed sizing and fullscreen entry/exit');
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
