import * as THREE from "three";
import { QUALITY } from "./config.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = "alta";
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 80);
    this.camera.position.set(0, 1.7, 7.4);
    this.camera.lookAt(0, 1.15, 0);
    this.composer = null;
    this.shake = 0;
    this.camTarget = new THREE.Vector3();
    window.addEventListener("resize", () => this.resize());
  }

  async enableBloom() {
    if (this.quality !== "alta") return;
    try {
      const { EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/addons/postprocessing/RenderPass.js");
      const { UnrealBloomPass } = await import("three/addons/postprocessing/UnrealBloomPass.js");
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.6, 0.85));
    } catch {
      this.composer = null;
    }
  }

  setQuality(q) {
    this.quality = q;
    const cfg = QUALITY[q] || QUALITY.alta;
    this.renderer.shadowMap.enabled = cfg.shadows;
    this.renderer.setPixelRatio(cfg.bloom ? Math.min(devicePixelRatio, 2) : 1);
    if (!cfg.bloom) this.composer = null;
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  }

  follow(x1, x2, dt) {
    const mid = (x1 + x2) / 2;
    const dist = Math.min(9.2, Math.max(6.4, Math.abs(x1 - x2) * 0.7 + 6.2));
    this.camTarget.set(mid, 1.55, dist);
    this.camera.position.lerp(this.camTarget, 1 - Math.pow(0.001, dt));
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.4;
      this.shake = Math.max(0, this.shake - dt * 8);
    }
    this.camera.lookAt(mid, 1.1, 0);
  }

  showcaseCam(t) {
    this.camera.position.set(Math.sin(t * 0.25) * 3.2, 1.6, 4.6);
    this.camera.lookAt(0, 1.1, 0);
  }

  editorCam() {
    if (window.innerWidth <= 900) {
      // En móvil el panel ocupa la mitad inferior: encuadra al shinobi arriba.
      this.camera.position.set(0.9, 1.5, 5.0);
      this.camera.lookAt(0, 0.05, 0);
    } else {
      this.camera.position.set(1.4, 1.5, 3.6);
      this.camera.lookAt(0, 1.05, 0);
    }
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
