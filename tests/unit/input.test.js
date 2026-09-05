import { test } from "node:test";
import assert from "node:assert/strict";
import { Input } from "../../js/input.js";

function setup() {
  let time = 1000;
  const target = new EventTarget();
  const doc = new EventTarget();
  const input = new Input({ target, doc, now: () => time });
  input.setEnabled(true);
  const key = (code, down = true, options = {}) => input.onKey({ code, repeat: false, preventDefault() {}, ...options }, down);
  return { input, key, target, doc, advance: (ms) => { time += ms; } };
}

test("WASD, arrows and Space have equivalent actions without key-repeat edges", () => {
  const { input, key } = setup();
  key("ArrowRight"); assert.equal(input.axis(), 1);
  key("Space"); assert.equal(input.wasPressed("up"), true);
  input.endFrame(); key("Space", true, { repeat: true });
  assert.equal(input.wasPressed("up"), false);
  key("Space", false); assert.equal(input.wasReleased("up"), true);
  key("KeyA"); assert.equal(input.axis(), 0);
});

test("typing in forms never moves the player or prevents text entry", () => {
  const { input, key } = setup();
  let prevented = false;
  key("KeyA", true, { target: { closest: () => ({}) }, preventDefault: () => { prevented = true; } });
  assert.equal(input.axis(), 0);
  assert.equal(prevented, false);
});

test("remapping swaps occupied keys, explicit binds override aliases, Escape cancels", () => {
  const { input, key } = setup();
  let value;
  input.remap("light", (code) => { value = code; });
  key("KeyK");
  assert.equal(value, "KeyK");
  assert.equal(input.binds.heavy, "KeyJ");
  input.remap("light", () => {}); key("ArrowLeft");
  key("ArrowLeft");
  assert.equal(input.wasPressed("light"), true);
  assert.equal(input.axis(), 0);
  input.remap("heavy", (code) => { value = code; }); key("Escape");
  assert.equal(value, null);
  assert.equal(input.listen, null);
  assert.equal(input.wasPressed("pause"), false);
});

test("duplicate legacy bindings are repaired to unique, usable codes", () => {
  const { input } = setup();
  input.setBinds({ left: "KeyD", right: "KeyD", heavy: "KeyJ" });
  const values = Object.values(input.binds);
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.every((value) => typeof value === "string"));
});

test("two fingers on one action do not release each other", () => {
  const { input } = setup();
  input.setSource(1, ["block"]); input.setSource(2, ["block"]);
  input.endFrame(); input.setSource(1, []);
  assert.equal(input.isDown("block"), true);
  assert.equal(input.wasReleased("block"), false);
  input.setSource(2, []);
  assert.equal(input.wasReleased("block"), true);
});

test("releasing a finger does not release a still-held keyboard action", () => {
  const { input, key } = setup();
  key("KeyW"); input.setSource(1, ["up"]); input.endFrame();
  input.setSource(1, []);
  assert.equal(input.wasReleased("up"), false);
  key("KeyW", false);
  assert.equal(input.wasReleased("up"), true);
});

test("double-tap dash measures elapsed time, independent of rendering frame rate", () => {
  const { input, key, advance } = setup();
  key("KeyD"); assert.equal(input.dashTap(), 0); input.endFrame(); key("KeyD", false);
  advance(200); key("KeyD"); assert.equal(input.dashTap(), 1);
  input.endFrame(); key("KeyD", false); advance(20); key("KeyD");
  assert.equal(input.dashTap(), 0, "a triple tap is not two dashes");
  input.endFrame(); key("KeyD", false); advance(400); key("KeyD");
  assert.equal(input.dashTap(), 0);
});

test("blur, hidden tabs and disabled gameplay clear all held and pending input", () => {
  const { input, key, target, doc } = setup();
  for (const reset of [() => target.dispatchEvent(new Event("blur")), () => { doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange")); }, () => input.setEnabled(false)]) {
    input.setEnabled(true); key("KeyD"); input.setSource(1, ["up", "light"]); input.analog = 0.8;
    reset();
    assert.equal(input.axis(), 0); assert.equal(input.isDown("up"), false); assert.equal(input.wasPressed("light"), false);
    assert.equal(input.pointers.size, 0); assert.equal(input.lastTap, null);
  }
  key("Escape"); assert.equal(input.wasPressed("pause"), true, "pause key can resume while gameplay is disabled");
});
