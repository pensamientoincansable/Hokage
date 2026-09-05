import * as THREE from "three";
import { disposeTree } from "./resources.js";

const SHARED = {};
function geo(name, create) {
  if (!SHARED[name]) {
    SHARED[name] = create();
    SHARED[name].userData.shared = true;
  }
  return SHARED[name];
}

function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
}

function glowSprite() {
  if (SHARED.glow) return SHARED.glow;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.userData.shared = true;
  SHARED.glow = texture;
  return texture;
}

function boltGeometry() {
  const positions = new Float32Array(18);
  let y = 0.35;
  for (let i = 0; i < 6; i++) {
    positions[i * 3] = (i % 2 ? 1 : -1) * 0.08 * (1 - i / 6);
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = 0;
    y -= 0.12;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.userData.shared = true;
  return geometry;
}

const ELEMENT_STYLE = {
  fire: "ember",
  water: "splash",
  lightning: "spark",
  wind: "slash",
  earth: "dust",
  ice: "shard",
  shadow: "wisp",
  sound: "ring",
};

export class FX {
  constructor(parent, particleScale = 1) {
    this.parent = parent;
    this.items = [];
    this.particleScale = particleScale;
  }

  spawn(mesh, extra = {}) {
    this.parent.add(mesh);
    this.items.push({ m: mesh, v: extra.v || new THREE.Vector3(), life: extra.life ?? 0.4, max: extra.life ?? 0.4, scale: extra.scale || 0, spin: extra.spin || 0, gravity: extra.gravity || 0, fade: extra.fade !== false });
    return mesh;
  }

  burst(x, y, z, color = "#ffe08a", n = 18, speed = 4, style = "spark") {
    n = Math.max(0, Math.min(Math.ceil(n * this.particleScale), 80 - this.items.length));
    const sphere = geo("sphere", () => new THREE.SphereGeometry(1, 6, 6));
    const shard = geo("shard", () => new THREE.OctahedronGeometry(1, 0));
    const rock = geo("rock", () => new THREE.DodecahedronGeometry(1, 0));
    const flame = geo("flame", () => new THREE.ConeGeometry(0.45, 1.4, 6));
    for (let i = 0; i < n; i++) {
      const kind = style === "shard" || style === "dust" ? (style === "shard" ? shard : rock) : style === "ember" ? flame : sphere;
      const size = style === "ember" ? 0.07 + Math.random() * 0.08 : 0.035 + Math.random() * 0.05;
      const mesh = new THREE.Mesh(kind, basic(color));
      mesh.scale.setScalar(size);
      if (style === "ember") mesh.scale.set(size * 0.6, size * 1.8, size * 0.6);
      mesh.position.set(x, y, z);
      const outward = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed * 0.35);
      if (style === "ember") { outward.y = 1.5 + Math.random() * 3.2; outward.x *= 0.45; }
      if (style === "splash") { outward.y = 1.2 + Math.random() * 2.4; }
      if (style === "dust") { outward.y = 0.4 + Math.random() * 1.2; outward.multiplyScalar(0.7); }
      if (style === "wisp") { outward.y = 0.8 + Math.random() * 1.6; outward.multiplyScalar(0.55); }
      this.spawn(mesh, {
        v: outward,
        life: 0.32 + Math.random() * 0.28,
        gravity: style === "ember" ? 1.4 : style === "splash" ? 9 : style === "dust" ? 4 : 2.5,
        spin: style === "shard" || style === "ember" ? 8 + Math.random() * 10 : 0,
      });
    }
  }

  impact(x, y, z, color = "#ffe08a", element = "fire") {
    const style = ELEMENT_STYLE[element] || "spark";
    const flashMat = basic("#ffffff", 0.95);
    const tex = glowSprite();
    if (tex) flashMat.map = tex;
    const flash = new THREE.Mesh(geo("flash", () => new THREE.PlaneGeometry(1, 1)), flashMat);
    flash.position.set(x, y, z + 0.28);
    flash.scale.setScalar(0.55);
    this.spawn(flash, { life: 0.12, scale: 14 });

    const slash = new THREE.Mesh(
      geo("slash", () => new THREE.TorusGeometry(0.32, 0.04, 5, 18, Math.PI * 1.15)),
      basic(color, 0.95)
    );
    slash.position.set(x, y, z + 0.22);
    slash.rotation.set(Math.random() * 0.8 - 0.4, 0.15, Math.random() * Math.PI);
    this.spawn(slash, { life: 0.22, scale: 10, spin: 4 });

    if (style === "slash" || element === "wind") {
      const blade = new THREE.Mesh(geo("blade", () => new THREE.TorusGeometry(0.45, 0.03, 4, 20, Math.PI)), basic(color, 0.85));
      blade.position.set(x, y, z + 0.2);
      blade.rotation.set(0.4, 0.2, Math.random() * Math.PI);
      this.spawn(blade, { life: 0.28, scale: 12, spin: 6 });
    }
    if (style === "ring" || element === "sound") {
      this.shock(x, y - 0.4, color);
    }
    this.burst(x, y, z, color, element === "lightning" ? 10 : 14, element === "lightning" ? 7 : 5, style);
  }

  cast(x, y, color = "#3ee0ff", element = "fire") {
    const ring = new THREE.Mesh(geo("cast", () => new THREE.TorusGeometry(0.35, 0.03, 6, 24)), basic(color, 0.9));
    ring.position.set(x, 0.05, 0.15);
    ring.rotation.x = Math.PI / 2;
    this.spawn(ring, { life: 0.4, scale: 10 });
    this.burst(x, y, 0, color, 12, 3.5, ELEMENT_STYLE[element] || "spark");
    if (element === "lightning") this.lightning(x, y, color);
    if (element === "shadow") {
      const veil = new THREE.Mesh(geo("flash", () => new THREE.PlaneGeometry(1, 1)), basic(color, 0.35));
      veil.position.set(x, y, 0.2);
      this.spawn(veil, { life: 0.35, scale: 8 });
    }
  }

  lightning(x, y, color) {
    const line = new THREE.Line(
      geo("bolt", boltGeometry),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false })
    );
    line.position.set(x, y, 0.18);
    line.rotation.z = (Math.random() - 0.5) * 0.6;
    this.spawn(line, { life: 0.16, scale: 6 });
  }

  projectileMesh(color, size = 0.35, element = "fire") {
    const group = new THREE.Group();
    const coreGeo = element === "ice" || element === "earth"
      ? geo(element === "ice" ? "crystal" : "rock", () => element === "ice" ? new THREE.OctahedronGeometry(1, 0) : new THREE.DodecahedronGeometry(1, 0))
      : geo("pcore", () => new THREE.SphereGeometry(1, 12, 10));
    const core = new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.5, roughness: 0.28, metalness: 0.15,
    }));
    core.scale.set(size * (element === "wind" ? 0.5 : 1.5), size, size * (element === "lightning" ? 0.55 : 1));
    group.add(core);

    if (element === "fire") {
      const flame = new THREE.Mesh(geo("pflame", () => new THREE.ConeGeometry(0.7, 1.8, 7)), basic(color, 0.7));
      flame.rotation.z = Math.PI / 2;
      flame.position.x = -size * 1.4;
      flame.scale.setScalar(size);
      group.add(flame);
    } else if (element === "wind") {
      const disc = new THREE.Mesh(geo("pdisc", () => new THREE.TorusGeometry(1, 0.12, 6, 20)), basic(color, 0.85));
      disc.scale.setScalar(size * 1.6);
      disc.rotation.y = Math.PI / 2;
      group.add(disc);
    } else if (element === "lightning") {
      const line = new THREE.Line(geo("bolt", boltGeometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
      line.scale.setScalar(size * 3);
      group.add(line);
    } else if (element === "water") {
      for (const s of [-1, 1]) {
        const drop = new THREE.Mesh(geo("sphere", () => new THREE.SphereGeometry(1, 6, 6)), basic(color, 0.7));
        drop.position.set(0, s * size * 0.7, s * size * 0.15);
        drop.scale.setScalar(size * 0.28);
        group.add(drop);
      }
    } else if (element === "shadow") {
      const halo = new THREE.Mesh(geo("pglow", () => new THREE.SphereGeometry(1, 8, 8)), basic(color, 0.22));
      halo.scale.setScalar(size * 2.4);
      group.add(halo);
    } else if (element === "sound") {
      const ring = new THREE.Mesh(geo("pring", () => new THREE.TorusGeometry(1, 0.08, 6, 18)), basic(color, 0.8));
      ring.scale.setScalar(size * 1.4);
      group.add(ring);
    } else {
      const ring = new THREE.Mesh(geo("pring", () => new THREE.TorusGeometry(1, 0.08, 6, 16)), basic(color, 0.7));
      ring.scale.setScalar(size * 1.3);
      group.add(ring);
    }

    const glow = new THREE.Mesh(geo("pglow", () => new THREE.SphereGeometry(1, 8, 8)), basic(color, 0.16));
    glow.scale.setScalar(size * 2.1);
    group.add(glow);
    this.parent.add(group);
    return group;
  }

  trapMesh(x, color, element = "earth") {
    const group = new THREE.Group();
    group.position.set(x, 0, 0);
    const spikeGeo = geo("spike", () => new THREE.ConeGeometry(0.22, 1.1, 5));
    for (let i = 0; i < 3; i++) {
      const spike = new THREE.Mesh(spikeGeo, new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.7, roughness: 0.55,
      }));
      spike.position.set((i - 1) * 0.28, 0.15, (i % 2 ? 0.08 : -0.06));
      spike.rotation.z = (i - 1) * 0.18;
      group.add(spike);
    }
    this.parent.add(group);
    this.spawn(group, { life: 0.55, v: new THREE.Vector3(0, 2.8, 0), fade: false, gravity: 6 });
    this.shock(x, 0.08, color);
    if (element === "ice") this.burst(x, 0.4, 0, color, 8, 3, "shard");
    return group;
  }

  pickupMesh(id, color) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      geo("pickup", () => new THREE.IcosahedronGeometry(0.16, 0)),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.3 })
    );
    const ring = new THREE.Mesh(geo("pring", () => new THREE.TorusGeometry(1, 0.08, 6, 16)), basic(color, 0.8));
    ring.scale.setScalar(0.26);
    const glow = new THREE.Mesh(geo("pglow", () => new THREE.SphereGeometry(1, 8, 8)), basic(color, 0.14));
    glow.scale.setScalar(0.34);
    group.add(core, ring, glow);
    group.userData.pickup = id;
    this.parent.add(group);
    return group;
  }

  shockwave(x, y, color = "#3ee0ff") {
    const ring = new THREE.Mesh(geo("wave", () => new THREE.TorusGeometry(0.4, 0.05, 8, 28)), basic(color, 0.9));
    ring.position.set(x, y, 0.2);
    ring.rotation.x = Math.PI / 2;
    this.spawn(ring, { life: 0.45, scale: 22 });
    const ring2 = new THREE.Mesh(geo("wave", () => new THREE.TorusGeometry(0.4, 0.05, 8, 28)), basic(color, 0.55));
    ring2.position.set(x, y + 0.15, 0.2);
    ring2.rotation.x = Math.PI / 2;
    this.spawn(ring2, { life: 0.35, scale: 16 });
  }

  shock(x, y, color) {
    const ring = new THREE.Mesh(geo("shock", () => new THREE.TorusGeometry(0.2, 0.04, 8, 20)), basic(color, 0.9));
    ring.position.set(x, y, 0.2);
    ring.rotation.x = Math.PI / 2;
    this.spawn(ring, { life: 0.35, scale: 8 });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      it.m.position.addScaledVector(it.v, dt);
      if (it.gravity) it.v.y -= it.gravity * dt;
      if (it.spin) it.m.rotation.z += it.spin * dt;
      const materials = [];
      it.m.traverse((node) => { if (node.material && node.material.transparent) materials.push(node.material); });
      if (it.fade) {
        const opacity = Math.max(0, it.life / Math.max(0.001, it.max)) * (it.max < 0.2 ? 1 : 0.9);
        if (it.m.material) it.m.material.opacity = opacity;
        materials.forEach((material) => { material.opacity = Math.min(material.opacity, opacity + 0.15); });
      }
      if (it.scale) it.m.scale.addScalar(dt * it.scale);
      if (it.life <= 0) {
        disposeTree(it.m);
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    this.items.forEach((it) => disposeTree(it.m));
    this.items.length = 0;
  }
}
