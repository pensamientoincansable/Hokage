// Build-time only. No Collada/FBX parsing or authoring files are shipped to players.
import * as THREE from "three";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { createNaruto } from "../js/naruto.js";
import { DEFAULT_APPEARANCE } from "../js/config.js";

export { THREE, ColladaLoader, FBXLoader };

export const CITY_PARTS = [
  ["tower-ring", "Cube028", "building"],
  ["tower-needle", "Cube032", "building"],
  ["tower-block", "Cube021", "building"],
  ["tower-spire", "Cube031", "building"],
  ["hall", "Cube003", "building"],
  ["station", "Cube064", "building"],
  ["habitat", "Cube026", "building"],
  ["hangar", "Cube022", "building"],
  ["pavilion", "Cube037", "prop"],
  ["canopy", "Cube038", "prop"],
  ["gateway", "Cube004", "prop"],
  ["terminal", "Cube054", "prop"],
  ["lamp", "Cube055", "prop"],
  ["generator", "Cube056", "prop"],
  ["antenna", "Cube009", "prop"],
  ["pylon", "Cube035", "prop"],
  ["shuttle", "Cube017", "vehicle"],
  ["aircraft", "Cube016", "vehicle"],
];

async function loadComplete(Loader, url) {
  const manager = new THREE.LoadingManager();
  const complete = new Promise((resolve, reject) => {
    manager.onLoad = resolve;
    manager.onError = (path) => reject(new Error(`No se pudo cargar ${path}`));
  });
  const result = await new Loader(manager).loadAsync(url);
  await complete;
  return result;
}

export async function prepareNaruto() {
  const { scene } = await loadComplete(ColladaLoader, "/Naruto/model.dae");
  scene.updateMatrixWorld(true);
  const sourceMeshes = [];
  scene.traverse((node) => {
    // Meshes 10–19 are kunai and inverted outline shells. The taijutsu fighter
    // is unarmed; keeping those shells would hide the textured skin.
    if (node.isSkinnedMesh && Number(node.name.split("_")[1]) < 10) sourceMeshes.push(node);
  });
  const bones = [];
  scene.traverse((node) => { if (node.isBone) bones.push(node); });

  // Pose the T-pose arms down in MODEL space, independent of the source's
  // unusual joint axes. Next bake this rest pose and canonicalize all axes.
  for (const [name, angle] of [["R_harm", Math.PI / 2], ["L_harm", -Math.PI / 2]]) {
    const bone = scene.getObjectByName(name);
    const parentWorld = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const delta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
    bone.quaternion.premultiply(parentWorld.clone().invert().multiply(delta).multiply(parentWorld));
  }
  scene.updateMatrixWorld(true);
  const worldPositions = new Map(bones.map((bone) => [bone, bone.getWorldPosition(new THREE.Vector3())]));
  const canonicalIndex = new Map(bones.map((bone, i) => [bone.name, i]));
  const geometries = [];
  const skinMatrix = new THREE.Matrix4();
  const boneMatrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  for (const mesh of sourceMeshes) {
    mesh.skeleton.update();
    const geometry = mesh.geometry.clone();
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const indices = geometry.attributes.skinIndex;
    const weights = geometry.attributes.skinWeight;
    for (let i = 0; i < positions.count; i++) {
      position.fromBufferAttribute(positions, i);
      mesh.applyBoneTransform(i, position);
      position.applyMatrix4(mesh.matrixWorld);
      positions.setXYZ(i, position.x, position.y, position.z);
      skinMatrix.elements.fill(0);
      for (let j = 0; j < 4; j++) {
        const index = indices.getComponent(i, j);
        const weight = weights.getComponent(i, j);
        boneMatrix.multiplyMatrices(mesh.skeleton.bones[index].matrixWorld, mesh.skeleton.boneInverses[index]);
        for (let k = 0; k < 16; k++) skinMatrix.elements[k] += boneMatrix.elements[k] * weight;
        indices.setComponent(i, j, canonicalIndex.get(mesh.skeleton.bones[index].name));
      }
      skinMatrix.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix).premultiply(mesh.matrixWorld);
      normalMatrix.getNormalMatrix(skinMatrix);
      normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
      normals.setXYZ(i, normal.x, normal.y, normal.z);
    }
    geometries.push({ geometry, material: mesh.material });
  }

  const bounds = new THREE.Box3();
  for (const { geometry } of geometries) {
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox);
  }
  const scale = 2.2 / (bounds.max.y - bounds.min.y);
  const origin = new THREE.Vector3(0, bounds.min.y, 0);
  const model = new THREE.Group();
  model.name = "Naruto";
  model.userData = { source: "Naruto/model.dae", restPose: "canonical-arms-down", height: 2.2 };
  const rootBone = bones[0];
  model.add(rootBone);
  for (const bone of bones) {
    const parentPosition = worldPositions.get(bone.parent);
    bone.position.copy(worldPositions.get(bone)).sub(parentPosition || origin).multiplyScalar(scale);
    bone.quaternion.identity();
    bone.scale.setScalar(1);
  }
  model.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();

  // Merge by texture: ten body meshes become four draw calls, one shared rig.
  const byTexture = new Map();
  for (const { geometry, material } of geometries) {
    geometry.translate(-origin.x, -origin.y, -origin.z).scale(scale, scale, scale);
    // Collada creates distinct Texture objects for repeated image references.
    const key = material.map.image.currentSrc || material.map.image.src;
    if (!byTexture.has(key)) byTexture.set(key, { map: material.map, geometries: [] });
    geometry.clearGroups();
    byTexture.get(key).geometries.push(geometry.index ? geometry.toNonIndexed() : geometry);
  }
  let i = 0;
  for (const { map, geometries: pieces } of byTexture.values()) {
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 });
    material.name = `Naruto-texture-${i}`;
    const geometry = mergeVertices(mergeGeometries(pieces));
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = `Naruto-skin-${i++}`;
    model.add(mesh);
    mesh.bind(skeleton);
    mesh.normalizeSkinWeights();
  }
  return model;
}

export async function prepareCity() {
  const source = await loadComplete(FBXLoader, "/assets/futuristic%20low%20poly%20city%20by%20niko.fbx");
  source.updateMatrixWorld(true);
  const kit = new THREE.Group();
  kit.name = "Futuristic-low-poly-city-by-niko";
  kit.userData.source = "assets/futuristic low poly city by niko.fbx";
  const materials = new Map();
  const materialFor = (name) => {
    if (!materials.has(name)) {
      const light = name === "lights";
      const material = new THREE.MeshStandardMaterial({
        color: light ? "#76e9ff" : name === "metalic dark gray" ? "#172d43" : name === "blue" ? "#244561" : name === "green" ? "#36898b" : "#536b88",
        emissive: light ? "#40d8ff" : "#000000",
        emissiveIntensity: light ? 1.6 : 0,
        roughness: 0.62,
        metalness: 0.3,
      });
      material.name = name;
      materials.set(name, material);
    }
    return materials.get(name);
  };
  for (const [name, sourceName, kind] of CITY_PARTS) {
    const original = source.getObjectByName(sourceName);
    if (!original?.isMesh) throw new Error(`Falta ${sourceName} en la ciudad de Niko`);
    const geometry = (original.geometry.index ? original.geometry.toNonIndexed() : original.geometry.clone()).applyMatrix4(original.matrixWorld);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const unit = kind === "vehicle" ? Math.max(size.x, size.z) : size.y;
    geometry.translate(-center.x, -box.min.y, -center.z).scale(1 / unit, 1 / unit, 1 / unit);
    const group = new THREE.Group();
    group.name = name;
    group.userData = { sourceName, kind, size: size.divideScalar(unit).toArray() };
    const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: geometry.attributes.position.count, materialIndex: 0 }];
    const sourceMaterials = [original.material].flat();
    const byMaterial = new Map();
    for (const range of groups) {
      const materialName = sourceMaterials[range.materialIndex].name;
      const part = new THREE.BufferGeometry();
      for (const key of ["position", "normal"]) {
        const attr = geometry.attributes[key];
        part.setAttribute(key, new THREE.BufferAttribute(attr.array.slice(range.start * attr.itemSize, (range.start + range.count) * attr.itemSize), attr.itemSize));
      }
      if (!byMaterial.has(materialName)) byMaterial.set(materialName, []);
      byMaterial.get(materialName).push(part);
    }
    for (const [materialName, parts] of byMaterial) {
      const mesh = new THREE.Mesh(mergeVertices(mergeGeometries(parts)), materialFor(materialName));
      mesh.name = `${name}-${materialName.replaceAll(" ", "-")}`;
      group.add(mesh);
    }
    kit.add(group);
  }
  return kit;
}

async function asBase64(scene) {
  const data = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(new Blob([data]));
  });
}

function portraitFromModel(template) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(384, 384);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#172e43");
  scene.add(new THREE.HemisphereLight("#d3e8ff", "#453447", 2.5));
  const key = new THREE.DirectionalLight("#fff0d5", 3);
  key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#53d9ff", 2);
  rim.position.set(3, 3, -3); scene.add(rim);
  const ninja = createNaruto(DEFAULT_APPEARANCE, template);
  ninja.root.rotation.y = -0.2;
  ninja.animator.update(0.1);
  scene.add(ninja.root);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0, 1.9, 2.5);
  camera.lookAt(0, 1.65, 0);
  renderer.render(scene, camera);
  const data = renderer.domElement.toDataURL("image/png").split(",")[1];
  renderer.dispose();
  return data;
}

async function smallLogo() {
  const image = new Image();
  image.src = "/assets/img/logo.png";
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d").drawImage(image, 0, 0, 256, 256);
  return canvas.toDataURL("image/webp", 0.88).split(",")[1];
}

export async function prepareAssets() {
  const [naruto, city] = await Promise.all([prepareNaruto(), prepareCity()]);
  return {
    naruto: await asBase64(naruto),
    city: await asBase64(city),
    portrait: portraitFromModel(naruto),
    logo: await smallLogo(),
    parts: CITY_PARTS.map(([name, sourceName, kind]) => ({ name, sourceName, kind })),
  };
}
