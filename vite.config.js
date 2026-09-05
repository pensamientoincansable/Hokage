import { defineConfig } from "vite";
import { cp, mkdir } from "node:fs/promises";

export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    allowedHosts: [".e2b.app"],
    watch: { ignored: ["**/.cache/**", "**/playwright-report/**", "**/test-results/**"] },
  },
  preview: { host: "0.0.0.0", allowedHosts: [".e2b.app"] },
  plugins: [{
    name: "copy-ui-art",
    async closeBundle() {
      // UI templates refer to these files by URL. Source FBX/Blend files are
      // intentionally NOT shipped; the runtime imports the prepared GLBs.
      await cp("assets/img", "dist/assets/img", { recursive: true });
      await cp("THIRD_PARTY_NOTICES.md", "dist/THIRD_PARTY_NOTICES.md");
      await cp("LICENSE", "dist/LICENSE.txt");
      await mkdir("dist/licenses", { recursive: true });
      await cp("node_modules/three/LICENSE", "dist/licenses/three-MIT.txt", { recursive: true });
      for (const font of ["cinzel", "orbitron", "teko", "noto-sans-jp"]) {
        await cp(`node_modules/@fontsource/${font}/LICENSE`, `dist/licenses/${font}-OFL.txt`, { recursive: true });
      }
    },
  }],
  build: {
    rolldownOptions: {
      output: { manualChunks: (id) => id.includes("/three/build/") ? "three" : undefined },
    },
    chunkSizeWarningLimit: 650,
  },
});
