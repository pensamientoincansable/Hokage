// Templates own shared geometry/textures for the lifetime of the application.
// Instances own their cloned materials, skeleton textures and transient effects.
export function markShared(root) {
  root.traverse((node) => {
    if (node.geometry) node.geometry.userData.shared = true;
    for (const material of [node.material].flat().filter(Boolean)) {
      material.userData.shared = true;
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.userData.shared = true;
      }
    }
  });
}

export function disposeTree(root) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const skeletons = new Set();
  root.traverse((node) => {
    if (node.isInstancedMesh) node.dispose();
    if (node.geometry && !node.geometry.userData.shared) geometries.add(node.geometry);
    if (node.skeleton) skeletons.add(node.skeleton);
    for (const material of [node.material].flat().filter(Boolean)) {
      if (material.userData.shared) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture && !value.userData.shared) textures.add(value);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  skeletons.forEach((skeleton) => skeleton.dispose());
  root.removeFromParent();
}
