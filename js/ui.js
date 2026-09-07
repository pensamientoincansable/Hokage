import { ELEMENTS, ELEMENT_IDS, HAIR_STYLES, EYE_STYLES, MARKINGS, OUTFITS, VILLAGES, PRESETS, LEVELS, DIFFICULTY, QUALITY, STATUS, fusionUltimate } from "./config.js";
import { ACTION_LABELS } from "./input.js";

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

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
    <img class="boot-logo" src="assets/img/logo-ui.webp" alt="Hokage" />
    <div class="gold-title boot-title">HOKAGE</div>
    <div class="boot-msg">CARGANDO CHAKRA</div>
    <div class="boot-bar"><i id="boot-fill"></i></div>
  </div>`);
}

export function menuScreen(save, input) {
  return el(`<div class="screen" id="menu">
    <div class="menu-top">
      <img src="assets/img/logo-ui.webp" alt="" />
      <div>
        <div class="menu-kicker">Shinobi Fatal Clash</div>
        <div class="gold-title menu-title">HOKAGE</div>
        <div class="menu-sub">NARUTO × NEO CITY · TAIJUTSU</div>
      </div>
    </div>
    <nav class="menu-nav">
      <button class="btn primary" data-go="campaign">Campaña — 30 misiones</button>
      <button class="btn" data-go="versus">Combate rápido</button>
      <button class="btn" data-go="editor">Personaje y chakra</button>
      <button class="btn" data-go="settings">Ajustes</button>
      <button class="btn ghost" data-go="credits">Créditos</button>
    </nav>
    <div class="menu-footer">
      <span>Progreso: ${save.completed.length}/30 · Desbloqueado ${save.unlocked}</span>
      <span>${escapeHTML(input.label("light"))} / ${escapeHTML(input.label("heavy"))} / ${escapeHTML(input.label("kick"))} taijutsu · PC + táctil</span>
    </div>
  </div>`);
}

export function settingsScreen(settings, binds, input) {
  const diffs = Object.entries(DIFFICULTY).map(([key, value]) => `<option value="${key}" ${settings.difficulty === key ? "selected" : ""}>${value.label}</option>`).join("");
  const qualities = Object.keys(QUALITY).map((key) => `<option value="${key}" ${settings.quality === key ? "selected" : ""}>${key}</option>`).join("");
  const touch = [["auto", "Automático"], ["on", "Siempre visibles"], ["off", "Solo teclado"]].map(([key, label]) => `<option value="${key}" ${settings.touchControls === key ? "selected" : ""}>${label}</option>`).join("");
  const keys = Object.keys(binds).map((action) => `<div class="keybind"><span>${ACTION_LABELS[action]}</span><button class="keybind-key" data-bind="${action}" aria-label="Reasignar ${ACTION_LABELS[action]}">${escapeHTML(input.label(action))}</button></div>`).join("");
  return el(`<div class="screen overlay" id="settings">
    <div class="panel sheet">
      <h2 class="gold-title">Ajustes</h2>
      <p class="lead">Tu dojo, a tu medida. Los cambios se guardan en este navegador.</p>
      <div class="row"><label for="music-setting">Música</label><input id="music-setting" type="range" min="0" max="1" step="0.01" data-set="music" value="${settings.music}" /></div>
      <div class="row"><label for="sfx-setting">Efectos</label><input id="sfx-setting" type="range" min="0" max="1" step="0.01" data-set="sfx" value="${settings.sfx}" /></div>
      <div class="row"><label for="difficulty-setting">Dificultad</label><select id="difficulty-setting" data-set="difficulty">${diffs}</select></div>
      <div class="row"><label for="quality-setting">Calidad<span class="hint">Resolución adaptativa · baja recomendada en móvil</span></label><select id="quality-setting" data-set="quality">${qualities}</select></div>
      <div class="row"><label for="hints-setting">Pistas de control</label><input id="hints-setting" type="checkbox" data-set="showHints" ${settings.showHints ? "checked" : ""} /></div>
      <div class="row"><label for="touch-setting">Controles táctiles<span class="hint">Multitáctil, también en tablet y portátil táctil</span></label><select id="touch-setting" data-set="touchControls">${touch}</select></div>
      <div class="row"><label for="scale-setting">Tamaño de botones</label><input id="scale-setting" type="range" min="0.85" max="1.15" step="0.05" data-set="touchScale" value="${settings.touchScale}" /></div>
      <h3 class="gold-title section-title">Teclado</h3>
      <p class="lead">WASD o flechas · Espacio también salta. Pulsa una tecla para reasignarla; Esc cancela. Las teclas ocupadas se intercambian.</p>
      <div class="keybind-grid">${keys}</div>
      <div class="actions">
        <button class="btn primary" data-go="menu">Volver</button>
        <button class="btn ghost" data-act="resetBinds">Restablecer teclas</button>
        <button class="btn ghost" data-act="fullscreen">Pantalla completa</button>
      </div>
    </div>
  </div>`);
}

export function editorScreen(app) {
  const isCustomizable = ["custom", "futuristic", "robot"].includes(app.model);
  const tabs = isCustomizable ? ["identidad","rostro","cabello","ojos","marcas","ropa","accesorios","elementos","inspiraciones"] : ["identidad", "elementos"];
  const tabBtns = tabs.map((t,i)=>`<button class="tab ${i===0?"on":""}" data-tab="${t}">${t}</button>`).join("");
  const lead = app.model === "futuristic" ? "Ninja futurista — estilo Virtua Fighter, neón y filo cibernético." : app.model === "robot" ? "Ninja robot — chasis de combate, ojos rojos." : app.model === "custom" ? "Crea tu shinobi y prueba sus técnicas." : "Elige tu alias y tus dos naturalezas de chakra.";
  return el(`<div class="screen" id="editor">
    <div class="editor-grid">
      <div class="panel editor-side">
        <h2 class="gold-title">Dojo Shinobi — VF</h2>
        <p class="lead">${lead}</p>
        <div class="animation-preview"><span>PRUEBA EL TAIJUTSU VF</span><div class="chip-row">
          <button class="chip" data-preview="light">Jab</button><button class="chip" data-preview="heavy">Directo</button>
          <button class="chip" data-preview="kick">Circular</button><button class="chip" data-preview="crouchLight">Barrido</button>
          <button class="chip" data-preview="airKick">Aérea</button>
          <button class="chip" data-preview="evade">Esquive</button><button class="chip" data-preview="grab">Agarre</button>
        </div></div>
        <div class="tabs">${tabBtns}</div>
        <div id="editor-fields"></div>
        <div class="actions">
          <button class="btn primary" data-act="saveChar">Guardar y salir</button>
          <button class="btn" data-act="randomChar">${isCustomizable ? "Aleatorio" : "Chakra aleatorio"}</button>
          <button class="btn ghost" data-go="menu">Cancelar</button>
        </div>
      </div>
    </div>
    <div class="editor-hint">ARRASTRA · VISTA 3D · DOS ELEMENTOS OBLIGATORIOS · G: AGARRE / H: ESQUIVE</div>
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
    const model = sel("Personaje", [{ id: "futuristic", name: "Ninja Futurista — VF" }, { id: "robot", name: "Ninja Robot — serie R" }, { id: "custom", name: "Shinobi personalizado" }, { id: "naruto", name: "Naruto (legacy)" }], app.model, "model");
    const identity = `${model}<div class="field"><label for="fighter-name">Nombre de combate</label><input id="fighter-name" type="text" maxlength="18" data-name value="${escapeHTML(app.name)}" /></div>
      <div class="field"><label for="fighter-height">Altura</label><input id="fighter-height" type="range" min="0.9" max="1.12" step="0.01" data-num="height" value="${app.height}" /></div>`;
    const note = app.model === "futuristic"
      ? `<p class="asset-note">Modelo Ninja Futurista (media/ninja futurista.png). Animación VF con anticipación y follow-through, holograma de pecho con textura original.</p>`
      : app.model === "robot"
      ? `<p class="asset-note">Modelo Ninja Robot (media/ninja robot.png). Enemigos robotizados con textura original y variaciones sintéticas.</p>`
      : app.model !== "custom" ? `<p class="asset-note">Legacy Naruto — se redirige automáticamente al Ninja Futurista para cumplir compatibilidad. Usa "Personalizado" para editor completo.</p>` : "";
    if (!["custom", "futuristic", "robot"].includes(app.model)) return `${identity}${note}`;
    return `${identity}${note}
      ${sel("Género", [{id:"male",name:"Masculino"},{id:"female",name:"Femenino"},{id:"androgynous",name:"Andrógino"}], app.gender, "gender")}
      ${sel("Complexión", [{id:"slim",name:"Delgado"},{id:"athletic",name:"Atlético"},{id:"broad",name:"Corpulento"}], app.build, "build")}
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
  const portrait = eLevel.portrait || "assets/img/ninja-robot.png";
  const playerPortrait = eLevel.playerPortrait || (eLevel.playerModel === "robot" ? "assets/img/ninja-robot.png" : eLevel.playerModel === "futuristic" ? "assets/img/ninja-futurista.png" : "assets/img/portrait-player.jpg");
  const sub = eLevel.versus
    ? "COMBATE RÁPIDO"
    : eLevel.boss
      ? "JEFE DE MISIÓN"
      : eLevel.waveCount > 1
        ? `MISIÓN ${String(eLevel.id).padStart(2, "0")} · ${eLevel.waveCount} ENEMIGOS`
        : `MISIÓN ${String(eLevel.id).padStart(2, "0")}`;
  return el(`<div class="vs-intro">
    <div class="vs-card">
      <img src="${playerPortrait}" alt="Tu luchador" onerror="this.src='assets/img/ninja-futurista.png'" />
      <h3>${escapeHTML(pName)}</h3>
      <div class="felems">${(eLevel.playerElems||[]).join(" / ")}</div>
    </div>
    <div class="vs-mark">VS</div>
    <div class="vs-card">
      <img src="${portrait}" alt="" onerror="this.src='assets/img/ninja-robot.png'" />
      <h3>${eLevel.name}</h3>
      <div class="felems">${sub}</div>
    </div>
  </div>`);
}

export function hud(p1, p2, level, input) {
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
        <div class="name-row"><div class="fname" id="p1-name">${escapeHTML(p1.name)}</div><div class="felems" id="p1-el"></div></div>
        <div class="bar" id="p1-hp" role="progressbar" aria-label="Tu vitalidad" aria-valuemin="0" aria-valuemax="100"><b></b><i></i></div>
        <div class="bar chakra" id="p1-ck" role="progressbar" aria-label="Tu chakra" aria-valuemin="0" aria-valuemax="100"><i></i></div>
        <div class="status-row" id="p1-status"></div>
      </div>
      <div class="timer"><div class="round">${roundLabel}</div><div class="t" id="timer">99</div><div class="wave-info" id="wave-info"></div></div>
      <div class="fighter-hud p2">
        <div class="name-row"><div class="fname" id="p2-name">${escapeHTML(p2.name)}</div><div class="felems" id="p2-el"></div></div>
        <div class="bar" id="p2-hp" role="progressbar" aria-label="Vitalidad rival" aria-valuemin="0" aria-valuemax="100"><b></b><i></i></div>
        <div class="bar chakra" id="p2-ck" role="progressbar" aria-label="Chakra rival" aria-valuemin="0" aria-valuemax="100"><i></i></div>
        <div class="status-row p2" id="p2-status"></div>
      </div>
    </div>
    <div class="stage-label">${level.stage.name}<span>NEO CITY / NIKO</span></div>
    <div class="hud-tools"><button data-act="fullscreen" aria-label="Pantalla completa" title="Pantalla completa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5"/></svg></button><button data-act="pause" aria-label="Pausar combate" title="Pausa">Ⅱ</button></div>
    <div class="combo" id="combo">0 <small>HITS</small></div>
    <div class="announcer" id="announcer"></div>
    <div class="help-strip" id="help">${escapeHTML(input.label("left"))}/${escapeHTML(input.label("right"))} mover · ${escapeHTML(input.label("up"))} salto · ${escapeHTML(input.label("down"))}+${escapeHTML(input.label("light"))} barrido · ${escapeHTML(input.label("block"))} guardia/protege · ${escapeHTML(input.label("evade"))} esquivar · ${escapeHTML(input.label("grab"))} agarre+flurry · ${escapeHTML(input.label("light"))}/${escapeHTML(input.label("heavy"))}/${escapeHTML(input.label("kick"))} taijutsu VF · ${escapeHTML(input.label("special1"))}/${escapeHTML(input.label("special2"))} jutsus · ${escapeHTML(input.label("ultimate"))} fusión · ${escapeHTML(input.label("dash"))} dash</div>
    <div id="pause-slot"></div>
    <div id="result-slot"></div>
  </div>`);
}

export function pauseMenu() {
  return el(`<div class="panel pause-menu" role="dialog" aria-modal="true" aria-label="Juego en pausa">
    <h2 class="gold-title">Pausa</h2>
    <p class="lead">Tómate un respiro. El combate está detenido.</p>
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
    <img src="assets/img/logo-ui.webp" width="90" alt="" />
    <h2 class="gold-title">HOKAGE — VF EDITION v1.2</h2>
    <h3>Diseño</h3>
    <p>Pelea 2.5D estilo <strong>Virtua Fighter</strong> — Kage-Maru: guardia baja, esquives deslizantes y agarres con flurry rápido.</p>
    <h3>Sistemas v1.2</h3>
    <p>• Guardia dedicada + Esquiva invulnerable<br>• Agarre → combo 7 golpes (puños/patadas) ultra rápido<br>• 30 misiones 2–7 olas · robots vida ~30% vs tuya · escenario ±14u alargado</p>
    <h3>Motor</h3>
    <p>Three.js · Web Audio · animación VF con interpolación suave y respiración.</p>
    <h3>Assets</h3>
    <p>Ciudad: <strong>Futuristic low poly city by Niko</strong>.<br>Jugador: <strong>Ninja Futurista</strong> (media/ninja futurista.png).<br>Enemigos: <strong>Ninja Robot</strong> (media/ninja robot.png).<br>Katanas: <strong>media/descarga (1)-(4).png</strong> como pickups 3D.</p>
    <p class="asset-note">Homenaje no oficial a VF & Naruto. Ver THIRD_PARTY_NOTICES y assets/models/README.md.</p>
    <div class="actions" style="justify-content:center"><button class="btn primary" data-go="menu">Volver</button><a class="btn ghost" href="THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener">Licencias</a></div>
  </div></div>`);
}

export function touchLayer(player) {
  const element1 = player.el1;
  const element2 = player.el2;
  return el(`<div id="touch" aria-label="Controles táctiles">
    <div class="touch-dock">
      <div class="movement-control">
        <div class="joystick" data-joystick role="group" aria-label="Joystick: izquierda y derecha para mover, arriba para saltar, abajo para agacharse">
          <span class="stick-up" aria-hidden="true">▲</span><span class="stick-down" aria-hidden="true">▼</span>
          <span class="stick-left" aria-hidden="true">◀</span><span class="stick-right" aria-hidden="true">▶</span>
          <i class="joystick-thumb" aria-hidden="true"></i>
        </div>
        <span class="touch-hint">↑ SALTO · ↓ AGACHATE · ◇ PROTEGE</span>
      </div>
      <div class="touch-actions" style="grid-template-columns: repeat(4, var(--button-size));">
        <button class="touch-btn jutsu" data-input="special1" aria-label="Jutsu 1: ${element1.name}" style="--element:${element1.color}"><b>${element1.kana}</b><span>JUTSU I</span></button>
        <button class="touch-btn jutsu" data-input="special2" aria-label="Jutsu 2: ${element2.name}" style="--element:${element2.color}"><b>${element2.kana}</b><span>JUTSU II</span></button>
        <button class="touch-btn ult" data-input="ultimate" aria-label="Fusión de chakra"><b>奥</b><span>FUSIÓN</span></button>
        <button class="touch-btn utility" data-input="block" aria-label="Mantener guardia — PROTEGER" style="border-color:#8ab4ff; color:#c9f6ff;"><b>◇</b><span>PROTEGE</span></button>
        <button class="touch-btn attack" data-input="light" aria-label="Puño ligero, barrido al agacharse"><b>PUÑO</b><span>JAB</span></button>
        <button class="touch-btn attack" data-input="heavy" aria-label="Puño fuerte"><b>FUERTE</b><span>DIRECTO</span></button>
        <button class="touch-btn attack" data-input="kick" aria-label="Patada circular o aérea"><b>PATADA</b><span>CIRCULAR</span></button>
        <button class="touch-btn" data-input="grab" aria-label="Agarre + flurry rápido" style="border-color:#ffd27a; color:#ffdf8a; background: linear-gradient(145deg, #6a2a1aee, #2a1e16ef);"><b>投</b><span>AGARRE</span></button>
        <button class="touch-btn utility" data-input="evade" aria-label="Esquivar — invulnerable" style="border-color:#3ee0ff;"><b>≋</b><span>ESQUIVA</span></button>
        <button class="touch-btn utility" data-input="up" aria-label="Saltar"><b>↑</b><span>SALTO</span></button>
        <button class="touch-btn utility" data-input="dash" aria-label="Dash"><b>»</b><span>DASH</span></button>
        <button class="touch-btn utility" data-input="down" aria-label="Agacharse"><b>▽</b><span>AGACHA</span></button>
      </div>
    </div>
  </div>`);
}
