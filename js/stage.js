import * as THREE from "three";
import { QUALITY } from "./config.js";

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extra.roughness ?? 0.7,
    metalness: extra.metalness ?? 0.15,
    emissive: extra.emissive ?? 0x000000,
    emissiveIntensity: extra.emissiveIntensity ?? 0,
  });
}

export class Stage {
  constructor(renderer, quality = "alta") {
    this.renderer = renderer;
    this.q = QUALITY[quality] || QUALITY.alta;
    this.group = new THREE.Group();
    this.fx = new THREE.Group();
    this.rain = [];
    this.signs = [];
    this.loaded = false;
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
    this.buildTex = await load("assets/img/building.jpg");
    if (this.streetTex) this.streetTex.repeat.set(6, 2);
    if (this.buildTex) this.buildTex.repeat.set(2, 3);
  }

  build(stageDef) {
    this.clear();
    const pal = stageDef?.palette || ["#1b2230", "#c81e3a", "#3ee0ff"];
    const rainOn = !!stageDef?.rain;
    const scene = this.renderer.scene;
    scene.background = new THREE.Color(pal[0]);
    scene.fog = new THREE.Fog(pal[0], 12, 42);

    const groundMat = mat("#1a1d24", { roughness: 0.35, metalness: 0.4 });
    if (this.streetTex) groundMat.map = this.streetTex;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 18), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(40, 0.18, 1.2), mat("#2a2e38"));
    curb.position.set(0, 0.05, 2.4);
    this.group.add(curb);

    const count = this.q.buildings;
    for (let i = 0; i < count; i++) {
      const w = 2.2 + (i % 4) * 0.7;
      const h = 6 + ((i * 17) % 14);
      const d = 2 + (i % 3);
      const bmat = mat(i % 2 ? "#161a22" : "#10141c", { metalness: 0.35, roughness: 0.5 });
      if (this.buildTex) bmat.map = this.buildTex;
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

      const light = new THREE.PointLight(neonCol, 1.1, 9, 2);
      light.position.copy(neon.position);
      this.group.add(light);
    }

    for (let i = 0; i < 8; i++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), mat("#222"));
      pole.position.set(-10 + i * 3, 1.6, 2.1);
      this.group.add(pole);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 8),
        mat("#ffe08a", { emissive: "#ffcc66", emissiveIntensity: 1.2 })
      );
      lamp.position.set(pole.position.x, 3.2, 2.1);
      this.group.add(lamp);
      const pl = new THREE.PointLight("#ffd08a", 0.7, 8);
      pl.position.copy(lamp.position);
      this.group.add(pl);
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
      const pulse = 0.8 + Math.sin(performance.now() * 0.004 + i) * 0.4;
      if (s.material.emissiveIntensity !== undefined) s.material.emissiveIntensity = pulse;
    });
  }

  clear() {
    this.renderer.scene.remove(this.group);
    this.renderer.scene.remove(this.fx);
    this.group = new THREE.Group();
    this.fx = new THREE.Group();
    this.signs = [];
    this.rainMesh = null;
  }
}
