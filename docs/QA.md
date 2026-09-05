# Verificación de la integración Naruto / Niko

## Entorno y alcance

- Node.js 22; Three.js 0.160.1; Vite 8.
- Chromium headless con WebGL/SwiftShader.
- Escritorio 1280 × 800; móvil emulado con multitáctil.
- Tamaños de controles verificados: **320 × 568, 390 × 844, 844 × 390 y 1024 × 768**, incluido el tamaño de botones aumentado al 115 %.
- La ejecución no depende de un CDN de Three.js o Google Fonts.

**No equivale a probar hardware móvil real.** Queda recomendada una pasada manual en Safari/iOS y Android físico para rendimiento, audio, orientación y las restricciones de pantalla completa de cada navegador. No se garantiza una frecuencia de imágenes concreta.

## Comandos

```bash
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Para repetir la suite contra el compilado:

```bash
npm run preview -- --port 4174
# En otra terminal:
PLAYWRIGHT_BASE_URL=http://localhost:4174 npm run test:e2e
```

En un entorno que ya tenga Chromium instalado, puede especificarse `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Playwright admite su propio navegador sin esa variable. Los logs HTML, capturas y trazas se conservan localmente cuando falla una prueba, no en Git.

## Resultado de la comprobación local

- Instalación limpia con `npm ci`: correcta.
- Preparación de modelos/retrato/fuentes: correcta; los hashes de procedencia coinciden.
- `npm test`: **35/35 pruebas aprobadas**.
- `npm run build`: correcto, sin FBX/Blender/DAE en el despliegue y con los avisos de licencia incluidos.
- `npm audit`: **0 vulnerabilidades reportadas** en las dependencias instaladas.
- Suite completa contra **el build de producción** servido en el puerto 4174: **14/14 pruebas aprobadas** (Chromium 149.0.7827.0, render por software).
- `git diff --check` y comprobación de sintaxis JavaScript: correctos.

Los resultados anteriores corresponden a ejecución local. Esta PR no añade un workflow de GitHub Actions; la suite queda disponible para repetirla con los comandos indicados o incorporarla al CI del proyecto.

## Cobertura automatizada

### Unitarias (35)

- Identidad y hashes de originales/derivados; presupuesto de tamaño, cuatro pieles, texturas embebidas y 93 huesos de Naruto.
- Ventanas de preparación/contacto/recuperación y recuperación de poses.
- Continuidad del ciclo de movimiento; reinicio explícito de un nuevo ataque.
- Entrada de teclado, aliases, repetición de tecla, formularios, reasignación/cancelación y reparación de asignaciones duplicadas.
- Propiedad de cada pulsación multitáctil, combinación de teclado + táctil y limpieza al perder el foco.
- Doble pulsación medida por tiempo real.
- Búfer de ataques, hitstop, cancelación al recibir daño y bloqueo de cancelaciones abusivas por salto/dash.
- Daño y mejoras aplicados al cuerpo a cuerpo, guardia, combo por atacante, color del segundo jutsu, dash activo y cooldown.
- K.O. terminal, limpieza de varios proyectiles/trampas durante el resultado y daño de guardia no curativo.
- Salto variable, separación de cuerpos dentro de los límites y resolución por porcentaje de vida al agotar el tiempo.
- Cámara según aspecto, separación y salto; liberación de instancias sin destruir recursos compartidos.
- 28 fusiones simétricas, 30 misiones, seis escenarios, oleadas y jefes.
- Migración/validación del guardado, errores de almacenamiento y escape de nombres en el HTML.

### Navegador (14)

| Prueba | Resultado esperado |
| --- | --- |
| Carga de modelos | Naruto real, cuatro pieles y ciudad instanciada; ningún FBX/DAE/Blender ni CDN remoto en las peticiones del juego |
| Teclado de PC | Movimiento con flechas, ataque con daño, pausa y reanudación sin deriva |
| Reasignación y nombre | Tecla guardada tras recargar, ayuda actualizada y texto tratado como texto |
| Editor | Cinco técnicas previsualizables, Naruto por defecto y editor procedural opcional funcional |
| Calidad | Escenario actualizado y bloom activado, liberado y vuelto a activar |
| Escenarios / recursos | Las seis composiciones se renderizan; tres reinicios del mismo combate no acumulan geometrías/texturas |
| Campaña | K.O., objetos, siguiente oleada, guardado de misión y desbloqueo/siguiente misión |
| Concurrencia | Un inicio de nivel más reciente invalida la introducción anterior |
| Error de carga | Mensaje con nombre del asset y botón de reintento que recupera el menú |
| Salto alto | El luchador que salta y el rival en suelo permanecen dentro del encuadre |
| Layout táctil | Controles dentro de cada viewport, sin superposición con joystick y con al menos 44 px de objetivo |
| Multitáctil real del navegador | Movimiento y ataque simultáneos; liberar un dedo no suelta el otro; cancelación limpia |
| Guardia / salto / foco | Botones funcionales, pausa accesible y reloj/escenario congelados al perder foco |
| Preferencias táctiles | Forzar visibilidad u ocultarla funciona con independencia del ancho |

La suite desactiva la IA en las pruebas de entrada para obtener resultados deterministas. La prueba de progresión aplica un golpe letal a través de `Match.applyHit`: recorre el flujo real de K.O., recompensas, oleadas y guardado, sin depender de ganar contra una IA aleatoria.

## Revisión visual y manual

- Modelo original, texturas, orientación, guardia y poses de los cinco ataques inspeccionados en navegador.
- Composiciones y HUD revisados en escritorio y en emulación móvil vertical/horizontal.
- No se exige una captura píxel a píxel: el render depende de la GPU, antialias y adaptación de resolución.

Antes de una publicación abierta, verificar los permisos de los assets externos descritos en `assets/models/README.md`.
