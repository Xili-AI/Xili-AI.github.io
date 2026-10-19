#!/usr/bin/env node
'use strict';

/**
 * Sanity checks for the generated SVGs:
 *   - every shape stays inside the canvas
 *   - text baselines do not collide with the bottom edge
 *   - the canvas height matches the lowest drawn element
 *
 * Run: node tools/check-visuals.js
 */

const fs = require('fs');
const path = require('path');

const VIS = path.resolve(__dirname, '..', 'assets', 'vis');

let problems = 0;

function readBox(el) {
  const n = (a) => Number(el.getAttribute(a) || 0);
  switch (el.tagName) {
    case 'rect':
      return { x: n('x'), y: n('y'), w: n('width'), h: n('height') };
    case 'circle':
      return { x: n('cx') - n('r'), y: n('cy') - n('r'), w: n('r') * 2, h: n('r') * 2 };
    case 'text': {
      const size = Number(el.getAttribute('font-size') || 12);
      return { x: n('x'), y: n('y') - size, w: size * 0.6, h: size * 1.25 };
    }
    case 'polygon': {
      const pts = (el.getAttribute('points') || '').split(/\s+/).filter(Boolean)
        .map((p) => p.split(',').map(Number));
      if (!pts.length) return null;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      return {
        x: Math.min(...xs), y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
      };
    }
    case 'line': {
      const xs = [n('x1'), n('x2')];
      const ys = [n('y1'), n('y2')];
      return {
        x: Math.min(...xs), y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
      };
    }
    case 'image': {
      const s = n('y') + n('height');
      return { x: n('x'), y: n('y'), w: n('width'), h: n('height'), s };
    }
    default:
      return null;
  }
}

for (const file of fs.readdirSync(VIS).filter((f) => f.endsWith('.svg'))) {
  const raw = fs.readFileSync(path.join(VIS, file), 'utf8');
  const W = Number(raw.match(/width="(\d+)"/)[1]);
  const H = Number(raw.match(/height="(\d+)"/)[1]);
  const body = raw.substring(raw.indexOf('</defs>') + 8);

  const out = [];
  const re = /<(rect|circle|text|polygon|line|image)\b[^>]*\/?>/g;
  let m = re.exec(body);
  while (m) {
    const tag = m[1];
    const box = readBox({
      tagName: tag,
      getAttribute: (a) => (m[0].match(new RegExp(`${a}="([^"]*)"`)) || [, '0'])[1],
    });
    if (box) {
      const right = box.x + box.w;
      const bottom = box.y + box.h;
      const label = `${tag}(${Math.round(box.x)},${Math.round(box.y)}) ${Math.round(box.w)}x${Math.round(box.h)}`;
      if (box.x < -2) out.push(`  LEFT   ${label}`);
      if (right > W + 2) out.push(`  RIGHT  ${label}  right=${Math.round(right)} > ${W}`);
      if (bottom > H + 2) out.push(`  BOTTOM ${label}  bottom=${Math.round(bottom)} > ${H}`);
      if (box.y < -2) out.push(`  TOP    ${label}`);
    }
    m = re.exec(body);
  }

  // lowest element
  let lowest = 0;
  const re2 = /<(rect|circle|text|polygon|line|image)\b[^>]*\/?>/g;
  let m2 = re2.exec(body);
  while (m2) {
    const box = readBox({
      tagName: m2[1],
      getAttribute: (a) => (m2[0].match(new RegExp(`${a}="([^"]*)"`)) || [, '0'])[1],
    });
    if (box) lowest = Math.max(lowest, box.y + box.h);
    m2 = re2.exec(body);
  }

  if (out.length) {
    problems += out.length;
    console.log(`\x1b[31m${file}\x1b[0m  ${W}x${H}  (lowest element y=${Math.round(lowest)})`);
    out.slice(0, 12).forEach((l) => console.log(l));
    if (out.length > 12) console.log(`  ... ${out.length - 12} more`);
  } else {
    const slack = Math.round(H - lowest);
    console.log(`\x1b[32mOK\x1b[0m  ${file.padEnd(20)} ${W}x${H}  bottom slack ${slack}px`);
  }
}

console.log(problems ? `\n${problems} overflow problem(s)` : '\nno overflow problems');
process.exit(problems ? 1 : 0);
