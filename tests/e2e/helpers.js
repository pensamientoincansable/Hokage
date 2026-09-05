import { expect } from "@playwright/test";

export async function boot(page, settings = {}) {
  await page.addInitScript((overrides) => {
    if (!localStorage.getItem("hokage.save.v1")) localStorage.setItem("hokage.save.v1", JSON.stringify({ settings: { quality: "baja", music: 0, sfx: 0, ...overrides } }));
  }, settings);
  await page.goto("/");
  await expect(page.locator("#menu")).toBeVisible();
}

export function runtimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

export async function readyFight(page) {
  await page.waitForFunction(() => window.__hokage.mode === "fight");
  await page.evaluate(() => {
    const game = window.__hokage;
    game.match.intro = 0;
    game.ai.input = () => ({}); // Deterministic opponent, real input/combat/render loop.
    game.testEvents = [];
    const original = game.match.onEvent;
    game.match.onEvent = (event) => { game.testEvents.push({ type: event.type, move: event.move }); original(event); };
  });
}

export async function quickFight(page) {
  await page.locator('[data-go="versus"]').click();
  await readyFight(page);
}

export async function placeInRange(page) {
  await page.evaluate(() => {
    const { p1, p2 } = window.__hokage.match;
    p1.x = 0; p2.x = 1;
    for (const fighter of [p1, p2]) {
      fighter.y = fighter.vx = fighter.vy = fighter.animLock = fighter.hitstun = fighter.blockstun = 0;
      fighter.freeze = fighter.invuln = 0; fighter.blocking = false; fighter.move = null; fighter.pendingSpec = null;
      fighter.bufferedAction = null; fighter.state = "idle"; fighter.ninja.animator.reset(); fighter.sync();
    }
  });
}

export async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Control not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
