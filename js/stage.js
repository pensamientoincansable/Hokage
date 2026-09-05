import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { QUALITY } from "./config.js";
import { getAssets } from "./assets.js";
import { disposeTree } from "./resources.js";

const TOWERS = ["tower-ring", "tower-needle", "tower-block", "tower-spire"];
const rand = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export class Stage {
  constructor(renderer, quality = "alta") {
    this.renderer = renderer;
    this.setQuality(quality);
    this.group = new THREE.Group();
    this.fx = new THREE.Group();
    this.signs = [];
    this.traffic = [];
    this.time = 0;
    this.loaded = false;
  }

  setQuality(quality) {
    this.quality = quality;
    this.q = QUALITY[quality] || QUALITY.media;
  }

  build(stageDef) {
    this.clear();
    this.definition = stageDef;
    this.group.name = `Niko-city-${stageDef.id}`;
    this.fx.name = "Combat-effects";
    const pal = stageDef.palette;
    const id = stageDef.id;
    const scene = this.renderer.scene;
    scene.background = new THREE.Color(pal[0]).multiplyScalar(0.45);
    scene.fog = new THREE.Fog(scene.background, 26, 105);
    this.batches = new Map();
    this.materials = new Map();
    this.accent = pal[2];
    this.secondary = pal[1];
    this.kit = getAssets().city;

    const water = id === "bridge";
    const roof = id === "rooftop";
    this.box(150, 0.3, 110, 0, roof ? -7.5 : water ? -4 : -0.42, -28,
      this.material(water ? "#0d3043" : "#0d1728", { metalness: 0.55, roughness: water ? 0.2 : 0.72 }));
    const deck = this.material("#27384a", { roughness: 0.54, metalness: 0.35 });
    this.box(21, 0.32, water ? 4.8 : 5.8, 0, -0.16, 0, deck);
    this.box(21.4, 0.16, 6, 0, -0.4, 0, this.material("#0c1523"));
    const edge = this.glow(this.accent, 1.7);
    for (const z of [-2.75, 2.75]) this.box(21, 0.035, 0.065, 0, 0.01, z, edge);
    const seam = this.material("#0d1c2c");
    for (let x = -9; x <= 9; x += 1.5) {
      this.box(0.035, 0.015, 5.35, x, 0.013, 0, seam);
      if (Math.abs(x) < 8) this.box(0.4, 0.018, 0.05, x, 0.026, 1.75, edge);
    }
    for (const x of [-8.5, 8.5]) {
      this.box(0.08, 0.02, 4.2, x, 0.035, 0, this.glow(this.secondary, 1.2));
    }
    this.ring(1.1, 0.018, 0, 0.025, 0, this.accent, 0.28);

    // Towers only in the skyline. Hangars and gateways are door-shaped; using
    // them as distant buildings made thin "floating doors" in the fog.
    const seed = ["street", "rooftop", "alley", "station", "bridge", "plaza"].indexOf(id) * 97 + 11;
    const groundY = roof ? -7 : water ? -4.2 : -0.4;
    for (let i = 0; i < this.q.buildings; i++) {
      const back = i % 2 === 0;
      const column = Math.floor(i / 2);
      const x = (column - (Math.ceil(this.q.buildings / 2) - 1) / 2) * 7.4 + (back ? 3.5 : 0);
      const height = back ? 16 + rand(seed + i) * 14 : 10 + rand(seed + i) * 8;
      const z = back ? -42 - rand(i) * 8 : -26 - rand(i + 3) * 5;
      this.place(TOWERS[(i + seed) % TOWERS.length], x, groundY, z, height, (rand(seed - i) - 0.5) * 0.1);
    }

    if (id === "street") this.street();
    if (id === "rooftop") this.rooftop();
    if (id === "alley") this.alley();
    if (id === "station") this.station();
    if (id === "bridge") this.bridge();
    if (id === "plaza") this.plaza();
    this.mergeStaticDetails();
    this.buildInstances();
    this.addTraffic(id === "station");
    if (stageDef.rain) this.addRain();

    const hemi = new THREE.HemisphereLight("#b8d8ff", "#353039", 1.9);
    const key = new THREE.DirectionalLight("#fff0db", 3.1);
    key.position.set(-5, 12, 12);
    key.castShadow = this.q.shadows;
    key.shadow.mapSize.set(this.q.shadowMap || 1024, this.q.shadowMap || 1024);
    Object.assign(key.shadow.camera, { near: 1, far: 45, left: -13, right: 13, top: 9, bottom: -5 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.035;
    const rim = new THREE.DirectionalLight(this.accent, 2.4);
    rim.position.set(4, 6, -8);
    // Two directional lights replace dozens of expensive per-building lights.
    this.group.add(hemi, key, rim);
    scene.add(this.group, this.fx);
    this.loaded = true;
  }

  material(color, options = {}) {
    return new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.7, ...options });
  }

  glow(color, intensity = 1) {
    const m = this.material(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
    this.signs.push({ material: m, base: intensity });
    return m;
  }

  box(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = this.q.shadows;
    this.group.add(mesh);
    return mesh;
  }

  ring(radius, tube, x, y, z, color, opacity = 1) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 64), new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    return mesh;
  }

  place(name, x, y, z, scale, rotation = 0) {
    if (!this.batches.has(name)) this.batches.set(name, []);
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation), new THREE.Vector3(scale, scale, scale));
    this.batches.get(name).push(matrix);
  }

  kitMaterial(source) {
    if (!this.materials.has(source.uuid)) {
      const material = source.clone();
      material.userData = {};
      if (source.name === "lights") {
        material.color.set(this.accent);
        material.emissive.set(this.accent);
        material.emissiveIntensity = 1.5;
      } else if (source.name === "blue" || source.name === "green") {
        material.color.set(this.secondary).multiplyScalar(0.55);
      }
      this.materials.set(source.uuid, material);
    }
    return this.materials.get(source.uuid);
  }

  mergeStaticDetails() {
    const batches = new Map();
    for (const mesh of this.group.children) {
      if (!mesh.isMesh || mesh.isInstancedMesh) continue;
      const key = `${mesh.material.uuid}-${mesh.receiveShadow}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(mesh);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((mesh) => {
        mesh.updateMatrix();
        return mesh.geometry.clone().applyMatrix4(mesh.matrix);
      });
      const merged = new THREE.Mesh(mergeGeometries(geometries), meshes[0].material);
      merged.receiveShadow = meshes[0].receiveShadow;
      merged.name = "Arena-static-detail";
      this.group.add(merged);
      for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
      geometries.forEach((geometry) => geometry.dispose());
    }
  }

  buildInstances() {
    for (const [name, matrices] of this.batches) {
      const template = this.kit.getObjectByName(name);
      if (!template) throw new Error(`Pieza de ciudad no encontrada: ${name}`);
      for (const part of template.children) {
        const mesh = new THREE.InstancedMesh(part.geometry, this.kitMaterial(part.material), matrices.length);
        mesh.name = `Niko-${part.name}`;
        matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.castShadow = this.q.shadows && template.userData.kind === "prop";
        mesh.receiveShadow = this.q.shadows;
        this.group.add(mesh);
      }
    }
  }

  sign(text, x, y, z, color = this.accent, width = 3.6) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#091321"; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(4, 4, 504, 120);
    ctx.fillStyle = new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.3).getStyle(); ctx.font = "bold 40px monospace"; ctx.textAlign = "center";
    ctx.fillText(text, 256, 68);
    ctx.font = "16px monospace"; ctx.fillStyle = "#92aac1"; ctx.fillText("H O K A G E   /   N E O  C I T Y", 256, 101);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    mesh.position.set(x, y, z);
    this.group.add(mesh);
  }

  street() {
    this.place("hall", -9.8, 0, -11.2, 5.4, 0.04);
    this.place("habitat", 10.6, 0, -12, 6.2, -0.04);
    this.place("hall", 0.4, 0, -15.5, 4.6, 0);
    for (const x of [-8.4, -4.2, 4.2, 8.4]) this.place("lamp", x, 0, -3.55, 2.55, Math.PI / 2);
    this.place("terminal", -9.2, 0, -3.45, 1.4);
    this.place("terminal", 9.2, 0, -3.45, 1.4, Math.PI);
    this.sign("KONOHA / 01", -4.8, 4.8, -7, this.secondary, 5);
    this.sign("NINJA DISTRICT", 8, 3.5, -5.5, this.accent, 4);
  }

  rooftop() {
    this.railings();
    this.place("antenna", -10.2, 0, -4, 5);
    this.place("generator", 10.2, 0, -3.8, 1.8);
    this.place("pylon", 9.7, 0, -6, 4);
    this.ring(2, 0.045, 0, 0.026, 0, this.secondary, 0.55);
    this.box(1.7, 0.02, 0.15, 0, 0.04, 0, this.glow(this.secondary, 0.65));
    for (const x of [-0.8, 0.8]) this.box(0.16, 0.02, 1.5, x, 0.04, 0, this.glow(this.secondary, 0.65));
    this.sign("SKY DOJO / 02", -7.5, 2.8, -4.2, this.secondary);
  }

  alley() {
    const brick = this.material("#0a1018", { roughness: 0.92, metalness: 0.12 });
    this.box(7.5, 8.5, 1.6, -12.6, 3.9, -5.2, brick);
    this.box(7.5, 8.5, 1.6, 12.6, 3.9, -5.2, brick);
    this.place("habitat", -11.6, 0, -8.4, 6.4, 0.06);
    this.place("hangar", 11.8, 0, -8.8, 5.8, Math.PI + 0.05);
    this.place("lamp", -6.2, 0, -3.35, 2.4, Math.PI / 2);
    this.place("lamp", 6.2, 0, -3.35, 2.4, Math.PI / 2);
    this.place("terminal", 8.5, 0, -3.45, 1.35, -0.08);
    this.place("generator", -8.6, 0, -3.4, 1.15);
    this.box(24, 0.18, 0.28, 0, 6.5, -5.6, this.material("#142536"));
    this.box(23, 0.035, 0.04, 0, 6.38, -5.45, this.glow(this.secondary, 2));
    this.sign("ICHIRAKU", -6.4, 3.6, -4.4, this.secondary, 3.1);
    this.sign("UNDERGROUND / 03", 5.6, 5.1, -6, this.accent, 4.3);
  }

  station() {
    this.place("station", 0, 0, -18.5, 8.2, 0);
    for (const x of [-7.4, 7.4]) {
      this.place("canopy", x, 0, -9.2, 2.1);
      this.place("terminal", x * 1.12, 0, -3.5, 1.45);
      this.place("lamp", x * 0.55, 0, -3.6, 2.5, Math.PI / 2);
    }
    for (const z of [-5.8, -7.5]) this.box(90, 0.07, 0.1, 0, 0.12, z, this.glow(this.accent, 0.7));
    this.sign("TRANSIT / 04", 0, 3.7, -5.6, this.accent, 4.5);
  }

  railings() {
    const metal = this.material("#334b60");
    for (const z of [-2.9, 2.95]) {
      const front = z > 0;
      this.box(21, 0.06, 0.08, 0, front ? 0.14 : 0.75, z, metal);
      for (const x of [-10, -7, -4, 0, 4, 7, 10]) this.box(0.07, front ? 0.15 : 0.8, 0.08, x, front ? 0.075 : 0.4, z, metal);
    }
  }

  bridge() {
    this.railings();
    for (const x of [-10.4, 10.4]) {
      this.place("pylon", x, -0.1, -3.8, 7.5, Math.PI / 2);
      this.place("antenna", x * 1.7, -4, -10, 12);
      const cable = this.box(0.08, 10, 0.1, x * 0.55, 3.6, -3.4, this.glow(this.accent, 0.8));
      cable.rotation.z = Math.sign(x) * -0.95;
    }
    this.sign("RAIJIN LINK / 05", 0, 5.7, -8, this.accent, 5);
  }

  plaza() {
    this.place("antenna", 0, 0, -8.5, 6.2);
    this.place("hall", -13, 0, -9.5, 4.5, 0.3);
    this.place("hall", 13, 0, -9.5, 4.5, -0.3);
    for (const x of [-7, 7]) this.place("pavilion", x, 0, -5, 2.8);
    this.ring(2.2, 0.035, 0, 6.4, -8.5, this.secondary, 0.75);
    this.ring(1.7, 0.025, 0, 6.8, -8.5, this.accent, 0.6);
    this.sign("HOKAGE MEMORIAL", 0, 3.7, -5.6, this.secondary, 4.4);
  }

  addTraffic(train) {
    const template = this.kit.getObjectByName(train ? "shuttle" : "aircraft");
    for (let i = 0; i < (this.quality === "baja" ? 1 : 2); i++) {
      const vehicle = template.clone();
      vehicle.traverse((node) => { if (node.isMesh) node.material = this.kitMaterial(node.material); });
      const scale = train ? 5 : 2.2;
      vehicle.scale.setScalar(scale);
      vehicle.position.set(-25 + i * 35, train ? 0.55 : 8 + i * 5, train ? -6.5 : -16 - i * 8);
      vehicle.rotation.y = Math.PI / 2;
      this.group.add(vehicle);
      this.traffic.push({ mesh: vehicle, speed: train ? 5 : 2.6 + i });
    }
  }

  addRain() {
    const count = Math.floor(650 * this.q.particles);
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = rand(i + 100) * 42 - 21;
      const y = rand(i + 200) * 18;
      const z = rand(i + 300) * 26 - 18;
      positions.set([x, y, z, x - 0.025, y - 0.3, z], i * 6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.rainMesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: "#8cbddd", transparent: true, opacity: 0.22, depthWrite: false }));
    this.group.add(this.rainMesh);
  }

  update(dt) {
    this.time += dt;
    if (this.rainMesh) {
      const attribute = this.rainMesh.geometry.attributes.position;
      const arr = attribute.array;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= dt * 13;
        if (arr[i + 1] < -1) arr[i + 1] = 18;
        arr[i + 4] = arr[i + 1] - 0.3;
      }
      attribute.needsUpdate = true;
    }
    this.signs.forEach(({ material, base }, i) => { material.emissiveIntensity = base * (0.94 + Math.sin(this.time * 1.4 + i) * 0.06); });
    this.traffic.forEach(({ mesh, speed }) => {
      mesh.position.x += speed * dt;
      if (mesh.position.x > 42) mesh.position.x = -42;
    });
  }

  clear() {
    // FX owns its transient geometry; Game clears it before replacing a stage.
    disposeTree(this.group);
    disposeTree(this.fx);
    this.group = new THREE.Group();
    this.fx = new THREE.Group();
    this.rainMesh = null;
    this.signs = [];
    this.traffic = [];
    this.loaded = false;
  }
}
