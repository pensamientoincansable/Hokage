import * as THREE from "three";
import { MOVES } from "./config.js";

// Authored taijutsu poses in a canonical, arms-down rig. The import pipeline
// retargets Naruto's original joints to these axes without losing skin weights.
// Both Naruto and the customizable opponents use the same choreography.
const GUARD = {
  hips: [0, -0.12, 0], torso: [0.04, -0.12, 0], head: [0, 0.18, 0],
  lUpper: [-0.72, 0.12, 0.16], rUpper: [-0.48, -0.12, -0.22],
  lFore: [-1.5, 0, 0], rFore: [-1.65, 0, 0],
  lThigh: [-0.22, 0, -0.16], rThigh: [0.22, 0, 0.16],
  lShin: [0.3, 0, 0], rShin: [0.28, 0, 0],
  lFoot: [-0.08, 0, 0], rFoot: [-0.45, 0, 0],
  offset: [0, -0.055, 0],
};
const CROUCH = {
  offset: [0, -0.43, 0], torso: [0.3, -0.1, 0],
  lThigh: [-1.05, 0, 0.22], rThigh: [-0.9, 0, -0.22],
  lShin: [1.55, 0, 0], rShin: [1.5, 0, 0],
  lFoot: [-0.48, 0, 0], rFoot: [-0.5, 0, 0],
};
const JUMP = {
  offset: [0, -0.05, 0], torso: [-0.1, 0.08, 0],
  lThigh: [-0.75, 0, 0.15], rThigh: [-0.3, 0, -0.15],
  lShin: [1.2, 0, 0], rShin: [0.8, 0, 0],
};

const frame = (time, pose = {}) => ({ time, pose });
const duration = (name) => MOVES[name].startup + MOVES[name].active + MOVES[name].recovery;

export function martialPoses() {
  const jab = {
    torso: [0.08, 0.18, 0], hips: [0, 0.08, 0], offset: [0, -0.06, 0.06],
    lUpper: [-1.6, -0.26, 0.08], lFore: [-0.08, 0, 0],
    rUpper: [-0.65, -0.1, -0.2], rFore: [-1.6, 0, 0],
  };
  const cross = {
    torso: [0.1, 0.1, 0.05], hips: [0, -0.16, 0], offset: [0, -0.09, 0.08],
    rUpper: [-1.62, 0.06, -0.08], rFore: [-0.04, 0, 0],
    lUpper: [-0.85, 0.15, 0.22], lFore: [-1.55, 0, 0],
    rThigh: [0.35, -0.2, -0.12], rFoot: [-0.5, -0.3, 0],
  };
  const knee = {
    hips: [0, 0.25, 0], torso: [-0.12, -0.2, 0], offset: [0, -0.02, 0],
    rThigh: [-1.65, 0, -0.2], rShin: [1.8, 0, 0],
    lThigh: [0, 0, 0.06], lShin: [0.06, 0, 0], lFoot: [0, 0, 0],
  };
  const roundhouse = {
    ...knee, hips: [0, 0.65, -0.08], torso: [-0.22, -0.5, 0.16],
    rThigh: [-1.55, 0.16, -0.6], rShin: [0.06, 0, 0], rFoot: [0.2, 0, 0],
    lUpper: [-0.8, 0, 0.4], rUpper: [-0.35, 0, -0.65],
  };
  const sweep = {
    ...CROUCH, hips: [0, 0.65, 0], torso: [0.18, -0.45, 0.2], offset: [0, -0.58, 0],
    rThigh: [-1.25, 0.35, -0.65], rShin: [0.08, 0, 0], rFoot: [0.1, 0, 0],
    lThigh: [-1.25, 0, 0.2], lShin: [2.1, 0, 0],
  };
  const flying = {
    ...JUMP, hips: [0, 0.28, 0], torso: [-0.3, -0.3, 0],
    rThigh: [-1.7, 0, -0.15], rShin: [0.04, 0, 0], rFoot: [-0.1, 0, 0],
    lThigh: [-0.8, 0, 0.12], lShin: [1.7, 0, 0],
  };
  const seal = { torso: [0.06, 0, 0], lUpper: [-0.7, -0.35, 0.4], rUpper: [-0.7, 0.35, -0.4], lFore: [-1.5, 0, 0], rFore: [-1.5, 0, 0] };
  const palm = { torso: [0.1, 0, 0], lUpper: [-1.5, 0, 0.1], rUpper: [-1.5, 0, -0.1], lFore: [-0.12, 0, 0], rFore: [-0.12, 0, 0], offset: [0, -0.06, 0.06] };
  return {
    idle: { loop: true, frames: [frame(0), frame(0.9, { torso: [0.02, -0.1, 0], offset: [0, -0.04, 0] }), frame(1.8)] },
    walk: { loop: true, frames: [
      frame(0, { lThigh: [-0.6, 0, 0.1], rThigh: [0.5, 0, -0.1], lShin: [0.5, 0, 0], rShin: [0.15, 0, 0] }),
      frame(0.18, { offset: [0, -0.025, 0], lThigh: [0, 0, 0.1], rThigh: [-0.3, 0, -0.1], rShin: [1, 0, 0] }),
      frame(0.36, { lThigh: [0.5, 0, 0.1], rThigh: [-0.6, 0, -0.1], lShin: [0.15, 0, 0], rShin: [0.5, 0, 0] }),
      frame(0.54, { offset: [0, -0.025, 0], lThigh: [-0.3, 0, 0.1], rThigh: [0, 0, -0.1], lShin: [1, 0, 0] }),
      frame(0.72, { lThigh: [-0.6, 0, 0.1], rThigh: [0.5, 0, -0.1], lShin: [0.5, 0, 0], rShin: [0.15, 0, 0] }),
    ] },
    jump: { frames: [frame(0, JUMP), frame(0.5, JUMP)] },
    crouch: { loop: true, frames: [frame(0, CROUCH), frame(1, CROUCH)] },
    block: { loop: true, frames: [frame(0, { lUpper: [-1, 0, 0.3], rUpper: [-1, 0, -0.3], lFore: [-1.55, 0, 0], rFore: [-1.55, 0, 0], torso: [0.15, 0, 0] }), frame(0.6, { lUpper: [-1, 0, 0.3], rUpper: [-1, 0, -0.3], lFore: [-1.55, 0, 0], rFore: [-1.55, 0, 0], torso: [0.15, 0, 0] })] },
    light: { frames: [frame(0), frame(MOVES.light.startup, jab), frame(MOVES.light.startup + MOVES.light.active, jab), frame(duration("light"))] },
    heavy: { frames: [frame(0), frame(0.08, { torso: [0, 0.5, 0], hips: [0, 0.2, 0], rUpper: [-0.2, 0, -0.35], rFore: [-1.9, 0, 0] }), frame(MOVES.heavy.startup, cross), frame(MOVES.heavy.startup + MOVES.heavy.active, cross), frame(duration("heavy"))] },
    kick: { frames: [frame(0), frame(0.09, knee), frame(MOVES.kick.startup, roundhouse), frame(MOVES.kick.startup + MOVES.kick.active, roundhouse), frame(0.38, knee), frame(duration("kick"))] },
    crouchLight: { frames: [frame(0, CROUCH), frame(MOVES.crouchLight.startup, sweep), frame(MOVES.crouchLight.startup + MOVES.crouchLight.active, { ...sweep, hips: [0, 1.05, 0] }), frame(duration("crouchLight"), CROUCH)] },
    airKick: { frames: [frame(0, JUMP), frame(MOVES.airKick.startup, flying), frame(MOVES.airKick.startup + MOVES.airKick.active, flying), frame(duration("airKick"), JUMP)] },
    special: { frames: [frame(0), frame(0.1, seal), frame(0.16, palm), frame(0.3, palm), frame(0.45)] },
    ultimate: { frames: [frame(0), frame(0.18, { ...seal, ...CROUCH }), frame(0.28, palm), frame(0.46, palm), frame(0.7)] },
    dash: { frames: [frame(0, { torso: [0.5, 0, 0], lUpper: [0.9, 0, 0.12], rUpper: [0.9, 0, -0.12], lFore: [-0.2, 0, 0], rFore: [-0.2, 0, 0], lThigh: [-0.8, 0, 0], rThigh: [0.5, 0, 0], offset: [0, -0.12, 0] }), frame(0.18, JUMP)] },
    hurt: { frames: [frame(0, { torso: [-0.25, 0.2, 0], head: [0.2, 0, 0], lUpper: [-0.45, 0, 0.4], rUpper: [-0.35, 0, -0.4] }), frame(0.35)] },
    ko: { frames: [frame(0), frame(0.3, { hips: [-0.7, 0, 0], offset: [0, -0.45, -0.2] }), frame(0.8, { hips: [-Math.PI / 2, 0, 0], offset: [0, -0.98, -0.4], lUpper: [-0.4, 0, 0.5], rUpper: [-0.3, 0, -0.5], lFore: [-0.4, 0, 0], rFore: [-0.3, 0, 0], lThigh: [0, 0, 0.1], rThigh: [0, 0, -0.1], lShin: [0.1, 0, 0], rShin: [0.1, 0, 0] })] },
    win: { frames: [frame(0), frame(0.5, { rUpper: [-2.7, 0, -0.2], rFore: [-0.5, 0, 0], torso: [0, 0.2, 0] }), frame(2.5, { rUpper: [-2.7, 0, -0.2], rFore: [-0.5, 0, 0], torso: [0, -0.1, 0] })] },
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
    this.state = name;
    this.t = 0;
    this.lock = lock;
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (previous && previous !== action) action.crossFadeFrom(previous, ["hurt", "ko"].includes(name) ? 0.035 : 0.065, false);
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
