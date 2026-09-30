# AGENTS.md

## Descripción general

Juego en HTML5 Canvas puro — sin framework, sin paso de build, sin dependencias, sin `package.json`. Toda la lógica (~420 líneas) está en el único archivo `game.js`; `index.html` es solo una carcasa que lo carga.

## Ejecución / verificación

Abre `index.html` directamente en el navegador, o usa `npx serve .` (http://localhost:3000). No hay tests, lint ni typecheck — verifica los cambios jugando en el navegador (la consola está limpia; el archivo corre en `'use strict'`).

## Estructura

- Un solo bucle de `requestAnimationFrame` (`loop()` al final de `game.js`); `dt` limitado a 0.05 s.
- Máquina de estados global: `state` ∈ `'playing' | 'dead' | 'gameover'`; `update(dt)` hace early-return según el estado. Agrega nuevos estados ahí.
- Clases `Ship`, `Bullet`, `Asteroid`, `Particle`, `PowerUp`, `ShootingStar`. La afinación por tamaño vive en los arreglos `RADII` / `SPEEDS` / `POINTS` (índice = tamaño 1–3), no en la clase.
- El espacio es toroidal: todo movimiento pasa por `wrap(v, max)`.

## Advertencias

- El tamaño del canvas está duplicado: los atributos `width`/`height` del `<canvas>` en `index.html` deben coincidir con las constantes `W`/`H` al inicio de `game.js`. Cámbialos juntos.
- `pressed(code)` consume el flag `justPressed` al leerlo. Llámalo como máximo una vez por tecla por frame (el input se descarta en silencio si no); usa `keys[code]` para estado mantenido.
- El input usa cadenas de `e.code` (`'ArrowLeft'`, `'Space'`, …); flechas y espacio reciben `preventDefault()` para evitar el scroll de la página.
- Las estrellas fugaces viven en su propio arreglo `shootingStars`, separado de `asteroids` para no bloquear el avance de nivel; su ciclo (aparición periódica, estela, expiración) se maneja en `updateShootingStars()`.

## Convenciones

- Los comentarios del código, el README y todas las cadenas visibles para el usuario (HUD, overlays) están en español — manténlo así.
