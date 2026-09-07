import * as THREE from "three";
import { disposeTree } from "./resources.js";
import { PICKUPS } from "./config.js";

const swordCache = new Map();
function getSwordTexture(path) {
  if (!path) return null;
  if (swordCache.has(path)) return swordCache.get(path);
  const loader = new THREE.TextureLoader();
  const tex = loader.load(path, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; });
  tex.colorSpace = THREE.SRGBColorSpace;
  swordCache.set(path, tex);
  return tex;
}

export class FX {
  constructor(parent, particleScale = 1) {
    this.parent = parent;
    this.items = [];
    this.particleScale = particleScale;
  }

  burst(x, y, z, color = "#ffe08a", n = 18, speed = 4) {
    n = Math.max(0, Math.min(Math.ceil(n * this.particleScale), 80 - this.items.length));
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 1 })
      );
      m.position.set(x, y, z);
      const v = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed * 0.3);
      this.parent.add(m);
      this.items.push({ m, v, life: 0.35 + Math.random() * 0.25 });
    }
  }

  projectileMesh(color, size = 0.35) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 10),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.3 })
    );
    core.scale.set(1.6, 1, 1);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(size * 1.3, 0.04, 8, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.7 })
    );
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(size * 2, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.18 })
    );
    g.add(core, ring, glow);
    this.parent.add(g);
    return g;
  }

  pickupMesh(id, color) {
    const g = new THREE.Group();
    const pickup = PICKUPS[id];
    const image = pickup?.image;
    // Si es mejora con espada, usa la imagen de la espada de /media
    if (image) {
      const tex = getSwordTexture(image);
      if (tex) {
        // Espada flotante — plano double-sided con brillo neón
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.55, 0.95),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.12, side: THREE.DoubleSide, depthWrite: false })
        );
        blade.position.y = 0.18;
        // Inclinación katanas futuristas
        blade.rotation.z = 0.18;
        blade.rotation.y = 0.12;
        const glow = new THREE.Mesh(
          new THREE.PlaneGeometry(0.72, 1.12),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
        );
        glow.position.y = 0.18;
        glow.position.z = -0.04;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.03, 8, 20),
          new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.78 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.02;
        g.add(glow);
        g.add(blade);
        g.add(ring);
        // Partícula superior brillante
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 6, 6),
          new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.9 })
        );
        tip.position.set(0.12, 0.62, 0);
        g.add(tip);
        g.userData.pickup = id;
        this.parent.add(g);
        return g;
      }
    }
    // Fallback clásico si no hay textura
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.3 })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.03, 8, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.8 })
    );
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.14 })
    );
    g.add(core, ring, glow);
    g.userData.pickup = id;
    this.parent.add(g);
    return g;
  }

  shockwave(x, y, color = "#3ee0ff") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.05, 8, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.9 })
    );
    ring.position.set(x, y, 0.2);
    ring.rotation.x = Math.PI / 2;
    this.parent.add(ring);
    this.items.push({ m: ring, v: new THREE.Vector3(), life: 0.45, scale: 22 });
  }

  shock(x, y, color) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.04, 8, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.9 })
    );
    ring.position.set(x, y, 0.2);
    ring.rotation.x = Math.PI / 2;
    this.parent.add(ring);
    this.items.push({ m: ring, v: new THREE.Vector3(), life: 0.35, scale: 8 });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      it.m.position.addScaledVector(it.v, dt);
      if (it.m.material) it.m.material.opacity = Math.max(0, it.life * 3);
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
