import { test } from "node:test";
import assert from "node:assert/strict";
import { Fighter, Match } from "../../js/combat.js";
import { ARENA, MOVES, ELEMENTS } from "../../js/config.js";

function setup(stats = {}) {
  const ninja = () => ({ appearance: { name: "Test", elements: ["fire", "lightning"] }, root: { position: { set() {} }, rotation: {} }, animator: { play() {} }, update() {} });
  const p1 = new Fighter(ninja(), 1, { hp: 100, ...stats });
  const p2 = new Fighter(ninja(), 2, { hp: 100 });
  const events = [];
  const match = new Match(p1, p2, { onEvent: (event) => events.push(event) });
  match.intro = 0; p1.x = 0; p2.x = 1;
  const step = (input = {}, count = 1) => {
    for (let i = 0; i < count; i++) {
      match.control(p1, i ? {} : input, 1 / 60);
      match.update(1 / 60);
    }
  };
  return { p1, p2, match, events, step };
}

test("jab hits once during active frames, never during startup or recovery", () => {
  const { p1, p2, match } = setup();
  match.startMove(p1, "light");
  match.physics(p1, 0.05); assert.equal(p2.hp, 100);
  match.physics(p1, 0.04); assert.equal(p2.hp, 94);
  match.physics(p1, 0.04); assert.equal(p2.hp, 94);
  match.physics(p1, 0.3); assert.equal(p2.hp, 94);
});

test("normal strikes respect damage upgrades and fighter stats", () => {
  const { p1, p2, match } = setup({ damage: 2 });
  p1.buffs.damage = 8;
  match.startMove(p1, "heavy"); match.physics(p1, MOVES.heavy.startup);
  assert.equal(p2.hp, 100 - 11 * 2 * 1.5);
});

test("getting hit interrupts both melee and pending jutsu", () => {
  const { p1, p2, match } = setup();
  match.special(p1, 1); assert.ok(p1.pendingSpec);
  match.applyHit(p1, p2, 5, 0.3, 2, false);
  assert.equal(p1.pendingSpec, null); assert.equal(p1.move, null);
  match.physics(p1, 0.2); assert.equal(match.projectiles.length, 0);
  p1.hitstun = p1.animLock = 0; match.startMove(p1, "heavy");
  match.applyHit(p1, p2, 5, 0.3, 2, false); match.physics(p1, 0.2);
  assert.equal(p2.hp, 100, "interrupted hitbox must not fire later");
});

test("dash and jump cannot cancel a committed attack", () => {
  const { p1, match, step } = setup();
  match.startMove(p1, "heavy");
  step({ jump: true, up: true, dash: true, axis: 1 });
  assert.equal(p1.y, 0); assert.equal(p1.state, "heavy");
  assert.equal(p1.dashTime, 0);
});

test("a late button press is buffered through the recovery window", () => {
  const { p1, p2, match, step } = setup();
  p2.x = 5;
  match.startMove(p1, "light");
  match.physics(p1, 0.25);
  step({ heavy: true }, 7);
  assert.equal(p1.state, "heavy");
  assert.ok(p1.animLock > 0);
});

test("hitstop freezes simulation, but does not lose a short attack input", () => {
  const { p1, match, step } = setup();
  match.hitstop = 0.08;
  step({ heavy: true });
  assert.equal(p1.move, null); assert.ok(p1.bufferedAction);
  step({}, 8);
  assert.equal(p1.state, "heavy");
});

test("dash impulse survives ground friction and has a cooldown", () => {
  const { p1, p2, step } = setup();
  p2.x = 7;
  step({ dash: true, axis: 1 }, 12);
  assert.ok(p1.x > 1.7, `dash only travelled ${p1.x}`);
  const cooldown = p1.cd.dash;
  step({ dash: true, axis: 1 });
  assert.ok(cooldown > 0); assert.ok(p1.cd.dash < cooldown);
});

test("dash jutsu can connect after travelling, not only at launch", () => {
  const { p1, p2, match, step } = setup();
  p1.chakra = 100; p2.x = 3;
  match.special(p1, 2);
  step({}, 30);
  assert.ok(p2.hp < 100);
});

test("guard blocks damage/status effects; combo scaling is per attacker", () => {
  const { p1, p2, match } = setup();
  match.applyHit(p2, p1, 20, 0.3, 2, true, 2, ["burn"]);
  assert.equal(p2.hp, 98); assert.deepEqual(p2.statuses, []);
  match.applyHit(p2, p1, 10, 0.3, 2, false);
  match.applyHit(p1, p2, 10, 0.3, 2, false);
  assert.equal(p1.hp, 90);
  assert.equal(match.combo, 1);
});

test("KO is terminal; a late projectile cannot overwrite the winner", () => {
  const { p1, p2, match, events } = setup();
  match.applyHit(p2, p1, 200, 0.3, 2, false);
  match.applyHit(p1, p2, 200, 0.3, 2, false);
  match.ko(p1, p2);
  assert.equal(match.winner, p1); assert.equal(p1.hp, 100);
  assert.equal(events.filter((event) => event.type === "ko").length, 1);
});

test("second jutsu uses its own element color", () => {
  const { p1, match } = setup();
  p1.elements = ["fire", "water"]; p1.chakra = 100;
  match.special(p1, 2); match.physics(p1, 0.17);
  assert.equal(match.projectiles[0].color, ELEMENTS.water.color);
});

test("collision separation never pushes a fighter outside the arena", () => {
  const { p1, p2, match } = setup();
  for (const edge of [ARENA.minX, ARENA.maxX]) {
    p1.x = p2.x = edge; p1.vx = p2.vx = 0;
    match.update(1 / 60);
    assert.ok(p1.x >= ARENA.minX && p1.x <= ARENA.maxX);
    assert.ok(p2.x >= ARENA.minX && p2.x <= ARENA.maxX);
    assert.ok(Math.abs(p1.x - p2.x) >= 0.5999);
  }
});

test("holding jump gives more height than a quick tap", () => {
  const jumpHeight = (hold) => {
    const { p1, p2, match } = setup(); p2.x = 8;
    let peak = 0;
    for (let i = 0; i < 100; i++) {
      match.control(p1, { jump: i === 0, up: hold, upReleased: !hold && i === 1 });
      match.update(1 / 60); peak = Math.max(peak, p1.y);
    }
    return peak;
  };
  assert.ok(jumpHeight(true) > jumpHeight(false) * 1.5);
});

test("timeout compares health ratios with unequal max health", () => {
  const { p1, p2, match } = setup();
  p1.maxHp = 120; p1.hp = 60; p2.maxHp = 50; p2.hp = 40;
  match.time = 0.01; match.update(1 / 60);
  assert.equal(match.winner, p2);
});

test("KO callbacks may clear multiple projectiles/traps safely", () => {
  for (const kind of ["projectiles", "traps"]) {
    const { p1, p2, match } = setup();
    const attack = kind === "projectiles"
      ? { x: p2.x, y: 1.1, vx: 1, life: 2, size: 0.3, owner: p1, damage: 200, hitstun: 0.2, knock: 1 }
      : { x: p2.x, owner: p1, age: 0.2, life: 1, damage: 200, hitstun: 0.2 };
    match[kind].push({ ...attack }, { ...attack });
    match.onEvent = (event) => { if (event.type === "ko") { match.projectiles.length = 0; match.traps.length = 0; } };
    assert.doesNotThrow(() => match.stepProjectiles(1 / 60));
    assert.equal(match.winner, p1);
  }
});

test("nonlethal guard chip cannot heal a fighter below one health point", () => {
  const { p1, p2, match } = setup();
  p2.hp = 0.2;
  match.applyHit(p2, p1, 10, 0.2, 2, true, 1);
  assert.equal(p2.hp, 0.2);
});
