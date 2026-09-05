# Assets de ejecución y procedencia

## Personaje

`naruto.glb` deriva exclusivamente de:

- `/Naruto/model.dae`
- `/Naruto/Texture_0_CMP.png` … `Texture_3_CMP.png`

Se conservan los **93 huesos, UV y pesos de piel**. La preparación coloca los brazos en reposo, hornea esa postura en las posiciones/normales y recalcula los ejes e inversas del esqueleto para que las animaciones usen coordenadas canónicas. La altura se normaliza a 2,2 unidades.

Se excluyen `Mesh_10` … `Mesh_19`: kunai y carcasas de contorno duplicadas. Las diez mallas visibles se agrupan por **imagen de textura**, no por UUID de material, y se exportan como cuatro mallas de piel y cuatro texturas embebidas. El GLB resultante pesa aproximadamente 256 KiB.

El DAE no contiene clips. `js/martial-arts.js` crea `AnimationClip` de taijutsu para el rig: jab, directo, circular, barrido y patada aérea, además de los estados de locomoción, guardia, chakra, daño y victoria. Cada golpe tiene cámara, extensión, contacto y recuperación; el idle mantiene la guardia con un bounce de peso. Los tiempos se derivan de `MOVES` para que coincidan con el contacto del combate. Los rivales procedurales usan la misma coreografía con un adaptador de articulaciones. No se importan clips de Mixamo: el rig de 93 huesos no comparte nombres ni ejes con un esqueleto genérico.

`assets/img/naruto-portrait.png` se renderiza desde este modelo; **no es una imagen generada por IA**. `assets/img/logo-ui.webp` es una versión reducida del logo existente para evitar cargar su PNG de aproximadamente 2 MiB como icono.

## Ciudad

`niko-city-kit.glb` deriva de **`assets/futuristic low poly city by niko.fbx`**. Se conserva el `.blend` original sin modificarlo, pero no se necesita Blender en ejecución ni para esta conversión.

El kit contiene 18 grupos reutilizables. El manifiesto relaciona cada nombre de juego con su objeto original del FBX, por ejemplo:

| Pieza | Objeto de origen |
| --- | --- |
| tower-ring | Cube028 |
| tower-needle | Cube032 |
| tower-block | Cube021 |
| tower-spire | Cube031 |
| hall | Cube003 |
| station | Cube064 |
| habitat | Cube026 |
| shuttle | Cube017 |
| aircraft | Cube016 |

La lista completa está en `manifest.json`. Se hornean las transformaciones, se centra cada pieza en su base, se normaliza su tamaño y se fusionan los grupos de un mismo material. El FBX presenta sus materiales de superficie como blancos en Three.js; se traducen sus **nombres de material** a metal, superficies oscuras, cristales y luz emisiva. Cada escenario aplica su propia paleta sin sustituir la geometría original.

`js/stage.js` instancia las piezas repetidas y añade una plataforma de lucha despejada, barandillas, cartelería y luces. El skyline instancia solo torres (`tower-*`); `hangar` y `gateway` son piezas de puerta/nave y se usan como muros o almacenes a cota de calle, nunca como silueta lejana. Las seis distribuciones comparten el kit, pero tienen composiciones y elementos de primer plano distintos. Las luces direccionales sustituyen la antigua luz puntual por cada edificio/farola.

## Reproducibilidad

```bash
npm ci
npx playwright install chromium
npm run assets:prepare
npm test
```

- `scripts/asset-tools.js`: transformación y exportación de modelos; retrato y logo.
- `scripts/prepare-assets.mjs`: navegador de preparación, escritura y hashes SHA-256.
- `scripts/prepare-symbol-font.mjs`: selecciona solo los fragmentos de Noto Sans JP necesarios para los símbolos del juego.
- `manifest.json`: hashes de los originales y los derivados, tamaños y mapa de piezas.

El navegador de **juego** solo carga los dos GLB preparados. `npm run build` no distribuye `/Naruto` ni los FBX/Blender originales. Los derivados pequeños se versionan porque son necesarios para ejecutar el juego; los informes, cachés y builds no se versionan.

Las geometrías/texturas de la biblioteca viven durante la sesión y se marcan como compartidas. Cada instancia tiene sus propios materiales/esqueleto. `js/resources.js` libera solo recursos propios al reconstruir personajes, escenarios y efectos, para no invalidar las plantillas reutilizadas.

## Créditos y permisos

- **Futuristic low poly city by Niko:** atribución tomada del nombre de los archivos aportados. No se añade un enlace ni una licencia que no conste en el repositorio.
- **Naruto:** personaje de sus respectivos titulares. Modelo y texturas aportados en `/Naruto`; no hay créditos del extractor/modelador ni licencia verificable en esa carpeta.
- Las animaciones de esta integración están escritas en el proyecto, sin usar clips externos.
- Fuentes Fontsource (incluidos los fragmentos Noto Sans JP): SIL Open Font License 1.1; los paquetes instalados contienen sus avisos de licencia.

La licencia del código del repositorio **no implica** permiso sobre personajes o assets de terceros. Quien publique o redistribuya el juego debe comprobar los derechos correspondientes, especialmente para un uso comercial. Los originales se han conservado intactos.
