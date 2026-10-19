// Local preview for the XILI-AI org profile README.
// Usage:  npm install && npm run preview   ->  opens ../preview.html
const fs = require('fs');
const path = require('path');

let marked;
try {
  ({ marked } = require('marked'));
} catch (e) {
  console.error('missing dependency. run: npm install');
  process.exit(1);
}

const REPO = path.resolve(__dirname, '..');
// The org profile lives in the sibling Xili-AI/.github repository.
const PROFILE_REPO = process.env.PROFILE_REPO || path.resolve(REPO, '..', '.github');
const SRC = path.join(PROFILE_REPO, 'profile', 'README.md');
const OUT = path.join(REPO, 'preview.html');

const md = fs.readFileSync(SRC, 'utf8');
const html = marked.parse(md, { gfm: true, breaks: false });

// Point every asset at the local file so the preview works offline:
//   ../assets/x.png                -> file:///<repo>/assets/x.png
//   https://raw.githubusercontent.com/Xili-AI/Xili-AI.github.io/main/assets/x
//   https://xili-ai.github.io/assets/x
// (paths must use forward slashes, browsers reject backslashes in file:// URLs)
const posix = (p) => p.replace(/\\/g, '/');
const REPO_URL = `file:///${posix(REPO)}`;
const fixed = html
  .replace(/(src|href)="\.\.\/assets\/([^"]+)"/g, (_m, a, p) => `${a}="${REPO_URL}/assets/${p}"`)
  .replace(/(src|href)="https:\/\/raw\.githubusercontent\.com\/Xili-AI\/Xili-AI\.github\.io\/main\/([^"?]+)(?:\?v=[a-z0-9]+)?"/g,
    (_m, a, p) => `${a}="${REPO_URL}/${p}"`)
  .replace(/(src|href)="https:\/\/xili-ai\.github\.io\/([^"?]+)(?:\?v=[a-z0-9]+)?"/g,
    (_m, a, p) => `${a}="${REPO_URL}/${p}"`);

const shell = `<!DOCTYPE html>
<html lang="zh-CN" data-color-mode="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>XILI-AI Profile Preview</title>
<style>
  :root{
    --fg-default:#e6edf3; --fg-muted:#8b949e; --bg-canvas:#0d1117; --bg-subtle:#161b22;
    --border:#30363d; --accent:#58a6ff; --border-muted:#21262d;
    --code-bg:#151b23; --shadow:0 1px 0 rgba(1,4,9,.04),0 8px 24px rgba(1,4,9,.28);
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg-canvas);color:var(--fg-default);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,
    "PingFang SC","Microsoft YaHei",sans-serif;
    font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;}
  .page{max-width:1012px;margin:0 auto;padding:32px 24px 80px;}
  .banner{background:var(--bg-subtle);border:1px solid var(--border-muted);border-radius:12px;
    padding:22px 26px;margin-bottom:28px;box-shadow:var(--shadow);}
  .banner h1{font-size:20px;margin:0 0 6px;}
  .banner p{margin:0;color:var(--fg-muted);font-size:14px;}
  .markdown-body{font-size:16px;line-height:1.6;word-wrap:break-word;}
  .markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4{
    margin-top:24px;margin-bottom:16px;font-weight:600;line-height:1.25;}
  .markdown-body h1{padding-bottom:.3em;border-bottom:1px solid var(--border-muted);font-size:2em;}
  .markdown-body h2{padding-bottom:.3em;border-bottom:1px solid var(--border-muted);font-size:1.5em;}
  .markdown-body h3{font-size:1.25em;}
  .markdown-body p{margin-top:0;margin-bottom:16px;}
  .markdown-body a{color:var(--accent);text-decoration:none;}
  .markdown-body a:hover{text-decoration:underline;}
  .markdown-body img{max-width:100%;box-sizing:content-box;background-color:transparent;}
  .markdown-body code,.markdown-body tt{padding:.2em .4em;margin:0;font-size:85%;
    background-color:var(--code-bg);border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
  .markdown-body pre{padding:16px;overflow:auto;font-size:85%;line-height:1.45;
    background-color:var(--code-bg);border-radius:6px;}
  .markdown-body pre code{padding:0;background:transparent;border:0;}
  .markdown-body hr{height:.25em;padding:0;margin:24px 0;background-color:var(--border);border:0;}
  .markdown-body table{display:block;width:max-content;max-width:100%;overflow:auto;
    border-spacing:0;border-collapse:collapse;margin-bottom:16px;}
  .markdown-body table th,.markdown-body table td{padding:6px 13px;border:1px solid var(--border);}
  .markdown-body table th{font-weight:600;background-color:var(--bg-subtle);}
  .markdown-body table tr:nth-child(2n){background-color:rgba(110,118,129,.1);}
  .markdown-body blockquote{padding:0 1em;color:var(--fg-muted);border-left:.25em solid var(--border);margin:0 0 16px;}
  .markdown-body ul,.markdown-body ol{padding-left:2em;margin-top:0;margin-bottom:16px;}
  .markdown-body li+li{margin-top:.25em;}
</style>
</head>
<body>
<div class="page">
  <div class="banner">
    <h1>Local preview &mdash; XILI-AI org profile</h1>
    <p>Source: <code>profile/README.md</code> &nbsp;&middot;&nbsp; hover the project cards to rotate them in 3D, hover the contributor bars to lift them.</p>
  </div>
  <article class="markdown-body">
${fixed}
  </article>
</div>
</body>
</html>`;

fs.writeFileSync(OUT, shell, 'utf8');
console.log('preview written ->', OUT);
