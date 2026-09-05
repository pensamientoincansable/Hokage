import * as THREE from "three";
import { QUALITY } from "./config.js";

export function fightFraming(width, height, separation, touch = false, jumpHeight = 0) {
  const aspect = width / Math.max(height, 1);
  const tan = Math.tan(THREE.MathUtils.degToRad(42 / 2));
  const portrait = aspect < 1;
  const top = Math.min(height * 0.2, portrait ? 115 : 95);
  const bottom = touch ? (portrait ? Math.min(220, height * 0.3) : Math.min(110, height * 0.24)) : 40;
  const usable = Math.max(height * 0.4, height - top - bottom);
  const distance = Math.max(7.2, (Math.abs(separation) + 3.6) / (2 * tan * aspect), Math.max(4.6, jumpHeight + 3.2) / (2 * tan * usable / height));
  const center = (top + usable / 2) / height;
  return { distance, targetY: 1.6 + jumpHeight * 0.45 - (0.5 - center) * 2 * distance * tan };
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = "media";
    this.touch = false;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.info.autoReset = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.7, 7.4);
    this.camera.lookAt(0, 1.15, 0);
    this.composer = null;
    this.bloomGeneration = 0;
    this.shake = 0;
    this.camTarget = new THREE.Vector3();
    this.pixelRatio = 1;
    this.frameTime = 0;
    this.frameCount = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.visualViewport?.addEventListener("resize", () => this.resize());
  }

  disposeBloom() {
    this.composer?.passes.forEach((pass) => pass.dispose?.());
    this.composer?.dispose();
    this.composer = null;
  }

  async enableBloom() {
    if (this.quality !== "alta" || this.composer) return;
    const generation = ++this.bloomGeneration;
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import("three/addons/postprocessing/EffectComposer.js"),
        import("three/addons/postprocessing/RenderPass.js"),
        import("three/addons/postprocessing/UnrealBloomPass.js"),
        import("three/addons/postprocessing/OutputPass.js"),
      ]);
      if (generation !== this.bloomGeneration || this.quality !== "alta") return;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 0.22, 0.45, 1.1));
      this.composer.addPass(new OutputPass());
      this.resize();
    } catch (error) {
      // Bloom is optional; gameplay remains available if this optional chunk fails.
      console.warn("Bloom no disponible; se mantiene el renderizado directo.", error);
      this.disposeBloom();
    }
  }

  async setQuality(quality) {
    this.quality = Object.hasOwn(QUALITY, quality) ? quality : "media";
    const cfg = QUALITY[this.quality];
    this.renderer.shadowMap.enabled = cfg.shadows;
    this.maxPixelRatio = Math.min(window.devicePixelRatio || 1, cfg.pixelRatio);
    this.setPixelRatio(this.maxPixelRatio);
    if (!cfg.bloom) { ++this.bloomGeneration; this.disposeBloom(); }
    else await this.enableBloom();
  }

  setPixelRatio(ratio) {
    this.pixelRatio = ratio;
    this.renderer.setPixelRatio(ratio);
    this.composer?.setPixelRatio(ratio);
    this.resize();
  }

  trackFrame(dt) {
    if (dt > 0.5) return;
    this.frameTime += dt;
    this.frameCount++;
    if (this.frameTime < 3) return;
    const average = this.frameTime / this.frameCount;
    if (average > 0.026 && this.pixelRatio > 0.76) this.setPixelRatio(Math.max(0.75, this.pixelRatio - 0.15));
    else if (average < 0.017 && this.pixelRatio < this.maxPixelRatio) this.setPixelRatio(Math.min(this.maxPixelRatio, this.pixelRatio + 0.05));
    this.frameTime = 0;
    this.frameCount = 0;
  }

  resize() {
    this.width = this.canvas.clientWidth || innerWidth;
    this.height = this.canvas.clientHeight || innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    this.composer?.setSize(this.width, this.height);
  }

  follow(x1, x2, dt, y1 = 0, y2 = 0) {
    const mid = (x1 + x2) / 2;
    const { distance, targetY } = fightFraming(this.width, this.height, x1 - x2, this.touch, Math.max(y1, y2));
    this.camTarget.set(mid, targetY + 1.7, distance);
    this.camera.position.lerp(this.camTarget, 1 - Math.exp(-8 * dt));
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.3;
      this.shake = Math.max(0, this.shake - dt * 8);
    }
    this.camera.lookAt(mid, targetY, 0);
  }

  showcaseCam(t) {
    const narrow = this.width < 700;
    const x = narrow ? -0.8 : -1.7;
    this.camera.position.set(x + Math.sin(t * 0.15) * 0.25, 1.9, narrow ? 7.5 : 5.7);
    this.camera.lookAt(x, 1.15, 0);
  }

  editorCam() {
    if (this.width <= 900) {
      this.camera.position.set(0, -0.5, 9);
      this.camera.lookAt(0, -0.95, 0);
    } else {
      const x = -420 / this.width * (4.8 * Math.tan(THREE.MathUtils.degToRad(21)) * this.camera.aspect);
      this.camera.position.set(x, 1.6, 4.8);
      this.camera.lookAt(x, 1.1, 0);
    }
  }

  render() {
    this.renderer.info.reset();
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
