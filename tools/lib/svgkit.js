'use strict';

/**
 * Shared SVG drawing primitives for the generated assets.
 *
 * SVG files are rendered by the browser in "secure static mode": no external
 * resources, no scripts. So web fonts have to be embedded as base64
 * @font-face inside the SVG itself - which is what FONT_CSS does.
 */

const fs = require('fs');
const path = require('path');

const FONT_DIR = path.resolve(__dirname, '..', '..', 'assets', 'font');

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[c]));

const r2 = (n) => Math.round(n * 100) / 100;

const dataUri = (file) =>
  `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

const kfmt = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

/* ------------------------------------------------------------- fonts --- */

function fontFace(family, file) {
  const p = path.join(FONT_DIR, file);
  if (!fs.existsSync(p)) return '';
  const b64 = fs.readFileSync(p).toString('base64');
  return `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-display:block;}\n`;
}

const PS2P = 'PS2P';
const VT3 = 'VT3';

const FONT_CSS = fontFace(PS2P, 'PressStart2P.woff2') + fontFace(VT3, 'VT323.woff2');

const FONT_PIXEL = `'${PS2P}','Courier New',monospace`;
const FONT_MONO = `'${VT3}','Courier New',monospace`;
const FONT_BODY = `'Noto Sans SC','Microsoft YaHei','PingFang SC','Hiragino Sans GB',sans-serif`;

/* ------------------------------------------------------------ shapes --- */

const rect = (x, y, w, h, fill, extra = '') =>
  `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fill}" ${extra}/>`;

const poly = (list, fill, extra = '') =>
  `<polygon points="${list.map((p) => `${r2(p[0])},${r2(p[1])}`).join(' ')}" fill="${fill}" ${extra}/>`;

const line = (x1, y1, x2, y2, stroke, extra = '') =>
  `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${stroke}" ${extra}/>`;

const text = (x, y, str, opts = {}) => {
  const {
    size = 15, fill = '#cfe8ff', anchor = 'start', family = FONT_BODY,
    weight = 'normal', ls = '0', opacity = '1', extra = '',
  } = opts;
  return `<text x="${r2(x)}" y="${r2(y)}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${opacity}" ${extra}>${esc(str)}</text>`;
};

const svgDoc = (w, h, body, css = '') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
<defs>
<style>
${FONT_CSS}
${css}
</style>
</defs>
${body}
</svg>
`;

/* --------------------------------------------------------- text bits --- */

/** Width of a string in px for the given family (rough but stable). */
function measure(str, size, family) {
  let w = 0;
  for (const ch of String(str)) {
    if (family === FONT_PIXEL) w += size;
    else if (family === FONT_MONO) w += size * 0.5;
    else if (/[\u3000-\u9fff\uff00-\uffef]/.test(ch)) w += size;
    else w += size * 0.55;
  }
  return w;
}

let titleSeq = 0;

/** Chunky pixel heading with a hard 3D drop shadow, like the site CSS. */
function heading(x, y, str, opts = {}) {
  const { size = 22, shadow = '#0b1b3a', fill = '#ffffff', family = FONT_PIXEL, ls = '1', off = 2 } = opts;
  return (
    text(x + off, y + off, str, { size, fill: shadow, family, ls }) +
    text(x, y, str, { size, fill, family, ls })
  );
}

/**
 * Section title as a chunky pixel plate, mirroring the site's .xl-head:
 * gradient body, dark 3D border, hard offset shadow underneath.
 */
function sectionTitle(cx, y, str, sub = '') {
  const size = 18;
  const tw = measure(str, size, FONT_PIXEL);
  const padX = 26;
  const w = tw + padX * 2;
  const h = 30;
  const x = cx - w / 2;
  const top = y - h + 8;
  const id = `hp${(titleSeq += 1)}`;

  let out = '';
  out += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#5b9bd5"/><stop offset="48%" stop-color="#2f60c4"/>
<stop offset="52%" stop-color="#1d3f8f"/><stop offset="100%" stop-color="#16307a"/>
</linearGradient></defs>`;
  // hard shadow plate
  out += rect(x, top + 6, w, h, '#0b1b3a', 'rx="7"');
  // plate
  out += rect(x, top, w, h, `url(#${id})`, 'rx="7" stroke="#0b1b3a" stroke-width="3"');
  out += text(cx, y, str, { size, fill: '#ffffff', anchor: 'middle', family: FONT_PIXEL, ls: '1' });
  if (sub) {
    out += text(cx, top + h + 30, sub, { size: 15, fill: '#6d8ec2', anchor: 'middle', family: FONT_MONO });
  }
  return out;
}

/** Greedy wrap that understands CJK (breaks anywhere) and Latin (breaks on spaces). */
function wrap(str, maxWidth, size, family) {
  const isCJK = (c) => /[\u3000-\u9fff\uff00-\uffef]/.test(c);
  const out = [];
  let line = '';
  let w = 0;
  let token = '';
  let tokenW = 0;

  const flush = () => {
    if (line.trim()) out.push(line.replace(/\s+$/, ''));
    line = '';
    w = 0;
  };

  const pushToken = () => {
    if (!token) return;
    if (w + tokenW > maxWidth) flush();
    if (tokenW > maxWidth) {
      for (const ch of token) {
        const cw = measure(ch, size, family);
        if (w + cw > maxWidth) flush();
        line += ch;
        w += cw;
      }
    } else {
      line += token;
      w += tokenW;
    }
    token = '';
    tokenW = 0;
  };

  for (const ch of Array.from(String(str))) {
    if (/\s/.test(ch)) {
      pushToken();
      if (line && w < maxWidth) {
        line += ' ';
        w += measure(' ', size, family);
      }
    } else if (isCJK(ch)) {
      pushToken();
      const cw = measure(ch, size, family);
      if (w + cw > maxWidth) flush();
      line += ch;
      w += cw;
    } else {
      token += ch;
      tokenW += measure(ch, size, family);
    }
  }
  pushToken();
  flush();
  return out;
}

/** A body paragraph that wraps and returns {svg, height}. */
function paragraph(x, y, str, maxWidth, opts = {}) {
  const { size = 13.5, fill = '#a9c7f5', lh = 1.85, family = FONT_BODY } = opts;
  const lines = wrap(str, maxWidth, size, family);
  let out = '';
  lines.forEach((ln, i) => {
    out += text(x, y + i * size * lh, ln, { size, fill, family });
  });
  return { svg: out, height: lines.length * size * lh, lines: lines.length };
}

/** A pill / tag. Returns {svg, width}. */
function chip(x, y, str, opts = {}) {
  const { size = 12, fill = '#bfe6ff', bg = 'rgba(95,211,243,.10)', stroke = 'rgba(95,211,243,.35)', pad = 9 } = opts;
  const w = measure(str, size, FONT_MONO) + pad * 2;
  const h = size + 9;
  let out = rect(x, y, w, h, bg, `rx="5" stroke="${stroke}" stroke-width="1"`);
  out += text(x + pad, y + h - 6, str, { size, fill, family: FONT_MONO });
  return { svg: out, width: w, height: h };
}

/** Lay a row of chips out, wrapping when the row is full. */
function chipRow(x, y, items, maxWidth, opts = {}) {
  const { gap = 7, rowGap = 7 } = opts;
  let out = '';
  let cx = x;
  let cy = y;
  let rowH = 0;
  items.forEach((it) => {
    const c = chip(cx, cy, it, opts);
    if (cx > x && cx + c.width > x + maxWidth) {
      cx = x;
      cy += rowH + rowGap;
      const c2 = chip(cx, cy, it, opts);
      out += c2.svg;
      cx += c2.width + gap;
      rowH = c2.height;
      return;
    }
    out += c.svg;
    cx += c.width + gap;
    rowH = Math.max(rowH, c.height);
  });
  return { svg: out, height: cy - y + rowH, width: cx - x };
}

/** A framed panel with an optional title strip. */
function panel(x, y, w, h, opts = {}) {
  const {
    fill = 'url(#panelG)', stroke = '#24467f', rx = 12, accent = null, dash = '',
  } = opts;
  let out = rect(x, y, w, h, fill, `rx="${rx}" stroke="${stroke}" stroke-width="1.6" ${dash}`);
  if (accent) {
    out += rect(x, y + 14, 4, h - 28, accent, 'rx="2" opacity=".9"');
  }
  return out;
}

/** A horizontal progress bar with a rounded track. */
function bar(x, y, w, h, pct, opts = {}) {
  const { from = '#3a6ed8', to = '#5fd3f3', track = '#0b1b3a' } = opts;
  const id = `g${Math.abs(Math.round(x * 7919 + y * 104729))}`;
  let out = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
</linearGradient></defs>`;
  out += rect(x, y, w, h, track, 'rx="4"');
  out += rect(x, y, Math.max(3, w * pct), h, `url(#${id})`, 'rx="4"');
  return out;
}

/** Standard gradient + glow defs used by the section graphics. */
const COMMON_DEFS = `<defs>
<linearGradient id="panelG" x1="0" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#132449"/><stop offset="100%" stop-color="#0a1428"/>
</linearGradient>
<linearGradient id="cardG" x1="0" y1="0" x2="0.8" y2="1">
  <stop offset="0%" stop-color="#15295b"/><stop offset="100%" stop-color="#0a1730"/>
</linearGradient>
<radialGradient id="softGlow" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#5fd3f3" stop-opacity=".10"/>
  <stop offset="100%" stop-color="#2f60c4" stop-opacity="0"/>
</radialGradient>
</defs>`;

/**
 * Dark backdrop so the asset reads as a designed panel on both the light
 * and the dark GitHub theme, with the same grid texture as the site.
 */
function backdrop(w, h, opts = {}) {
  const { bg = '#080d1a', step = 40, glow = true } = opts;
  let out = rect(0, 0, w, h, bg);
  const g = [];
  for (let x = 0; x <= w; x += step) g.push(rect(x, 0, 1, h, 'rgba(95,211,243,.045)'));
  for (let y = 0; y <= h; y += step) g.push(rect(0, y, w, 1, 'rgba(95,211,243,.045)'));
  out += g.join('');
  if (glow) {
    out += `<defs><radialGradient id="topGlow" cx="50%" cy="0%" r="70%">
<stop offset="0%" stop-color="#2f60c4" stop-opacity=".30"/>
<stop offset="100%" stop-color="#080d1a" stop-opacity="0"/>
</radialGradient></defs>`;
    out += rect(0, 0, w, Math.min(h, 220), 'url(#topGlow)');
  }
  return out;
}

module.exports = {
  esc, r2, dataUri, kfmt, FONT_CSS, FONT_PIXEL, FONT_MONO, FONT_BODY,
  rect, poly, line, text, svgDoc, measure, heading, sectionTitle,
  wrap, paragraph, chip, chipRow, panel, bar, COMMON_DEFS, backdrop,
};
