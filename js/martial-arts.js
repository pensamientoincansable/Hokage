import * as THREE from "three";
import { MOVES } from "./config.js";

// Sifu-inspired kung fu choreography on the canonical arms-down rig.
// Anticipation, hip drive, contact and follow-through replace the old
// two-pose "Tekken 1" pops. Naruto and the procedural fighters share it.
const GUARD = {
  hips: [0.05, -0.2, 0], torso: [0.1, -0.24, 0.04], head: [0.06, 0.2, 0],
  lUpper: [-0.95, 0.22, 0.32], rUpper: [-0.52, -0.2, -0.38],
  lFore: [-1.22, 0.12, 0.1], rFore: [-1.48, -0.12, 0],
  lThigh: [-0.42, 0.1, -0.2], rThigh: [0.08, -0.08, 0.22],
  lShin: [0.58, 0, 0], rShin: [0.46, 0, 0],
  lFoot: [-0.16, 0.04, 0], rFoot: [-0.32, -0.06, 0],
  offset: [0, -0.09, 0.03],
};
const CROUCH = {
  ...GUARD,
  offset: [0, -0.43, 0.02], torso: [0.32, -0.16, 0.06], head: [0.18, 0.12, 0],
  lUpper: [-0.85, 0.28, 0.38], rUpper: [-0.62, -0.18, -0.4],
  lFore: [-1.35, 0.1, 0.08], rFore: [-1.5, -0.08, 0],
  lThigh: [-1.05, 0.08, 0.18], rThigh: [-0.9, -0.08, -0.2],
  lShin: [1.55, 0, 0], rShin: [1.5, 0, 0],
  lFoot: [-0.48, 0, 0], rFoot: [-0.5, 0, 0],
};
const JUMP = {
  ...GUARD,
  offset: [0, -0.04, 0], torso: [-0.08, 0.06, 0], head: [-0.04, 0.1, 0],
  lUpper: [-0.7, 0.18, 0.28], rUpper: [-0.55, -0.16, -0.3],
  lFore: [-1.05, 0, 0], rFore: [-1.1, 0, 0],
  lThigh: [-0.78, 0.08, 0.12], rThigh: [-0.32, -0.08, -0.12],
  lShin: [1.15, 0, 0], rShin: [0.82, 0, 0],
  lFoot: [-0.2, 0, 0], rFoot: [-0.28, 0, 0],
};

const frame = (time, pose = {}) => ({ time, pose });
const duration = (name) => MOVES[name].startup + MOVES[name].active + MOVES[name].recovery;
const LOCOMOTION = new Set(["idle", "walk", "crouch", "block", "jump"]);

export function martialPoses() {
  const jabLoad = {
    ...GUARD,
    hips: [0.08, -0.38, 0], torso: [0.14, -0.42, 0.06], head: [0.08, 0.28, 0],
    lUpper: [-0.35, 0.32, 0.42], lFore: [-1.72, 0.15, 0.12],
    rUpper: [-0.7, -0.12, -0.32], rFore: [-1.55, 0, 0],
    lThigh: [-0.28, 0.12, -0.16], rThigh: [0.18, -0.1, 0.18],
    offset: [0, -0.12, -0.04],
  };
  const jab = {
    ...GUARD,
    hips: [0.04, 0.22, 0.04], torso: [0.12, 0.32, 0.08], head: [-0.04, -0.08, 0],
    lUpper: [-1.64, -0.3, 0.1], lFore: [-0.05, 0, 0],
    rUpper: [-0.48, 0.16, -0.42], rFore: [-1.72, -0.1, 0],
    lThigh: [-0.18, 0.06, -0.1], rThigh: [0.32, -0.12, 0.14],
    rShin: [0.28, 0, 0], offset: [0, -0.07, 0.12],
  };
  const jabThrough = {
    ...jab,
    hips: [0.02, 0.28, 0.05], torso: [0.08, 0.38, 0.1],
    lUpper: [-1.7, -0.36, 0.06], offset: [0, -0.06, 0.16],
  };
  const jabRecoil = {
    ...GUARD,
    hips: [0.06, 0.04, 0], torso: [0.1, 0.06, 0.04],
    lUpper: [-1.05, -0.08, 0.22], lFore: [-0.85, 0.08, 0],
    rUpper: [-0.62, 0.05, -0.3], offset: [0, -0.08, 0.05],
  };
  const crossLoad = {
    ...GUARD,
    hips: [0.06, 0.42, 0.04], torso: [0.08, 0.55, 0.1], head: [0.04, -0.22, 0],
    rUpper: [-0.15, -0.08, -0.48], rFore: [-1.92, 0, 0],
    lUpper: [-0.85, 0.28, 0.38], lFore: [-1.45, 0.1, 0],
    rThigh: [0.08, -0.18, 0.1], offset: [0, -0.13, -0.02],
  };
  const cross = {
    ...GUARD,
    hips: [0.08, -0.28, 0.06], torso: [0.14, -0.22, 0.08], head: [-0.06, 0.12, 0],
    rUpper: [-1.66, 0.08, -0.1], rFore: [-0.04, 0, 0],
    lUpper: [-0.72, 0.22, 0.36], lFore: [-1.58, 0.08, 0],
    rThigh: [0.4, -0.22, -0.1], lThigh: [-0.32, 0.12, -0.08],
    rFoot: [-0.52, -0.28, 0], offset: [0, -0.1, 0.14],
  };
  const crossThrough = {
    ...cross,
    hips: [0.06, -0.36, 0.08], torso: [0.1, -0.3, 0.1],
    rUpper: [-1.72, 0.12, -0.14], offset: [0, -0.08, 0.18],
  };
  const knee = {
    ...GUARD,
    hips: [0.04, 0.32, -0.04], torso: [-0.16, -0.28, 0.06], head: [0.1, 0.16, 0],
    rThigh: [-1.62, 0.06, -0.22], rShin: [1.78, 0, 0], rFoot: [-0.15, 0, 0],
    lThigh: [0.05, 0, 0.1], lShin: [0.12, 0, 0],
    lUpper: [-0.85, 0.2, 0.42], rUpper: [-0.4, -0.12, -0.5],
    offset: [0, -0.03, 0.04],
  };
  const roundhouse = {
    ...knee,
    hips: [0.02, 0.78, -0.1], torso: [-0.28, -0.62, 0.18], head: [0.08, 0.35, 0],
    rThigh: [-1.52, 0.22, -0.68], rShin: [0.05, 0, 0], rFoot: [0.22, 0.08, 0],
    lThigh: [0.12, 0.08, 0.16], lShin: [0.35, 0, 0],
    lUpper: [-0.78, 0.08, 0.52], rUpper: [-0.28, -0.08, -0.72],
    offset: [0, -0.02, 0.08],
  };
  const kickRecover = {
    ...GUARD,
    hips: [0.05, 0.28, 0], torso: [-0.08, -0.18, 0.06],
    rThigh: [-0.95, 0.1, -0.28], rShin: [1.15, 0, 0],
    lUpper: [-0.88, 0.16, 0.34], offset: [0, -0.08, 0.02],
  };
  const sweep = {
    ...CROUCH,
    hips: [0.1, 0.72, 0.04], torso: [0.16, -0.52, 0.22], head: [0.12, 0.4, 0],
    rThigh: [-1.22, 0.38, -0.7], rShin: [0.06, 0, 0], rFoot: [0.12, 0, 0],
    lThigh: [-1.28, 0.06, 0.22], lShin: [2.05, 0, 0],
    lUpper: [-0.55, 0.2, 0.45], rUpper: [-0.4, -0.15, -0.55],
    offset: [0, -0.58, 0],
  };
  const flying = {
    ...JUMP,
    hips: [0.02, 0.34, -0.04], torso: [-0.34, -0.38, 0.08], head: [0.06, 0.18, 0],
    rThigh: [-1.72, 0.04, -0.18], rShin: [0.04, 0, 0], rFoot: [-0.08, 0, 0],
    lThigh: [-0.85, 0.08, 0.14], lShin: [1.65, 0, 0],
    lUpper: [-0.9, 0.15, 0.4], rUpper: [-0.35, -0.1, -0.55],
    offset: [0, -0.02, 0.1],
  };
  const seal = {
    ...GUARD,
    torso: [0.16, 0, 0.04], head: [0.12, 0, 0],
    lUpper: [-0.78, -0.42, 0.48], rUpper: [-0.78, 0.42, -0.48],
    lFore: [-1.58, 0.2, 0.15], rFore: [-1.58, -0.2, -0.15],
    offset: [0, -0.12, 0],
  };
  const palm = {
    ...GUARD,
    hips: [0.06, 0.08, 0], torso: [0.18, 0.06, 0.06], head: [-0.08, 0, 0],
    lUpper: [-1.55, 0.04, 0.12], rUpper: [-1.55, -0.04, -0.12],
    lFore: [-0.1, 0, 0], rFore: [-0.1, 0, 0],
    lThigh: [-0.22, 0.08, -0.12], rThigh: [0.22, -0.08, 0.12],
    offset: [0, -0.05, 0.14],
  };
  const salute = {
    ...GUARD,
    torso: [0.08, 0.06, 0], head: [0.12, 0, 0],
    lUpper: [-1.15, 0.35, 0.15], rUpper: [-1.35, -0.15, -0.12],
    lFore: [-1.55, 0.25, 0.2], rFore: [-0.45, 0, 0],
    offset: [0, -0.08, 0],
  };
  const lightT = duration("light");
  const heavyT = duration("heavy");
  const kickT = duration("kick");
  const sweepT = duration("crouchLight");
  const airT = duration("airKick");
  return {
    idle: { loop: true, frames: [
      frame(0, GUARD),
      frame(0.45, { ...GUARD, offset: [0, -0.13, 0.03], torso: [0.12, -0.2, 0.05], lFore: [-1.16, 0.14, 0.12], rThigh: [0.12, -0.08, 0.2] }),
      frame(0.9, { ...GUARD, offset: [0, -0.07, 0.04], torso: [0.08, -0.28, 0.03], rFore: [-1.4, -0.16, 0], lThigh: [-0.36, 0.1, -0.18] }),
      frame(1.35, { ...GUARD, offset: [0, -0.12, 0.02], torso: [0.11, -0.22, 0.05], lUpper: [-0.9, 0.24, 0.3], head: [0.08, 0.16, 0] }),
      frame(1.8, GUARD),
    ] },
    walk: { loop: true, frames: [
      frame(0, { ...GUARD, lThigh: [-0.68, 0.1, -0.16], rThigh: [0.48, -0.08, 0.18], lShin: [0.62, 0, 0], rShin: [0.18, 0, 0], torso: [0.1, -0.2, 0.04], offset: [0, -0.07, 0.03] }),
      frame(0.16, { ...GUARD, offset: [0, -0.04, 0.03], lThigh: [-0.12, 0.1, -0.16], rThigh: [-0.28, -0.08, 0.16], rShin: [0.95, 0, 0], lUpper: [-0.88, 0.18, 0.3] }),
      frame(0.32, { ...GUARD, lThigh: [0.46, 0.08, -0.14], rThigh: [-0.66, -0.08, 0.18], lShin: [0.16, 0, 0], rShin: [0.58, 0, 0], torso: [0.1, -0.26, 0.03], offset: [0, -0.08, 0.03] }),
      frame(0.48, { ...GUARD, offset: [0, -0.04, 0.03], lThigh: [-0.3, 0.1, -0.16], rThigh: [0.02, -0.08, 0.16], lShin: [0.98, 0, 0], rUpper: [-0.48, -0.16, -0.34] }),
      frame(0.64, { ...GUARD, lThigh: [-0.68, 0.1, -0.16], rThigh: [0.48, -0.08, 0.18], lShin: [0.62, 0, 0], rShin: [0.18, 0, 0], torso: [0.1, -0.2, 0.04], offset: [0, -0.07, 0.03] }),
    ] },
    jump: { frames: [
      frame(0, JUMP),
      frame(0.18, { ...JUMP, lThigh: [-0.95, 0.1, 0.14], rThigh: [-0.55, -0.08, -0.12], lShin: [1.35, 0, 0], lUpper: [-0.55, 0.2, 0.22], offset: [0, -0.02, 0] }),
      frame(0.5, JUMP),
    ] },
    crouch: { loop: true, frames: [
      frame(0, CROUCH),
      frame(0.55, { ...CROUCH, offset: [0, -0.46, 0.02], torso: [0.34, -0.14, 0.06] }),
      frame(1.1, CROUCH),
    ] },
    block: { loop: true, frames: [
      frame(0, { ...GUARD, lUpper: [-1.08, 0.18, 0.38], rUpper: [-1.05, -0.16, -0.4], lFore: [-1.58, 0.08, 0], rFore: [-1.6, -0.08, 0], torso: [0.2, -0.08, 0.04], offset: [0, -0.12, -0.02] }),
      frame(0.5, { ...GUARD, lUpper: [-1.12, 0.2, 0.4], rUpper: [-1.02, -0.14, -0.38], lFore: [-1.55, 0.08, 0], rFore: [-1.58, -0.08, 0], torso: [0.22, -0.06, 0.04], offset: [0, -0.11, -0.02] }),
      frame(1, { ...GUARD, lUpper: [-1.08, 0.18, 0.38], rUpper: [-1.05, -0.16, -0.4], lFore: [-1.58, 0.08, 0], rFore: [-1.6, -0.08, 0], torso: [0.2, -0.08, 0.04], offset: [0, -0.12, -0.02] }),
    ] },
    light: { frames: [
      frame(0, GUARD),
      frame(MOVES.light.startup * 0.45, jabLoad),
      frame(MOVES.light.startup, jab),
      frame(MOVES.light.startup + MOVES.light.active, jabThrough),
      frame(lightT * 0.72, jabRecoil),
      frame(lightT, GUARD),
    ] },
    heavy: { frames: [
      frame(0, GUARD),
      frame(0.07, crossLoad),
      frame(MOVES.heavy.startup, cross),
      frame(MOVES.heavy.startup + MOVES.heavy.active, crossThrough),
      frame(heavyT * 0.72, { ...GUARD, rUpper: [-0.95, 0.05, -0.22], rFore: [-0.7, 0, 0], hips: [0.05, -0.08, 0], offset: [0, -0.09, 0.06] }),
      frame(heavyT, GUARD),
    ] },
    kick: { frames: [
      frame(0, GUARD),
      frame(0.07, knee),
      frame(MOVES.kick.startup, roundhouse),
      frame(MOVES.kick.startup + MOVES.kick.active, { ...roundhouse, hips: [0.02, 0.88, -0.12], rThigh: [-1.48, 0.26, -0.74] }),
      frame(0.38, kickRecover),
      frame(kickT, GUARD),
    ] },
    crouchLight: { frames: [
      frame(0, CROUCH),
      frame(MOVES.crouchLight.startup * 0.5, { ...CROUCH, hips: [0.08, 0.28, 0], rThigh: [-1.15, 0.22, -0.4] }),
      frame(MOVES.crouchLight.startup, sweep),
      frame(MOVES.crouchLight.startup + MOVES.crouchLight.active, { ...sweep, hips: [0.1, 1.05, 0.04] }),
      frame(sweepT * 0.78, { ...CROUCH, hips: [0.06, 0.22, 0] }),
      frame(sweepT, CROUCH),
    ] },
    airKick: { frames: [
      frame(0, JUMP),
      frame(MOVES.airKick.startup * 0.5, { ...JUMP, rThigh: [-1.15, 0, -0.12], rShin: [1.2, 0, 0] }),
      frame(MOVES.airKick.startup, flying),
      frame(MOVES.airKick.startup + MOVES.airKick.active, { ...flying, rThigh: [-1.78, 0.06, -0.2] }),
      frame(airT, JUMP),
    ] },
    special: { frames: [
      frame(0, GUARD),
      frame(0.08, seal),
      frame(0.16, palm),
      frame(0.3, { ...palm, offset: [0, -0.04, 0.18], torso: [0.22, 0.08, 0.08] }),
      frame(0.45, GUARD),
    ] },
    ultimate: { frames: [
      frame(0, GUARD),
      frame(0.14, { ...seal, ...CROUCH, lUpper: seal.lUpper, rUpper: seal.rUpper, lFore: seal.lFore, rFore: seal.rFore }),
      frame(0.28, palm),
      frame(0.46, { ...palm, offset: [0, -0.03, 0.2], torso: [0.24, 0.1, 0.1] }),
      frame(0.7, GUARD),
    ] },
    dash: { frames: [
      frame(0, { ...GUARD, torso: [0.48, 0.05, 0], head: [-0.15, 0, 0], lUpper: [0.55, 0.12, 0.18], rUpper: [0.55, -0.12, -0.18], lFore: [-0.35, 0, 0], rFore: [-0.35, 0, 0], lThigh: [-0.85, 0.08, -0.1], rThigh: [0.45, -0.08, 0.1], offset: [0, -0.14, 0.16] }),
      frame(0.18, JUMP),
    ] },
    hurt: { frames: [
      frame(0, { ...GUARD, torso: [-0.32, 0.28, -0.08], head: [0.28, -0.12, 0], lUpper: [-0.42, 0.18, 0.48], rUpper: [-0.32, -0.18, -0.48], lFore: [-0.7, 0, 0], rFore: [-0.65, 0, 0], offset: [0, -0.06, -0.1] }),
      frame(0.18, { ...GUARD, torso: [-0.22, 0.18, -0.04], head: [0.16, -0.06, 0], offset: [0, -0.08, -0.06] }),
      frame(0.35, GUARD),
    ] },
    ko: { frames: [
      frame(0, GUARD),
      frame(0.22, { ...GUARD, hips: [-0.55, 0.15, 0], torso: [-0.35, 0.2, 0], offset: [0, -0.38, -0.18], lUpper: [-0.5, 0.2, 0.45] }),
      frame(0.8, { hips: [-Math.PI / 2, 0.1, 0], torso: [0.15, 0, 0], head: [0.2, 0, 0], offset: [0, -0.98, -0.4], lUpper: [-0.4, 0, 0.5], rUpper: [-0.3, 0, -0.5], lFore: [-0.4, 0, 0], rFore: [-0.3, 0, 0], lThigh: [0.05, 0, 0.1], rThigh: [0.05, 0, -0.1], lShin: [0.12, 0, 0], rShin: [0.12, 0, 0], lFoot: [0, 0, 0], rFoot: [0, 0, 0] }),
    ] },
    win: { frames: [
      frame(0, GUARD),
      frame(0.28, { ...GUARD, lUpper: [-0.9, 0.28, 0.2], rUpper: [-1.1, -0.1, -0.15], lFore: [-1.4, 0.15, 0], rFore: [-0.9, 0, 0] }),
      frame(0.55, salute),
      frame(2.5, { ...salute, torso: [0.06, -0.04, 0], offset: [0, -0.1, 0] }),
    ] },
  };
}

export class MartialAnimator {
  constructor(root, rig) {
    this.root = root;
    this.rig = rig;
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = new Map();
    this.state = "";
    this.t = 0;
    this.lock = 0;
    const rest = new Map(Object.entries(rig).map(([key, node]) => [key, { q: node.quaternion.clone(), p: node.position.clone() }]));
    root.updateMatrixWorld(true);
    const hipHeight = root.worldToLocal(rig.hips.getWorldPosition(new THREE.Vector3())).y;
    const q = new THREE.Quaternion();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    for (const [name, definition] of Object.entries(martialPoses())) {
      const times = definition.frames.map((f) => f.time);
      const tracks = [];
      for (const [key, node] of Object.entries(rig)) {
        const values = [];
        for (const { pose } of definition.frames) {
          const angles = pose[key] || GUARD[key] || [0, 0, 0];
          rotation.setFromEuler(euler.set(...angles));
          q.copy(rest.get(key).q).multiply(rotation);
          values.push(q.x, q.y, q.z, q.w);
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(`${node.uuid}.quaternion`, times, values));
      }
      const offsets = definition.frames.flatMap(({ pose }) => {
        const v = pose.offset || GUARD.offset;
        const base = rest.get("hips").p;
        // Hip displacement is relative to each rig's leg length.
        const ratio = hipHeight / 1.2;
        return [base.x + v[0], base.y + v[1] * ratio, base.z + v[2]];
      });
      tracks.push(new THREE.VectorKeyframeTrack(`${rig.hips.uuid}.position`, times, offsets));
      const clip = new THREE.AnimationClip(name, times.at(-1), tracks);
      const action = this.mixer.clipAction(clip);
      action.setLoop(definition.loop ? THREE.LoopRepeat : THREE.LoopOnce, definition.loop ? Infinity : 1);
      action.clampWhenFinished = !definition.loop;
      this.actions.set(name, action);
    }
    this.reset();
  }

  reset() {
    this.mixer.stopAllAction();
    this.state = "";
    this.current = null;
    this.play("idle", 0, true);
    this.mixer.update(0);
  }

  play(name, lock = 0, force = false) {
    if (this.state === name && !force) return;
    const action = this.actions.get(name);
    if (!action) return;
    const previous = this.current;
    const from = this.state;
    this.state = name;
    this.t = 0;
    this.lock = lock;
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (previous && previous !== action) {
      const fade = name === "hurt" || name === "ko" ? 0.04
        : LOCOMOTION.has(name) && LOCOMOTION.has(from) ? 0.12
        : LOCOMOTION.has(name) ? 0.08
        : 0.045;
      action.crossFadeFrom(previous, fade, false);
    }
    this.current = action;
  }

  update(dt) {
    this.t += dt;
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}

let contactTexture;
let contactGeometry;
function contactShadow() {
  if (!contactTexture) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.35)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    contactTexture = new THREE.CanvasTexture(canvas);
    contactTexture.userData.shared = true;
    contactGeometry = new THREE.PlaneGeometry(1.4, 1.2);
    contactGeometry.userData.shared = true;
  }
  const shadow = new THREE.Mesh(contactGeometry, new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, opacity: 0.5, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  return shadow;
}

export function animateNinja(root, rig, aura, aura2) {
  const animator = new MartialAnimator(root, rig);
  const shadow = contactShadow();
  root.add(shadow);
  const materials = new Map();
  root.traverse((node) => {
    for (const m of [node.material].flat().filter(Boolean)) {
      if (m.emissive && !materials.has(m)) materials.set(m, { color: m.emissive.clone(), intensity: m.emissiveIntensity });
    }
  });
  let wasFlashing = false;
  const update = (dt, state = {}) => {
    animator.update(dt);
    const height = state.height || 0;
    shadow.position.y = 0.012 - height / root.scale.y;
    shadow.material.opacity = Math.max(0.15, 0.5 - height * 0.09);
    const casting = ["special", "ultimate"].includes(animator.state);
    aura.material.opacity = THREE.MathUtils.damp(aura.material.opacity, casting ? 0.85 : 0, 12, dt);
    aura2.material.opacity = THREE.MathUtils.damp(aura2.material.opacity, casting ? 0.65 : 0, 12, dt);
    aura.rotation.z += dt * 2;
    aura2.rotation.z -= dt * 2.6;
    if (!!state.flash !== wasFlashing) {
      materials.forEach((base, material) => {
        material.emissive.copy(base.color);
        material.emissiveIntensity = base.intensity;
        if (state.flash) { material.emissive.lerp(new THREE.Color("#ffb49d"), 0.65); material.emissiveIntensity = 0.8; }
      });
      wasFlashing = !!state.flash;
    }
  };
  return { animator, update };
}
