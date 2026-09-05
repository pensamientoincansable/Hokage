# Componentes de terceros

La licencia del código de HOKAGE se encuentra en `LICENSE`. No sustituye las licencias o los derechos de los componentes externos.

## Bibliotecas y fuentes redistribuidas en el juego

| Componente | Licencia | Texto incluido en el build |
| --- | --- | --- |
| Three.js 0.160.1 | MIT | `licenses/three-MIT.txt` |
| Cinzel (Fontsource) | SIL Open Font License 1.1 | `licenses/cinzel-OFL.txt` |
| Orbitron (Fontsource) | SIL Open Font License 1.1 | `licenses/orbitron-OFL.txt` |
| Teko (Fontsource) | SIL Open Font License 1.1 | `licenses/teko-OFL.txt` |
| Noto Sans JP (Fontsource) | SIL Open Font License 1.1 | `licenses/noto-sans-jp-OFL.txt` |

`npm run build` copia los avisos completos, incluidos sus titulares de copyright, desde los paquetes instalados a `dist/licenses/`. Este archivo también se copia al build. Las fuentes son archivos distribuidos por Fontsource sin modificación; la hoja `css/symbols.css` selecciona qué fragmentos se usan para los símbolos del juego.

## Assets aportados al repositorio

- `Naruto/`: modelo y texturas del personaje Naruto, cuyos derechos corresponden a sus respectivos titulares. La carpeta no identifica la licencia del modelo ni al extractor/modelador.
- `assets/futuristic low poly city by niko.fbx` y `.blend`: ciudad atribuida a **Niko** por el nombre de los archivos aportados. No se adjuntó una licencia verificable.
- `assets/models/*.glb` y el retrato nuevo son derivados de los archivos anteriores, no obras de terceros descargadas durante esta integración.
- El resto del arte de `assets/img/` ya existía en el repositorio. Su presencia no certifica derechos de explotación.

Consulta `assets/models/README.md` para el origen y las transformaciones. Deben verificarse los permisos de esos assets antes de una redistribución pública o comercial. No se afirma que estén cubiertos por MIT, OFL o la licencia del código.
