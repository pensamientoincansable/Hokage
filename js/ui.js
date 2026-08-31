import { ELEMENTS, ELEMENT_IDS, HAIR_STYLES, EYE_STYLES, MARKINGS, OUTFITS, VILLAGES, PRESETS, LEVELS, DIFFICULTY, QUALITY, STATUS, fusionUltimate } from "./config.js";

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
  const swatches = (name, key, list) =>
    `<div class="field"><span>${name} — rápido</span><div class="swatches">${list.map(c =>
      `<button class="swatch ${app[key]===c?"on":""}" data-k="${key}" data-v="${c}" style="background:${c}"></button>`
    ).join("")}</div></div>`;
  const HAIR_SWATCHES = ["#f2d36b", "#1a1a1e", "#c81e3a", "#e8d080", "#c8d0d8", "#2a2018", "#7a5cff", "#f2a0c0", "#d8e4ea", "#1e6b3a"];
  const OUTFIT_SWATCHES = ["#2b3548", "#c81e3a", "#1c2430", "#e07020", "#3a2a58", "#1e6b3a", "#c8b090", "#111111", "#d8c8a0", "#0c1018"];
  if (tab === "identidad") {
    return `<div class="field"><span>Nombre</span><input type="text" maxlength="18" data-name value="${app.name}" /></div>
      ${sel("Género", [{id:"male",name:"Masculino"},{id:"female",name:"Femenino"},{id:"androgynous",name:"Andrógino"}], app.gender, "gender")}
      ${sel("Complexión", [{id:"slim",name:"Delgado"},{id:"athletic",name:"Atlético"},{id:"broad",name:"Corpulento"}], app.build, "build")}
      <div class="field"><span>Altura</span><input type="range" min="0.9" max="1.12" step="0.01" data-num="height" value="${app.height}" /></div>
      ${sel("Aldea", VILLAGES, app.village, "village")}`;
  }
  if (tab === "rostro") {
    return `${color("Piel", "skin")}
      ${swatches("Piel", "skin", ["#f0c7a0", "#e8b894", "#f3c49a", "#6a4a32", "#f6e0c8", "#c88a5a", "#f3c2b0", "#e0b090"])}
      ${sel("Rostro", [{id:"sharp",name:"Afilado"},{id:"oval",name:"Oval"},{id:"round",name:"Redondo"}], app.faceShape, "faceShape")}
      ${sel("Cejas", [{id:"sharp",name:"Afiladas"},{id:"soft",name:"Suaves"},{id:"thick",name:"Gruesas"},{id:"none",name:"Ninguna"}], app.eyebrow, "eyebrow")}`;
  }
  if (tab === "cabello") {
    return `${sel("Estilo", HAIR_STYLES, app.hairStyle, "hairStyle")}${color("Color", "hairColor")}${swatches("Color", "hairColor", HAIR_SWATCHES)}${color("Mechas / puntas", "hairAccent")}`;
  }
  if (tab === "ojos") {
    return `${sel("Dōjutsu / estilo", EYE_STYLES, app.eyeStyle, "eyeStyle")}${color("Iris", "eyeColor")}`;
  }
  if (tab === "marcas") {
    return `${sel("Marcas", MARKINGS, app.markings, "markings")}${color("Color de marca", "markingColor")}`;
  }
  if (tab === "ropa") {
    return `${sel("Traje", OUTFITS, app.outfit, "outfit")}
      ${color("Primario", "primaryColor")}${swatches("Primario", "primaryColor", OUTFIT_SWATCHES)}
      ${color("Secundario", "secondaryColor")}${color("Acento", "accentColor")}
      ${sel("Pantalón", [{id:"slim",name:"Ajustado"},{id:"baggy",name:"Ancho"},{id:"shorts",name:"Corto"},{id:"tactical",name:"Táctico"}], app.pants, "pants")}
      ${sel("Calzado", [{id:"sneakers",name:"Zapatillas"},{id:"sandals",name:"Sandalias"},{id:"boots",name:"Botas"}], app.shoes, "shoes")}`;
  }
  if (tab === "accesorios") {
    const tog = (k, n) => `<button class="chip ${app[k]?"on":""}" data-toggle="${k}">${n}</button>`;
    return `<div class="field"><span>Piezas</span><div class="chip-row">
      ${tog("headband","Protector")}${tog("cloak","Capa")}${tog("scarf","Bufanda")}${tog("earrings","Pendientes")}
      ${tog("gloves","Guantes")}${tog("goggles","Gafas")}${tog("scroll","Pergamino")}
    </div></div>
    ${sel("Máscara", [{id:"none",name:"No"},{id:"lower",name:"Inferior"},{id:"anbu",name:"ANBU"},{id:"cyber",name:"Cibernética"}], app.mask, "mask")}`;
  }
  if (tab === "elementos") {
    const cards = ELEMENT_IDS.map((id) => {
      const e = ELEMENTS[id];
      const on = app.elements.includes(id) ? "on" : "";
      const st = STATUS[e.status];
      return `<div class="element-card ${on}" data-el="${id}">
        <i class="dot" style="background:${e.color}"></i>
        <div><b>${e.kana} ${e.name}</b>
          <div class="meta" style="color:var(--muted);font-size:11px">${e.special.name}</div>
          <div class="meta" style="font-size:10px;color:${st.color}">Efecto: ${st.name}</div>
        </div>
      </div>`;
    }).join("");
    const ult = app.elements.length === 2 ? fusionUltimate(app.elements[0], app.elements[1]) : null;
    const ultBlock = ult
      ? `<div class="field" style="margin-top:10px"><span>Ultimátum resultante</span>
          <div class="element-card on"><i class="dot" style="background:${ult.color}"></i>
          <div><b>${ult.name}</b><div class="meta" style="font-size:10px;color:${ult.color}">Fusión de las dos naturalezas</div></div></div>
        </div>`
      : "";
    return `<p class="lead">Elige exactamente dos naturalezas: cada una aplica su efecto y juntas forjan tu ultimátum.</p>${cards}${ultBlock}`;
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
    const waves = lv.boss ? "1 jefe" : `${lv.stats.waves} enemigos`;
    return `<button class="level ${lv.boss?"boss":""} ${locked?"locked":""} ${done?"done":""}" data-level="${lv.id}" ${locked?"disabled":""}>
      ${lv.boss?`<span class="boss-tag">BOSS</span>`:""}
      <div class="n">NV. ${String(lv.id).padStart(2,"0")}</div>
      <h4>${lv.name}</h4>
      <div class="meta">${lv.title}<br>${lv.stage.name}<br>${waves}</div>
    </button>`;
  }).join("");
  return el(`<div class="screen" id="campaign">
    <div>
      <h2 class="gold-title">Archivo de misiones</h2>
      <p class="lead">Avanza derrotando a cada enemigo y recoge objetos curativos y mejoras. Cada 5 niveles espera un jefe.</p>
      <div class="actions"><button class="btn ghost" data-go="menu">Volver</button></div>
    </div>
    <div class="levels">${cards}</div>
  </div>`);
}

export function vsIntro(pName, eLevel) {
  const portrait = eLevel.portrait || "assets/img/portrait-player.jpg";
  const sub = eLevel.versus
    ? "COMBATE RÁPIDO"
    : eLevel.boss
      ? "JEFE DE MISIÓN"
      : eLevel.waveCount > 1
        ? `MISIÓN ${String(eLevel.id).padStart(2, "0")} · ${eLevel.waveCount} ENEMIGOS`
        : `MISIÓN ${String(eLevel.id).padStart(2, "0")}`;
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
      <div class="felems">${sub}</div>
    </div>
  </div>`);
}

export function hud(p1, p2, level) {
  const roundLabel = level.versus
    ? "VERSUS"
    : level.boss
      ? "BOSS"
      : level.waveCount > 1
        ? `MISIÓN ${level.id} · ${level.waveIndex + 1}/${level.waveCount}`
        : "MISIÓN " + level.id;
  return el(`<div id="hud" class="pass-through">
    <div class="hud-top">
      <div class="fighter-hud">
        <div class="name-row"><div class="fname" id="p1-name">${p1.name}</div><div class="felems" id="p1-el"></div></div>
        <div class="bar" id="p1-hp"><b></b><i></i></div>
        <div class="bar chakra" id="p1-ck"><i></i></div>
        <div class="status-row" id="p1-status"></div>
      </div>
      <div class="timer"><div class="round">${roundLabel}</div><div class="t" id="timer">99</div><div class="wave-info" id="wave-info"></div></div>
      <div class="fighter-hud p2">
        <div class="name-row"><div class="fname" id="p2-name">${p2.name}</div><div class="felems" id="p2-el"></div></div>
        <div class="bar" id="p2-hp"><b></b><i></i></div>
        <div class="bar chakra" id="p2-ck"><i></i></div>
        <div class="status-row p2" id="p2-status"></div>
      </div>
    </div>
    <div class="combo" id="combo">0 <small>HITS</small></div>
    <div class="announcer" id="announcer"></div>
    <div class="help-strip" id="help">A/D mover · W salto · S agachar · Shift bloqueo · J/K/L golpes · U/I jutsus · O ultimátum · P dash · ESC pausa</div>
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

export function resultScreen(win, level, versus = false) {
  const title = !win
    ? "DERROTA"
    : versus
      ? "VICTORIA"
      : level.boss
        ? "JEFE DERROTADO"
        : "MISIÓN CUMPLIDA";
  return el(`<div class="result ${win?"":"lose"}">
    <h2>${title}</h2>
    <p style="color:var(--muted)">${win ? level.name + " ha caído." : "El chakra se ha agotado."}</p>
    <div class="actions">
      ${win && !versus && level.id < 30 ? `<button class="btn primary" data-act="next">Siguiente misión</button>` : ""}
      <button class="btn" data-act="restart">${versus ? "Otro combate" : "Reintentar"}</button>
      <button class="btn ghost" data-go="${versus ? "menu" : "campaign"}">${versus ? "Menú" : "Misiones"}</button>
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
    <div class="touch-group move">
      <button class="touch-btn" data-act="up" style="left:56px;bottom:88px">▲</button>
      <button class="touch-btn" data-act="left" style="left:0;bottom:24px">◀</button>
      <button class="touch-btn" data-act="down" style="left:56px;bottom:-38px">▼</button>
      <button class="touch-btn" data-act="right" style="left:112px;bottom:24px">▶</button>
    </div>
    <div class="touch-group actions">
      <button class="touch-btn small" data-act="block" style="right:196px;bottom:88px">BLK</button>
      <button class="touch-btn small" data-act="dash" style="right:196px;bottom:24px">DASH</button>
      <button class="touch-btn" data-act="light" style="right:124px;bottom:88px">J</button>
      <button class="touch-btn" data-act="heavy" style="right:62px;bottom:126px">K</button>
      <button class="touch-btn" data-act="kick" style="right:0;bottom:88px">L</button>
      <button class="touch-btn small" data-act="special1" style="right:124px;bottom:16px">U</button>
      <button class="touch-btn small" data-act="special2" style="right:62px;bottom:16px">I</button>
      <button class="touch-btn small ult" data-act="ultimate" style="right:0;bottom:16px">O</button>
    </div>
  </div>`);
}
