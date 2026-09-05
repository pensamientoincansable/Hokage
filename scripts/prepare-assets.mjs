import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const server = await createServer({
  server: { host: "0.0.0.0", port: 0, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: "error",
});
let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") console.error(msg.text()); });
  await page.goto(`http://127.0.0.1:${port}/scripts/asset-workbench.html`);
  const result = await page.evaluate(async () => {
    const { prepareAssets } = await import("/scripts/asset-tools.js");
    return prepareAssets();
  });
  await mkdir("assets/models", { recursive: true });
  const manifest = { sources: {}, outputs: {}, cityParts: result.parts };
  for (const path of ["Naruto/model.dae", "Naruto/Texture_0_CMP.png", "Naruto/Texture_1_CMP.png", "Naruto/Texture_2_CMP.png", "Naruto/Texture_3_CMP.png", "assets/futuristic low poly city by niko.fbx", "assets/img/logo.png"]) {
    manifest.sources[path] = createHash("sha256").update(await readFile(path)).digest("hex");
  }
  for (const [key, filename] of [["naruto", "naruto.glb"], ["city", "niko-city-kit.glb"], ["portrait", "../img/naruto-portrait.png"], ["logo", "../img/logo-ui.webp"]]) {
    const data = Buffer.from(result[key], "base64");
    await writeFile(`assets/models/${filename}`, data);
    manifest.outputs[filename] = { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
    console.log(`${filename}: ${(data.length / 1024).toFixed(1)} KB`);
  }
  await writeFile("assets/models/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
} finally {
  await browser?.close();
  await server.close();
}
