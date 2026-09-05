import { test, expect } from "@playwright/test";
import { boot, runtimeErrors, quickFight, readyFight, placeInRange } from "./helpers.js";

test("loads real Naruto and the instanced Niko city without authoring files or external CDNs", async ({ page }) => {
  const errors = runtimeErrors(page);
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await boot(page);
  const assets = await page.evaluate(() => {
    const game = window.__hokage;
    let skins = 0, instances = 0;
    game.playerNinja.root.traverse((node) => { if (node.isSkinnedMesh) skins++; });
    game.stage.group.traverse((node) => { if (node.isInstancedMesh) instances++; });
    return { model: game.playerNinja.modelType, skins, instances, height: game.playerNinja.model.userData.height };
  });
  expect(assets.model).toBe("naruto"); expect(assets.skins).toBe(4); expect(assets.instances).toBeGreaterThan(10);
  await expect(page.locator("#touch")).toHaveCount(0);
  expect(requests.some((url) => /\.fbx|\.blend|model\.dae/.test(url))).toBe(false);
  expect(requests.filter((url) => new URL(url).origin !== new URL(page.url()).origin)).toEqual([]);
  expect(errors).toEqual([]);
});

test("PC movement, martial attacks, keyboard pause and resume work", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page); await quickFight(page);
  await expect(page.locator("#touch")).toBeHidden();
  const before = await page.evaluate(() => __hokage.match.p1.x);
  await page.keyboard.down("ArrowRight");
  await expect.poll(() => page.evaluate(() => __hokage.match.p1.x)).toBeGreaterThan(before + 0.15);
  await page.keyboard.up("ArrowRight");
  await placeInRange(page);
  await page.keyboard.press("KeyJ");
  await expect.poll(() => page.evaluate(() => __hokage.testEvents.some((event) => event.type === "attack" && event.move === "light"))).toBe(true);
  await expect.poll(() => page.evaluate(() => __hokage.match.p2.hp)).toBeLessThan(50);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Juego en pausa" })).toBeVisible();
  const time = await page.evaluate(() => __hokage.match.time);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => __hokage.match.time)).toBe(time);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => __hokage.input.axis())).toBe(0);
  expect(errors).toEqual([]);
});

test("remapping persists, help reflects it, and typing a name never triggers gameplay", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page);
  await page.locator('[data-go="editor"]').click();
  await page.locator('[data-name]').fill('<Naruto "&">');
  expect(await page.evaluate(() => __hokage.input.axis())).toBe(0);
  await page.locator('[data-act="saveChar"]').click();
  await page.locator('[data-go="settings"]').click();
  await page.locator('[data-bind="light"]').click(); await page.keyboard.press("KeyF");
  await expect(page.locator('[data-bind="light"]')).toHaveText("F");
  await page.locator('[data-bind="heavy"]').click(); await page.keyboard.press("Escape");
  await expect(page.locator('[data-bind="heavy"]')).toHaveText("K");
  await page.reload(); await expect(page.locator("#menu")).toBeVisible();
  await quickFight(page);
  await expect(page.locator("#p1-name")).toHaveText('<Naruto "&">');
  await expect(page.locator("#help")).toContainText("F/K/L taijutsu");
  await placeInRange(page); await page.keyboard.press("KeyF");
  await expect.poll(() => page.evaluate(() => __hokage.testEvents.some((event) => event.move === "light"))).toBe(true);
  expect(errors).toEqual([]);
});

test("Naruto editor preserves the original appearance and offers the legacy custom fighter", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page); await page.locator('[data-go="editor"]').click();
  await expect(page.locator('[data-tab="cabello"]')).toHaveCount(0);
  for (const move of ["light", "heavy", "kick", "crouchLight", "airKick"]) {
    await page.locator(`[data-preview="${move}"]`).click();
    expect(await page.evaluate(() => __hokage.playerNinja.animator.state)).toBe(move);
  }
  await page.locator('[data-k="model"][data-v="custom"]').click();
  await expect(page.locator('[data-tab="cabello"]')).toBeVisible();
  expect(await page.evaluate(() => __hokage.playerNinja.modelType)).toBe("custom");
  await page.locator('[data-k="model"][data-v="naruto"]').click();
  expect(await page.evaluate(() => __hokage.playerNinja.modelType)).toBe("naruto");
  expect(errors).toEqual([]);
});

test("quality switches update the city and dispose/re-enable bloom", async ({ page }) => {
  const errors = runtimeErrors(page);
  await page.setViewportSize({ width: 800, height: 520 });
  await boot(page); await page.locator('[data-go="settings"]').click();
  await page.locator('[data-set="quality"]').selectOption("alta");
  await expect.poll(() => page.evaluate(() => !!__hokage.renderer.composer)).toBe(true);
  expect(await page.evaluate(() => __hokage.stage.q.buildings)).toBe(26);
  await page.locator('[data-set="quality"]').selectOption("baja");
  expect(await page.evaluate(() => __hokage.renderer.composer === null && !__hokage.renderer.renderer.shadowMap.enabled)).toBe(true);
  expect(await page.evaluate(() => __hokage.stage.q.buildings)).toBe(12);
  await page.locator('[data-set="quality"]').selectOption("alta");
  await expect.poll(() => page.evaluate(() => !!__hokage.renderer.composer)).toBe(true);
  expect(errors).toEqual([]);
});

test("all six environments render and repeated restarts do not accumulate GPU resources", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page); await quickFight(page);
  for (let id = 1; id <= 6; id++) {
    await page.evaluate((level) => __hokage.startLevel(level, true), id);
    await readyFight(page);
    const stats = await page.evaluate(() => {
      __hokage.renderer.render();
      return { name: __hokage.stage.group.name, calls: __hokage.renderer.renderer.info.render.calls };
    });
    expect(stats.name).toContain(["street", "rooftop", "alley", "station", "bridge", "plaza"][id - 1]);
    expect(stats.calls).toBeLessThan(260);
  }
  await page.evaluate(() => __hokage.startLevel(1, true)); await readyFight(page);
  const memory = () => page.evaluate(() => { __hokage.renderer.render(); return { ...__hokage.renderer.renderer.info.memory }; });
  const baseline = await memory();
  for (let i = 0; i < 3; i++) { await page.evaluate(() => __hokage.startLevel(1, true)); await readyFight(page); }
  const after = await memory();
  expect(after.geometries).toBeLessThanOrEqual(baseline.geometries + 2);
  expect(after.textures).toBeLessThanOrEqual(baseline.textures + 2);
  expect(errors).toEqual([]);
});

test("campaign advances through waves, rewards and the next unlocked mission", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page); await page.locator('[data-go="campaign"]').click();
  await page.locator('[data-level="1"]').click(); await readyFight(page);
  await page.evaluate(() => { const g = __hokage; g.match.applyHit(g.match.p2, g.match.p1, 999, 0.3, 2, false); });
  await expect.poll(() => page.evaluate(() => __hokage.mode)).toBe("interlude");
  expect(await page.evaluate(() => __hokage.match.pickups.length)).toBeGreaterThan(0);
  await page.waitForFunction(() => __hokage.waveIndex === 1 && __hokage.mode === "fight");
  await readyFight(page);
  await page.evaluate(() => { const g = __hokage; g.match.applyHit(g.match.p2, g.match.p1, 999, 0.3, 2, false); });
  await expect(page.getByText("MISIÓN CUMPLIDA", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => __hokage.save.unlocked)).toBe(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("hokage.save.v1")).completed)).toContain(1);
  await page.locator('[data-act="next"]').click(); await readyFight(page);
  expect(await page.evaluate(() => __hokage.level.id)).toBe(2);
  expect(errors).toEqual([]);
});

test("a newer level request cancels an obsolete intro", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page);
  await page.evaluate(() => Promise.all([__hokage.startLevel(1, true), __hokage.startLevel(2, true)]));
  await readyFight(page);
  expect(await page.evaluate(() => ({ id: __hokage.level.id, stage: __hokage.stage.definition.id, enemies: __hokage.renderer.scene.children.filter((node) => node === __hokage.enemyNinja.root).length }))).toEqual({ id: 2, stage: "rooftop", enemies: 1 });
  expect(errors).toEqual([]);
});

test("missing model shows a useful retry screen instead of a broken fight", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("hokage.save.v1", JSON.stringify({ settings: { quality: "baja", music: 0, sfx: 0 } })));
  await page.route("**/*naruto*.glb", (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await page.goto("/");
  await expect(page.locator("#boot-error")).toContainText("Naruto");
  await expect(page.getByRole("button", { name: "Volver a intentar" })).toBeVisible();
  await page.unroute("**/*naruto*.glb");
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await expect(page.locator("#menu")).toBeVisible();
});

test("the camera keeps a high jump and the grounded opponent in frame", async ({ page }) => {
  const errors = runtimeErrors(page);
  await boot(page); await quickFight(page); await placeInRange(page);
  await page.keyboard.down("Space");
  await page.waitForFunction(() => __hokage.match.p1.y > 2.5);
  const projected = await page.evaluate(() => {
    const game = __hokage;
    const top = game.match.p1.ninja.root.position.clone(); top.y += 2.2;
    const ground = game.match.p2.ninja.root.position.clone();
    return { top: top.project(game.renderer.camera).y, ground: ground.project(game.renderer.camera).y };
  });
  expect(projected.top).toBeLessThan(0.95);
  expect(projected.ground).toBeGreaterThan(-0.95);
  await page.keyboard.up("Space");
  expect(errors).toEqual([]);
});
