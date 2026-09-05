# HOKAGE — Shinobi Fatal Clash

Juego de peleas 2.5D de temática ninja. **Naruto**, integrado desde el modelo de `/Naruto`, combate en una ciudad construida con **Futuristic low poly city by Niko**.

## Arrancar el juego

Requiere **Node.js 22.12 o posterior** y npm.

```bash
npm ci
npm run dev
```

Abre la dirección que muestra Vite (por defecto, `http://localhost:5173`). El servidor escucha en `0.0.0.0`, también para probar desde un móvil de tu red o una vista previa remota.

> ⚠️ **No abras `index.html` haciendo doble clic en el disco** (`file://`): los módulos ES, Three.js y los modelos GLB no pueden cargarse con ese esquema y el juego se quedaría en pantalla negra. Si ocurre, la pantalla mostrará ahora una guía con estos comandos en lugar del fondo negro.

### Compilar y publicar

```bash
npm run build
npm run preview
```

Publica **el contenido de `dist/`** en cualquier hosting estático. Las rutas relativas permiten desplegar también en una subcarpeta. No hace falta backend ni conexión a un CDN: Three.js, fuentes, texturas y modelos se sirven con el juego. **Ya no se debe servir directamente el código fuente con `python -m http.server`**; ese comando sí sirve para la carpeta `dist/` después de compilar.

## Controles de PC

| Acción | Teclas predeterminadas |
| --- | --- |
| Mover | A / D o flechas izquierda / derecha |
| Saltar | W, flecha arriba o Espacio; mantener para ganar altura |
| Agacharse | S o flecha abajo |
| Guardia | Shift izquierdo o derecho, mantener |
| Jab / puño ligero | J |
| Directo / puño fuerte | K |
| Patada circular / patada aérea | L, en suelo / aire |
| Barrido bajo | S + J |
| Jutsu de la primera / segunda naturaleza | U / I |
| Fusión de chakra | O, requiere 100 de chakra |
| Dash | P o doble pulsación de A / D (también flechas) |
| Pausa / reanudar | Esc o botón de pausa del HUD |

Las teclas se pueden reasignar en **Ajustes**. Esc cancela la reasignación y una tecla ocupada intercambia su acción anterior. La ayuda del combate refleja tus teclas. Si asignas una flecha o Espacio a otra acción, esa asignación tiene prioridad sobre el atajo alternativo.

## Móvil y tablet

- **Joystick izquierdo** con zona muerta: mover en horizontal, deslizar arriba para saltar y abajo para agacharse. Admite diagonales y doble toque para dash.
- **Nueve botones derechos**: dos jutsus, fusión, puño, directo, patada, guardia, salto y dash. Se pueden usar varios dedos a la vez y mantener movimiento + ataque / guardia.
- Pausa y pantalla completa accesibles desde el HUD. La disponibilidad de pantalla completa depende del navegador y del contenedor de la página.
- Compatible con vertical y horizontal, áreas seguras y tablets táctiles de más de 900 px. En horizontal hay más espacio para ver el combate.
- Ajustes: controles **automáticos / siempre visibles / solo teclado**, tamaño de botones y calidad gráfica. Los controles se detectan por capacidad táctil, no solo por ancho de pantalla.
- Cambiar de pestaña, perder el foco o redimensionar/orientar la ventana pausa el combate y libera las pulsaciones. Reanuda explícitamente para seguir jugando.

## Personajes y combate

- Naruto es el personaje inicial, con texturas originales, **93 articulaciones** y cuatro mallas de piel. Se han retirado los kunai y las carcasas de contorno duplicadas.
- Guardia, desplazamiento, salto, jab, directo, patada circular, barrido, patada aérea, canalización de chakra, reacción al golpe y K.O. usan animación esquelética con transiciones.
- Los ataques tienen preparación, contacto y recuperación sincronizados con sus ventanas de daño. Un pequeño búfer de entrada permite encadenar una pulsación al final de la recuperación; recibir daño interrumpe los ataques pendientes.
- **Personaje y chakra → Dojo Shinobi** permite probar las cinco técnicas, cambiar alias, altura y dos naturalezas. El aspecto de Naruto se conserva. El editor anterior de rostro, ropa, cabello y accesorios sigue disponible al elegir **Shinobi personalizado**; los rivales mantienen sus diseños propios.
- 8 naturalezas de chakra, 28 fusiones, estados alterados, combos, bloqueo, proyectiles y objetos de vitalidad / chakra / mejoras temporales.
- 30 misiones con oleadas, seis jefes y combate rápido. Los guardados antiguos conservan progreso y ajustes; si no elegían un modelo, pasan a usar Naruto.

## Escenarios y rendimiento

Se reutilizan 18 piezas reales del FBX de Niko: torres, hábitats, estaciones, cubiertas, equipos y vehículos. Hay seis distribuciones: **avenida, azotea, callejón, terminal, puente y plaza**, con iluminación, señalización y lluvia según la zona.

Los GLB preparados ocupan aproximadamente **256 KiB (Naruto)** y **1,75 MiB (ciudad)**. El navegador no descarga ni interpreta los DAE, FBX o Blender originales. La ciudad usa instancias y detalles fusionados; los personajes comparten geometría/texturas, pero tienen materiales y esqueletos independientes. Se liberan los recursos de combates y oleadas anteriores.

La simulación usa pasos de 60 Hz con recuperación limitada tras fotogramas largos. La cámara adapta distancia al ancho, a la separación de los luchadores y a la altura de los saltos. Los nuevos guardados en dispositivos táctiles empiezan en calidad baja; el render ajusta su resolución bajo carga. Calidad alta añade sombras y bloom; no se promete un FPS concreto en todo el hardware.

## Pruebas

```bash
npm test                         # pruebas unitarias y verificación de assets
npm run build                    # compilación de producción
npx playwright install chromium  # una vez; en Linux puede requerir --with-deps
npm run test:e2e                  # navegador, escritorio + móvil emulado
```

También se puede comprobar un servidor ya arrancado:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:4174 npm run test:e2e
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` permite usar un Chromium instalado por el sistema. Los informes y capturas de fallos quedan en `playwright-report/` y `test-results/` (ignorados en Git). Ver [pruebas y comprobaciones](docs/QA.md).

## Preparar los assets de nuevo

Los derivados necesarios están versionados; **no necesitas Blender ni ejecutar este paso para jugar**.

```bash
npx playwright install chromium
npm run assets:prepare
npm test
```

La herramienta usa Three.js en un navegador de preparación, convierte los originales, normaliza el rig, conserva UV/pesos de piel, fusiona por textura/material y genera el retrato y el logo ligero. Registra tamaños, piezas y hashes SHA-256 en `assets/models/manifest.json`. Más detalles en [assets/models/README.md](assets/models/README.md).

## Estructura

```text
index.html              entrada de Vite
js/                     juego, entrada, animación, combate, escenario y UI
css/                    estilos, HUD y controles táctiles
Naruto/                 modelo y texturas originales aportados
assets/*.fbx, *.blend    ciudad original aportada
assets/models/          GLB preparados y manifiesto de procedencia
assets/img/             arte de interfaz y retrato derivado del modelo
scripts/                preparación reproducible de assets y fuentes
tests/                 pruebas unitarias y Playwright
```

## Créditos

- **Ciudad:** Futuristic low poly city by **Niko**, desde los archivos aportados al repositorio.
- **Personaje:** modelo y texturas de `/Naruto`. Naruto pertenece a sus respectivos titulares; este juego es un homenaje no oficial.
- **Animación de taijutsu:** poses y clips creados en código para esta integración; no se han descargado animaciones de terceros.
- **Motor:** Three.js r160, Web Audio, Vite. Fuentes locales Cinzel, Orbitron, Teko y símbolos de Noto Sans JP, distribuidas mediante Fontsource (SIL OFL).

Los archivos externos aportados no incluyen información suficiente para certificar sus licencias. No se atribuye su autoría al proyecto ni se da por hecho que la licencia del código cubra esos assets. Verifica sus permisos antes de redistribuirlos públicamente o usarlos comercialmente.
