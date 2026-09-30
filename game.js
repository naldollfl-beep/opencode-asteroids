'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
// Apariencia de la nave: cada skin define silueta (coords locales, nariz en +x),
// color de trazo y color de llama. Es cosmética pura: el hitbox (radius 12) es
// el mismo para todas. Tecla C para rotar; se recuerda entre sesiones.
const SKINS = [
  {
    nombre: 'CLÁSICA',
    color:  '#fff',
    llama:  'rgba(255,130,0,0.85)',
    verts:  [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    nombre: 'DARDO',
    color:  '#00b8ff',
    llama:  'rgba(255,70,160,0.85)',
    verts:  [[23, 0], [-13, -5], [-8, 0], [-13, 5]],
  },
  {
    nombre: 'COLIBRÍ',
    color:  '#ff4fd8',
    llama:  'rgba(170,80,255,0.85)',
    verts:  [[15, 0], [2, -10], [-13, -5], [-7, 0], [-13, 5], [2, 10]],
  },
  {
    nombre: 'TITÁN',
    color:  '#ffe600',
    llama:  'rgba(255,60,30,0.85)',
    verts:  [[17, 0], [8, -12], [-12, -8], [-8, 0], [-12, 8], [8, 12]],
  },
  {
    nombre: 'ESPECTRO',
    color:  '#00ff66',
    llama:  'rgba(255,220,0,0.85)',
    verts:  [[24, 0], [-9, -11], [-14, -4], [-8, 0], [-14, 4], [-9, 11]],
  },
];

const SKIN_KEY = 'asteroids.skin';

let skinIndex = 0;
try {
  const saved = parseInt(localStorage.getItem(SKIN_KEY), 10);
  if (Number.isInteger(saved) && saved >= 0 && saved < SKINS.length) skinIndex = saved;
} catch (e) {
  // localStorage no disponible (p. ej. file:// con permisos restrictivos): skin por defecto
}

let skinMsg = 0;  // segundos restantes del aviso «SKIN: …» en el HUD

function cycleSkin() {
  skinIndex = (skinIndex + 1) % SKINS.length;
  skinMsg = 1.5;
  try { localStorage.setItem(SKIN_KEY, String(skinIndex)); } catch (e) {}
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.speedBoost    = 0;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    this.speedBoost = Math.max(0, this.speedBoost - dt);

    const ROT   = 3.5;   // rad/s
    const boost = this.speedBoost > 0 ? 2 : 1;  // power-up de velocidad
    const THRUST = 260 * boost;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta de la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      // Llama cian mientras dura el power-up de velocidad
      ctx.strokeStyle = this.speedBoost > 0 ? 'rgba(0, 255, 255, 0.9)' : skin.llama;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '255,255,255') {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${this.color},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp (velocidad) ───────────────────────────────────────────────────────
const POWERUP_DROP     = 0.12;  // probabilidad de drop por asteroide destruido
const POWERUP_DURATION = 5;     // segundos que dura el efecto en la nave
const POWERUP_TTL      = 10;    // segundos que dura el ítem en el mapa

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 45);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl  = POWERUP_TTL;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está por desaparecer
    if (this.ttl < 3 && Math.floor(this.ttl * 6) % 2 === 0) return;

    // Pulso suave de escala
    const pulse = 1 + Math.sin(this.ttl * 6) * 0.15;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.lineJoin = 'round';

    // Halo tenue para que se distinga como ítem recogible
    ctx.strokeStyle = 'rgba(0,255,255,0.35)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();

    // Rayo estilizado
    ctx.strokeStyle = '#0ff';
    ctx.beginPath();
    ctx.moveTo( 2, -8);
    ctx.lineTo(-4,  1);
    ctx.lineTo( 0,  1);
    ctx.lineTo(-2,  8);
    ctx.lineTo( 4, -1);
    ctx.lineTo( 0, -1);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

// ── Estrella fugaz ───────────────────────────────────────────────────────────
const SHOOTING_STAR_POINTS  = 500;  // recompensa por cazar una
const SHOOTING_STAR_MIN_GAP = 7;    // segundos mínimos entre apariciones
const SHOOTING_STAR_MAX_GAP = 12;   // segundos máximos entre apariciones

class ShootingStar {
  constructor() {
    // Nace junto a un borde aleatorio y apunta hacia la zona central
    const MARGIN = 20;
    const side = randInt(0, 3);
    if (side === 0)      { this.x = rand(0, W); this.y = MARGIN; }
    else if (side === 1) { this.x = W - MARGIN; this.y = rand(0, H); }
    else if (side === 2) { this.x = rand(0, W); this.y = H - MARGIN; }
    else                 { this.x = MARGIN; this.y = rand(0, H); }

    const angle = Math.atan2(
      rand(H * 0.25, H * 0.75) - this.y,
      rand(W * 0.25, W * 0.75) - this.x
    );
    const speed = rand(240, 320);   // mucho más veloz que cualquier asteroide
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.radius   = 12;
    this.rot      = rand(0, Math.PI * 2);
    this.rotSpeed = rand(3, 6) * (Math.random() < 0.5 ? -1 : 1);
    this.ttl      = rand(4, 6);     // vida limitada: se desvanece sola
    this.dead     = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo de aviso cuando le queda poca vida
    if (this.ttl < 1.5 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Estrella de 5 puntas
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a  = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r  = i % 2 === 0 ? this.radius : this.radius * 0.45;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else         ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shootingStars;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;  // cuenta atrás para la próxima estrella fugaz

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  starTimer = rand(SHOOTING_STAR_MIN_GAP, SHOOTING_STAR_MAX_GAP);
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  starTimer = rand(SHOOTING_STAR_MIN_GAP, SHOOTING_STAR_MAX_GAP);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8, color) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoost = 0;   // el power-up se pierde al morir
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// Mueve las estrellas fugaces, emite su estela y las desvanece al expirar
function updateShootingStars(dt) {
  for (const s of shootingStars) {
    s.update(dt);
    if (s.dead) {
      explode(s.x, s.y, 5, '255,215,80');
      continue;
    }
    if (Math.random() < 0.7)
      particles.push(new Particle(s.x - s.vx * 0.03, s.y - s.vy * 0.03, '255,215,80'));
  }
  shootingStars = shootingStars.filter(s => !s.dead);
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Rotación de skin (tecla C) disponible en cualquier estado
  if (pressed('KeyC')) cycleSkin();
  if (skinMsg > 0) skinMsg -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerUps.forEach(pu => pu.update(dt));
    powerUps = powerUps.filter(pu => !pu.dead);
    updateShootingStars(dt);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(pu => pu.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(pu => !pu.dead);

  // Estrella fugaz: aparición periódica, nunca encima de la nave
  starTimer -= dt;
  if (starTimer <= 0) {
    starTimer = rand(SHOOTING_STAR_MIN_GAP, SHOOTING_STAR_MAX_GAP);
    let s, tries = 0;
    do { s = new ShootingStar(); tries++; }
    while (tries < 8 && dist(s, ship) < 150);
    shootingStars.push(s);
  }
  updateShootingStars(dt);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        // Probabilidad de que el asteroide suelte un power-up de velocidad
        if (Math.random() < POWERUP_DROP)
          powerUps.push(new PowerUp(a.x, a.y));
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += SHOOTING_STAR_POINTS;
        explode(s.x, s.y, 16, '255,215,80');
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide o estrella fugaz
  if (ship.invincible <= 0) {
    const hit = asteroids.some(a => dist(ship, a) < ship.radius + a.radius * 0.82)
             || shootingStars.some(s => dist(ship, s) < ship.radius + s.radius);
    if (hit) killShip();
  }

  // Nave vs power-up
  if (!ship.dead) {
    for (const pu of powerUps) {
      if (!pu.dead && dist(ship, pu) < ship.radius + pu.radius) {
        pu.dead = true;
        ship.speedBoost = POWERUP_DURATION;
        explode(pu.x, pu.y, 6, '0,255,255');
      }
    }
  }
  powerUps = powerUps.filter(pu => !pu.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  // Ícono de vida: silueta de la skin activa a media escala
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.5, 0.5);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 2.4;   // compensa la escala: trazo efectivo de ~1.2 px
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Contador del power-up de velocidad activo
  if (ship.speedBoost > 0) {
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'center';
    ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, W / 2, 48);
  }

  // Aviso temporal al rotar de skin
  if (skinMsg > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, skinMsg);
    ctx.fillStyle   = SKINS[skinIndex].color;
    ctx.textAlign   = 'center';
    ctx.fillText(`SKIN: ${SKINS[skinIndex].nombre}`, W / 2, H - 20);
    ctx.restore();
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  powerUps.forEach(pu => pu.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
