#!/usr/bin/env node
'use strict';

/**
 * XILI-AI profile stats generator.
 *
 * Pulls every number the org profile shows straight from the GitHub REST API
 * (public AND private repos, using a PAT) and injects the rendered markup into
 * profile/README.md between marker comments. No third-party rendering service
 * is involved, so private repository data never leaves the org's own tooling.
 *
 *   node tools/gen-stats.js                 # live fetch, needs GITHUB_TOKEN
 *   node tools/gen-stats.js --offline        # re-render from assets/stats/snapshot.json
 *   node tools/gen-stats.js --dry-run        # fetch + print, touch nothing
 *
 * Token needs:  repo (read private repos)  +  read:org (list members)
 */

const fs = require('fs');
const path = require('path');

const { collect } = require('./lib/github');
const { renderMeta, renderRepos, renderLanguages, renderContributors } = require('./lib/render');

const REPO = path.resolve(__dirname, '..');
// The org profile lives in the sibling Xili-AI/.github repository.
const PROFILE_REPO = process.env.PROFILE_REPO || path.resolve(REPO, '..', '.github');
const README = path.join(PROFILE_REPO, 'profile', 'README.md');
const SNAPSHOT = path.join(REPO, 'assets', 'stats', 'snapshot.json');

const ORG = process.env.GITHUB_ORG || 'Xili-AI';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.PAT || '';

const argv = process.argv.slice(2);
const OFFLINE = argv.includes('--offline');
const DRY = argv.includes('--dry-run');

const log = (...a) => console.log('[stats]', ...a);

/**
 * The generated blocks are anchored to plain Markdown headings. Everything
 * between a heading and the next heading (or horizontal rule) is replaced,
 * so the README stays 100% basic Markdown - no angle-bracket tags, no
 * scripts, no HTML.
 */
const SECTIONS = {
  meta: '## 组织数据',
  repos: '### 仓库',
  languages: '### 语言分布',
  contributors: '### 成员贡献',
};

function inject(src, heading, html) {
  const lines = src.split('\n');
  const hi = lines.findIndex((l) => l.trim() === heading);
  if (hi < 0) {
    // The profile README renders most of its content as SVG sections, so a
    // missing block is normal - skip it instead of failing the whole run.
    log(`skip "${heading}" - block not present in the profile README`);
    return src;
  }
  let ei = hi + 1;
  while (ei < lines.length && !/^#{1,6}\s/.test(lines[ei]) && lines[ei].trim() !== '---') {
    ei += 1;
  }
  return [...lines.slice(0, hi + 1), '', html, '', ...lines.slice(ei)].join('\n');
}

async function main() {
  let data;

  if (OFFLINE) {
    if (!fs.existsSync(SNAPSHOT)) {
      throw new Error(`no snapshot at ${SNAPSHOT} - run without --offline first`);
    }
    data = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
    log(`offline: re-rendering from ${path.relative(REPO, SNAPSHOT)}`);
  } else {
    if (!TOKEN) {
      throw new Error(
        'no token found. Set GITHUB_TOKEN (PAT with "repo" + "read:org") or use --offline.'
      );
    }
    data = await collect({ org: ORG, token: TOKEN, log });
  }

  if (DRY) {
    log('dry run - nothing written');
    console.log(JSON.stringify(data, null, 2).slice(0, 4000));
    return;
  }

  const blocks = {
    meta: renderMeta(data),
    repos: renderRepos(data),
    languages: renderLanguages(data),
    contributors: renderContributors(data),
  };

  let readme = fs.readFileSync(README, 'utf8');
  for (const [key, html] of Object.entries(blocks)) {
    readme = inject(readme, SECTIONS[key], html);
  }

  // Cache-bust every visual asset so browsers fetch the freshly generated SVG
  // instead of a cached copy of the previous one.
  const stamp = Date.now().toString(36);
  readme = readme.replace(
    /(https:\/\/raw\.githubusercontent\.com\/Xili-AI\/Xili-AI\.github\.io\/main\/assets\/vis\/[a-z]+\.svg)(\?v=[a-z0-9]+)?/g,
    (_m, url) => `${url}?v=${stamp}`
  );
  readme = readme.replace(
    /(https:\/\/xili-ai\.github\.io\/assets\/vis\/[a-z]+\.svg)(\?v=[a-z0-9]+)?/g,
    (_m, url) => `${url}?v=${stamp}`
  );

  fs.writeFileSync(README, readme, 'utf8');
  log('injected blocks:', Object.keys(blocks).join(', '));
  log('asset cache stamp:', stamp);

  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(
    SNAPSHOT,
    `${JSON.stringify(
      { generatedAt: new Date().toISOString(), orgName: ORG, ...data },
      null,
      2
    )}\n`,
    'utf8'
  );
  log('snapshot written ->', path.relative(REPO, SNAPSHOT));

  log('summary:', {
    repos: data.repos.length,
    private: data.repos.filter((r) => r.private).length,
    members: data.contributors.length,
    commits: data.contributors.reduce((s, c) => s + c.commits, 0),
    languages: Object.keys(data.languages).length,
  });
}

main().catch((err) => {
  console.error('[stats] failed:', err.message);
  process.exit(1);
});
