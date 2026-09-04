import * as THREE from "three";
import { QUALITY } from "./config.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extra.roughness ?? 0.7,
    metalness: extra.metalness ?? 0.15,
    emissive: extra.emissive ?? 0x000000,
    emissiveIntensity: extra.emissiveIntensity ?? 0,
  });
}

// Reconstruction of the city palette. The FBX ships the geometry and the
// material *names* but not the colours (they were lost on export), so we map
// each named material to a coherent "futuristic low poly city" palette.
const CITY_MATERIALS = {
  "metalic light gray": { color: 0xb9c1cc, metalness: 0.7, roughness: 0.35 },
  "metalic dark gray": { color: 0x39404a, metalness: 0.7, roughness: 0.4 },
  gray: { color: 0x6a7280, metalness: 0.3, roughness: 0.6 },
  copper: { color: 0xc87a3a, metalness: 0.8, roughness: 0.35 },
  blue: { color: 0x2f6fd6, metalness: 0.5, roughness: 0.4 },
  green: { color: 0x2fbf7a, metalness: 0.4, roughness: 0.4 },
  lights: { color: 0x2a3240, metalness: 0.4, roughness: 0.4, emissive: 0xffd9a0, emissiveIntensity: 1.6 },
  energy: { color: 0x10222e, metalness: 0.3, roughness: 0.3, emissive: 0x3ee0ff, emissiveIntensity: 2.2 },
  barrier: { color: 0x3ee0ff, metalness: 0.1, roughness: 0.2, emissive: 0x3ee0ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.35 },
};

export class Stage {
  constructor(renderer, quality = "alta") {
    this.renderer = renderer;
    this.q = QUALITY[quality] || QUALITY.alta;
    this.group = new THREE.Group();
    this.fx = new THREE.Group();
    this.rain = [];
    this.signs = [];
    this.loaded = false;
    this.city = null; // imported city backdrop (replaces procedural buildings)
    this.cityScale = 0.002;
  }

  async loadTextures() {
    const loader = new THREE.TextureLoader();
    const load = (url) =>
      new Promise((res) => {
        loader.load(
          url,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            res(t);
          },
          undefined,
          () => res(null)
        );
      });
    this.streetTex = await load("assets/img/stage-street.jpg");
    if (this.streetTex) this.streetTex.repeat.set(6, 2);
  }

  // Loads the futuristic low-poly city and prepares it as a backdrop.
  async loadCity() {
    try {
      const loader = new FBXLoader();
      const city = await loader.loadAsync("assets/futuristic low poly city by niko.fbx");
      const box = new THREE.Box3().setFromObject(city);
      const s = box.getSize(new THREE.Vector3());
      const scale = this.cityScale;

      city.scale.setScalar(scale);
      city.position.set(
        -((box.min.x + box.max.x) / 2) * scale, // centre horizontally
        0, // city ground ~ y = 0 sits at the arena floor level
        -6 + 1500 * scale // dense city band (z ≈ -1500) behind the fighters
      );

      // Recolour by material name + flat shading for the low-poly look.
      const cache = new Map();
      const getMat = (name) => {
        if (cache.has(name)) return cache.get(name);
        const def = CITY_MATERIALS[name] || { color: 0x8890a0, metalness: 0.4, roughness: 0.5 };
        const m = new THREE.MeshStandardMaterial({
          color: def.color,
          metalness: def.metalness ?? 0.4,
          roughness: def.roughness ?? 0.5,
          emissive: def.emissive ?? 0x000000,
          emissiveIntensity: def.emissiveIntensity ?? 0,
          transparent: def.transparent ?? false,
          opacity: def.opacity ?? 1,
          flatShading: true,
        });
        if (def.emissive) m.userData.baseEmissive = def.emissiveIntensity ?? 1;
        cache.set(name, m);
        return m;
      };

      let kept = 0;
      const drop = new Set();
      // Identify the two giant outlier slabs (city ground + mega block) so the
      // backdrop reads as a skyline over the playable street.
      const vols = [];
      city.traverse((o) => {
        if (!o.isMesh) return;
        o.updateWorldMatrix(true, false);
        const b = new THREE.Box3().setFromObject(o);
        vols.push({ o, v: b.getSize(new THREE.Vector3()), name: o.name });
      });
      vols.sort((a, b) => b.v.x * b.v.y * b.v.z - a.v.x * a.v.y * a.v.z);
      vols.slice(0, 2).forEach((e) => drop.add(e.o));

      city.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        o.material = mats.map((m) => getMat(m.name || "gray"));
        o.castShadow = false;
        o.receiveShadow = true;

        // Crop: keep only the buildings behind the play area.
        o.updateWorldMatrix(true, false);
        const c = new THREE.Vector3();
        o.getWorldPosition(c);
        if (drop.has(o) || c.z > -2.5 || Math.abs(c.x) > 30) {
          o.visible = false;
        } else {
          kept++;
        }
      });

      this.city = city;
      return kept;
    } catch (err) {
      console.warn("City backdrop unavailable, using procedural skyline:", err);
      this.city = null;
      return 0;
    }
  }

  build(stageDef) {
    this.clear();
    const pal = stageDef?.palette || ["#1b2230", "#c81e3a", "#3ee0ff"];
    const rainOn = !!stageDef?.rain;
    const scene = this.renderer.scene;
    scene.background = new THREE.Color(pal[0]);
    scene.fog = new THREE.Fog(pal[0], 12, 46);

    // Playable floor (street) — characters fight on this.
    const groundMat = mat("#1a1d24", { roughness: 0.35, metalness: 0.4 });
    if (this.streetTex) groundMat.map = this.streetTex;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 18), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(40, 0.18, 1.2), mat("#2a2e38"));
    curb.position.set(0, 0.05, 2.4);
    this.group.add(curb);

    // City backdrop (imported) or procedural skyline fallback.
    if (this.city) {
      this.group.add(this.city);
      // Recollect the emissive city materials so their neon pulse survives
      // being re-attached across level builds.
      this.signs = this.collectGlow(this.city);
      // A couple of neon spotlights to tie the city into the arena palette.
      const spotCol = pal[2];
      for (const x of [-10, 10]) {
        const pl = new THREE.PointLight(spotCol, 0.8, 14, 2);
        pl.position.set(x, 5, -6);
        this.group.add(pl);
      }
    } else {
      this.buildProceduralSkyline(pal);
    }

    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 40),
      new THREE.MeshBasicMaterial({ color: pal[2], transparent: true, opacity: 0.07 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.group.add(ring);

    if (stageDef?.id === "plaza") {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.6, 4), mat("#e8c36a", { metalness: 0.5 }));
      hat.position.set(0, 8.4, -10);
      this.group.add(hat);
    }

    if (rainOn) {
      const geo = new THREE.BufferGeometry();
      const n = Math.floor(900 * this.q.particles);
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 40;
        pos[i * 3 + 1] = Math.random() * 16;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 18;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const rain = new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color: "#88a0c8", size: 0.035, transparent: true, opacity: 0.55 })
      );
      this.group.add(rain);
      this.rainMesh = rain;
    }

    this.hemi = new THREE.HemisphereLight("#9bb4d0", "#1a1010", 0.55);
    this.dir = new THREE.DirectionalLight("#fff3d6", 1.05);
    this.dir.position.set(6, 14, 8);
    this.dir.castShadow = this.q.shadows;
    if (this.q.shadows) {
      this.dir.shadow.mapSize.set(1024, 1024);
      this.dir.shadow.camera.near = 1;
      this.dir.shadow.camera.far = 40;
      this.dir.shadow.camera.left = -16;
      this.dir.shadow.camera.right = 16;
      this.dir.shadow.camera.top = 12;
      this.dir.shadow.camera.bottom = -4;
    }
    this.group.add(this.hemi, this.dir);
    scene.add(this.group);
    scene.add(this.fx);
    this.loaded = true;
  }

  buildProceduralSkyline(pal) {
    const count = this.q.buildings;
    for (let i = 0; i < count; i++) {
      const w = 2.2 + (i % 4) * 0.7;
      const h = 6 + ((i * 17) % 14);
      const d = 2 + (i % 3);
      const bmat = mat(i % 2 ? "#161a22" : "#10141c", { metalness: 0.35, roughness: 0.5 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bmat);
      const side = i % 2 === 0 ? -1 : 1;
      b.position.set(-18 + (i * 1.9) % 36, h / 2, -6 - (i % 5) * 1.4 + side * 0.2);
      b.castShadow = true;
      b.receiveShadow = true;
      this.group.add(b);

      const neonCol = i % 3 === 0 ? pal[1] : pal[2];
      const neon = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.7, 0.12, 0.08),
        mat(neonCol, { emissive: neonCol, emissiveIntensity: 1.4 })
      );
      neon.position.set(b.position.x, 2 + (i % 5), b.position.z + d / 2 + 0.05);
      this.group.add(neon);
      this.signs.push(neon);
    }
  }

  collectGlow(root) {
    const seen = new Set();
    const out = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.userData?.baseEmissive && !seen.has(m)) {
          seen.add(m);
          out.push(m);
        }
      }
    });
    return out;
  }

  update(dt) {
    if (this.rainMesh) {
      const arr = this.rainMesh.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= dt * 14;
        if (arr[i + 1] < 0) arr[i + 1] = 16;
      }
      this.rainMesh.geometry.attributes.position.needsUpdate = true;
    }
    this.signs.forEach((s, i) => {
      const pulse = 0.75 + Math.sin(performance.now() * 0.004 + i) * 0.35;
      if (s.isMesh && s.material && s.material.emissiveIntensity !== undefined) {
        s.material.emissiveIntensity = pulse;
      } else if (s.emissiveIntensity !== undefined) {
        s.emissiveIntensity = (s.userData.baseEmissive ?? 1) * pulse;
      }
    });
  }

  clear() {
    this.renderer.scene.remove(this.group);
    this.renderer.scene.remove(this.fx);
    if (this.city) this.renderer.scene.remove(this.city);
    this.group = new THREE.Group();
    this.fx = new THREE.Group();
    this.signs = [];
    this.rainMesh = null;
  }
}
