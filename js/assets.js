import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { markShared } from "./resources.js";

const NARUTO_URL = new URL("../assets/models/naruto.glb", import.meta.url).href;
const CITY_URL = new URL("../assets/models/niko-city-kit.glb", import.meta.url).href;
let pending;
let library;

export async function loadAssets(onProgress = () => {}) {
  if (library) return library;
  if (!pending) {
    const loader = new GLTFLoader();
    let loaded = 0;
    const load = async (url, label) => {
      try {
        const result = await loader.loadAsync(url);
        markShared(result.scene);
        onProgress(++loaded / 2, label);
        return result.scene;
      } catch (error) {
        throw new Error(`No se pudo cargar ${label}. Comprueba la conexión y vuelve a intentarlo.`, { cause: error });
      }
    };
    pending = Promise.all([load(NARUTO_URL, "Naruto"), load(CITY_URL, "la ciudad de Niko")])
      .then(([naruto, city]) => (library = { naruto, city }))
      .catch((error) => { pending = null; throw error; });
  }
  return pending;
}

export function getAssets() {
  if (!library) throw new Error("Los modelos deben cargarse antes de crear el escenario o el personaje.");
  return library;
}
