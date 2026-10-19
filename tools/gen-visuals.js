#!/usr/bin/env node
'use strict';

/**
 * Generates the animated SVG assets used by the org profile README.
 *
 * Why SVG files instead of a <style> block: GitHub's markdown sanitiser
 * strips style blocks, style/class attributes, inline SVG and iframes.
 * But an SVG *file* referenced with markdown image syntax is served as
 * image/svg+xml untouched, and the browser animates its embedded CSS
 * keyframes and SMIL. The README stays 100% basic Markdown.
 *
 *   node tools/gen-visuals.js
 *
 * Reads:  assets/stats/snapshot.json
 * Writes: assets/vis/*.svg
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const VIS = path.join(REPO, 'assets', 'vis');
const IMG = path.join(REPO, 'assets', 'image');
const SNAPSHOT = path.join(REPO, 'assets', 'stats', 'snapshot.json');

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[c]));

const dataUri = (file) =>
  `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

const kfmt = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const r2 = (n) => Math.round(n * 100) / 100;

const rect = (x, y, w, h, fill, extra = '') =>
  `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fill}" ${extra}/>`;

const poly = (list, fill, extra = '') =>
  `<polygon points="${list.map((p) => `${r2(p[0])},${r2(p[1])}`).join(' ')}" fill="${fill}" ${extra}/>`;

const line = (x1, y1, x2, y2, stroke, extra = '') =>
  `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${stroke}" ${extra}/>`;

const text = (x, y, str, opts = {}) => {
  const {
    size = 16, fill = '#cfe8ff', anchor = 'start', family = 'monospace',
    weight = 'normal', ls = '0', opacity = '1', extra = '',
  } = opts;
  return `<text x="${r2(x)}" y="${r2(y)}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${opacity}" ${extra}>${esc(str)}</text>`;
};

/**
 * Isometric box helper.
 *   cx,cy  centre of the top face on screen
 *   rx,ry  half width / half depth of the rhombus footprint
 *   h      height, t  thickness of the slab (top face sits h above the base)
 */
function isoBox(cx, cy, rx, ry, h) {
  const N = [cx, cy - ry];
  const E = [cx + rx, cy];
  const S = [cx, cy + ry];
  const W = [cx - rx, cy];
  return { N, E, S, W, top: [N, E, S, W] };
}

const svgDoc = (w, h, body, css = '') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
<defs>
<style>
${css}
</style>
</defs>
${body}
</svg>
`;

/* ============================================================ hero banner === */

function heroSvg(data) {
  const W = 1000;
  const H = 314;
  const logo = dataUri(path.join(IMG, 'logo.png'));
  const robot = dataUri(path.join(IMG, '3D.png'));

  const followers = (data.org && data.org.followers) || 0;
  const repos = (data.repos || []).filter((r) => r.name !== '.github').length;
  const members = (data.contributors || []).length;

  const grid = [];
  for (let x = 0; x <= W; x += 50) grid.push(rect(x, 0, 1, H, 'rgba(95,211,243,.04)'));
  for (let y = 0; y <= H; y += 50) grid.push(rect(0, y, W, 1, 'rgba(95,211,243,.04)'));

  const typing = 'Visual Intelligence + LLM Applications';
  const charW = 16.3;                 // 27px monospace advance
  const textW = typing.length * charW;
  const clipX = 500 - textW / 2;

  const css = `
.glow{animation:hl 3.6s ease-in-out infinite;}
@keyframes hl{0%,100%{opacity:.35}50%{opacity:.9}}
.typing-clip{animation:tp 9s steps(${typing.length},end) infinite;}
@keyframes tp{0%{width:0}40%{width:${r2(textW)}px}82%{width:${r2(textW)}px}90%{width:0}100%{width:0}}
.caret{animation:cb 1s step-end infinite;}
@keyframes cb{0%,100%{opacity:1}50%{opacity:0}}
.bot{animation:fl 4.2s ease-in-out infinite;}
@keyframes fl{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-14px) rotate(1.5deg)}}
.badge{animation:bp 3.6s ease-in-out infinite;}
.badge.b2{animation-delay:-.9s}
.badge.b3{animation-delay:-1.8s}
@keyframes bp{0%,100%{opacity:.5}50%{opacity:1}}
`;

  const body = `
${grid.join('')}
<defs><radialGradient id="glow1" cx="50%" cy="50%" r="50%">
<stop offset="0%" stop-color="#4ea8ff" stop-opacity=".40"/>
<stop offset="45%" stop-color="#2f60c4" stop-opacity=".20"/>
<stop offset="100%" stop-color="#2f60c4" stop-opacity="0"/>
</radialGradient></defs>
<ellipse class="glow" cx="500" cy="96" rx="380" ry="150" fill="url(#glow1)"/>

<image x="290" y="30" width="420" height="94" href="${logo}" xlink:href="${logo}"/>

<defs><clipPath id="tclip"><rect class="typing-clip" x="${r2(clipX)}" y="158" width="0" height="36"/></clipPath></defs>
<g clip-path="url(#tclip)">
  ${text(500, 186, typing, { size: 27, fill: '#5fd3f3', anchor: 'middle', ls: '1' })}
</g>
<rect class="caret" x="${r2(500 + textW / 2 + 4)}" y="164" width="3" height="24" fill="#5fd3f3"/>

${text(500, 224, '视觉智能 · 大模型应用 · 让算法真正落地到产线', { size: 17, fill: '#8fb3e8', anchor: 'middle', family: 'sans-serif', ls: '2' })}

<g class="bot">
  <image x="856" y="104" width="126" height="126" href="${robot}" xlink:href="${robot}"/>
</g>

<g class="badge b1">
  <rect x="272" y="250" width="136" height="30" rx="6" fill="#0f1e3c" stroke="#2f60c4" stroke-width="2"/>
  ${text(340, 271, `👥 ${followers} Followers`, { size: 14, fill: '#cfe8ff', anchor: 'middle' })}
</g>
<g class="badge b2">
  <rect x="420" y="250" width="122" height="30" rx="6" fill="#0f1e3c" stroke="#2f60c4" stroke-width="2"/>
  ${text(481, 271, `📦 ${repos} Repos`, { size: 14, fill: '#cfe8ff', anchor: 'middle' })}
</g>
<g class="badge b3">
  <rect x="554" y="250" width="138" height="30" rx="6" fill="#0f1e3c" stroke="#2f60c4" stroke-width="2"/>
  ${text(623, 271, `⚡ ${members} Members`, { size: 14, fill: '#cfe8ff', anchor: 'middle' })}
</g>
`;

  return svgDoc(W, H, body, css);
}

/* ============================================================== CPU chip === */
/*
 * Flat, straight-down view of the chip. The site version is the 3D one;
 * this SVG is the flat variant used on the org profile README, where an
 * SVG image can never be interactive, so a clean top-down read is clearer
 * at small sizes.
 */

function cpuSvg() {
  const W = 520;
  const H = 470;
  const logo = dataUri(path.join(IMG, 'logo.png'));
  const robot = dataUri(path.join(IMG, '3D.png'));

  // package (the chip body)
  const px = 96;
  const py = 66;
  const pw = 328;
  const ph = 330;

  // die (the silicon)
  const dx = 165;
  const dy = 110;
  const dw = 190;
  const dh = 190;
  const dcx = dx + dw / 2;
  const dcy = dy + dh / 2;

  const robotW = 132;
  const robotX = dcx - robotW / 2;
  const robotY = dcy - robotW / 2 - 8;

  // gold pins on all four sides
  const pins = [];
  const N_PINS = 13;
  const PIN_W = 9;
  const PIN_L = 20;
  const PIN_GAP = (pw - 30) / N_PINS;
  for (let i = 0; i < N_PINS; i += 1) {
    const t = px + 15 + PIN_GAP * (i + 0.5) - PIN_W / 2;
    pins.push(rect(t, py - PIN_L, PIN_W, PIN_L, '#e8c96a', 'opacity=".9"'));
    pins.push(rect(t, py + ph, PIN_W, PIN_L, '#e8c96a', 'opacity=".9"'));
  }
  const PIN_GAP_V = (ph - 30) / N_PINS;
  for (let i = 0; i < N_PINS; i += 1) {
    const t = py + 15 + PIN_GAP_V * (i + 0.5) - PIN_W / 2;
    pins.push(rect(px - PIN_L, t, PIN_L, PIN_W, '#e8c96a', 'opacity=".9"'));
    pins.push(rect(px + pw, t, PIN_L, PIN_W, '#e8c96a', 'opacity=".9"'));
  }

  // circuit traces on the die
  const traces = [];
  for (let gx = dx + 16; gx < dx + dw; gx += 16) {
    traces.push(line(gx, dy + 8, gx, dy + dh - 8, 'rgba(95,211,243,.13)', 'stroke-width="1"'));
  }
  for (let gy = dy + 16; gy < dy + dh; gy += 16) {
    traces.push(line(dx + 8, gy, dx + dw - 8, gy, 'rgba(95,211,243,.13)', 'stroke-width="1"'));
  }
  // a few brighter L-shaped power rails
  const rails = [
    [dx + 16, dy + 34, dx + 84, dy + 34, dx + 84, dy + 92],
    [dx + dw - 16, dy + 70, dx + dw - 74, dy + 70, dx + dw - 74, dy + 128],
    [dx + 40, dy + dh - 16, dx + 40, dy + dh - 78, dx + 104, dy + dh - 78],
    [dx + dw - 48, dy + dh - 16, dx + dw - 48, dy + dh - 62, dx + dw - 110, dy + dh - 62],
  ];
  rails.forEach((r) => {
    traces.push(line(r[0], r[1], r[2], r[3], 'rgba(95,211,243,.34)', 'stroke-width="1.6"'));
    traces.push(line(r[2], r[3], r[4], r[5], 'rgba(95,211,243,.34)', 'stroke-width="1.6"'));
  });

  // electrons: many small dots drifting in different directions
  const seed = [
    [0.10, 0.14, 46, 14], [0.26, 0.30, -34, 30], [0.42, 0.12, 52, 22],
    [0.60, 0.26, -44, 26], [0.78, 0.14, 38, 34], [0.90, 0.36, -30, 20],
    [0.14, 0.50, 48, -18], [0.32, 0.64, -40, 26], [0.52, 0.52, 44, 30],
    [0.70, 0.68, -46, -20], [0.86, 0.58, 32, 26], [0.20, 0.84, 42, -30],
    [0.44, 0.86, -38, -22], [0.66, 0.88, 40, -26], [0.84, 0.84, -30, -28],
  ];
  const sparks = seed.map((s, i) => {
    const sx = dx + s[0] * dw;
    const sy = dy + s[1] * dh;
    const delay = (i * 0.24).toFixed(2);
    const r = 2 + (i % 3) * 0.5;
    return `<circle cx="${r2(sx)}" cy="${r2(sy)}" r="${r}" fill="#e8fdff" opacity="0">
  <animate attributeName="cx" values="${r2(sx)};${r2(sx + s[2])};${r2(sx + s[2] * 0.4)}" dur="3.6s" begin="${delay}s" repeatCount="indefinite"/>
  <animate attributeName="cy" values="${r2(sy)};${r2(sy + s[3])};${r2(sy + s[3] * 0.3)}" dur="3.6s" begin="${delay}s" repeatCount="indefinite"/>
  <animate attributeName="opacity" values="0;0.95;0.6;0" keyTimes="0;0.18;0.6;1" dur="3.6s" begin="${delay}s" repeatCount="indefinite"/>
</circle>`;
  });

  // soft current wash over the die
  const wash = [];

  const css = `
.pkg{animation:pl 3.6s ease-in-out infinite;}
@keyframes pl{0%,100%{filter:brightness(.74)}50%{filter:brightness(1.4)}}
.die{animation:dd 3.6s ease-in-out infinite;}
@keyframes dd{0%,100%{filter:brightness(.78)}50%{filter:brightness(1.3)}}
.core{animation:ck 3.6s ease-in-out infinite;}
@keyframes ck{0%,100%{opacity:.72}50%{opacity:1}}
.pin{animation:pn 3.6s ease-in-out infinite;}
@keyframes pn{0%,100%{opacity:.55}50%{opacity:1}}
`;

  const body = `
<defs>
  <radialGradient id="glow3" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#5fd3f3" stop-opacity=".22"/>
    <stop offset="100%" stop-color="#2f60c4" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="pkgG" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#28406c"/>
    <stop offset="45%" stop-color="#16294b"/>
    <stop offset="100%" stop-color="#0b1730"/>
  </linearGradient>
  <linearGradient id="dieG" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0%" stop-color="#0d2340"/>
    <stop offset="100%" stop-color="#060e1c"/>
  </linearGradient>
</defs>

<g class="pin">
  ${pins.join('\n')}
</g>

<g class="pkg">
  ${rect(px, py, pw, ph, 'url(#pkgG)', 'rx="10" stroke="#4a6daa" stroke-width="2"')}
  ${rect(px + 12, py + 12, pw - 24, ph - 24, 'none', 'rx="6" stroke="rgba(95,211,243,.20)" stroke-width="1"')}
</g>

<g class="die">
  ${rect(dx, dy, dw, dh, 'url(#dieG)', `rx="12" stroke="#5fd3f3" stroke-width="1.6"`)}
  ${rect(dx - 26, dy - 26, dw + 52, dh + 52, 'url(#glow3)', 'rx="24"')}
  ${traces.join('\n')}
  ${wash.join('\n')}
  ${sparks.join('\n')}
  <g class="core">
    <svg x="${r2(robotX)}" y="${r2(robotY)}" width="${robotW}" height="${robotW}" viewBox="0 0 400 232" preserveAspectRatio="xMidYMid meet">
      <image width="400" height="400" href="${robot}" xlink:href="${robot}"/>
    </svg>
  </g>
</g>

<image x="${r2(dcx - 70)}" y="${r2(py + ph - 74)}" width="140" height="31" href="${logo}" xlink:href="${logo}"/>
`;

  return svgDoc(W, H, body, css);
}

/* ==================================================== 3D contributors bar === */

function contributorsSvg(data) {
  const rows = (data.contributors || []).slice().sort((a, b) => b.commits - a.commits);
  if (!rows.length) {
    return svgDoc(900, 120, text(450, 60, 'no members yet', { size: 18, anchor: 'middle', fill: '#6d8ec2' }));
  }

  const max = Math.max(1, ...rows.map((r) => r.commits));
  const total = rows.reduce((s, r) => s + r.commits, 0);

  const gap = 86;                                   // room for the label under each bar
  const W = Math.max(880, rows.length * gap + 170);
  const H = 430;
  const baseY = 300;
  const rx = 21;
  const ry = 10;
  const MAXH = 175;
  const span = rows.length * gap;
  const startX = W / 2 - span / 2 + gap / 2;

  const bars = [];
  const labels = [];

  rows.forEach((r, i) => {
    const h = r.commits > 0 ? Math.max(16, (r.commits / max) * MAXH) : 5;
    const cx = startX + i * gap;
    const cy = baseY - h;              // centre of the top face

    const N = [cx, cy - ry];
    const E = [cx + rx, cy];
    const S = [cx, cy + ry];
    const Wp = [cx - rx, cy];
    const down = (p, d) => [p[0], p[1] + d];

    const wallLeft = [Wp, S, down(S, h), down(Wp, h)];
    const wallRight = [S, E, down(E, h), down(S, h)];
    const cap = [N, E, S, Wp];

    const dim = r.commits > 0 ? '' : ' opacity=".4"';
    bars.push(
      `<g class="bar" style="animation-delay:${(i * 0.12).toFixed(2)}s"${dim}>` +
      poly(wallLeft, '#2b4f9e', 'stroke="#0b1b3a" stroke-width="1"') +
      poly(wallRight, '#1b3358', 'stroke="#0b1b3a" stroke-width="1"') +
      poly(cap, '#9fe9ff', 'stroke="#0b1b3a" stroke-width="1"') +
      `</g>`
    );

    labels.push(text(cx, cy - 12, kfmt(r.commits), { size: 15, anchor: 'middle', fill: '#eaf7ff' }));
    const short = r.login.length > 12 ? `${r.login.slice(0, 11)}…` : r.login;
    labels.push(text(cx, baseY + 34, short, { size: 12, anchor: 'middle', fill: '#8fb3e8' }));
  });

  // floor grid
  const floor = [];
  const gx0 = -(span / 2) - 40;
  const gx1 = span / 2 + 40;
  for (let g = gx0; g <= gx1; g += 24) {
    floor.push(line(
      W / 2 + g - 10, baseY - 4,
      W / 2 + g + 20, baseY + 26,
      'rgba(95,211,243,.20)', 'stroke-width="1"'
    ));
  }
  for (let k = 0; k <= 5; k += 1) {
    const yy = baseY - 4 + k * 6;
    floor.push(line(W / 2 + gx0 - 10, yy, W / 2 + gx1 + 20, yy, 'rgba(95,211,243,.16)', 'stroke-width="1"'));
  }

  const css = `
.bar{animation:bg 3.6s ease-in-out infinite;}
@keyframes bg{0%,100%{filter:brightness(.76)}50%{filter:brightness(1.4)}}
.floor{animation:fg 3.6s ease-in-out infinite;}
@keyframes fg{0%,100%{opacity:.5}50%{opacity:1}}
`;

  const body = `
<g class="floor">${floor.join('')}</g>
${bars.join('\n')}
${labels.join('\n')}
${text(W / 2, 42, 'COMMITS BY MEMBER', { size: 16, anchor: 'middle', fill: '#fff', ls: '2' })}
${text(W / 2, 68, `${rows.length} member(s) · ${kfmt(total)} commit(s)`, { size: 15, anchor: 'middle', fill: '#6d8ec2' })}
`;

  return svgDoc(W, H, body, css);
}

/* ================================================================= main === */

function main() {
  const data = fs.existsSync(SNAPSHOT)
    ? JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
    : { org: {}, repos: [], contributors: [], languages: {} };

  fs.mkdirSync(VIS, { recursive: true });

  const out = {
    'hero.svg': heroSvg(data),
    'cpu.svg': cpuSvg(),
    'contributors.svg': contributorsSvg(data),
  };

  for (const [name, content] of Object.entries(out)) {
    fs.writeFileSync(path.join(VIS, name), content, 'utf8');
    console.log(`[visuals] ${name}  ${(content.length / 1024).toFixed(1)} KB`);
  }
}

main();
