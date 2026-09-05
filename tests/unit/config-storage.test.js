import { test } from "node:test";
import assert from "node:assert/strict";
import { ELEMENT_IDS, fusionUltimate, LEVELS, STAGES, buildWaves } from "../../js/config.js";
import { normalizeSave, loadSave, writeSave } from "../../js/storage.js";
import { escapeHTML } from "../../js/ui.js";

test("all 28 chakra fusions are order-independent and have their named technique", () => {
  for (let i = 0; i < ELEMENT_IDS.length; i++) {
    for (let j = i + 1; j < ELEMENT_IDS.length; j++) {
      const a = ELEMENT_IDS[i], b = ELEMENT_IDS[j];
      const forward = fusionUltimate(a, b), backward = fusionUltimate(b, a);
      assert.equal(forward.name, backward.name);
      assert.notEqual(forward.name, "Jutsu Secreto", `${a}+${b}`);
      assert.equal(forward.statuses.length, 2);
    }
  }
});

test("30 missions preserve six environments, waves and bosses", () => {
  assert.equal(LEVELS.length, 30); assert.equal(STAGES.length, 6);
  assert.equal(LEVELS.filter((level) => level.boss).length, 6);
  for (const level of LEVELS) {
    assert.ok(STAGES.includes(level.stage));
    assert.equal(buildWaves(level, true).length, 1);
    for (const wave of buildWaves(level)) {
      assert.equal(new Set(wave.appearance.elements).size, 2);
      assert.ok(wave.hp > 0);
    }
  }
});

test("old, absent and malformed saves migrate to Naruto without breaking progress", () => {
  const save = normalizeSave({ unlocked: 11, completed: [1, 2, 2, 31, "3"], appearance: { name: "Mi ninja", elements: ["invalid", "fire"], skin: 12, hairColor: "not a color" }, settings: { quality: "unknown", touchScale: 4 } });
  assert.equal(save.appearance.model, "naruto"); assert.equal(save.appearance.name, "Mi ninja");
  assert.equal(save.unlocked, 11); assert.deepEqual(save.completed, [1, 2]);
  assert.equal(save.appearance.elements.length, 2); assert.equal(save.appearance.skin, "#f0c7a0");
  assert.equal(save.settings.touchScale, 1.15);
  for (const data of [null, [], 22, "invalid", { appearance: { elements: {} }, settings: [] }]) {
    assert.equal(normalizeSave(data).appearance.model, "naruto");
  }
  assert.equal(normalizeSave({ appearance: { model: "custom" } }).appearance.model, "custom");
});

test("storage failure does not interrupt gameplay and user names are escaped", () => {
  globalThis.localStorage = { getItem() { throw new Error("Denied"); }, setItem() { throw new Error("Quota"); } };
  assert.equal(loadSave(), null); assert.equal(writeSave({}), false);
  assert.equal(escapeHTML('<img src=x onerror="bad()">&'), '&lt;img src=x onerror=&quot;bad()&quot;&gt;&amp;');
  delete globalThis.localStorage;
});
