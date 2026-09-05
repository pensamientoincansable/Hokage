// Fallback de arranque (NO es un módulo ES: se ejecuta incluso cuando los
// import de la app fallan, p. ej. al abrir index.html desde file://).
// Si el juego no llega a arrancar, muestra instrucciones en vez de una
// pantalla negra con la viñeta.
(function () {
  "use strict";

  var STYLES = [
    "position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;",
    "background:radial-gradient(circle at 50% 30%, #1a1020, #07080d 70%);",
    "padding:24px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#f4ead8;",
  ].join("");

  var CARD = [
    "width:min(680px,94vw);max-height:92vh;overflow:auto;box-sizing:border-box;",
    "background:rgba(8,10,18,0.92);border:1px solid rgba(232,195,106,0.4);",
    "border-radius:6px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.6);",
  ].join("");

  var H2 = "margin:0 0 8px;font-size:26px;letter-spacing:0.18em;text-transform:uppercase;color:#e8c36a;";
  var P = "margin:10px 0;color:#c9d2df;line-height:1.6;font-size:14px;";
  var CODE = "display:block;margin:6px 0;padding:10px 12px;background:#0d1118;border:1px solid rgba(232,195,106,0.25);color:#8fe3ff;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;";
  var OL = "margin:10px 0 10px 22px;color:#c9d2df;line-height:1.7;font-size:14px;";
  var BTN = "margin-top:14px;padding:12px 20px;border:1px solid #ff6b84;background:linear-gradient(180deg,#c81e3a,#6b1020);color:#fff;font:600 13px system-ui,sans-serif;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;";

  function show(title, body, fileMode) {
    if (document.getElementById("boot-fallback")) return;
    var root = document.createElement("div");
    root.id = "boot-fallback";
    root.setAttribute("role", "alertdialog");
    root.setAttribute("aria-label", title);
    root.style.cssText = STYLES;

    var card = document.createElement("div");
    card.style.cssText = CARD;

    var h = document.createElement("h2");
    h.textContent = title;
    h.style.cssText = H2;
    card.appendChild(h);

    var lead = document.createElement("p");
    lead.style.cssText = P;
    if (fileMode) {
      lead.textContent = "Has abierto index.html como archivo local (file://). El juego usa m\u00f3dulos ES, Three.js y WebGL, y por seguridad los navegadores bloquean esos recursos desde el disco. Hay que servirlo con un peque\u00f1o servidor web.";
    } else {
      lead.textContent = "Detalle del error (tambi\u00e9n puedes abrir la consola del navegador con F12):";
    }
    card.appendChild(lead);

    if (fileMode) {
      var ol = document.createElement("ol");
      ol.style.cssText = OL;

      var steps = [
        ['Instala las dependencias (una sola vez):', "npm install"],
        ['Arranca el servidor de desarrollo:', "npm run dev"],
        ['Abre la direcci\u00f3n que muestra Vite, normalmente:', "http://localhost:5173/"],
      ];
      steps.forEach(function (step) {
        var li = document.createElement("li");
        var t = document.createTextNode(step[0] + " ");
        var code = document.createElement("code");
        code.textContent = step[1];
        code.style.cssText = CODE;
        li.appendChild(t);
        li.appendChild(code);
        card.appendChild(li);
      });

      var alt = document.createElement("p");
      alt.style.cssText = P;
      alt.innerHTML = "Tambi\u00e9n puedes compilar y servir la carpeta <b>dist/</b>: <code style='color:#8fe3ff'>npm run build</code> y despu\u00e9s <code style='color:#8fe3ff'>npm run preview</code>.";
      card.appendChild(alt);
    } else {
      var code = document.createElement("code");
      code.textContent = body;
      code.style.cssText = CODE;
      card.appendChild(code);
    }

    var retry = document.createElement("button");
    retry.textContent = "Volver a intentar";
    retry.style.cssText = BTN;
    retry.addEventListener("click", function () { location.reload(); });
    card.appendChild(retry);

    root.appendChild(card);
    (document.body || document.documentElement).appendChild(root);
  }

  // 1) Acceso directo al archivo: es el fallo m\u00e1s habitual (pantalla negra + vi\u00f1eta).
  if (location.protocol === "file:") {
    show(
      "HOKAGE necesita un servidor web",
      "",
      true
    );
    return;
  }

  // 2) Vigilante: la app debe exponer window.__hokage al iniciar. Si no llega
  //    a hacerlo (import roto, recurso bloqueado, etc.), damos un diagn\u00f3stico.
  var lastError = "";
  window.addEventListener("error", function (event) {
    lastError = event.message || String(event.error || "");
  });
  window.addEventListener("unhandledrejection", function (event) {
    lastError = (event.reason && (event.reason.message || String(event.reason))) || "Promesa rechazada sin mensaje";
  });

  setTimeout(function () {
    if (window.__hokage || document.getElementById("boot-fallback")) return;
    show(
      "No se pudo iniciar el juego",
      lastError || "La aplicaci\u00f3n no expuso su estado. Abre la consola del navegador (F12) para ver el error exacto.",
      false
    );
  }, 12000);
})();
