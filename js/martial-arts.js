import * as THREE from "three";
import { MOVES } from "./config.js";

// Virtua Fighter — estilo Kage-Maru: bajo centro de gravedad, desplazamiento
// deslizante, anticipación visible, follow-through y respiración continua.
// Se interpola suave (no lineal) para evitar rigidez.

const GUARD = {
  hips: [0, -0.10, 0], torso: [0.05, -0.08, 0], head: [0.04, 0.12, 0],
  lUpper: [-0.68, 0.22, 0.18], rUpper: [-0.52, -0.18, -0.20],
  lFore: [-1.48, 0.12, 0.05], rFore: [-1.62, -0.08, 0],
  lThigh: [-0.18, 0, -0.14], rThigh: [0.20, 0, 0.14],
  lShin: [0.32, 0, 0], rShin: [0.30, 0, 0],
  lFoot: [-0.08, 0, 0], rFoot: [-0.42, 0, 0],
  offset: [0, -0.045, 0],
};
const CROUCH = {
  offset: [0, -0.44, 0], torso: [0.28, -0.08, 0],
  lThigh: [-1.06, 0, 0.20], rThigh: [-0.92, 0, -0.20],
  lShin: [1.56, 0, 0], rShin: [1.52, 0, 0],
  lFoot: [-0.46, 0, 0], rFoot: [-0.48, 0, 0],
};
const JUMP = {
  offset: [0, -0.06, 0], torso: [-0.08, 0.06, 0],
  lThigh: [-0.72, 0, 0.14], rThigh: [-0.32, 0, -0.14],
  lShin: [1.18, 0, 0], rShin: [0.82, 0, 0],
};

const frame = (time, pose = {}) => ({ time, pose });
const duration = (name) => MOVES[name].startup + MOVES[name].active + MOVES[name].recovery;

export function martialPoses() {
  // Virtua Fighter inspiración: anticipación - carga - golpe - retracción elástica
  const jab = {
    torso: [0.07, 0.20, 0.03], hips: [0.02, 0.10, 0], offset: [0, -0.05, 0.07],
    lUpper: [-1.58, -0.22, 0.10], lFore: [-0.06, 0.05, 0],
    rUpper: [-0.62, -0.06, -0.18], rFore: [-1.58, -0.04, 0],
    head: [0.06, 0.18, -0.04],
  };
  const jabAnticip = {
    torso: [0.02, 0.28, -0.04], hips: [0, -0.06, 0], offset: [0, -0.07, -0.02],
    lUpper: [-0.42, 0.32, 0.28], lFore: [-1.1, 0, 0],
    rUpper: [-0.48, -0.14, -0.22], rFore: [-1.62, 0, 0],
  };
  const cross = {
    torso: [0.12, 0.08, 0.06], hips: [0, -0.14, 0], offset: [0, -0.08, 0.10],
    rUpper: [-1.66, 0.10, -0.06], rFore: [-0.02, 0.02, 0],
    lUpper: [-0.82, 0.18, 0.24], lFore: [-1.52, 0.06, 0],
    rThigh: [0.32, -0.18, -0.10], rFoot: [-0.48, -0.28, 0],
    head: [0.03, -0.14, 0],
  };
  const crossWindup = {
    torso: [0.02, 0.42, 0.04], hips: [0, 0.18, 0], offset: [0, -0.09, 0.02],
    rUpper: [-0.18, 0.42, -0.32], rFore: [-1.85, -0.12, 0],
    lUpper: [-0.55, 0.12, 0.28], lFore: [-1.4, 0, 0],
  };
  const knee = {
    hips: [0, 0.22, 0], torso: [-0.14, -0.18, 0], offset: [0, -0.01, 0],
    rThigh: [-1.62, 0, -0.18], rShin: [1.78, 0, 0],
    lThigh: [0.02, 0, 0.05], lShin: [0.08, 0, 0], lFoot: [0, 0, 0],
    rUpper: [-0.62, -0.08, -0.18], lUpper: [-0.72, 0.14, 0.22],
  };
  const roundhouse = {
    ...knee, hips: [0, 0.62, -0.07], torso: [-0.20, -0.48, 0.14],
    rThigh: [-1.52, 0.16, -0.58], rShin: [0.08, 0, 0], rFoot: [0.18, 0, 0],
    lUpper: [-0.78, 0, 0.38], rUpper: [-0.32, 0, -0.62],
    head: [-0.06, -0.42, 0],
  };
  const sweep = {
    ...CROUCH, hips: [0, 0.62, 0], torso: [0.16, -0.42, 0.18], offset: [0, -0.56, 0],
    rThigh: [-1.22, 0.32, -0.62], rShin: [0.10, 0, 0], rFoot: [0.08, 0, 0],
    lThigh: [-1.22, 0, 0.18], lShin: [2.08, 0, 0],
  };
  const flying = {
    ...JUMP, hips: [0, 0.28, 0], torso: [-0.28, -0.28, 0],
    rThigh: [-1.68, 0, -0.14], rShin: [0.06, 0, 0], rFoot: [-0.08, 0, 0],
    lThigh: [-0.78, 0, 0.10], lShin: [1.68, 0, 0],
  };
  const seal = { torso: [0.06, 0, 0], lUpper: [-0.68, -0.32, 0.38], rUpper: [-0.68, 0.32, -0.38], lFore: [-1.48, 0, 0], rFore: [-1.48, 0, 0] };
  const palm = { torso: [0.10, 0, 0], lUpper: [-1.48, 0, 0.10], rUpper: [-1.48, 0, -0.10], lFore: [-0.10, 0, 0], rFore: [-0.10, 0, 0], offset: [0, -0.05, 0.06] };

  // Guardia VF: codos pegados, puños a altura mandíbula, rodillas flexionadas
  const vfGuard = {
    lUpper: [-0.92, 0.28, 0.32], rUpper: [-0.88, -0.24, -0.32],
    lFore: [-1.62, 0.06, 0], rFore: [-1.66, -0.06, 0],
    torso: [0.06, 0, 0], hips: [0, -0.08, 0], offset: [0, -0.06, 0],
    lThigh: [-0.12, 0, -0.12], rThigh: [0.14, 0, 0.12],
  };
  const evadeTilt = {
    offset: [0, -0.12, 0.42], torso: [0.08, -0.78, 0.18], hips: [0, 0.55, 0.12],
    lUpper: [-0.42, 0.18, 0.35], rUpper: [-0.86, -0.18, -0.38],
    lFore: [-1.0, 0, 0], rFore: [-1.55, 0, 0],
    lThigh: [-0.52, -0.12, 0.28], rThigh: [0.18, 0.28, 0.42], lShin: [0.62, 0, 0], rShin: [0.42, 0, 0],
    head: [0.06, -0.45, 0.12],
  };
  const evadeRecoil = {
    offset: [0, -0.06, -0.08], torso: [0.04, 0.52, -0.08], hips: [0, -0.22, 0],
    lUpper: [-0.62, 0.12, 0.18], rUpper: [-0.58, -0.08, -0.18],
    lFore: [-1.42, 0, 0], rFore: [-1.44, 0, 0],
  };
  // Grab: extensión de brazos, manos abiertas, paso corto
  const grabReach = {
    torso: [0.06, 0.12, 0], hips: [0, -0.04, 0], offset: [0, -0.04, 0.12],
    lUpper: [-1.45, 0.08, 0.12], lFore: [-0.22, 0, 0],
    rUpper: [-1.45, -0.08, -0.12], rFore: [-0.22, 0, 0],
    lThigh: [0.08, 0, -0.10], rThigh: [0.22, 0, 0.10],
  };
  const grabHold = {
    torso: [0.10, 0, 0], hips: [0, -0.06, 0], offset: [0, -0.07, 0.04],
    lUpper: [-1.15, 0.18, 0.22], rUpper: [-1.15, -0.18, -0.22],
    lFore: [-1.05, 0, 0], rFore: [-1.05, 0, 0],
    lThigh: [-0.08, 0, -0.06], rThigh: [0.10, 0, 0.06],
  };
  // Flurry poses — alternancia rápida puño/patada
  const grabPunchL = {
    torso: [0.08, 0.18, 0.04], lUpper: [-1.68, 0.12, 0.10], lFore: [-0.08, 0, 0],
    rUpper: [-0.72, -0.08, -0.18], rFore: [-1.58, 0, 0],
    hips: [0, 0.06, 0], offset: [0, -0.06, 0.05],
  };
  const grabPunchR = {
    torso: [0.08, -0.14, 0.02], rUpper: [-1.70, -0.08, -0.08], rFore: [-0.06, 0, 0],
    lUpper: [-0.76, 0.12, 0.22], lFore: [-1.62, 0, 0],
    hips: [0, -0.04, 0], offset: [0, -0.06, 0.06],
  };
  const grabKickR = {
    torso: [-0.10, -0.22, 0.08], rThigh: [-1.35, 0.08, -0.28], rShin: [0.62, 0, 0],
    lThigh: [-0.08, 0, 0.08], lUpper: [-0.68, 0.18, 0.22], rUpper: [-0.62, -0.12, -0.32],
  };
  const grabFinisher = {
    torso: [0.18, 0.06, 0.06], hips: [0, -0.12, 0], offset: [0, -0.08, 0.14],
    rUpper: [-1.72, 0.22, -0.04], rFore: [0.02, 0, 0],
    lUpper: [-0.88, -0.08, 0.28], lFore: [-1.48, 0, 0],
    rThigh: [0.38, -0.14, -0.12], lThigh: [-0.12, 0, 0.10],
    head: [0.04, 0.14, 0],
  };

  return {
    idle: { loop: true, frames: [
      frame(0, { ...vfGuard, offset: [0, -0.055, 0], torso: [0.05, -0.04, 0] }),
      frame(0.55, { ...vfGuard, offset: [0, -0.065, 0.015], torso: [0.06, -0.08, 0.01], head: [0.02, 0.08, 0] }),
      frame(1.10, { ...vfGuard, offset: [0, -0.05, -0.01], torso: [0.04, 0.06, -0.01], head: [-0.01, -0.06, 0] }),
      frame(1.75, { ...vfGuard, offset: [0, -0.06, 0], torso: [0.05, -0.02, 0] }),
      frame(2.4),
    ] },
    walk: { loop: true, frames: [
      frame(0, { lThigh: [-0.58, 0, 0.08], rThigh: [0.48, 0, -0.08], lShin: [0.48, 0, 0], rShin: [0.14, 0, 0], offset: [0, -0.06, 0], torso: [0.03, 0.04, 0], lUpper: [-0.62, 0.14, 0.22], rUpper: [-0.58, -0.12, -0.18] }),
      frame(0.16, { offset: [0, -0.03, 0.02], lThigh: [-0.06, 0, 0.08], rThigh: [-0.28, 0, -0.08], rShin: [0.98, 0, 0], torso: [0.02, -0.06, 0] }),
      frame(0.32, { lThigh: [0.48, 0, 0.08], rThigh: [-0.58, 0, -0.08], lShin: [0.14, 0, 0], rShin: [0.48, 0, 0], offset: [0, -0.055, -0.01], torso: [0.03, -0.04, 0] }),
      frame(0.48, { offset: [0, -0.032, -0.02], lThigh: [-0.28, 0, 0.08], rThigh: [-0.06, 0, -0.08], lShin: [0.98, 0, 0], torso: [0.04, 0.06, 0] }),
      frame(0.64, { lThigh: [-0.58, 0, 0.08], rThigh: [0.48, 0, -0.08], lShin: [0.48, 0, 0], rShin: [0.14, 0, 0], offset: [0, -0.06, 0] }),
    ] },
    jump: { frames: [frame(0, { ...JUMP, torso: [-0.06, 0.04, 0] }), frame(0.32, JUMP), frame(0.55, { ...JUMP, offset: [0, 0.02, 0] })] },
    crouch: { loop: true, frames: [frame(0, CROUCH), frame(0.9, { ...CROUCH, offset: [0, -0.45, 0], torso: [0.30, -0.06, 0] }), frame(1.9, CROUCH)] },
    block: { loop: true, frames: [
      frame(0, { lUpper: [-1.18, 0.32, 0.38], rUpper: [-1.18, -0.28, -0.38], lFore: [-1.72, 0.04, 0], rFore: [-1.72, -0.04, 0], torso: [0.12, 0.06, 0], offset: [0, -0.07, 0.02], head: [0.04, 0, 0], lThigh: [-0.16, 0, -0.08], rThigh: [0.16, 0, 0.08] }),
      frame(0.5, { lUpper: [-1.20, 0.32, 0.38], rUpper: [-1.20, -0.28, -0.38], lFore: [-1.72, 0.04, 0], rFore: [-1.72, -0.04, 0], torso: [0.12, 0.04, 0], offset: [0, -0.07, 0.02] }),
    ] },
    evade: { frames: [
      frame(0),
      frame(MOVES.evade.startup, evadeTilt),
      frame(MOVES.evade.startup + 0.06, { ...evadeTilt, offset: [0, -0.14, 0.38] }),
      frame(MOVES.evade.startup + MOVES.evade.active, evadeRecoil),
      frame(duration("evade")),
    ] },
    grab: { frames: [
      frame(0),
      frame(0.06, { torso: [0.02, 0.18, 0], offset: [0, -0.05, 0.04], lUpper: [-0.92, 0.14, 0.18], rUpper: [-0.92, -0.12, -0.18], lFore: [-1.15, 0, 0], rFore: [-1.15, 0, 0] }),
      frame(MOVES.grab.startup, grabReach),
      frame(MOVES.grab.startup + MOVES.grab.active, grabHold),
      frame(duration("grab"), grabHold),
    ] },
    grabCombo: { frames: [
      frame(0, grabHold),
      frame(0.06, grabPunchL),
      frame(0.12, grabPunchR),
      frame(0.18, grabPunchL),
      frame(0.24, grabKickR),
      frame(0.30, grabPunchR),
      frame(0.38, grabPunchL),
      frame(0.46, grabFinisher),
      frame(0.62, grabFinisher),
      frame(0.78),
    ] },
    grabPunch: { frames: [frame(0), frame(MOVES.grabPunch.startup, grabPunchL), frame(MOVES.grabPunch.startup + MOVES.grabPunch.active, grabPunchL), frame(duration("grabPunch"))] },
    grabKick: { frames: [frame(0), frame(MOVES.grabKick.startup, grabKickR), frame(MOVES.grabKick.startup + MOVES.grabKick.active, grabKickR), frame(duration("grabKick"))] },
    grabFinisher: { frames: [frame(0), frame(MOVES.grabFinisher.startup, grabFinisher), frame(MOVES.grabFinisher.startup + MOVES.grabFinisher.active, grabFinisher), frame(duration("grabFinisher"))] },
    light: { frames: [
      frame(0),
      frame(0.04, jabAnticip),
      frame(MOVES.light.startup, jab),
      frame(MOVES.light.startup + MOVES.light.active, jab),
      frame(MOVES.light.startup + MOVES.light.active + 0.045, { ...jab, offset: [0, -0.04, 0.03], torso: [0.05, 0.12, 0] }),
      frame(duration("light")),
    ] },
    heavy: { frames: [
      frame(0),
      frame(0.07, crossWindup),
      frame(MOVES.heavy.startup, cross),
      frame(MOVES.heavy.startup + MOVES.heavy.active, cross),
      frame(MOVES.heavy.startup + MOVES.heavy.active + 0.06, { ...cross, offset: [0, -0.06, 0.05] }),
      frame(duration("heavy")),
    ] },
    kick: { frames: [
      frame(0),
      frame(0.07, knee),
      frame(MOVES.kick.startup, roundhouse),
      frame(MOVES.kick.startup + MOVES.kick.active, roundhouse),
      frame(0.34, knee),
      frame(duration("kick")),
    ] },
    crouchLight: { frames: [
      frame(0, CROUCH),
      frame(0.06, { ...CROUCH, torso: [0.22, -0.28, 0.12], offset: [0, -0.46, 0.02] }),
      frame(MOVES.crouchLight.startup, sweep),
      frame(MOVES.crouchLight.startup + MOVES.crouchLight.active, { ...sweep, hips: [0, 1.02, 0] }),
      frame(duration("crouchLight"), CROUCH),
    ] },
    airKick: { frames: [
      frame(0, JUMP),
      frame(MOVES.airKick.startup, flying),
      frame(MOVES.airKick.startup + MOVES.airKick.active, flying),
      frame(duration("airKick"), JUMP),
    ] },
    special: { frames: [frame(0), frame(0.09, seal), frame(0.15, palm), frame(0.29, palm), frame(0.45)] },
    ultimate: { frames: [frame(0), frame(0.16, { ...seal, ...CROUCH }), frame(0.26, palm), frame(0.44, palm), frame(0.70)] },
    dash: { frames: [
      frame(0, { torso: [0.42, 0, 0], lUpper: [0.82, 0, 0.12], rUpper: [0.82, 0, -0.12], lFore: [-0.22, 0, 0], rFore: [-0.22, 0, 0], lThigh: [-0.76, 0, 0], rThigh: [0.48, 0, 0], offset: [0, -0.10, 0] }),
      frame(0.10, { torso: [0.48, 0, 0], lUpper: [0.9, 0, 0.10], rUpper: [0.9, 0, -0.10], offset: [0, -0.09, 0] }),
      frame(0.18, JUMP),
    ] },
    hurt: { frames: [
      frame(0, { torso: [-0.22, 0.18, 0], head: [0.18, 0, 0], lUpper: [-0.42, 0, 0.38], rUpper: [-0.32, 0, -0.38], offset: [0, -0.04, -0.03] }),
      frame(0.18, { torso: [-0.18, 0.12, 0], offset: [0, -0.03, -0.02] }),
      frame(0.35),
    ] },
    ko: { frames: [
      frame(0),
      frame(0.28, { hips: [-0.68, 0, 0], offset: [0, -0.42, -0.18], torso: [-0.12, 0.08, 0] }),
      frame(0.75, { hips: [-Math.PI / 2, 0, 0], offset: [0, -0.96, -0.38], lUpper: [-0.38, 0, 0.48], rUpper: [-0.28, 0, -0.48], lFore: [-0.38, 0, 0], rFore: [-0.28, 0, 0], lThigh: [0, 0, 0.10], rThigh: [0, 0, -0.10], lShin: [0.10, 0, 0], rShin: [0.10, 0, 0] }),
    ] },
    win: { frames: [
      frame(0),
      frame(0.45, { rUpper: [-2.68, 0, -0.18], rFore: [-0.48, 0, 0], torso: [0, 0.18, 0], hips: [0, -0.06, 0] }),
      frame(1.0, { rUpper: [-2.72, 0, -0.18], rFore: [-0.42, 0, 0], torso: [0, -0.08, 0] }),
      frame(2.5, { rUpper: [-2.70, 0, -0.18], rFore: [-0.46, 0, 0] }),
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
        const track = new THREE.QuaternionKeyframeTrack(`${node.uuid}.quaternion`, times, values);
        track.setInterpolation(THREE.InterpolateSmooth);
        tracks.push(track);
      }
      const offsets = definition.frames.flatMap(({ pose }) => {
        const v = pose.offset || GUARD.offset;
        const base = rest.get("hips").p;
        const ratio = hipHeight / 1.2;
        return [base.x + v[0], base.y + v[1] * ratio, base.z + v[2]];
      });
      const posTrack = new THREE.VectorKeyframeTrack(`${rig.hips.uuid}.position`, times, offsets);
      posTrack.setInterpolation(THREE.InterpolateSmooth);
      tracks.push(posTrack);
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
    if (previous && previous !== action) {
      const isQuick = ["hurt", "ko", "evade", "grab"].includes(name);
      action.crossFadeFrom(previous, isQuick ? 0.04 : 0.09, false);
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
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.85)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.38)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    contactTexture = new THREE.CanvasTexture(canvas);
    contactTexture.userData.shared = true;
    contactGeometry = new THREE.PlaneGeometry(1.5, 1.3);
    contactGeometry.userData.shared = true;
  }
  const shadow = new THREE.Mesh(contactGeometry, new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, opacity: 0.52, depthWrite: false }));
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
  let breathe = 0;
  const update = (dt, state = {}) => {
    animator.update(dt);
    breathe += dt * 1.45;
    // Respiración sutil VF — pecho y cadera oscilan incluso en idle
    if (["idle", "block", "walk"].includes(animator.state)) {
      const s = Math.sin(breathe) * 0.015;
      rig.torso.rotation.x += s * 0.4;
      rig.torso.position.y += s * 0.12;
    }
    // Micro sway lateral en guardia
    if (animator.state === "idle") {
      const sway = Math.sin(breathe * 0.55) * 0.04;
      rig.hips.rotation.z = sway * 0.3;
      rig.torso.rotation.z = -sway * 0.5;
    }
    const height = state.height || 0;
    shadow.position.y = 0.012 - height / root.scale.y;
    shadow.material.opacity = Math.max(0.14, 0.52 - height * 0.09);
    // Ligera deformación de sombra según impulso
    const stretch = state.evade ? 1.25 : state.dash ? 1.12 : 1;
    shadow.scale.set(stretch, 1, 1);
    const casting = ["special", "ultimate"].includes(animator.state);
    aura.material.opacity = THREE.MathUtils.damp(aura.material.opacity, casting ? 0.86 : 0, 11, dt);
    aura2.material.opacity = THREE.MathUtils.damp(aura2.material.opacity, casting ? 0.66 : 0, 11, dt);
    aura.rotation.z += dt * 1.9;
    aura2.rotation.z -= dt * 2.4;
    if (!!state.flash !== wasFlashing) {
      materials.forEach((base, material) => {
        material.emissive.copy(base.color);
        material.emissiveIntensity = base.intensity;
        if (state.flash) { material.emissive.lerp(new THREE.Color("#ffb49d"), 0.65); material.emissiveIntensity = 0.82; }
      });
      wasFlashing = !!state.flash;
    }
  };
  return { animator, update };
}
