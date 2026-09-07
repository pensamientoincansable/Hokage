import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { getAssets } from "./assets.js";
import { ELEMENTS } from "./config.js";
import { animateNinja } from "./martial-arts.js";
import { createNinja } from "./ninja.js";

export function createNaruto(appearance, template = getAssets().naruto) {
  // Migración Virtua Fighter: Naruto original reemplazado por Ninja Futurista.
  // Si el save pide naruto, lo redirigimos al nuevo modelo cibernético.
  if (appearance.model !== "naruto") {
    return createNinja(appearance);
  }
  // Compat: si aún llega como naruto, usar futurista igualmente para cumplir petición
  const futuristic = { ...appearance, model: "futuristic", textureImage: appearance.textureImage || "assets/img/ninja-futurista.png", portrait: appearance.portrait || "assets/img/ninja-futurista.png", primaryColor: "#0b1622", secondaryColor: "#3ee0ff" };
  return createNinja(futuristic);
  const root = new THREE.Group();
  root.name = "Naruto-player";
  root.scale.setScalar(appearance.height || 1);
  const model = clone(template);
  root.add(model);
  model.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    node.material = node.material.clone();
    node.material.userData = {}; // Instance-owned material; texture remains shared.
    node.castShadow = true;
    node.receiveShadow = false;
    // Animated limbs can leave the rest-pose bounding sphere.
    node.frustumCulled = false;
  });
  const names = {
    hips: "hip", torso: "breast", head: "head",
    lUpper: "R_harm", rUpper: "L_harm", lFore: "R_larm", rFore: "L_larm",
    lThigh: "R_hleg", rThigh: "L_hleg", lShin: "R_lleg", rShin: "L_lleg",
    lFoot: "R_toe", rFoot: "L_toe",
  };
  const rig = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, model.getObjectByName(name)]));
  // Close the hands for unarmed strikes. Finger pivots are preserved by the
  // canonical import, including Naruto's original skin weights.
  for (const side of ["R", "L"]) {
    for (const finger of ["Hi", "Na", "Ku", "Ko"]) {
      for (const joint of ["01", "02", "03"]) {
        const bone = model.getObjectByName(`${side}_fin${finger}${joint}`);
        if (bone) bone.rotation.z = side === "R" ? 0.95 : -0.95;
      }
    }
    for (const [joint, curl] of [["01", 0.7], ["02", 0.65], ["03", 0.5]]) {
      const thumb = model.getObjectByName(`${side}_finOy${joint}`);
      if (thumb) thumb.rotation.set(joint === "01" ? 0.85 : 0.25, 0, side === "R" ? curl : -curl);
    }
  }
  const auras = [0, 1].map((i) => {
    const color = (ELEMENTS[appearance.elements?.[i]] || ELEMENTS.wind).color;
    const aura = new THREE.Mesh(new THREE.TorusGeometry(i ? 0.36 : 0.5, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.025;
    root.add(aura);
    return aura;
  });
  const { animator, update } = animateNinja(root, rig, ...auras);
  return { root, model, parts: rig, animator, update, appearance, modelType: "naruto" };
}
