#!/usr/bin/env node
'use strict';

// ── Triage de issues ──────────────────────────────────────────────────────────
// Lo dispara .github/workflows/issue-triage.yml al abrir un issue:
//   1. Clasifica título + cuerpo por palabras clave → tipo (labels default de
//      GitHub) y temas propios del juego (labels creadas al vuelo si faltan).
//   2. Aplica las labels al issue.
//   3. Reformatea el cuerpo: el reporte del autor queda intacto y debajo se
//      añade una sección «Clasificación automática».
//
// Notas:
//   - Idempotente: si el cuerpo ya contiene el MARKER, no se vuelve a tocar.
//   - DRY_RUN=1 clasifica y muestra el cuerpo resultante sin llamar a la API.
//   - ISSUE_TITLE / ISSUE_BODY / ISSUE_NUMBER sobreescriben el payload
//     (útil para pruebas locales sin evento de GitHub).

import { readFileSync } from 'node:fs';

const MARKER = '<!-- triage-bot:issue -->';

// Labels de tipo: ya existen en el repo (defaults de GitHub). El orden del
// arreglo define la prioridad cuando hay empate en palabras clave.
const TYPE_RULES = [
  {
    label: 'bug',
    keywords: [
      'bug', 'bugs', 'falla', 'fallas', 'fallo', 'fallos', 'error', 'errores',
      'no funciona', 'no va', 'deja de funcionar', 'funciona mal', 'roto',
      'rompe', 'se rompe', 'crashea', 'crash', 'cuelga', 'se cuelga',
      'congela', 'se congela', 'traba', 'se traba', 'glitch', 'bloquea',
      'se bloquea', 'incorrecto', 'no deberia', 'colision', 'colisiones',
      'colisiona', 'se solapan', 'solapa', 'atraviesa', 'desaparece',
      'no aparece',
    ],
  },
  {
    label: 'enhancement',
    keywords: [
      'mejora', 'mejoras', 'mejorar', 'mejoraria', 'sugerencia',
      'sugerencias', 'sugiero', 'idea', 'ideas', 'feature', 'features',
      'agregar', 'anadir', 'sumar', 'seria bueno', 'seria genial', 'seria util',
      'estaria bien', 'quisiera', 'quiero que', 'podriamos', 'deberiamos',
      'propuesta', 'peticion', 'solicitud', 'nueva funcionalidad',
      'nueva caracteristica', 'nuevo power', 'nueva nave', 'personalizar',
    ],
  },
  {
    label: 'question',
    keywords: [
      // Sin «como» a secas: las preguntas en español casi siempre trae «?» y
      // el «cómo» comparativo («me gusta cómo se ve») daría falsos positivos
      '?', 'cual', 'cuales', 'donde', 'cuando', 'cuanto', 'duda', 'dudas',
      'ayuda', 'pregunta', 'es posible', 'existe alguna', 'hay alguna',
      'se puede', 'hay forma', 'hay manera', 'alguna forma', 'alguna manera',
      'que significa', 'para que sirve', 'como funciona',
    ],
  },
  {
    label: 'documentation',
    keywords: [
      'readme', 'docs', 'documentacion', 'documentar', 'documenta', 'wiki',
      'guia', 'manual', 'instrucciones', 'explicacion', 'typo', 'ortografia',
    ],
  },
];

// Labels de tema: específicas del juego; se crean si no existen en el repo.
const TOPIC_RULES = [
  {
    label: 'power-ups',
    color: '0e8a16',
    description: 'Power-ups: velocidad, escudo y triple disparo',
    keywords: [
      'powerup', 'powerups', 'power up', 'power ups', 'power-up',
      'power-ups', 'escudo', 'escudos', 'triple', 'triple disparo',
      'velocidad', 'burbuja', 'boost', 'rayo cian', 'magenta', 'rafaga',
    ],
  },
  {
    label: 'estrella fugaz',
    color: 'fbca04',
    description: 'Estrella fugaz: asteroide dorado veloz que cruza la pantalla',
    keywords: [
      'estrella fugaz', 'estrella dorada', 'estrella que cruza',
      'estrella veloz', 'shooting star', 'dorada',
    ],
  },
  {
    label: 'skins',
    color: 'd4c5f9',
    description: 'Skins cosméticas de la nave (tecla C)',
    keywords: [
      'skin', 'skins', 'diseno', 'cosmetico', 'cosmeticos', 'silueta',
      'clasica', 'dardo', 'colibri', 'titan', 'espectro', 'color de la nave',
      'llama',
    ],
  },
  {
    label: 'hud',
    color: 'f9d0c4',
    description: 'HUD y contadores en pantalla',
    keywords: ['hud', 'marcador', 'contador'],
  },
  {
    label: 'controles',
    color: 'bfd4f2',
    description: 'Controles y teclado',
    keywords: [
      'tecla', 'teclas', 'control', 'controles', 'flecha', 'flechas',
      'espacio', 'teclado', 'input', 'barra espaciadora', 'izquierda',
      'derecha', 'arriba', 'abajo',
    ],
  },
  {
    label: 'puntuación',
    color: 'e99695',
    description: 'Puntuación y puntos por asteroide',
    keywords: [
      'puntos', 'puntuacion', 'score', 'record', 'highscore',
      'mejor puntuacion',
    ],
  },
];

// Fallback cuando ninguna regla de tipo matchea.
const NEEDS_TRIAGE = {
  label: 'needs-triage',
  color: 'ededed',
  description: 'Sin clasificar: requiere triage manual',
};

// ── Clasificación ─────────────────────────────────────────────────────────────

// Minúsculas, sin tildes y espacios colapsados: «Puntería» → «punteria».
const normalize = (text) => (text ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Límites de palabra propios (en vez de \b, que es solo ASCII) para evitar
// falsos positivos tipo «multipuntos» o «espacial». Solo se exige límite en
// el borde donde la keyword es letra/dígito («bug» sí, «?» no: «nave?»
// debe matchear aunque el signo venga pegado a una letra).
function hasKeyword(normalizedText, keyword) {
  const lead = /^[\p{L}\p{N}]/u.test(keyword) ? '(^|[^\\p{L}\\p{N}])' : '';
  const trail = /[\p{L}\p{N}]$/u.test(keyword) ? '([^\\p{L}\\p{N}]|$)' : '';
  const re = new RegExp(`${lead}${escapeRegex(keyword)}${trail}`, 'u');
  return re.test(normalizedText);
}

function classify(title, body) {
  const text = normalize(`${title ?? ''}\n${body ?? ''}`);
  const matchedKeywords = (rule) =>
    rule.keywords.filter((k) => hasKeyword(text, k));

  let type = null;
  for (const rule of TYPE_RULES) {
    const matched = matchedKeywords(rule);
    if (matched.length === 0) continue;
    // Empate: gana la regla anterior (el orden del arreglo es la prioridad)
    if (!type || matched.length > type.matched.length) type = { rule, matched };
  }

  const topics = TOPIC_RULES
    .map((rule) => ({ rule, matched: matchedKeywords(rule) }))
    .filter((m) => m.matched.length > 0);

  return { type, topics };
}

// ── Formato del cuerpo ────────────────────────────────────────────────────────

const code = (s) => '`' + s + '`';
const quoteList = (list) => list.map((k) => `«${k}»`).join(', ');

function formatBody(originalBody, author, result) {
  const reporte = originalBody && originalBody.trim()
    ? originalBody.trim()
    : '_(sin descripción)_';

  const tipo = result.type
    ? `${code(result.type.rule.label)} — ${quoteList(result.type.matched)}`
    : `sin clasificar → ${code(NEEDS_TRIAGE.label)}`;

  const temas = result.topics.length
    ? result.topics
        .map((m) => `${code(m.rule.label)} — ${quoteList(m.matched)}`)
        .join('<br>')
    : '—';

  const labels = [
    result.type ? result.type.rule.label : NEEDS_TRIAGE.label,
    ...result.topics.map((m) => m.rule.label),
  ];

  return [
    `## 📝 Reporte original de @${author}`,
    '',
    reporte,
    '',
    '---',
    '',
    MARKER,
    '## 🔎 Clasificación automática',
    '',
    '| Campo | Valor |',
    '| --- | --- |',
    `| Tipo | ${tipo} |`,
    `| Tema(s) | ${temas} |`,
    `| Labels aplicadas | ${labels.map(code).join(', ')} |`,
    '',
    '> 🤖 Sección añadida automáticamente al abrir el issue; el reporte '
      + 'original no fue modificado.',
  ].join('\n');
}

// ── API de GitHub ─────────────────────────────────────────────────────────────

const API_BASE = process.env.GITHUB_API_URL || 'https://api.github.com';

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err.message || '';
      if (err.errors) detail += ` ${JSON.stringify(err.errors)}`;
    } catch { /* respuesta sin JSON */ }
    throw new Error(`${method} ${path} → ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res.status === 204 ? null : res.json();
}

// Garantiza que la label exista (la crea si falta). Devuelve true/false.
async function ensureLabel(repo, rule) {
  try {
    await api('GET', `/repos/${repo}/labels/${encodeURIComponent(rule.label)}`);
    return true;
  } catch { /* no existe (o falló el GET): intentar crearla */ }
  try {
    await api('POST', `/repos/${repo}/labels`, {
      name: rule.label,
      color: rule.color,
      description: rule.description,
    });
    console.log(`Label creada: ${rule.label}`);
    return true;
  } catch (err) {
    // 422 «already_exists» si el GET falló por otra razón pero sí existe
    if (String(err.message).includes('already_exists')) return true;
    console.warn(`::warning::No se pudo garantizar la label «${rule.label}»: ${err.message}`);
    return false;
  }
}

// ── Flujo principal ───────────────────────────────────────────────────────────

async function main() {
  // Payload del evento (los env var sobreescriben, útil para pruebas locales)
  const payload = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
    : {};
  if (payload.action && payload.action !== 'opened') {
    console.log(`Nada que hacer: action = ${payload.action}`);
    return;
  }

  const raw = payload.issue ?? {};
  const issue = {
    number: Number(process.env.ISSUE_NUMBER || raw.number),
    title: process.env.ISSUE_TITLE ?? raw.title ?? '',
    body: process.env.ISSUE_BODY ?? raw.body ?? '',
    author: raw.user?.login ?? 'anónimo',
  };
  if (!issue.number) {
    throw new Error('No hay issue en el payload (¿falta GITHUB_EVENT_PATH o ISSUE_NUMBER?)');
  }

  // Idempotencia: si ya tiene la sección, no se toca nada
  if (issue.body.includes(MARKER)) {
    console.log(`Issue #${issue.number}: ya tiene la sección de triage; no se toca nada.`);
    return;
  }

  const result = classify(issue.title, issue.body);
  const typeRule = result.type ? result.type.rule : NEEDS_TRIAGE;
  const labelRules = [typeRule, ...result.topics.map((m) => m.rule)];
  const newBody = formatBody(issue.body, issue.author, result);

  if (process.env.DRY_RUN) {
    console.log(`── DRY RUN ── issue #${issue.number} «${issue.title}» de @${issue.author}`);
    console.log(`Labels: ${labelRules.map((r) => r.label).join(', ')}`);
    console.log('── Cuerpo resultante ──');
    console.log(newBody);
    return;
  }

  const repo = process.env.GITHUB_REPOSITORY || payload.repository?.full_name;
  if (!repo) throw new Error('Falta GITHUB_REPOSITORY');
  if (!process.env.GH_TOKEN) throw new Error('Falta GH_TOKEN');

  // 1. Labels: garantizar existencia y aplicar (que un fallo aquí no
  //    impida el formateo del cuerpo)
  let applied = [];
  try {
    const ensured = [];
    for (const rule of labelRules) {
      if (await ensureLabel(repo, rule)) ensured.push(rule.label);
    }
    if (ensured.length > 0) {
      await api('POST', `/repos/${repo}/issues/${issue.number}/labels`, {
        labels: ensured,
      });
      applied = ensured;
    }
  } catch (err) {
    console.warn(`::warning::No se pudieron aplicar las labels: ${err.message}`);
  }

  // 2. Formato del cuerpo (el reporte original queda intacto dentro)
  await api('PATCH', `/repos/${repo}/issues/${issue.number}`, { body: newBody });

  console.log(`Issue #${issue.number} clasificado — labels: ${applied.join(', ') || '(ninguna)'}`);
}

main().catch((err) => {
  console.error(`::error::${err.message}`);
  process.exitCode = 1;
});
