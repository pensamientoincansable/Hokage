import { test, expect } from "@playwright/test";
import { boot, runtimeErrors, quickFight, center, placeInRange } from "./helpers.js";

test("touch controls stay inside 320px phones, landscape, and tablets, including larger buttons", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page, { touchScale: 1.15 }); await quickFight(page);
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.locator('[data-act="resume"]').tap();
    await expect(page.locator("#touch")).toBeVisible();
    const boxes = await page.locator('#touch [data-input], #touch [data-joystick]').evaluateAll((nodes) => nodes.map((node) => {
      const b = node.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, name: node.dataset.input || "stick" };
    }));
    for (const box of boxes) {
      expect(box.x, `${width}: ${box.name}`).toBeGreaterThanOrEqual(0);
      expect(box.y, `${width}: ${box.name}`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w, `${width}: ${box.name}`).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.h, `${width}: ${box.name}`).toBeLessThanOrEqual(height + 1);
      expect(box.w).toBeGreaterThanOrEqual(44); expect(box.h).toBeGreaterThanOrEqual(44);
    }
    const stick = boxes.find((box) => box.name === "stick");
    const attacks = boxes.filter((box) => box.name !== "stick");
    expect(stick.x + stick.w + 4).toBeLessThan(Math.min(...attacks.map((box) => box.x)));
  }
  expect(errors).toEqual([]);
});

test("a real multi-touch joystick + attack works, release/cancel never sticks", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page); await quickFight(page); await placeInRange(page);
  const cdp = await page.context().newCDPSession(page);
  const stick = await page.locator('[data-joystick]').boundingBox();
  const position = { x: stick.x + stick.width * 0.84, y: stick.y + stick.height / 2, id: 1 };
  const attack = { ...await center(page.locator('[data-input="light"]')), id: 2 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [position] });
  await expect.poll(() => page.evaluate(() => __hokage.input.axis())).toBeGreaterThan(0.5);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [position, attack] });
  await expect.poll(() => page.evaluate(() => __hokage.testEvents.some((event) => event.move === "light"))).toBe(true);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [attack] });
  await expect.poll(() => page.evaluate(() => __hokage.input.isDown("light"))).toBe(false);
  expect(await page.evaluate(() => __hokage.input.axis())).toBeGreaterThan(0.5);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => __hokage.input.axis())).toBe(0);
  expect(await page.evaluate(() => __hokage.input.pointers.size)).toBe(0);
  expect(errors).toEqual([]);
});

test("guard, jump and accessible pause work; losing focus clears all touches and freezes time", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page); await quickFight(page);
  const cdp = await page.context().newCDPSession(page);
  const block = { ...await center(page.locator('[data-input="block"]')), id: 1 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [block] });
  await expect.poll(() => page.evaluate(() => __hokage.match.p1.blocking)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("dialog")).toBeVisible();
  const frozen = await page.evaluate(() => [__hokage.match.time, __hokage.stage.time]);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => [__hokage.match.time, __hokage.stage.time])).toEqual(frozen);
  expect(await page.evaluate(() => __hokage.input.isDown("block"))).toBe(false);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await page.locator('[data-act="resume"]').tap();
  await page.locator('[data-input="up"]').tap();
  await expect.poll(() => page.evaluate(() => __hokage.testEvents.some((event) => event.type === "jump"))).toBe(true);
  await page.getByRole("button", { name: "Pausar combate" }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#touch")).toBeHidden();
  expect(errors).toEqual([]);
});

test("touch preference can be disabled and re-enabled independent of viewport width", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page); await page.locator('[data-go="settings"]').tap();
  await page.locator('[data-set="touchControls"]').selectOption("off");
  await page.locator('[data-go="menu"]').tap(); await quickFight(page);
  await expect(page.locator("#touch")).toBeHidden();
  await page.getByRole("button", { name: "Pausar combate" }).tap();
  await page.locator('[data-go="menu"]').tap();
  await page.locator('[data-go="settings"]').tap();
  await page.locator('[data-set="touchControls"]').selectOption("on");
  await page.locator('[data-go="menu"]').tap(); await quickFight(page);
  await expect(page.locator("#touch")).toBeVisible();
  expect(errors).toEqual([]);
});
