import * as THREE from "three";
import { ELEMENTS } from "./config.js";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

// ---------------------------------------------------------------------------
// NARUTO MODEL — skinned character loaded from Naruto/model.dae.
//
// The procedural ninja is kept as a fallback (createProceduralNinja) so the
// game never breaks if the model cannot be fetched/parsed. Once loaded, every
// ninja (player, enemies, bosses) is a cloned instance of the imported skinned
// model, animated through its MMD-style skeleton.
// ---------------------------------------------------------------------------

let template = null; // { scene, modelGroup, bones, rest } — built once.
let loadPromise = null;

const HEIGHT_SCALE = 1.9; // target total height (game units) of the imported model.

// Bones we animate, and their neutral/rest offset.
const ANIM_BONES = {
  hip: "hip",
  waist: "waist",
  neck: "neck",
  head: "head",
  rUpper: "R_harm",
  rFore: "R_larm",
  lUpper: "L_harm",
  lFore: "L_larm",
  rThigh: "R_hleg",
  rShin: "R_lleg",
  lThigh: "L_hleg",
  lShin: "L_lleg",
};

// Base pose (T-pose -> fighting stance). Values are model-local eulers
// (radians) about the model's axes: +Y up, +Z forward (the face).
const BASE_POSE = {
  rUpper: [0, 0, 1.35],
  lUpper: [0, 0, -1.35],
  rFore: [-0.6, 0, 0],
  lFore: [-0.6, 0, 0],
};

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extra.roughness ?? 0.55,
    metalness: extra.metalness ?? 0.12,
    emissive: extra.emissive ?? 0x000000,
    emissiveIntensity: extra.emissiveIntensity ?? 0,
    transparent: extra.transparent ?? false,
    opacity: extra.opacity ?? 1,
  });
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// Loading + normalization of the Naruto model.
// ---------------------------------------------------------------------------
export async function loadNinjaModel() {
  if (template) return template;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const loader = new ColladaLoader();
    let collada;
    try {
      collada = await loader.loadAsync("Naruto/model.dae");
    } catch (err) {
      console.warn("Could not load the Naruto model, using procedural ninja:", err);
      return null;
    }
    const scene = collada.scene;

    // Normalize: centre on origin, feet at y = 0, scale to ~1.9 units tall.
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const scale = HEIGHT_SCALE / Math.max(0.001, size.y);
    scene.position.set(
      -(box.min.x + box.max.x) / 2,
      -box.min.y,
      -(box.min.z + box.max.z) / 2
    );

    const modelGroup = new THREE.Group();
    modelGroup.scale.setScalar(scale);
    modelGroup.add(scene);

    // Cache bind (rest) quaternions for the bones we animate.
    const bones = {};
    const rest = {};
    scene.updateMatrixWorld(true);
    for (const key of Object.keys(ANIM_BONES)) {
      const name = ANIM_BONES[key];
      const b = scene.getObjectByName(name);
      if (b) {
        bones[key] = b;
        rest[name] = b.quaternion.clone();
      }
    }

    template = { scene, modelGroup, bones, rest, scale };
    return template;
  })();
  return loadPromise;
}

function modelReady() {
  return !!template;
}

// ---------------------------------------------------------------------------
// Model-based ninja (skinned Naruto mesh).
// ---------------------------------------------------------------------------
function createModelNinja(appearance) {
  const a = appearance;
  const root = new THREE.Group();
  const modelGroup = cloneSkeleton(template.modelGroup);
  const height = a.height || 1;
  modelGroup.scale.setScalar(template.scale * height);
  root.add(modelGroup);

  // Fresh materials per instance + palette tinting.
  const white = new THREE.Color(0xffffff);
  const skin = new THREE.Color(a.skin || "#f0c7a0");
  const primary = new THREE.Color(a.primaryColor || "#2b3548");
  const secondary = new THREE.Color(a.secondaryColor || "#e8c36a");
  modelGroup.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const next = mats.map((m) => {
      const nm = m.clone();
      const region = materialRegion(m.name);
      if (region === "skin") nm.color.copy(white).lerp(skin, 0.5);
      else if (region === "primary") nm.color.copy(white).lerp(primary, 0.6);
      else if (region === "secondary") nm.color.copy(white).lerp(secondary, 0.6);
      nm.emissive = new THREE.Color(0x000000);
      nm.emissiveIntensity = 0;
      return nm;
    });
    o.material = next.length === 1 ? next[0] : next;
  });

  // Element aura rings (kept from the procedural design).
  const el = ELEMENTS[a.elements?.[0]] || ELEMENTS.fire;
  const el2 = ELEMENTS[a.elements?.[1]] || ELEMENTS.wind;
  const aura = mesh(
    new THREE.TorusGeometry(0.5, 0.016, 8, 28),
    mat(el.color, { emissive: el.color, emissiveIntensity: 0.7, transparent: true, opacity: 0.0 }),
    0, 0.02, 0
  );
  aura.rotation.x = Math.PI / 2;
  root.add(aura);
  const aura2 = mesh(
    new THREE.TorusGeometry(0.36, 0.012, 8, 24),
    mat(el2.color, { emissive: el2.color, emissiveIntensity: 0.7, transparent: true, opacity: 0.0 }),
    0, 0.02, 0
  );
  aura2.rotation.x = Math.PI / 2;
  root.add(aura2);

  // Build the bone map for this instance.
  const bones = {};
  const rest = template.rest;
  for (const key of Object.keys(ANIM_BONES)) {
    const name = ANIM_BONES[key];
    const b = modelGroup.getObjectByName(name);
    if (b) bones[key] = b;
  }

  const rig = { modelGroup, bones, rest };
  const animator = new ModelAnimator(rig, aura, aura2);
  const parts = {
    root,
    hips: bones.hip,
    torso: bones.waist,
    head: bones.head,
    lArm: bones.lUpper,
    rArm: bones.rUpper,
    lLeg: bones.lThigh,
    rLeg: bones.rThigh,
    aura,
    aura2,
  };
  return { root, parts, animator, appearance: a, modelBased: true, update: (dt, st) => animator.update(dt, st) };
}

function materialRegion(matName) {
  const m = /Material_(\d+)$/.exec(matName || "");
  const n = m ? Number(m[1]) : -1;
  if (n === 0 || n === 1) return "skin"; // face + body skin
  if (n === 3 || n === 5) return "primary"; // orange suit
  if ([2, 4, 6, 7, 8, 9, 10, 13].includes(n)) return "secondary"; // navy trim
  return "other";
}

// ---------------------------------------------------------------------------
// Skeleton animator — drives the MMD bones to match the game's move states.
// ---------------------------------------------------------------------------
class ModelAnimator {
  constructor(rig, aura, aura2) {
    this.rig = rig;
    this.aura = aura;
    this.aura2 = aura2;
    this.state = "idle";
    this.t = 0;
    this.lock = 0;
    this.flash = 0;
    this.pose = {};
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._q3 = new THREE.Quaternion();
    this._q4 = new THREE.Quaternion();
    this._q5 = new THREE.Quaternion();
    this._q6 = new THREE.Quaternion();
    this._q7 = new THREE.Quaternion();
    this._e = new THREE.Euler();
  }

  play(name, lock = 0) {
    if (this.t < this.lock && !["hurt", "ko", "win"].includes(name)) return;
    this.state = name;
    this.t = 0;
    this.lock = lock;
  }

  applyBone(b, euler) {
    const qModel = this._q1.setFromEuler(this._e.set(euler[0], euler[1], euler[2], "XYZ"));
    const modelQ = this.rig.modelGroup.getWorldQuaternion(this._q2);
    const parentQ = b.parent.getWorldQuaternion(this._q3);
    const restWorld = this._q4.copy(parentQ).multiply(this.rig.rest[b.name]);
    // Convert the model-space rotation into world space, then back into the
    // bone's local frame relative to its (possibly animated) parent.
    const qWorldRot = this._q5.copy(modelQ).multiply(qModel).multiply(this._q6.copy(modelQ).invert());
    const newWorld = this._q7.copy(qWorldRot).multiply(restWorld);
    b.quaternion.copy(this._q6.copy(parentQ).invert().multiply(newWorld));
  }

  applyPose() {
    const P = this.pose;
    const order = [
      "hip", "waist", "neck", "head",
      "rUpper", "rFore", "lUpper", "lFore",
      "rThigh", "rShin", "lThigh", "lShin",
    ];
    for (const key of order) {
      const b = this.rig.bones[key];
      if (!b) continue;
      this.applyBone(b, P[key] || BASE_POSE[key] || [0, 0, 0]);
    }
  }

  update(dt, st = {}) {
    this.t += dt;
    const t = this.t;
    const s = this.state;
    const P = this.pose;
    const bob = Math.sin(t * 4) * 0.015;
    const body = this.rig.modelGroup;

    for (const k in BASE_POSE) P[k] = BASE_POSE[k].slice();
    body.position.y = 0;

    if (s === "idle") {
      P.rUpper[0] += 0.08 + bob * 2;
      P.lUpper[0] += 0.08 - bob * 2;
      P.waist = [Math.sin(t * 1.2) * 0.03, 0, 0];
      P.head = [Math.sin(t * 1.2 + 1) * 0.03, 0, 0];
    } else if (s === "walk") {
      const w = Math.sin(t * 11);
      P.rThigh = [-w * 0.55, 0, 0];
      P.lThigh = [w * 0.55, 0, 0];
      P.rUpper[0] += w * 0.25;
      P.lUpper[0] -= w * 0.25;
      P.waist = [-0.12, 0, 0];
      body.position.y = Math.abs(w) * 0.03;
    } else if (s === "jump") {
      P.rUpper = [0, 0, 0.7];
      P.lUpper = [0, 0, -0.7];
      P.rFore = [-0.4, 0, 0];
      P.lFore = [-0.4, 0, 0];
      P.rThigh = [-0.35, 0, 0];
      P.rShin = [-0.5, 0, 0];
      P.lThigh = [-0.25, 0, 0];
      P.lShin = [-0.5, 0, 0];
    } else if (s === "crouch") {
      body.position.y = -0.18;
      P.rThigh = [0.55, 0, 0];
      P.lThigh = [0.55, 0, 0];
      P.rShin = [-0.75, 0, 0];
      P.lShin = [-0.75, 0, 0];
      P.waist = [-0.15, 0, 0];
    } else if (s === "block") {
      P.rUpper = [0, 0, 1.1];
      P.lUpper = [0, 0, -1.1];
      P.rFore = [-1.6, 0, 0];
      P.lFore = [-1.6, 0, 0];
      P.waist = [0.1, 0, 0];
    } else if (s === "light" || s === "crouchLight") {
      const k = Math.min(1, t / 0.12);
      P.rUpper = [-0.9 * k, 0, 1.35];
      P.rFore = [-0.6 - 0.6 * k, 0, 0];
      P.waist = [-0.15 * k, 0, 0];
    } else if (s === "heavy") {
      const k = Math.min(1, t / 0.22);
      P.rUpper = [-1.4 * k, 0, 1.35];
      P.rFore = [-0.6 + 0.5 * k, 0, 0];
      P.waist = [-0.22 * k, 0, 0];
    } else if (s === "kick" || s === "airKick") {
      const k = Math.min(1, t / 0.16);
      P.rThigh = [-0.8 * k, 0, 0];
      P.rShin = [0.15 * k, 0, 0];
      P.rUpper[0] += 0.35 * k;
      P.lUpper[0] += 0.35 * k;
      P.waist = [0.15 * k, 0, 0];
    } else if (s === "special" || s === "ultimate") {
      const k = Math.sin(Math.min(1, t / 0.25) * Math.PI);
      P.rUpper = [-1.0 * k, 0, 1.0];
      P.lUpper = [-1.0 * k, 0, -1.0];
      P.rFore = [-1.0 * k, 0, 0];
      P.lFore = [-1.0 * k, 0, 0];
      P.waist = [-0.15 * k, 0, 0];
    } else if (s === "hurt") {
      P.waist = [0.45, 0, 0];
      P.neck = [0.3, 0, 0];
      P.rUpper = [0.5, 0, 0.8];
      P.lUpper = [0.5, 0, -0.8];
    } else if (s === "ko") {
      body.position.y = -0.5;
      P.hip = [Math.min(1.3, t * 3), 0, 0];
      P.neck = [0.4, 0, 0];
    } else if (s === "win") {
      P.rUpper = [-1.4, 0, 1.0];
      P.neck = [-0.2, 0, 0];
      P.waist = [Math.sin(t * 3) * 0.05, 0, 0];
    } else if (s === "dash") {
      P.waist = [-0.45, 0, 0];
      P.rUpper = [0.5, 0, 1.35];
      P.lUpper = [0.5, 0, -1.35];
    }

    this.applyPose();

    // Aura rings.
    const on = s === "special" || s === "ultimate";
    const ta = on ? 0.9 : 0;
    this.aura.material.opacity = THREE.MathUtils.lerp(this.aura.material.opacity, ta, dt * 6);
    this.aura2.material.opacity = THREE.MathUtils.lerp(this.aura2.material.opacity, on ? 0.75 : 0, dt * 6);
    this.aura.rotation.z += dt * 2;
    this.aura2.rotation.z -= dt * 2.6;

    // Hit flash.
    if (st.flash) this.flash = 0.12;
    if (this.flash > 0) {
      this.flash -= dt;
      this.rig.modelGroup.traverse((o) => {
        if (o.isMesh && o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            if (m.emissive) {
              m.emissive.setHex(0xffffff);
              m.emissiveIntensity = 0.35;
            }
          });
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Public factory.
// ---------------------------------------------------------------------------
export function createNinja(appearance) {
  if (modelReady()) {
    try {
      return createModelNinja(appearance);
    } catch (err) {
      console.warn("Falling back to procedural ninja:", err);
    }
  }
  return createProceduralNinja(appearance);
}

export function disposeNinja(ninja) {
  if (!ninja) return;
  ninja.root?.traverse((o) => {
    if (o.isMesh) {
      if (!ninja.modelBased && o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    }
  });
}

// ===========================================================================
// PROCEDURAL NINJA (fallback) — original implementation, kept intact.
// ===========================================================================

function villageCanvas(symbol, bg, fg) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(8, 8, 112, 112);
  g.fillStyle = fg;
  g.font = "bold 64px serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(symbol, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// PELO — cada estilo tiene una silueta claramente distinta.
// ---------------------------------------------------------------------------
function hairMeshes(style, color, accent, head) {
  const group = new THREE.Group();
  const m = mat(color, { roughness: 0.72, metalness: 0.02 });
  const a = mat(accent || color, { roughness: 0.72, metalness: 0.02 });
  const add = (g, x, y, z, rx = 0, ry = 0, rz = 0, material = m) => {
    const p = mesh(g, material, x, y, z);
    p.rotation.set(rx, ry, rz);
    group.add(p);
  };

  const capGeo = () => {
    const g = new THREE.SphereGeometry(0.205, 14, 12);
    g.scale(1, 0.82, 1);
    return g;
  };
  const cap = (y = 0.03, z = -0.01) => add(capGeo(), 0, y, z);

  // Puntas con degradado de color (punta de acento) para dar volumen.
  const tuft = (len, r, x, y, z, ang, matl = m, tip = null) => {
    add(new THREE.ConeGeometry(r, len, 6), x, y, z, -1.0 + ang, 0, ang, matl);
    if (tip) {
      add(new THREE.ConeGeometry(r * 0.72, len * 0.34, 6), x + Math.sin(ang) * len * 0.34, y + len * 0.34, z, -1.0 + ang, 0, ang, tip);
    }
  };

  switch (style) {
    case "spiky": {
      // Naruto — corona de pinchos altos hacia arriba y lados.
      cap(0.04, -0.02);
      for (let i = 0; i < 12; i++) {
        const ang = -1.15 + i * 0.21;
        const len = 0.4 + (i % 3) * 0.09;
        const r = 0.075 + (i % 2) * 0.02;
        tuft(len, r, Math.sin(ang) * 0.13, 0.16, Math.cos(ang) * 0.1, ang, m, a);
      }
      for (let i = 0; i < 4; i++) {
        add(new THREE.ConeGeometry(0.07, 0.3, 6), -0.12 + i * 0.08, 0.12, -0.15, -0.7, 0, 0.3);
      }
      break;
    }
    case "messy": {
      // Boruto — mechones irregulares + ahoge.
      cap(0.05, 0);
      const angles = [-0.9, -0.55, -0.2, 0.15, 0.5, 0.85, 1.1];
      angles.forEach((ang, i) => {
        const len = 0.26 + (i % 3) * 0.07;
        tuft(len, 0.065, Math.sin(ang) * 0.15, 0.14, Math.cos(ang) * 0.06, ang, i % 2 ? a : m);
      });
      add(new THREE.BoxGeometry(0.14, 0.18, 0.14), -0.12, 0.14, 0.02, 0.25, 0, 0.4);
      add(new THREE.BoxGeometry(0.12, 0.16, 0.12), 0.13, 0.16, 0.02, -0.3, 0, -0.4);
      add(new THREE.ConeGeometry(0.02, 0.14, 5), 0.02, 0.3, 0.02, -0.5);
      break;
    }
    case "longback": {
      // Sasuke — flequillo + melena larga hacia atrás.
      cap(0.04, -0.02);
      add(new THREE.BoxGeometry(0.26, 0.12, 0.1), 0, 0.1, 0.13, 0.2);
      add(new THREE.BoxGeometry(0.24, 0.5, 0.13), 0, -0.14, -0.15, 0.15);
      add(new THREE.BoxGeometry(0.2, 0.55, 0.11), 0, -0.34, -0.16, 0.3);
      add(new THREE.BoxGeometry(0.1, 0.3, 0.08), -0.15, -0.02, -0.1, 0.15, 0, 0.4);
      add(new THREE.BoxGeometry(0.1, 0.3, 0.08), 0.15, -0.02, -0.1, 0.15, 0, -0.4);
      break;
    }
    case "shortbob": {
      // Bob — casquete redondeado + cortinas laterales + clips.
      cap(0.02, 0);
      add(new THREE.BoxGeometry(0.34, 0.2, 0.24), 0, -0.03, 0);
      add(new THREE.BoxGeometry(0.06, 0.3, 0.16), -0.18, -0.05, 0.02, 0.1, 0, 0.15);
      add(new THREE.BoxGeometry(0.06, 0.3, 0.16), 0.18, -0.05, 0.02, 0.1, 0, -0.15);
      add(new THREE.BoxGeometry(0.04, 0.08, 0.03), -0.14, 0.08, 0.16, 0, 0, 0, a);
      add(new THREE.BoxGeometry(0.04, 0.08, 0.03), 0.14, 0.08, 0.16, 0, 0, 0, a);
      break;
    }
    case "smooth": {
      // Mitsuki — liso, serpenteante y largo.
      cap(0.04, -0.02);
      add(new THREE.BoxGeometry(0.22, 0.16, 0.1), 0, 0.08, 0.1, 0.25);
      add(new THREE.BoxGeometry(0.2, 0.62, 0.12), 0, -0.2, -0.14, 0.22);
      add(new THREE.BoxGeometry(0.16, 0.5, 0.1), 0, -0.4, -0.15, 0.4);
      add(new THREE.BoxGeometry(0.08, 0.34, 0.07), -0.14, -0.02, 0.02, 0.12, 0, 0.35);
      add(new THREE.BoxGeometry(0.08, 0.34, 0.07), 0.14, -0.02, 0.02, 0.12, 0, -0.35);
      break;
    }
    case "undercut": {
      // Lados rapados + volumen arriba (Darui / Kawaki).
      add(new THREE.SphereGeometry(0.16, 10, 8), 0, 0.04, -0.02);
      add(new THREE.BoxGeometry(0.3, 0.14, 0.26), 0, 0.1, 0, 0.15);
      add(new THREE.BoxGeometry(0.24, 0.14, 0.2), 0, 0.16, 0.02, -0.15);
      add(new THREE.ConeGeometry(0.04, 0.16, 5), -0.13, 0.2, 0.02, -0.9, 0, -0.5);
      add(new THREE.ConeGeometry(0.04, 0.16, 5), 0.13, 0.2, 0.02, -0.9, 0, 0.5);
      break;
    }
    case "silver": {
      // Kakashi — mechón lateral que cubre un ojo + pinchos atrás.
      cap(0.03, -0.02);
      add(new THREE.BoxGeometry(0.2, 0.14, 0.12), -0.08, 0.09, 0.14, 0.35, 0, -0.5);
      for (let i = 0; i < 7; i++) {
        add(new THREE.ConeGeometry(0.055, 0.3, 5), -0.1 + i * 0.035, 0.2, -0.05, -0.7, 0, 0.1);
      }
      add(new THREE.BoxGeometry(0.2, 0.1, 0.08), 0, 0.05, 0.16);
      break;
    }
    case "ponytail": {
      // Coleta alta (Itachi / Shikamaru).
      cap(0.03, -0.02);
      add(new THREE.CylinderGeometry(0.05, 0.045, 0.6, 8), 0, -0.18, -0.22, 0.5);
      add(new THREE.SphereGeometry(0.09, 8, 8), 0, -0.12, -0.2);
      add(new THREE.CylinderGeometry(0.025, 0.02, 0.14, 6), 0, 0.16, -0.06, 0.2, 0, 0, a);
      add(new THREE.BoxGeometry(0.24, 0.08, 0.1), 0, 0.06, 0.02);
      break;
    }
    case "bun": {
      // Moño de combate arriba.
      cap(0.03, -0.02);
      add(new THREE.SphereGeometry(0.13, 10, 10), 0, 0.2, -0.04);
      add(new THREE.TorusGeometry(0.07, 0.02, 6, 12), 0, 0.2, 0.04, 0, 0, 0, a);
      add(new THREE.BoxGeometry(0.24, 0.08, 0.1), 0, 0.05, 0.02);
      add(new THREE.ConeGeometry(0.02, 0.1, 5), 0.06, 0.28, 0.02, -0.6);
      break;
    }
    case "flow": {
      // Hinata / Neji — melena larga en capas con mechones laterales.
      cap(0.04, -0.02);
      add(new THREE.BoxGeometry(0.28, 0.7, 0.16), 0, -0.24, -0.14, 0.22);
      add(new THREE.BoxGeometry(0.24, 0.72, 0.14), 0, -0.5, -0.15, 0.35);
      add(new THREE.BoxGeometry(0.11, 0.5, 0.1), -0.17, -0.16, 0.0, 0.12, 0, 0.35);
      add(new THREE.BoxGeometry(0.11, 0.5, 0.1), 0.17, -0.16, 0.0, 0.12, 0, -0.35);
      add(new THREE.BoxGeometry(0.24, 0.1, 0.1), 0, 0.06, 0.1, 0.2);
      break;
    }
    case "bowl": {
      // Rock Lee — casquete tipo bol + flequillo recto.
      cap(0.04, -0.02);
      add(new THREE.CylinderGeometry(0.2, 0.24, 0.22, 12), 0, 0.02, 0);
      add(new THREE.BoxGeometry(0.3, 0.06, 0.14), 0, 0.02, 0.15);
      add(new THREE.BoxGeometry(0.2, 0.04, 0.08), 0, -0.06, 0.16);
      break;
    }
    case "wild": {
      // Gaara — pinchos salvajes en todas direcciones.
      cap(0.04, -0.02);
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        const len = 0.26 + (i % 4) * 0.07;
        add(new THREE.ConeGeometry(0.06, len, 5), Math.sin(ang) * 0.17, 0.1 + Math.cos(ang * 2) * 0.05, Math.cos(ang) * 0.13, -0.5, 0, ang, i % 3 ? m : a);
      }
      add(new THREE.SphereGeometry(0.16, 8, 8), 0, 0.02, -0.02);
      break;
    }
    case "twin": {
      // Dos coletas laterales (Temari).
      cap(0.03, -0.02);
      add(new THREE.CylinderGeometry(0.05, 0.045, 0.55, 8), -0.18, -0.14, -0.08, 0.55, 0, 0.45);
      add(new THREE.CylinderGeometry(0.05, 0.045, 0.55, 8), 0.18, -0.14, -0.08, 0.55, 0, -0.45);
      add(new THREE.SphereGeometry(0.08, 8, 8), -0.19, -0.02, -0.02, 0, 0, 0, a);
      add(new THREE.SphereGeometry(0.08, 8, 8), 0.19, -0.02, -0.02, 0, 0, 0, a);
      add(new THREE.BoxGeometry(0.24, 0.08, 0.1), 0, 0.05, 0.02);
      break;
    }
    case "buzz": {
      // Rapeado táctico — casi sin pelo, con sombra de afeitado.
      add(new THREE.SphereGeometry(0.2, 10, 8), 0, 0.02, -0.02);
      for (let i = 0; i < 30; i++) {
        add(new THREE.BoxGeometry(0.01, 0.01, 0.01), (i % 10 - 4.5) * 0.03, 0.12, -0.14 + Math.floor(i / 10) * 0.05, 0, 0, 0, a);
      }
      break;
    }
    case "crown": {
      // Corona de pinchos alta y majestuosa.
      cap(0.04, -0.02);
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const len = 0.44 + (i % 2) * 0.12;
        add(new THREE.ConeGeometry(0.06, len, 6), Math.sin(ang) * 0.15, 0.16, Math.cos(ang) * 0.12, -1.15, 0, ang, i % 2 ? m : a);
      }
      add(new THREE.SphereGeometry(0.17, 8, 8), 0, 0.03, -0.02);
      break;
    }
    default:
      cap(0.03, -0.01);
      add(new THREE.BoxGeometry(0.24, 0.1, 0.1), 0, 0.07, 0.02);
  }

  group.position.copy(head.position);
  group.position.y += 0.12;
  return group;
}

// ---------------------------------------------------------------------------
// OJOS — más grandes y con dōjutsu diferenciados.
// ---------------------------------------------------------------------------
function makeEyes(style, color) {
  const g = new THREE.Group();
  const white = mat("#f7f3ec", { roughness: 0.4 });
  const glow = ["tomoe", "gold", "ring", "bar", "slit"].includes(style);
  const iris = mat(color, { roughness: 0.25, emissive: glow ? color : 0x000000, emissiveIntensity: glow ? 0.6 : 0 });
  const pupilCol = style === "pale" ? "#cdd8ec" : "#0b0b0e";

  [-0.08, 0.08].forEach((x) => {
    const eye = mesh(new THREE.SphereGeometry(0.042, 12, 10), white, x, 0.05, 0.155);
    eye.scale.set(1, 0.95, 0.55);
    g.add(eye);

    const ir = mesh(new THREE.SphereGeometry(0.026, 12, 10), iris, x, 0.05, 0.178);
    ir.scale.set(1, 1.15, 0.5);
    g.add(ir);

    const pu = mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(pupilCol), x, 0.05, 0.196);
    if (style === "slit") pu.scale.set(0.35, 1.7, 1);
    g.add(pu);

    // Brillo especular.
    const hi = mesh(new THREE.SphereGeometry(0.006, 6, 4), mat("#ffffff", { emissive: "#ffffff", emissiveIntensity: 0.4 }), x + 0.008, 0.062, 0.198);
    g.add(hi);

    if (style === "tomoe") {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.6;
        g.add(mesh(new THREE.SphereGeometry(0.007, 6, 4), mat("#5a0008"), x + Math.cos(a) * 0.015, 0.05 + Math.sin(a) * 0.013, 0.194));
      }
    }
    if (style === "bar") {
      g.add(mesh(new THREE.BoxGeometry(0.055, 0.009, 0.012), mat("#0b0b0e", { emissive: "#0b0b0e", emissiveIntensity: 0.2 }), x, 0.058, 0.196));
    }
    if (style === "ring") {
      const r = mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 14), mat("#b18cff", { emissive: "#7a5cff", emissiveIntensity: 0.9 }), x, 0.05, 0.19);
      g.add(r);
    }
    if (style === "gold") {
      g.add(mesh(new THREE.TorusGeometry(0.016, 0.003, 6, 12), mat("#ffd27a", { emissive: "#ff9a2a", emissiveIntensity: 0.8 }), x, 0.05, 0.19));
    }
  });
  return g;
}

function makeMarkings(kind, color) {
  const g = new THREE.Group();
  const m = mat(color);
  if (kind === "whiskers") {
    [-1, 1].forEach((s) => {
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.008, 0.01), m, 0.13 * s, -0.02, 0.16));
      g.add(mesh(new THREE.BoxGeometry(0.07, 0.008, 0.01), m, 0.13 * s, -0.045, 0.16));
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.008, 0.01), m, 0.13 * s, -0.07, 0.16));
    });
  } else if (kind === "underEye") {
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.022, 0.01), m, -0.08, 0.005, 0.17));
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.022, 0.01), m, 0.08, 0.005, 0.17));
  } else if (kind === "clan") {
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.06, 0.012), mat("#c81e3a"), 0, 0.13, 0.16));
  } else if (kind === "scar") {
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.013, 0.012), m, 0.05, 0.065, 0.17));
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.07, 0.012), m, 0.05, 0.04, 0.17));
  } else if (kind === "dots") {
    g.add(mesh(new THREE.SphereGeometry(0.012, 6, 6), m, 0, 0.13, 0.17));
  } else if (kind === "facepaint") {
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.085, 0.02), m, 0, -0.025, 0.15));
  } else if (kind === "karma") {
    g.add(mesh(new THREE.BoxGeometry(0.17, 0.22, 0.02), mat("#141418"), -0.1, 0.0, 0.15));
    g.add(mesh(new THREE.BoxGeometry(0.04, 0.09, 0.02), mat("#141418"), 0.05, 0.05, 0.16));
  } else if (kind === "sand") {
    g.add(mesh(new THREE.BoxGeometry(0.11, 0.09, 0.016), mat("#111"), 0.0, 0.13, 0.16));
  }
  return g;
}

function createProceduralNinja(appearance) {
  const a = appearance;
  const root = new THREE.Group();
  const scale = a.height || 1;
  root.scale.setScalar(scale);

  const build = { slim: 0.9, athletic: 1, broad: 1.13 }[a.build] || 1;

  const skin = mat(a.skin || "#f0c7a0", { roughness: 0.62 });
  const cloth = mat(a.primaryColor || "#2b3548");
  const cloth2 = mat(a.secondaryColor || "#e8c36a");
  const accent = mat(a.accentColor || "#3ee0ff", { emissive: a.accentColor || "#3ee0ff", emissiveIntensity: 0.18 });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  const torso = new THREE.Group();
  torso.position.y = 0.18;
  const head = new THREE.Group();
  head.position.y = 0.52;

  const pelvis = mesh(new THREE.BoxGeometry(0.34 * build, 0.16, 0.2), cloth);
  hips.add(pelvis);

  const chestW = 0.4 * build;
  const chest = mesh(
    a.outfit === "crop" ? new THREE.BoxGeometry(chestW * 0.95, 0.28, 0.22) : new THREE.BoxGeometry(chestW, 0.46, 0.24),
    a.outfit === "flak" ? cloth2 : cloth,
    0,
    a.outfit === "crop" ? 0.08 : 0.16
  );
  torso.add(chest);
  if (a.outfit === "hoodie" || a.outfit === "jacket") {
    torso.add(mesh(new THREE.BoxGeometry(chestW * 1.15, 0.22, 0.28), cloth, 0, 0.28));
    if (a.outfit === "hoodie") {
      torso.add(mesh(new THREE.BoxGeometry(chestW * 0.4, 0.1, 0.06), cloth, 0, 0.3, 0.13));
    }
  }
  if (a.outfit === "flak") {
    torso.add(mesh(new THREE.BoxGeometry(chestW * 1.1, 0.28, 0.26), cloth, 0, 0.12));
    torso.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), accent, 0, 0.18, 0.14));
  }
  if (a.outfit === "kimono") {
    torso.add(mesh(new THREE.BoxGeometry(chestW * 1.15, 0.5, 0.26), cloth2, 0, 0.12));
    torso.add(mesh(new THREE.BoxGeometry(chestW * 0.3, 0.4, 0.02), cloth, 0, 0.16, 0.135));
  }
  if (a.outfit === "tactical") {
    torso.add(mesh(new THREE.BoxGeometry(chestW * 1.05, 0.44, 0.26), mat("#111"), 0, 0.16));
    torso.add(mesh(new THREE.BoxGeometry(0.2, 0.08, 0.08), accent, 0, 0.22, 0.12));
    torso.add(mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), accent, 0, 0.18, 0.15));
  }

  const neck = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 8), skin, 0, 0.42);
  torso.add(neck);

  // Cabeza — la forma del rostro ahora cambia de verdad.
  const faceW = a.faceShape === "round" ? 1.06 : a.faceShape === "sharp" ? 0.92 : 1;
  const skull = mesh(new THREE.SphereGeometry(0.185, 18, 14), skin, 0, 0.08, 0);
  skull.scale.set(faceW, 1.05, faceW);
  head.add(skull);
  const jaw = mesh(new THREE.BoxGeometry(0.16 * faceW, 0.1, 0.14), skin, 0, -0.06, 0.045);
  head.add(jaw);
  if (a.faceShape === "sharp") {
    const chin = mesh(new THREE.ConeGeometry(0.045, 0.07, 4), skin, 0, -0.12, 0.06);
    chin.rotation.x = 0;
    head.add(chin);
  }
  head.add(makeEyes(a.eyeStyle, a.eyeColor));
  head.add(makeMarkings(a.markings, a.markingColor || "#3a2418"));

  const brow = mat("#2a2018");
  if (a.eyebrow !== "none") {
    const h = a.eyebrow === "thick" ? 0.028 : 0.013;
    head.add(mesh(new THREE.BoxGeometry(0.075, h, 0.02), brow, -0.08, 0.1, 0.16));
    head.add(mesh(new THREE.BoxGeometry(0.075, h, 0.02), brow, 0.08, 0.1, 0.16));
  }

  const hair = hairMeshes(a.hairStyle, a.hairColor, a.hairAccent, { position: new THREE.Vector3(0, 0.08, 0) });
  head.add(hair);

  if (a.goggles) {
    const strap = mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.03, 16, 1, true), mat("#22262e"), 0, 0.06, 0);
    head.add(strap);
    [-0.08, 0.08].forEach((x) => {
      const lens = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), mat("#9fd8ff", { roughness: 0.1, metalness: 0.2, emissive: "#3ee0ff", emissiveIntensity: 0.15 }), x, 0.06, 0.16);
      lens.rotation.x = Math.PI / 2;
      head.add(lens);
    });
  }

  if (a.headband && a.village !== "none") {
    const band = mesh(new THREE.CylinderGeometry(0.188, 0.188, 0.055, 16, 1, true), mat("#2a2a30"));
    band.position.set(0, 0.1, 0);
    head.add(band);
    const plate = mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), mat("#c0c8d0", { metalness: 0.7, roughness: 0.3 }), 0, 0.1, 0.178);
    const tex = villageCanvas(
      { leaf: "葉", sand: "砂", mist: "霧", cloud: "雲", stone: "石", rain: "雨", sound: "音" }[a.village] || "忍",
      "#c0c8d0",
      "#222"
    );
    plate.material = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.55, roughness: 0.35 });
    head.add(plate);
  }

  if (a.mask === "lower") {
    head.add(mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), mat("#d0d4dc"), 0, -0.04, 0.1));
  } else if (a.mask === "anbu") {
    head.add(mesh(new THREE.BoxGeometry(0.2, 0.16, 0.06), mat("#f4ead8"), 0, 0.05, 0.16));
    head.add(mesh(new THREE.BoxGeometry(0.14, 0.05, 0.02), mat("#c81e3a"), 0, 0.03, 0.2));
  } else if (a.mask === "cyber") {
    head.add(mesh(new THREE.BoxGeometry(0.1, 0.06, 0.06), mat("#111", { emissive: "#3ee0ff", emissiveIntensity: 0.5 }), -0.08, 0.05, 0.16));
  }

  function arm(side) {
    const g = new THREE.Group();
    g.position.set(0.26 * side * build, 0.34, 0);
    const upper = new THREE.Group();
    upper.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.32, 8), cloth, 0, -0.16, 0));
    const fore = new THREE.Group();
    fore.position.y = -0.32;
    const sleeveMat = a.gloves ? accent : skin;
    fore.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.3, 8), sleeveMat, 0, -0.14, 0));
    fore.add(mesh(new THREE.SphereGeometry(0.055, 8, 6), skin, 0, -0.3, 0));
    upper.add(fore);
    g.add(upper);
    g.userData = { upper, fore };
    return g;
  }

  function leg(side) {
    const g = new THREE.Group();
    g.position.set(0.11 * side * build, 0, 0);
    const thigh = new THREE.Group();
    const pants = mat(a.pants === "tactical" ? "#111" : a.primaryColor);
    const pantW = a.pants === "baggy" ? 1.25 : 1;
    const thighGeo = new THREE.CylinderGeometry(0.07 * pantW, 0.08 * pantW, 0.38, 8);
    thigh.add(mesh(thighGeo, pants, 0, -0.18, 0));
    const shin = new THREE.Group();
    shin.position.y = -0.38;
    const shinH = a.pants === "shorts" ? 0.18 : 0.36;
    shin.add(mesh(new THREE.CylinderGeometry(0.055 * pantW, 0.065 * pantW, shinH, 8), a.pants === "shorts" ? skin : pants, 0, -shinH / 2, 0));
    const shoeCol = a.shoes === "sandals" ? "#3a2a18" : a.shoes === "boots" ? "#111" : "#e8e8ee";
    const shoe = mesh(new THREE.BoxGeometry(0.12, 0.07, 0.22), mat(shoeCol), 0, -0.4, 0.04);
    shin.add(shoe);
    if (a.shoes === "boots") {
      shin.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), mat("#111"), 0, -0.24, 0.02));
    }
    thigh.add(shin);
    g.add(thigh);
    g.userData = { thigh, shin };
    return g;
  }

  const lArm = arm(-1);
  const rArm = arm(1);
  const lLeg = leg(-1);
  const rLeg = leg(1);
  torso.add(lArm, rArm);
  hips.add(torso);
  hips.add(lLeg, rLeg);
  torso.add(head);
  root.add(hips);

  if (a.scarf) {
    const scarf = mat(a.accentColor || "#e8c36a", { roughness: 0.8 });
    head.add(mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.08, 10), scarf, 0, 0.38, 0));
    const tail1 = mesh(new THREE.BoxGeometry(0.07, 0.34, 0.03), scarf, 0, 0.18, -0.14);
    tail1.rotation.x = -0.35;
    head.add(tail1);
    const tail2 = mesh(new THREE.BoxGeometry(0.07, 0.3, 0.03), scarf, -0.06, 0.16, -0.15);
    tail2.rotation.x = -0.5;
    head.add(tail2);
  }

  if (a.cloak || a.outfit === "cloak") {
    const cloak = mesh(new THREE.BoxGeometry(0.62, 0.85, 0.08), cloth2, 0, 1.15, -0.16);
    cloak.userData.cloak = true;
    root.add(cloak);
    root.add(mesh(new THREE.BoxGeometry(0.62, 0.12, 0.1), cloth, 0, 1.56, -0.14));
  }
  if (a.scroll) {
    root.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8), cloth2, -0.22, 0.95, -0.12));
  }
  if (a.earrings) {
    head.add(mesh(new THREE.SphereGeometry(0.02, 6, 6), mat("#e8c36a", { metalness: 0.8 }), -0.17, -0.01, 0.02));
    head.add(mesh(new THREE.SphereGeometry(0.02, 6, 6), mat("#e8c36a", { metalness: 0.8 }), 0.17, -0.01, 0.02));
  }

  // Aura de dos naturalezas (una por elemento elegido).
  const el = ELEMENTS[a.elements?.[0]] || ELEMENTS.fire;
  const el2 = ELEMENTS[a.elements?.[1]] || ELEMENTS.wind;
  const aura = mesh(
    new THREE.TorusGeometry(0.5, 0.016, 8, 28),
    mat(el.color, { emissive: el.color, emissiveIntensity: 0.7, transparent: true, opacity: 0.0 }),
    0,
    0.02,
    0
  );
  aura.rotation.x = Math.PI / 2;
  root.add(aura);
  const aura2 = mesh(
    new THREE.TorusGeometry(0.36, 0.012, 8, 24),
    mat(el2.color, { emissive: el2.color, emissiveIntensity: 0.7, transparent: true, opacity: 0.0 }),
    0,
    0.02,
    0
  );
  aura2.rotation.x = Math.PI / 2;
  root.add(aura2);

  const parts = { root, hips, torso, head, lArm, rArm, lLeg, rLeg, aura, aura2 };
  const animator = new RigAnimator(parts);
  return { root, parts, animator, appearance: a, update: (dt, st) => animator.update(dt, st) };
}

class RigAnimator {
  constructor(parts) {
    this.p = parts;
    this.state = "idle";
    this.t = 0;
    this.lock = 0;
    this.flash = 0;
  }

  play(name, lock = 0) {
    if (this.t < this.lock && !["hurt", "ko", "win"].includes(name)) return;
    this.state = name;
    this.t = 0;
    this.lock = lock;
  }

  update(dt, st = {}) {
    this.t += dt;
    const { hips, torso, head, lArm, rArm, lLeg, rLeg, aura, aura2 } = this.p;
    const reset = () => {
      [lArm, rArm, lLeg, rLeg, torso, head, hips].forEach((n) => n.rotation.set(0, 0, 0));
      lArm.userData.upper.rotation.set(0, 0, 0);
      rArm.userData.upper.rotation.set(0, 0, 0);
      lArm.userData.fore.rotation.set(0, 0, 0);
      rArm.userData.fore.rotation.set(0, 0, 0);
      lLeg.userData.thigh.rotation.set(0, 0, 0);
      rLeg.userData.thigh.rotation.set(0, 0, 0);
      lLeg.userData.shin.rotation.set(0, 0, 0);
      rLeg.userData.shin.rotation.set(0, 0, 0);
    };
    reset();
    const s = this.state;
    const t = this.t;
    const bob = Math.sin(t * 4) * 0.015;
    if (s === "idle") {
      hips.position.y = 0.95 + bob;
      lArm.userData.upper.rotation.x = 0.15 + bob;
      rArm.userData.upper.rotation.x = 0.15 - bob;
      torso.rotation.y = Math.sin(t * 1.2) * 0.04;
      head.rotation.y = Math.sin(t * 1.2 + 1) * 0.03;
    } else if (s === "walk") {
      const w = Math.sin(t * 11);
      lLeg.userData.thigh.rotation.x = w * 0.72;
      rLeg.userData.thigh.rotation.x = -w * 0.72;
      lArm.userData.upper.rotation.x = -w * 0.5;
      rArm.userData.upper.rotation.x = w * 0.5;
      torso.rotation.x = 0.12;
      hips.position.y = 0.95 + Math.abs(w) * 0.03;
    } else if (s === "jump") {
      lArm.userData.upper.rotation.x = -0.9;
      rArm.userData.upper.rotation.x = -0.9;
      lLeg.userData.thigh.rotation.x = -0.45;
      rLeg.userData.thigh.rotation.x = 0.35;
      torso.rotation.x = -0.15;
    } else if (s === "crouch") {
      hips.position.y = 0.7;
      lLeg.userData.thigh.rotation.x = -1.1;
      rLeg.userData.thigh.rotation.x = -1.1;
      lLeg.userData.shin.rotation.x = 1.4;
      rLeg.userData.shin.rotation.x = 1.4;
      lArm.userData.upper.rotation.x = 0.4;
      rArm.userData.upper.rotation.x = 0.4;
      torso.rotation.x = 0.2;
    } else if (s === "block") {
      lArm.userData.upper.rotation.set(-1.2, 0, 0.6);
      rArm.userData.upper.rotation.set(-1.2, 0, -0.6);
      torso.rotation.x = 0.15;
    } else if (s === "light" || s === "crouchLight") {
      const k = Math.min(1, t / 0.12);
      rArm.userData.upper.rotation.x = -1.6 * k;
      rArm.userData.fore.rotation.x = -0.4 * k;
      torso.rotation.y = -0.3 * k;
    } else if (s === "heavy") {
      const k = Math.min(1, t / 0.22);
      rArm.userData.upper.rotation.x = -1.8 * k;
      rArm.userData.upper.rotation.z = -0.4 * k;
      torso.rotation.y = -0.45 * k;
      torso.rotation.x = 0.1 * k;
    } else if (s === "kick" || s === "airKick") {
      const k = Math.min(1, t / 0.16);
      rLeg.userData.thigh.rotation.x = -1.55 * k;
      lArm.userData.upper.rotation.x = -0.6;
      torso.rotation.x = -0.15;
      if (s === "airKick") lLeg.userData.thigh.rotation.x = -0.4;
    } else if (s === "special" || s === "ultimate") {
      const k = Math.sin(Math.min(1, t / 0.25) * Math.PI);
      lArm.userData.upper.rotation.x = -1.8 * k;
      rArm.userData.upper.rotation.x = -1.8 * k;
      torso.rotation.x = -0.3 * k;
      aura.material.opacity = 0.9;
      aura2.material.opacity = 0.75;
    } else if (s === "hurt") {
      torso.rotation.x = -0.35;
      head.rotation.x = 0.25;
      lArm.userData.upper.rotation.x = -0.8;
      rArm.userData.upper.rotation.x = -0.8;
    } else if (s === "ko") {
      hips.rotation.x = Math.min(1.4, t * 3);
      hips.position.y = 0.95 - Math.min(0.7, t * 1.5);
    } else if (s === "win") {
      rArm.userData.upper.rotation.x = -2.4;
      hips.rotation.y = Math.sin(t * 3) * 0.1;
    } else if (s === "dash") {
      torso.rotation.x = 0.4;
      lArm.userData.upper.rotation.x = 1.1;
      rArm.userData.upper.rotation.x = 1.1;
    }
    if (s !== "special" && s !== "ultimate") {
      aura.material.opacity = THREE.MathUtils.lerp(aura.material.opacity, 0, dt * 6);
      aura2.material.opacity = THREE.MathUtils.lerp(aura2.material.opacity, 0, dt * 6);
    }
    aura.rotation.z += dt * 2;
    aura2.rotation.z -= dt * 2.6;
    if (st.flash) {
      this.flash = 0.12;
    }
    if (this.flash > 0) {
      this.flash -= dt;
      head.traverse((o) => {
        if (o.material && o.material.emissive) o.material.emissive.setHex(0xffdddd);
      });
    }
  }
}

