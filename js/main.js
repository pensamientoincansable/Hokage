import { Game } from "./game.js";

async function start() {
  try {
    const game = new Game();
    window.__hokage = game;
    await game.start();
  } catch (error) {
    console.error(error);
    const ui = document.getElementById("ui-root");
    ui.innerHTML = `<div class="screen overlay"><div class="panel sheet">
      <h2 class="gold-title">No se pudo iniciar</h2>
      <p class="lead" id="boot-error"></p>
      <button class="btn primary" id="retry-boot">Volver a intentar</button>
    </div></div>`;
    document.getElementById("boot-error").textContent = error.message || String(error);
    document.getElementById("retry-boot").addEventListener("click", () => location.reload());
  }
}
start();
