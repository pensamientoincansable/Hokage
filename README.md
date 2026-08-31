# HOKAGE — Shinobi Fatal Clash

Juego de peleas 2.5D al estilo *Fatal Fury* con temática ninja urbana inspirada en la era **Boruto / Naruto**.

## Cómo jugar

Sirve la carpeta del proyecto (los módulos ES no funcionan abriendo el HTML en crudo):

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Abre `http://localhost:8080`.

### Controles (P1)

| Acción | Tecla |
| --- | --- |
| Mover | A / D |
| Saltar | W (mantén para saltar más alto) |
| Agachar | S |
| Bloqueo | Shift |
| Golpe ligero / fuerte / patada | J / K / L |
| Jutsu elemento 1 / 2 | U / I |
| Ultimátum (fusión) | O |
| Dash | P o doble toque A/D |
| Pausa | Esc |

En móvil hay botones táctiles (movimiento, golpes, jutsus y dash).

## Contenido

- Menú principal, campaña, combate rápido, ajustes y créditos
- Editor de personaje avanzado (rostro, complexión, cabello, dōjutsu, marcas, ropa, aldea, accesorios, bufanda)
- 15 peinados con silueta propia + paletas de color rápidas
- 16 inspiraciones de clanes y héroes de la saga
- **8 naturalezas** de chakra: elige **dos**; cada una da un jutsu con su **efecto elemental** y juntas forjan un **ultimátum fusionado**
  - Fuego quema · Agua ralentiza · Rayo aturde · Viento empuja · Tierra fragiliza · Hielo congela · Sombra absorbe chakra · Sonido debilita
- **30 misiones** en escenarios urbanos nocturnos, con **varias oleadas de enemigos** (más rivales, menos vida cada uno)
- **Objetos** que sueltan los enemigos: vitalidad, chakra y mejoras temporales (poder, velocidad, escudo)
- **Jefe cada 5 niveles** (6 bosses)
- Combate 2.5D con física realista (aceleración, salto variable, dash), hitstun, bloqueo, proyectiles, combos, estados alterados y medidor de chakra
- Personajes y ciudad **procedurales en Three.js** (sombras, neón, lluvia, bloom)
- Audio procedural (Web Audio)
- Guardado local (progreso, shinobi, teclas)
- Adaptado a escritorio y a móvil/Android (botones táctiles y editor responsive)

## Estructura

```
index.html
css/          estilo y HUD
js/           motor, combate, IA, UI, ninja 3D
assets/img/   arte de menú, logo, texturas y retratos
```

## Créditos de motor

Three.js r160 · fuentes Google (Cinzel, Orbitron, Teko, Noto Sans JP).

Inspiración estética de la saga ninja; el juego es un homenaje original, no un producto oficial.
