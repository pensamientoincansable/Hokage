import { ELEMENTS, ELEMENT_IDS, HAIR_STYLES, EYE_STYLES, MARKINGS, OUTFITS, VILLAGES, PRESETS, LEVELS, DIFFICULTY, QUALITY } from "./config.js";

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function mount(root, node) {
  root.innerHTML = "";
  if (node) root.appendChild(node);
}

export function toast(msg) {
  const box = document.getElementById("toasts");
  if (!box) return;
  const n = document.createElement("div");
  n.className = "toast";
  n.textContent = msg;
  box.appendChild(n);
  setTimeout(() => n.remove(), 2400);
}

export function bootScreen() {
  return el(`<div class="screen" id="boot">
    <img class="boot-logo" src="assets/img/logo.png" alt="Hokage" />
    <div class="gold-title boot-title">HOKAGE</div>
    <div class="boot-msg">CARGANDO CHAKRA</div>
    <div class="boot-bar"><i id="boot-fill"></i></div>
  </div>`);
}

export function menuScreen(save) {
  return el(`<div class="screen" id="menu">
    <div class="menu-top">
      <img src="assets/img/logo.png" alt="" />
      <div>
        <div class="menu-kicker">Shinobi Fatal Clash</div>
        <div class="gold-title menu-title">HOKAGE</div>
        <div class="menu-sub">Ciudad neón · Dos elementos · Un nombre</div>
      </div>
    </div>
    <nav class="menu-nav">
      <button class="btn primary" data-go="campaign">Campaña — 30 misiones</button>
      <button class="btn" data-go="versus">Combate rápido</button>
      <button class="btn" data-go="editor">Personalizar shinobi</button>
      <button class="btn" data-go="settings">Ajustes</button>
      <button class="btn ghost" data-go="credits">Créditos</button>
    </nav>
    <div class="menu-footer">
      <span>Progreso: ${save.completed.length}/30 · Desbloqueado ${save.unlocked}</span>
      <span>J / K / L golpes · U / I / O jutsus</span>
    </div>
  </div>`);
}

export function settingsScreen(settings, binds, input) {
  const diffs = Object.entries(DIFFICULTY).map(([k, v]) => `<option value="${k}" ${settings.difficulty===k?"selected":""}>${v.label}</option>`).join("");
  const quals = Object.keys(QUALITY).map((k) => `<option value="${k}" ${settings.quality===k?"selected":""}>${k}</option>`).join("");
  const keys = Object.keys(binds).map((a) => `<div class="keybind"><span>${a}</span><kbd data-bind="${a}">${input.label(a)}</kbd></div>`).join("");
  return el(`<div class="screen overlay" id="settings">
    <div class="panel sheet">
      <h2 class="gold-title">Ajustes</h2>
      <p class="lead">Calibra el dojo digital. Los cambios se guardan en este navegador.</p>
      <div class="row"><label>Música<span class="hint">Tema procedural</span></label><input type="range" min="0" max="1" step="0.01" data-set="music" value="${settings.music}" /></div>
      <div class="row"><label>Efectos<span class="hint">Golpes y jutsus</span></label><input type="range" min="0" max="1" step="0.01" data-set="sfx" value="${settings.sfx}" /></div>
      <div class="row"><label>Dificultad</label><select data-set="difficulty">${diffs}</select></div>
      <div class="row"><label>Calidad</label><select data-set="quality">${quals}</select></div>
      <div class="row"><label>Pistas de control</label><input type="checkbox" data-set="showHints" ${settings.showHints?"checked":""} /></div>
      <div class="row"><label>Hitboxes (debug)</label><input type="checkbox" data-set="hitboxes" ${settings.hitboxes?"checked":""} /></div>
      <h3 class="gold-title" style="margin-top:18px;font-size:16px">Controles</h3>
      <p class="lead">Haz clic en una tecla y pulsa otra para reasignar.</p>
      ${keys}
      <div class="actions">
        <button class="btn primary" data-go="menu">Volver</button>
        <button class="btn ghost" data-act="resetBinds">Restablecer teclas</button>
      </div>
    </div>
  </div>`);
}

export function editorScreen(app) {
  const tabs = ["identidad","rostro","cabello","ojos","marcas","ropa","accesorios","elementos","inspiraciones"];
  const tabBtns = tabs.map((t,i)=>`<button class="tab ${i===0?"on":""}" data-tab="${t}">${t}</button>`).join("");
  return el(`<div class="screen" id="editor">
    <div class="editor-grid">
      <div class="panel editor-side">
        <h2 class="gold-title">Laboratorio Shinobi</h2>
        <p class="lead">Edita cada detalle. El modelo 3D se actualiza en vivo.</p>
        <div class="tabs">${tabBtns}</div>
        <div id="editor-fields"></div>
        <div class="actions">
          <button class="btn primary" data-act="saveChar">Guardar y salir</button>
          <button class="btn" data-act="randomChar">Aleatorio</button>
          <button class="btn ghost" data-go="menu">Cancelar</button>
        </div>
      </div>
    </div>
    <div class="editor-hint">ARRASTRA · VISTA 3D · DOS ELEMENTOS OBLIGATORIOS</div>
  </div>`);
}

export function editorFields(tab, app) {
  const sel = (name, options, val, key) =>
    `<div class="field"><span>${name}</span><div class="chip-row">${options.map(o => {
      const id = o.id || o;
      const label = o.name || o;
      return `<button class="chip ${app[key]===id?"on":""}" data-k="${key}" data-v="${id}">${label}</button>`;
    }).join("")}</div></div>`;
  const color = (name, key) => `<div class="field"><span>${name}</span><input type="color" data-color="${key}" value="${toHex(app[key])}" /></div>`;
  if (tab === "identidad") {
    return `<div class="field"><span>Nombre</span><input type="text" maxlength="18" data-name value="${app.name}" /></div>
      ${sel("Género", [{id:"male",name:"Masculino"},{id:"female",name:"Femenino"},{id:"androgynous",name:"Andrógino"}], app.gender, "gender")}
      <div class="field"><span>Altura</span><input type="range" min="0.9" max="1.12" step="0.01" data-num="height" value="${app.height}" /></div>
      ${sel("Aldea", VILLAGES, app.village, "village")}`;
  }
  if (tab === "rostro") {
    return `${color("Piel", "skin")}
      ${sel("Rostro", [{id:"sharp",name:"Afilado"},{id:"oval",name:"Oval"},{id:"round",name:"Redondo"}], app.faceShape, "faceShape")}
      ${sel("Cejas", [{id:"sharp",name:"Afiladas"},{id:"soft",name:"Suaves"},{id:"thick",name:"Gruesas"},{id:"none",name:"Ninguna"}], app.eyebrow, "eyebrow")}`;
  }
  if (tab === "cabello") {
    return `${sel("Estilo", HAIR_STYLES, app.hairStyle, "hairStyle")}${color("Color", "hairColor")}${color("Mechas", "hairAccent")}`;
  }
  if (tab === "ojos") {
    return `${sel("Dōjutsu / estilo", EYE_STYLES, app.eyeStyle, "eyeStyle")}${color("Iris", "eyeColor")}`;
  }
  if (tab === "marcas") {
    return `${sel("Marcas", MARKINGS, app.markings, "markings")}${color("Color de marca", "markingColor")}`;
  }
  if (tab === "ropa") {
    return `${sel("Traje", OUTFITS, app.outfit, "outfit")}
      ${color("Primario", "primaryColor")}${color("Secundario", "secondaryColor")}${color("Acento", "accentColor")}
      ${sel("Pantalón", [{id:"slim",name:"Ajustado"},{id:"baggy",name:"Ancho"},{id:"shorts",name:"Corto"},{id:"tactical",name:"Táctico"}], app.pants, "pants")}
      ${sel("Calzado", [{id:"sneakers",name:"Zapatillas"},{id:"sandals",name:"Sandalias"},{id:"boots",name:"Botas"}], app.shoes, "shoes")}`;
  }
  if (tab === "accesorios") {
    const tog = (k, n) => `<button class="chip ${app[k]?"on":""}" data-toggle="${k}">${n}</button>`;
    return `<div class="field"><span>Piezas</span><div class="chip-row">
      ${tog("headband","Protector")}${tog("cloak","Capa")}${tog("earrings","Pendientes")}
      ${tog("gloves","Guantes")}${tog("goggles","Gafas")}${tog("scroll","Pergamino")}
    </div></div>
    ${sel("Máscara", [{id:"none",name:"No"},{id:"lower",name:"Inferior"},{id:"anbu",name:"ANBU"},{id:"cyber",name:"Cibernética"}], app.mask, "mask")}`;
  }
  if (tab === "elementos") {
    const cards = ELEMENT_IDS.map((id) => {
      const e = ELEMENTS[id];
      const on = app.elements.includes(id) ? "on" : "";
      return `<div class="element-card ${on}" data-el="${id}">
        <i class="dot" style="background:${e.color}"></i>
        <div><b>${e.kana} ${e.name}</b><div class="meta" style="color:var(--muted);font-size:11px">${e.special.name}</div></div>
      </div>`;
    }).join("");
    return `<p class="lead">Elige exactamente dos naturalezas. El ultimátum fusiona ambas.</p>${cards}`;
  }
  if (tab === "inspiraciones") {
    return `<div class="preset-grid">${PRESETS.map(p => `<button class="preset" data-preset="${p.id}"><b>${p.name}</b><span>${p.desc}</span></button>`).join("")}</div>`;
  }
  return "";
}

function toHex(c) {
  if (!c) return "#ffffff";
  if (c.startsWith("#") && c.length === 7) return c;
  return "#f0c7a0";
}

export function campaignScreen(save) {
  const cards = LEVELS.map((lv) => {
    const locked = lv.id > save.unlocked;
    const done = save.completed.includes(lv.id);
    return `<button class="level ${lv.boss?"boss":""} ${locked?"locked":""} ${done?"done":""}" data-level="${lv.id}" ${locked?"disabled":""}>
      ${lv.boss?`<span class="boss-tag">BOSS</span>`:""}
      <div class="n">NV. ${String(lv.id).padStart(2,"0")}</div>
      <h4>${lv.name}</h4>
      <div class="meta">${lv.title}<br>${lv.stage.name}</div>
    </button>`;
  }).join("");
  return el(`<div class="screen" id="campaign">
    <div>
      <h2 class="gold-title">Archivo de misiones</h2>
      <p class="lead">Cada 5 niveles espera un jefe. Completa 30 para reclamar el sombrero.</p>
      <div class="actions"><button class="btn ghost" data-go="menu">Volver</button></div>
    </div>
    <div class="levels">${cards}</div>
  </div>`);
}

export function vsIntro(pName, eLevel) {
  const portrait = eLevel.portrait || "assets/img/portrait-player.jpg";
  return el(`<div class="vs-intro">
    <div class="vs-card">
      <img src="assets/img/portrait-player.jpg" alt="" />
      <h3>${pName}</h3>
      <div class="felems">${(eLevel.playerElems||[]).join(" / ")}</div>
    </div>
    <div class="vs-mark">VS</div>
    <div class="vs-card">
      <img src="${portrait}" alt="" onerror="this.src='assets/img/portrait-player.jpg'" />
      <h3>${eLevel.name}</h3>
      <div class="felems">${eLevel.title}</div>
    </div>
  </div>`);
}

export function hud(p1, p2, level) {
  return el(`<div id="hud" class="pass-through">
    <div class="hud-top">
      <div class="fighter-hud">
        <div class="name-row"><div class="fname" id="p1-name">${p1.name}</div><div class="felems" id="p1-el"></div></div>
        <div class="bar" id="p1-hp"><b></b><i></i></div>
        <div class="bar chakra" id="p1-ck"><i></i></div>
      </div>
      <div class="timer"><div class="round">${level.boss ? "BOSS" : "MISIÓN " + level.id}</div><div class="t" id="timer">99</div></div>
      <div class="fighter-hud p2">
        <div class="name-row"><div class="fname" id="p2-name">${p2.name}</div><div class="felems" id="p2-el"></div></div>
        <div class="bar" id="p2-hp"><b></b><i></i></div>
        <div class="bar chakra" id="p2-ck"><i></i></div>
      </div>
    </div>
    <div class="combo" id="combo">0 <small>HITS</small></div>
    <div class="announcer" id="announcer"></div>
    <div class="help-strip" id="help">A/D mover · W salto · S agachar · Shift bloqueo · J/K/L golpes · U/I jutsus · O ultimátum · ESC pausa</div>
    <div id="pause-slot"></div>
    <div id="result-slot"></div>
  </div>`);
}

export function pauseMenu() {
  return el(`<div class="panel pause-menu">
    <h2 class="gold-title">Pausa</h2>
    <button class="btn primary" data-act="resume">Reanudar</button>
    <button class="btn" data-act="restart">Reiniciar misión</button>
    <button class="btn ghost" data-go="menu">Abandonar</button>
  </div>`);
}

export function resultScreen(win, level) {
  return el(`<div class="result ${win?"":"lose"}">
    <h2>${win ? (level.boss ? "JEFE DERROTADO" : "MISIÓN CUMPLIDA") : "DERROTA"}</h2>
    <p style="color:var(--muted)">${win ? level.name + " ha caído." : "El chakra se ha agotado."}</p>
    <div class="actions">
      ${win && level.id < 30 ? `<button class="btn primary" data-act="next">Siguiente</button>` : ""}
      <button class="btn" data-act="restart">Repetir</button>
      <button class="btn ghost" data-go="campaign">Misiones</button>
    </div>
  </div>`);
}

export function creditsScreen() {
  return el(`<div class="screen overlay"><div class="panel credits">
    <img src="assets/img/logo.png" width="90" alt="" />
    <h2 class="gold-title">HOKAGE</h2>
    <h3>Diseño</h3>
    <p>Pelea 2.5D al estilo Fatal Fury · shinobi urbanos inspirados en la era Boruto.</p>
    <h3>Sistemas</h3>
    <p>Dos naturalezas de chakra · editor avanzado · 30 misiones · jefe cada 5 niveles.</p>
    <h3>Motor</h3>
    <p>Three.js · Web Audio · personalización procedural 3D.</p>
    <div class="actions" style="justify-content:center"><button class="btn primary" data-go="menu">Volver</button></div>
  </div></div>`);
}

export function touchLayer() {
  return el(`<div id="touch">
    <button class="touch-btn" data-act="left" style="left:24px;bottom:90px">◀</button>
    <button class="touch-btn" data-act="right" style="left:100px;bottom:90px">▶</button>
    <button class="touch-btn" data-act="up" style="left:62px;bottom:160px">▲</button>
    <button class="touch-btn" data-act="down" style="left:62px;bottom:24px">▼</button>
    <button class="touch-btn" data-act="block" style="right:210px;bottom:24px">BLK</button>
    <button class="touch-btn" data-act="light" style="right:140px;bottom:90px">J</button>
    <button class="touch-btn" data-act="heavy" style="right:70px;bottom:130px">K</button>
    <button class="touch-btn" data-act="kick" style="right:24px;bottom:90px">L</button>
    <button class="touch-btn" data-act="special1" style="right:140px;bottom:24px">U</button>
    <button class="touch-btn" data-act="special2" style="right:70px;bottom:24px">I</button>
    <button class="touch-btn" data-act="ultimate" style="right:24px;bottom:24px">O</button>
  </div>`);
}
