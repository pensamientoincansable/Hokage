import { Game } from "./game.js";

const game = new Game();
game.start().catch((err) => {
  console.error(err);
  const ui = document.getElementById("ui-root");
  if (ui) {
    ui.innerHTML = `<div class="screen overlay"><div class="panel sheet">
      <h2 class="gold-title">Error al iniciar</h2>
      <p class="lead">${String(err)}</p>
    </div></div>`;
  }
});

window.__hokage = game;
