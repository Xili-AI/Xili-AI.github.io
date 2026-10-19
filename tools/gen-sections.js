#!/usr/bin/env node
'use strict';

/**
 * Renders the org profile README sections as self-contained animated SVGs.
 *
 * The README itself stays pure Markdown; every section is an SVG image
 * referenced with ![](url). The browser renders the SVG's own CSS
 * keyframes and SMIL, so the profile animates without any HTML in the
 * README.
 *
 *   node tools/gen-sections.js
 */

const fs = require('fs');
const path = require('path');

const K = require('./lib/svgkit');

const {
  esc, r2, dataUri, kfmt, FONT_PIXEL, FONT_MONO, FONT_BODY,
  rect, poly, line, text, svgDoc, measure, heading, sectionTitle,
  paragraph, chip, chipRow, panel, bar, COMMON_DEFS, backdrop,
} = K;

const REPO = path.resolve(__dirname, '..');
const VIS = path.join(REPO, 'assets', 'vis');
const IMG = path.join(REPO, 'assets', 'image');
const SNAPSHOT = path.join(REPO, 'assets', 'stats', 'snapshot.json');

const W = 900;            // matches the README column width
const logo = dataUri(path.join(IMG, 'logo.png'));
const robot = dataUri(path.join(IMG, '3D.png'));

const CSS = `
.panel{animation:pnl 3.6s ease-in-out infinite;}
@keyframes pnl{0%,100%{filter:brightness(.82)}50%{filter:brightness(1.18)}}
.chiplist{animation:cp 3.6s ease-in-out infinite;}
@keyframes cp{0%,100%{opacity:.6}50%{opacity:1}}
.glowdot{animation:gd 3.6s ease-in-out infinite;}
@keyframes gd{0%,100%{opacity:.3}50%{opacity:1}}
.scan{animation:sc 4.2s linear infinite;}
@keyframes sc{0%{transform:translateX(-40px)}100%{transform:translateX(40px)}}
`;

/* ================================================================ about === */

function aboutSvg() {
  const H = 452;
  const dirs = [
    ['👁 视觉智能', '图像 / 视频理解、目标检测与分割、OCR、视觉大模型微调与评测，服务真实场景下的感知与标注需求。'],
    ['🧠 大模型应用', '以 RAG 为核心的知识库工程、实体与关系抽取、智能体编排、模型微调与推理加速，把模型能力转化为业务生产力。'],
    ['⚙ 工程交付', '数据治理、标注流水线、服务端架构与可观测性，交付稳定、可维护、可扩展的端到端系统。'],
  ];

  let body = COMMON_DEFS + backdrop(W, H);
  body += sectionTitle(W / 2, 52, 'ABOUT US', '苏州矽励科技有限公司 · Silicon Insight Technology');

  // intro paragraph
  const intro = paragraph(70, 108,
    '我们把计算机视觉的前沿能力与大语言模型的推理能力相结合，用工程化方法把它们沉淀为可交付、可落地的产品系统。',
    W - 140, { size: 14.5, fill: '#bcd6fb' });
  body += intro.svg;

  // three direction cards
  const cw = 240;
  const gap = 22;
  const x0 = (W - (cw * 3 + gap * 2)) / 2;
  const cy = 168;
  const ch = 210;

  dirs.forEach((d, i) => {
    const x = x0 + i * (cw + gap);
    const delay = (i * 0.45).toFixed(2);
    body += `<g class="panel" style="animation-delay:${delay}s">`;
    body += panel(x, cy, cw, ch, { fill: 'url(#panelG)', stroke: '#2b4a86', accent: '#5fd3f3' });
    body += text(x + 22, cy + 40, d[0], { size: 15, fill: '#fff', family: FONT_MONO, ls: '1' });
    const p = paragraph(x + 22, cy + 74, d[1], cw - 44, { size: 13, fill: '#a9c7f5' });
    body += p.svg;
    body += '</g>';
  });

  body += rect(70, cy + ch + 30, W - 140, 2, '#1d3567');
  body += text(W / 2, cy + ch + 58, '核心能力：LLM · 知识图谱 · 向量检索 · 计算机视觉 · 标注流水线',
    { size: 14, fill: '#6d8ec2', anchor: 'middle', family: FONT_MONO });

  return svgDoc(W, H, body, CSS);
}

/* ============================================================== projects === */

function projectsSvg() {
  const cw = 400;
  const gap = 24;
  const x0 = (W - (cw * 2 + gap)) / 2;
  const cy = 104;             // below the section title
  const ch = 340;

  const projects = [
    {
      name: 'Xili-ReportRAG',
      desc: '质量部知识库管理系统。基于 LLM + 向量检索 + 知识图谱，从 8D 质量报告中抽取实体与关系，支持混合检索、RAG 流式问答与 AI 根因推理。',
      stack: ['Python', 'Flask', 'MySQL', 'Qdrant', 'Neo4j', 'Qwen3-VL', 'MinerU', 'Vue 3', 'TypeScript', 'Naive UI', 'ECharts', 'uv', 'Docker'],
    },
    {
      name: 'AutoLabel',
      desc: '桌面端自动标注 / 模型训练工具。覆盖预训练权重加载、数据集准备、自动标注、模型训练与训练曲线查看的完整闭环，配套 Labelme 标注规范。',
      stack: ['Python', 'tkinter', 'YOLO', 'PyTorch', 'OpenCV', 'scikit-learn', 'TensorBoard', 'Labelme', 'numpy', 'pandas', 'uv'],
    },
  ];

  const chipTop = cy + 222;
  const chipMax = cw - 44;

  // measure the chip rows first so the card can be sized to fit them
  let maxChipH = 0;
  projects.forEach((p) => {
    const r = chipRow(0, 0, p.stack, chipMax, { size: 11 });
    maxChipH = Math.max(maxChipH, r.height);
  });
  const cardH = Math.max(ch, chipTop - cy + maxChipH + 26);

  const bannerY = cy + cardH + 30;
  const H = bannerY + 78 + 56;

  let body = COMMON_DEFS + backdrop(W, H);
  body += sectionTitle(W / 2, 46, 'PROJECTS', '官网版本支持 3D 悬停交互');

  projects.forEach((p, i) => {
    const x = x0 + i * (cw + gap);
    const delay = (i * 0.5).toFixed(2);
    body += `<g class="panel" style="animation-delay:${delay}s">`;
    body += panel(x, cy, cw, cardH, { fill: 'url(#cardG)', stroke: '#3a5b93' });
    // private badge
    body += rect(x + 22, cy + 20, 104, 22, 'rgba(255,196,61,.12)', 'rx="11" stroke="rgba(255,196,61,.45)" stroke-width="1"');
    body += text(x + 74, cy + 36, '🔒 PRIVATE', { size: 11, fill: '#ffd479', anchor: 'middle', family: FONT_MONO });
    body += heading(x + 22, cy + 82, p.name, { size: 16, fill: '#fff' });
    const d = paragraph(x + 22, cy + 112, p.desc, cw - 44, { size: 13, fill: '#a9c7f5' });
    body += d.svg;
    body += line(x + 22, cy + 196, x + cw - 22, cy + 196, '#1d3567', 'stroke-width="1"');
    body += text(x + 22, cy + 216, 'STACK', { size: 11, fill: '#6d8ec2', family: FONT_MONO, ls: '1' });
    const cr = chipRow(x + 22, chipTop, p.stack, chipMax, { size: 11 });
    body += cr.svg;
    body += '</g>';
  });

  // full-width roadmap banner
  const by = bannerY;
  body += `<g class="panel">`;
  body += panel(60, by, W - 120, 78, {
    fill: 'url(#panelG)', stroke: '#2f60c4', dash: 'stroke-dasharray="7 5"',
  });
  body += rect(84, by + 16, 118, 22, 'rgba(124,92,255,.14)', 'rx="11" stroke="rgba(124,92,255,.45)" stroke-width="1"');
  body += text(143, by + 32, '🚧 IN PROGRESS', { size: 11, fill: '#c3b0ff', anchor: 'middle', family: FONT_MONO });
  body += heading(84, by + 62, 'MORE IN THE PIPELINE', { size: 13, fill: '#fff' });
  const cr2 = chipRow(430, by + 20, ['Multimodal Eval', 'Vision Agent', 'LLM Serving', 'Data Platform'], W - 500, { size: 11.5 });
  body += cr2.svg;
  body += '</g>';

  return svgDoc(W, H, body, CSS);
}

/* ================================================================= stack === */

function stackSvg() {
  const H = 414;
  const rows = [
    ['后端', 'Python 3.10+ · Flask · FastAPI · SQLAlchemy · Gunicorn'],
    ['数据', 'MySQL · Qdrant · Neo4j'],
    ['模型', 'LLM（OpenAI 兼容协议）· Qwen3-VL-Embedding · PyTorch · MinerU · Stirling-PDF'],
    ['视觉', 'ultralytics YOLO · OpenCV · scikit-learn · TensorBoard'],
    ['前端', 'Vue 3 · TypeScript · Vite · Naive UI · Pinia · ECharts'],
    ['桌面端', 'tkinter · Labelme'],
    ['工程', 'uv · Docker · pytest · GitHub Actions'],
  ];

  let body = COMMON_DEFS + backdrop(W, H);
  body += sectionTitle(W / 2, 48, 'TECH STACK', '从数据到模型，从服务到交付');

  const y0 = 116;
  const rh = 38;
  rows.forEach((r, i) => {
    const y = y0 + i * rh;
    const delay = (i * 0.22).toFixed(2);
    body += `<g class="panel" style="animation-delay:${delay}s">`;
    body += rect(60, y, W - 120, rh - 8, 'rgba(19,36,73,.55)', 'rx="8" stroke="#1d3567" stroke-width="1"');
    body += rect(60, y, 6, rh - 8, '#5fd3f3', 'rx="3" opacity=".9"');
    body += text(84, y + 21, r[0], { size: 13, fill: '#5fd3f3', family: FONT_MONO, ls: '1' });
    body += text(180, y + 21, r[1], { size: 13, fill: '#cfe8ff', family: FONT_BODY });
    body += '</g>';
  });

  return svgDoc(W, H, body, CSS);
}

/* ================================================================= stats === */

function statsSvg(data) {
  const repos = (data.repos || []).filter((r) => r.name !== '.github');
  const langs = Object.entries(data.languages || {}).sort((a, b) => b[1] - a[1]);
  const rowH = 66;
  const langRows = langs.slice(0, 6);
  const H = 108 + repos.length * (rowH + 12) + langRows.length * 28 + 48;

  let body = COMMON_DEFS + backdrop(W, H);
  body += sectionTitle(W / 2, 48, 'STATS', '数据由 GitHub REST API 直读生成');

  // repo rows
  const cy = 112;
  repos.forEach((r, i) => {
    const y = cy + i * (rowH + 12);
    const delay = (i * 0.25).toFixed(2);
    body += `<g class="panel" style="animation-delay:${delay}s">`;
    body += panel(60, y, W - 120, rowH, { fill: 'url(#panelG)', stroke: '#2b4a86' });
    body += text(84, y + 28, r.private ? '🔒' : '🌐', { size: 14 });
    body += text(106, y + 28, r.name, { size: 14, fill: '#fff', family: FONT_MONO });
    const d = paragraph(106, y + 50, r.description || '—', W - 240, { size: 12, fill: '#8fb3e8' });
    body += d.svg;
    const met = `commits ${kfmt(r.commits || 0)}  ·  ★ ${kfmt(r.stars || 0)}  ·  ⑂ ${kfmt(r.forks || 0)}  ·  ${r.language || '—'}`;
    body += text(W - 76, y + 28, met, { size: 11, fill: '#6d8ec2', anchor: 'end', family: FONT_MONO });
    body += '</g>';
  });

  // language bars
  const ly = cy + repos.length * (rowH + 12) + 10;
  const total = langs.reduce((s, e) => s + e[1], 0) || 1;
  body += text(60, ly, 'LANGUAGES', { size: 11, fill: '#6d8ec2', family: FONT_MONO, ls: '1' });
  langRows.forEach((l, i) => {
    const y = ly + 16 + i * 28;
    const pct = l[1] / total;
    body += text(60, y + 11, l[0], { size: 12, fill: '#cfe8ff', family: FONT_MONO });
    body += bar(190, y, 560, 12, pct);
    body += text(768, y + 11, `${(pct * 100).toFixed(1)}%`, { size: 12, fill: '#7f9fd4', family: FONT_MONO });
  });

  return svgDoc(W, H, body, CSS);
}

/* ============================================================== contact === */

function contactSvg() {
  const H = 276;
  let body = COMMON_DEFS + backdrop(W, H);
  body += sectionTitle(W / 2, 48, 'CONTACT', '保持连接');

  const roles = [
    ['👁 视觉算法', '检测 / 分割 / 视觉大模型'],
    ['🧠 大模型应用', '知识库工程 / RAG / 微调'],
    ['🛠 全栈工程', '平台架构 / 数据管线'],
  ];
  const cw = 240;
  const gap = 22;
  const x0 = (W - (cw * 3 + gap * 2)) / 2;
  roles.forEach((r, i) => {
    const x = x0 + i * (cw + gap);
    const delay = (i * 0.4).toFixed(2);
    body += `<g class="panel" style="animation-delay:${delay}s">`;
    body += panel(x, 112, cw, 74, { fill: 'url(#panelG)', stroke: '#2b4a86' });
    body += text(x + 20, 140, r[0], { size: 14, fill: '#fff', family: FONT_MONO });
    body += text(x + 20, 166, r[1], { size: 12, fill: '#8fb3e8' });
    body += '</g>';
  });

  // contact buttons
  const by = 206;
  const btns = [
    ['GitHub', 'https://github.com/Xili-AI'],
    ['组织主页', 'https://github.com/Xili-AI/.github'],
    ['官网', 'https://xili-ai.github.io/'],
  ];
  let bx = W / 2 - 250;
  btns.forEach((b, i) => {
    const w = 150;
    const delay = (i * 0.3).toFixed(2);
    body += `<g class="chiplist" style="animation-delay:${delay}s">`;
    body += rect(bx, by, w, 34, '#0f1e3c', 'rx="7" stroke="#2f60c4" stroke-width="2"');
    body += text(bx + w / 2, by + 23, b[0], { size: 13, fill: '#cfe8ff', anchor: 'middle', family: FONT_MONO });
    body += '</g>';
    bx += w + 25;
  });

  return svgDoc(W, H, body, CSS);
}

/* ================================================================= main === */

function main() {
  const data = fs.existsSync(SNAPSHOT)
    ? JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
    : { org: {}, repos: [], contributors: [], languages: {} };

  fs.mkdirSync(VIS, { recursive: true });

  const out = {
    'about.svg': aboutSvg(),
    'projects.svg': projectsSvg(),
    'stack.svg': stackSvg(),
    'stats.svg': statsSvg(data),
    'contact.svg': contactSvg(),
  };

  for (const [name, content] of Object.entries(out)) {
    fs.writeFileSync(path.join(VIS, name), content, 'utf8');
    console.log(`[sections] ${name}  ${(content.length / 1024).toFixed(1)} KB`);
  }
}

main();
