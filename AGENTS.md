# AGENTS.md

## Overview

Vanilla HTML5 Canvas game — no framework, no build step, no dependencies, no `package.json`. All logic (~420 lines) is in the single `game.js`; `index.html` is only a shell that loads it.

## Running / verification

Open `index.html` directly in a browser, or `npx serve .` (http://localhost:3000). There are no tests, lint, or typecheck — verify changes by playing in the browser (console is clean; file runs in `'use strict'`).

## Structure

- Single `requestAnimationFrame` loop (`loop()` at bottom of `game.js`); `dt` clamped to 0.05 s.
- Global state machine: `state` ∈ `'playing' | 'dead' | 'gameover'`; `update(dt)` early-returns per state. Add new states there.
- Classes `Ship`, `Bullet`, `Asteroid`, `Particle`. Per-size tuning lives in the `RADII` / `SPEEDS` / `POINTS` arrays (index = size 1–3), not in the class.
- Space is toroidal: all movement goes through `wrap(v, max)`.

## Gotchas

- Canvas size is duplicated: the `width`/`height` attributes on `<canvas>` in `index.html` must match the `W`/`H` constants at the top of `game.js`. Change both together.
- `pressed(code)` consumes the `justPressed` flag on read. Call it at most once per key per frame (input is silently dropped otherwise); use `keys[code]` for held state.
- Input uses `e.code` strings (`'ArrowLeft'`, `'Space'`, …); arrows/space are `preventDefault()`ed to stop page scroll.
- README mentions power-ups and a "shooting star" asteroid type, but neither is implemented — don't search for or assume that code exists.

## Conventions

- Code comments, README, and all user-facing strings (HUD, overlays) are in Spanish — keep it that way.
