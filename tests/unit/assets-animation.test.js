import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { MartialAnimator, martialPoses } from "../../js/martial-arts.js";
import { MOVES } from "../../js/config.js";
import { fightFraming } from "../../js/renderer.js";
import { disposeTree, markShared } from "../../js/resources.js";

function rig() {
  const root = new THREE.Group();
  const joints = {};
  for (const name of ["hips", "torso", "head", "lUpper", "rUpper", "lFore", "rFore", "lThigh", "rThigh", "lShin", "rShin"]) {
    joints[name] = new THREE.Group(); root.add(joints[name]);
  }
  joints.hips.position.y = 1.2;
  return new MartialAnimator(root, joints);
}

test("all martial attack clips share the combat startup/active/recovery timing", () => {
  const poses = martialPoses();
  for (const [name, move] of Object.entries(MOVES)) {
    const times = poses[name].frames.map((frame) => frame.time);
    assert.ok(times.every((time, i) => !i || time > times[i - 1]), name);
    assert.ok(times.includes(move.startup), name);
    assert.ok(Math.abs(times.at(-1) - move.startup - move.active - move.recovery) < 1e-8, name);
  }
});

test("continuous movement does not restart the clip every simulation frame", () => {
  const animator = rig();
  for (let i = 0; i < 30; i++) { animator.play("walk"); animator.update(1 / 60); }
  assert.ok(animator.t > 0.49);
  assert.ok(animator.actions.get("walk").time > 0.49);
  animator.play("light", 0.3, true); animator.update(0.15);
  animator.play("light", 0.3, true);
  assert.equal(animator.t, 0);
  animator.dispose();
});

test("martial poses use finite normalized joint rotations and recover from crouch", () => {
  const animator = rig();
  for (const name of Object.keys(martialPoses())) {
    animator.play(name, 0, true); animator.update(0.19);
    for (const node of Object.values(animator.rig)) {
      assert.ok(node.quaternion.toArray().every(Number.isFinite), name);
      assert.ok(Math.abs(node.quaternion.length() - 1) < 1e-5, name);
    }
  }
  animator.play("crouch", 0, true); animator.update(0.2);
  const crouching = animator.rig.hips.position.y;
  animator.play("idle"); animator.update(0.2);
  assert.ok(animator.rig.hips.position.y > crouching + 0.2);
  animator.dispose();
});

test("prepared files match their manifest and the supplied authoring assets", async () => {
  const manifest = JSON.parse(await readFile("assets/models/manifest.json", "utf8"));
  for (const [file, hash] of Object.entries(manifest.sources)) {
    assert.equal(createHash("sha256").update(await readFile(file)).digest("hex"), hash, file);
  }
  for (const [file, details] of Object.entries(manifest.outputs)) {
    const data = await readFile(`assets/models/${file}`);
    assert.equal(data.length, details.bytes, file);
    assert.equal(createHash("sha256").update(data).digest("hex"), details.sha256, file);
  }
  const glb = await readFile("assets/models/naruto.glb");
  assert.equal(glb.readUInt32LE(0), 0x46546c67);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
  assert.equal(json.meshes.length, 4);
  assert.equal(json.skins[0].joints.length, 93);
  assert.equal(json.images.length, 4);
  assert.ok(json.images.every((image) => !image.uri), "textures are embedded, no external dependencies");
  assert.ok(glb.length < 750_000);
  assert.ok(manifest.outputs["niko-city-kit.glb"].bytes < 2_500_000);
  assert.equal(manifest.cityParts.length, 18);
});

test("camera framing keeps the full arena visible in portrait, landscape and PC", () => {
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1024, 768], [1440, 900]]) {
    for (const gap of [0, 6.4, 16.8]) {
      const framing = fightFraming(width, height, gap, true);
      assert.ok(Number.isFinite(framing.targetY));
      const halfWidth = framing.distance * Math.tan(THREE.MathUtils.degToRad(21)) * width / height;
      assert.ok(halfWidth + 1e-7 >= gap / 2 + 1.8, `${width}×${height}, gap ${gap}`);
    }
  }
});

test("disposing an instance releases owned resources once, not shared templates", () => {
  const texture = new THREE.Texture();
  const template = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: texture }));
  markShared(template);
  const ownedMaterial = template.material.clone(); ownedMaterial.userData = {};
  const root = new THREE.Group();
  root.add(new THREE.Mesh(template.geometry, ownedMaterial), new THREE.Mesh(template.geometry, ownedMaterial));
  let geometryDisposals = 0, textureDisposals = 0, materialDisposals = 0;
  template.geometry.addEventListener("dispose", () => geometryDisposals++);
  texture.addEventListener("dispose", () => textureDisposals++);
  ownedMaterial.addEventListener("dispose", () => materialDisposals++);
  disposeTree(root);
  assert.equal(geometryDisposals, 0); assert.equal(textureDisposals, 0); assert.equal(materialDisposals, 1);
});

test("jump framing expands vertically as the fighter leaves the ground", () => {
  const standing = fightFraming(1280, 800, 1, false, 0);
  const jumping = fightFraming(1280, 800, 1, false, 3);
  assert.ok(jumping.distance > standing.distance);
  assert.ok(jumping.targetY > standing.targetY);
});
