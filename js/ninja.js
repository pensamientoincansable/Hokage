import * as THREE from "three";
import { ELEMENTS } from "./config.js";

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

function hairMeshes(style, color, accent, head) {
  const group = new THREE.Group();
  const m = mat(color, { roughness: 0.7 });
  const a = mat(accent || color, { roughness: 0.7 });
  const add = (g, x, y, z, rx = 0, ry = 0, rz = 0, material = m) => {
    const p = mesh(g, material, x, y, z);
    p.rotation.set(rx, ry, rz);
    group.add(p);
  };
  switch (style) {
    case "spiky":
      for (let i = 0; i < 9; i++) {
        const ang = -0.8 + i * 0.2;
        add(new THREE.ConeGeometry(0.07, 0.42, 5), Math.sin(ang) * 0.12, 0.28, Math.cos(ang) * 0.08, -0.9, 0, ang);
      }
      add(new THREE.SphereGeometry(0.2, 10, 8), 0, 0.08, -0.02);
      break;
    case "messy":
      add(new THREE.SphereGeometry(0.22, 10, 8), 0, 0.06, 0);
      add(new THREE.BoxGeometry(0.18, 0.16, 0.12), -0.12, 0.18, 0.04, 0.2, 0, 0.4);
      add(new THREE.BoxGeometry(0.12, 0.2, 0.1), 0.1, 0.2, 0.02, -0.3, 0, -0.3, a);
      add(new THREE.BoxGeometry(0.16, 0.14, 0.18), 0, 0.16, -0.1);
      break;
    case "longback":
      add(new THREE.SphereGeometry(0.21, 10, 8), 0, 0.05, 0);
      add(new THREE.BoxGeometry(0.22, 0.55, 0.16), 0, -0.18, -0.14, 0.25);
      add(new THREE.BoxGeometry(0.08, 0.18, 0.08), 0.12, 0.12, 0.08, 0.4);
      break;
    case "shortbob":
      add(new THREE.SphereGeometry(0.23, 12, 10), 0, 0.02, 0);
      add(new THREE.BoxGeometry(0.32, 0.16, 0.22), 0, -0.02, 0);
      add(new THREE.BoxGeometry(0.04, 0.05, 0.01), -0.12, 0.08, 0.18, 0, 0, 0, a);
      add(new THREE.BoxGeometry(0.04, 0.05, 0.01), 0.12, 0.08, 0.18, 0, 0, 0, a);
      break;
    case "smooth":
      add(new THREE.SphereGeometry(0.22, 12, 10), 0, 0.04, 0);
      add(new THREE.BoxGeometry(0.2, 0.5, 0.14), 0, -0.12, -0.12, 0.15);
      break;
    case "undercut":
      add(new THREE.BoxGeometry(0.28, 0.1, 0.24), 0, 0.14, 0);
      add(new THREE.SphereGeometry(0.16, 8, 6), 0, 0.08, -0.02);
      break;
    case "silver":
      add(new THREE.SphereGeometry(0.22, 10, 8), 0, 0.06, 0);
      for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(0.05, 0.28, 4), -0.08 + i * 0.03, 0.22, -0.04, -0.8);
      add(new THREE.BoxGeometry(0.22, 0.12, 0.08), 0, 0.08, 0.16);
      break;
    case "ponytail":
      add(new THREE.SphereGeometry(0.21, 10, 8), 0, 0.05, 0);
      add(new THREE.CylinderGeometry(0.05, 0.045, 0.55, 6), 0, -0.12, -0.2, 0.4);
      break;
    case "bun":
      add(new THREE.SphereGeometry(0.21, 10, 8), 0, 0.04, 0);
      add(new THREE.SphereGeometry(0.12, 8, 8), 0, 0.2, -0.06);
      break;
    case "flow":
      add(new THREE.SphereGeometry(0.22, 10, 8), 0, 0.04, 0);
      add(new THREE.BoxGeometry(0.28, 0.7, 0.16), 0, -0.22, -0.12, 0.2);
      add(new THREE.BoxGeometry(0.1, 0.45, 0.1), -0.16, -0.1, 0.02, 0.1, 0, 0.3);
      add(new THREE.BoxGeometry(0.1, 0.45, 0.1), 0.16, -0.1, 0.02, 0.1, 0, -0.3);
      break;
    case "bowl":
      add(new THREE.SphereGeometry(0.24, 10, 8), 0, 0.04, 0);
      break;
    case "wild":
      for (let i = 0; i < 12; i++) {
        add(new THREE.ConeGeometry(0.05, 0.34, 4), Math.sin(i) * 0.16, 0.2, Math.cos(i) * 0.12, -0.5, 0, i);
      }
      add(new THREE.SphereGeometry(0.18, 8, 8), 0, 0.04, 0);
      break;
    case "twin":
      add(new THREE.SphereGeometry(0.2, 10, 8), 0, 0.04, 0);
      add(new THREE.CylinderGeometry(0.045, 0.04, 0.5, 6), -0.16, -0.08, -0.08, 0.5, 0, 0.4);
      add(new THREE.CylinderGeometry(0.045, 0.04, 0.5, 6), 0.16, -0.08, -0.08, 0.5, 0, -0.4);
      break;
    case "buzz":
      add(new THREE.SphereGeometry(0.2, 8, 6), 0, 0.02, 0);
      break;
    case "crown":
      for (let i = 0; i < 10; i++) {
        add(new THREE.ConeGeometry(0.06, 0.38, 5), Math.sin(i * 0.7) * 0.14, 0.26, Math.cos(i * 0.7) * 0.1, -1.1);
      }
      add(new THREE.SphereGeometry(0.2, 8, 8), 0, 0.06, 0);
      break;
    default:
      add(new THREE.SphereGeometry(0.21, 10, 8), 0, 0.05, 0);
  }
  group.position.copy(head.position);
  group.position.y += 0.12;
  return group;
}

function makeEyes(style, color) {
  const g = new THREE.Group();
  const white = mat("#f4f0ea");
  const irisCol = color;
  const pupilCol = style === "pale" ? "#c8d8f0" : "#111";
  [-0.075, 0.075].forEach((x) => {
    const eye = mesh(new THREE.SphereGeometry(0.038, 10, 8), white, x, 0.04, 0.155);
    eye.scale.set(1, 0.85, 0.6);
    const iris = mesh(new THREE.SphereGeometry(0.022, 10, 8), mat(irisCol, { roughness: 0.3 }), x, 0.04, 0.175);
    const pupil = mesh(new THREE.SphereGeometry(0.01, 8, 6), mat(pupilCol), x, 0.04, 0.19);
    if (style === "tomoe") {
      for (let i = 0; i < 3; i++) {
        const t = mesh(new THREE.SphereGeometry(0.006, 6, 4), mat("#4a0008"), x + Math.cos(i * 2.1) * 0.012, 0.04 + Math.sin(i * 2.1) * 0.01, 0.188);
        g.add(t);
      }
    }
    if (style === "slit") pupil.scale.set(0.4, 1.6, 1);
    if (style === "bar") {
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), mat("#111"), x, 0.055, 0.19));
    }
    if (style === "ring") {
      g.add(mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 12), mat("#7a5cff", { emissive: "#7a5cff", emissiveIntensity: 0.4 }), x, 0.04, 0.182));
    }
    g.add(eye, iris, pupil);
  });
  return g;
}

function makeMarkings(kind, color) {
  const g = new THREE.Group();
  const m = mat(color);
  if (kind === "whiskers") {
    [-1, 1].forEach((s) => {
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.008, 0.01), m, 0.12 * s, -0.02, 0.16,));
      g.add(mesh(new THREE.BoxGeometry(0.07, 0.008, 0.01), m, 0.12 * s, -0.04, 0.16));
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.008, 0.01), m, 0.12 * s, -0.06, 0.16));
    });
  } else if (kind === "underEye") {
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.02, 0.01), m, -0.075, 0.0, 0.17));
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.02, 0.01), m, 0.075, 0.0, 0.17));
  } else if (kind === "clan") {
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.05, 0.01), mat("#c81e3a"), 0, 0.12, 0.16));
  } else if (kind === "scar") {
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.012, 0.01), m, 0.04, 0.06, 0.17,));
  } else if (kind === "dots") {
    g.add(mesh(new THREE.SphereGeometry(0.012, 6, 6), m, 0, 0.12, 0.17));
  } else if (kind === "facepaint") {
    g.add(mesh(new THREE.BoxGeometry(0.28, 0.08, 0.02), m, 0, -0.02, 0.15));
  } else if (kind === "karma") {
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.2, 0.02), mat("#111"), -0.1, 0.0, 0.15));
    g.add(mesh(new THREE.BoxGeometry(0.04, 0.08, 0.02), mat("#111"), 0.05, 0.04, 0.16));
  } else if (kind === "sand") {
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 0.015), mat("#111"), 0.0, 0.12, 0.16));
  }
  return g;
}

export function createNinja(appearance) {
  const a = appearance;
  const root = new THREE.Group();
  const scale = a.height || 1;
  root.scale.setScalar(scale);

  const skin = mat(a.skin || "#f0c7a0", { roughness: 0.62 });
  const cloth = mat(a.primaryColor || "#2b3548");
  const cloth2 = mat(a.secondaryColor || "#e8c36a");
  const accent = mat(a.accentColor || "#3ee0ff", { emissive: a.accentColor || "#3ee0ff", emissiveIntensity: 0.15 });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  const torso = new THREE.Group();
  torso.position.y = 0.18;
  const head = new THREE.Group();
  head.position.y = 0.52;

  const pelvis = mesh(new THREE.BoxGeometry(0.34, 0.16, 0.2), cloth);
  hips.add(pelvis);

  const chest = mesh(
    a.outfit === "crop" ? new THREE.BoxGeometry(0.38, 0.28, 0.22) : new THREE.BoxGeometry(0.4, 0.46, 0.24),
    a.outfit === "flak" ? cloth2 : cloth,
    0,
    a.outfit === "crop" ? 0.08 : 0.16
  );
  torso.add(chest);
  if (a.outfit === "hoodie" || a.outfit === "jacket") {
    torso.add(mesh(new THREE.BoxGeometry(0.46, 0.22, 0.28), cloth, 0, 0.28));
  }
  if (a.outfit === "flak") {
    torso.add(mesh(new THREE.BoxGeometry(0.44, 0.28, 0.26), cloth, 0, 0.12));
    torso.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), accent, 0, 0.18, 0.14));
  }
  if (a.outfit === "kimono") {
    torso.add(mesh(new THREE.BoxGeometry(0.46, 0.5, 0.26), cloth2, 0, 0.12));
  }
  if (a.outfit === "tactical") {
    torso.add(mesh(new THREE.BoxGeometry(0.42, 0.44, 0.26), mat("#111"), 0, 0.16));
    torso.add(mesh(new THREE.BoxGeometry(0.2, 0.08, 0.08), accent, 0, 0.22, 0.12));
  }

  const neck = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 8), skin, 0, 0.42);
  torso.add(neck);

  const skull = mesh(new THREE.SphereGeometry(0.18, 16, 12), skin, 0, 0.08, 0);
  head.add(skull);
  const jaw = mesh(new THREE.BoxGeometry(0.16, 0.1, 0.14), skin, 0, -0.06, 0.04);
  head.add(jaw);
  head.add(makeEyes(a.eyeStyle, a.eyeColor));
  head.add(makeMarkings(a.markings, a.markingColor || "#3a2418"));

  const brow = mat("#2a2018");
  if (a.eyebrow !== "none") {
    const h = a.eyebrow === "thick" ? 0.025 : 0.012;
    head.add(mesh(new THREE.BoxGeometry(0.07, h, 0.02), brow, -0.075, 0.09, 0.16));
    head.add(mesh(new THREE.BoxGeometry(0.07, h, 0.02), brow, 0.075, 0.09, 0.16));
  }

  const hair = hairMeshes(a.hairStyle, a.hairColor, a.hairAccent, { position: new THREE.Vector3(0, 0.08, 0) });
  head.add(hair);

  if (a.headband && a.village !== "none") {
    const band = mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.055, 16, 1, true), mat("#2a2a30"));
    band.position.set(0, 0.1, 0);
    head.add(band);
    const plate = mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), mat("#c0c8d0", { metalness: 0.7, roughness: 0.3 }), 0, 0.1, 0.175);
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
    head.add(mesh(new THREE.BoxGeometry(0.2, 0.16, 0.06), mat("#f4ead8"), 0, 0.04, 0.16));
  } else if (a.mask === "cyber") {
    head.add(mesh(new THREE.BoxGeometry(0.1, 0.06, 0.06), mat("#111", { emissive: "#3ee0ff", emissiveIntensity: 0.5 }), -0.08, 0.05, 0.16));
  }

  function arm(side) {
    const g = new THREE.Group();
    g.position.set(0.26 * side, 0.34, 0);
    const upper = new THREE.Group();
    upper.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.32, 8), cloth, 0, -0.16, 0));
    const fore = new THREE.Group();
    fore.position.y = -0.32;
    const sleeveMat = a.gloves ? cloth2 : skin;
    fore.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.3, 8), sleeveMat, 0, -0.14, 0));
    fore.add(mesh(new THREE.SphereGeometry(0.055, 8, 6), skin, 0, -0.3, 0));
    upper.add(fore);
    g.add(upper);
    g.userData = { upper, fore };
    return g;
  }

  function leg(side) {
    const g = new THREE.Group();
    g.position.set(0.11 * side, 0, 0);
    const thigh = new THREE.Group();
    const pants = mat(a.pants === "tactical" ? "#111" : a.primaryColor);
    thigh.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.38, 8), pants, 0, -0.18, 0));
    const shin = new THREE.Group();
    shin.position.y = -0.38;
    const shinH = a.pants === "shorts" ? 0.18 : 0.36;
    shin.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, shinH, 8), a.pants === "shorts" ? skin : pants, 0, -shinH / 2, 0));
    const shoeCol = a.shoes === "sandals" ? "#3a2a18" : a.shoes === "boots" ? "#111" : "#e8e8ee";
    shin.add(mesh(new THREE.BoxGeometry(0.12, 0.07, 0.22), mat(shoeCol), 0, -0.4, 0.04));
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

  if (a.cloak || a.outfit === "cloak") {
    const cloak = mesh(new THREE.BoxGeometry(0.62, 0.85, 0.08), cloth2, 0, 1.15, -0.16);
    cloak.userData.cloak = true;
    root.add(cloak);
  }
  if (a.scroll) {
    root.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8), cloth2, -0.22, 0.95, -0.12,));
  }
  if (a.earrings) {
    head.add(mesh(new THREE.SphereGeometry(0.018, 6, 6), mat("#e8c36a", { metalness: 0.8 }), -0.17, 0.0, 0.02));
    head.add(mesh(new THREE.SphereGeometry(0.018, 6, 6), mat("#e8c36a", { metalness: 0.8 }), 0.17, 0.0, 0.02));
  }

  const el = ELEMENTS[a.elements?.[0]] || ELEMENTS.fire;
  const aura = mesh(
    new THREE.TorusGeometry(0.45, 0.015, 8, 24),
    mat(el.color, { emissive: el.color, emissiveIntensity: 0.6, transparent: true, opacity: 0.0 }),
    0,
    0.02,
    0
  );
  aura.rotation.x = Math.PI / 2;
  root.add(aura);

  const parts = { root, hips, torso, head, lArm, rArm, lLeg, rLeg, aura };
  const animator = new Animator(parts);
  return { root, parts, animator, appearance: a, update: (dt, st) => animator.update(dt, st) };
}

class Animator {
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
    const { hips, torso, head, lArm, rArm, lLeg, rLeg, aura } = this.p;
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
    } else if (s === "walk") {
      const w = Math.sin(t * 10);
      lLeg.userData.thigh.rotation.x = w * 0.7;
      rLeg.userData.thigh.rotation.x = -w * 0.7;
      lArm.userData.upper.rotation.x = -w * 0.5;
      rArm.userData.upper.rotation.x = w * 0.5;
      hips.position.y = 0.95 + Math.abs(w) * 0.03;
    } else if (s === "jump") {
      lArm.userData.upper.rotation.x = -0.8;
      rArm.userData.upper.rotation.x = -0.8;
      lLeg.userData.thigh.rotation.x = -0.4;
      rLeg.userData.thigh.rotation.x = 0.3;
    } else if (s === "crouch") {
      hips.position.y = 0.7;
      lLeg.userData.thigh.rotation.x = -1.1;
      rLeg.userData.thigh.rotation.x = -1.1;
      lLeg.userData.shin.rotation.x = 1.4;
      rLeg.userData.shin.rotation.x = 1.4;
      lArm.userData.upper.rotation.x = 0.4;
      rArm.userData.upper.rotation.x = 0.4;
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
    } else if (s === "kick" || s === "airKick") {
      const k = Math.min(1, t / 0.16);
      rLeg.userData.thigh.rotation.x = -1.5 * k;
      lArm.userData.upper.rotation.x = -0.6;
      torso.rotation.x = -0.15;
    } else if (s === "special" || s === "ultimate") {
      const k = Math.sin(Math.min(1, t / 0.25) * Math.PI);
      lArm.userData.upper.rotation.x = -1.8 * k;
      rArm.userData.upper.rotation.x = -1.8 * k;
      torso.rotation.x = -0.3 * k;
      aura.material.opacity = 0.85;
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
    }
    aura.rotation.z += dt * 2;
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

export function disposeNinja(ninja) {
  ninja?.root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
}
