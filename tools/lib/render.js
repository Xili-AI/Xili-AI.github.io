'use strict';

/**
 * Renders the generated blocks as pure GitHub Flavored Markdown.
 *
 * GitHub's markdown sanitiser strips <style>, style=, class=, inline <svg>
 * and <iframe> from READMEs, so everything injected here must be plain
 * Markdown - no angle-bracket tags at all.
 */

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/\|/g, '\\|')     // keep table cells from breaking the row
    .replace(/\r?\n/g, ' ');   // keep table cells on one line

/**
 * Where the animated SVG assets are published.
 *
 * These are read straight from the repository through raw.githubusercontent.com
 * rather than through the Pages URL, so the org profile picks up a new
 * version the moment it is pushed - no Pages build in the queue.
 */
const VIS_BASE = process.env.XILI_VIS_BASE
  || 'https://raw.githubusercontent.com/Xili-AI/Xili-AI.github.io/main/assets/vis';

const kfmt = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const daysAgo = (iso) => {
  if (!iso) return 'never';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const sizeLabel = (kb) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

/** The org profile repo is the page itself - it is never listed as a project. */
const isProfileRepo = (r) => r.name === '.github';
const projectRepos = (repos) => repos.filter((r) => !isProfileRepo(r));

/* ---------------------------------------------------------------- meta ---- */

function renderMeta(data) {
  const { org, repos, contributors } = data;
  const projects = projectRepos(repos);
  const priv = projects.filter((r) => r.private).length;
  const since = new Date(org.createdAt).getFullYear();

  return (
    `**${org.followers}** Followers · **${projects.length}** Repos · ` +
    `**${priv}** Private · **${contributors.length}** Members · Since ${since}`
  );
}

/* ----------------------------------------------------------- repo table ---- */

function renderRepos(data) {
  const repos = projectRepos(data.repos);
  if (!repos.length) return '_暂无仓库_';

  const rows = repos.map(
    (r) =>
      `| ${r.private ? '🔒' : '🌐'} | **${esc(r.name)}** | ${esc(r.description) || '—'} | ` +
      `${kfmt(r.commits || 0)} | ${kfmt(r.stars)} | ${kfmt(r.forks)} | ` +
      `${esc(r.language) || '—'} | ${esc(daysAgo(r.pushedAt))} |`
  );

  return [
    '| 可见性 | 仓库 | 简介 | 提交 | ★ | ⑂ | 语言 | 更新 |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | --- |',
    ...rows,
  ].join('\n');
}

/* --------------------------------------------------------- language table ---- */

function renderLanguages(data) {
  const entries = Object.entries(data.languages).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '_暂无语言数据_';

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const rows = entries.slice(0, 10).map(([lang, bytes]) => {
    const share = (bytes / total) * 100;
    return `| **${esc(lang)}** | ${share.toFixed(1)}% | ${bytes.toLocaleString('en-US')} |`;
  });

  return [
    '| 语言 | 占比 | 字节 |',
    '| --- | ---: | ---: |',
    ...rows,
  ].join('\n');
}

/* ------------------------------------------------------ contributor table ---- */

function renderContributors(data) {
  const rows = data.contributors;
  if (!rows.length) return '_暂无成员数据_';

  const totalCommits = rows.reduce((s, r) => s + r.commits, 0);
  const totalRepos = new Set(rows.flatMap((r) => r.repos || [])).size;

  const body = rows.map(
    (r) => `| **${esc(r.login)}** | ${kfmt(r.commits)} | ${r.repos.length} |`
  );

  return [
    `| 成员 | 提交 | 参与仓库 |`,
    `| --- | ---: | ---: |`,
    ...body,
    '',
    `合计 **${kfmt(totalCommits)}** 次提交，覆盖 **${totalRepos}** 个仓库。`,
    '',
    `![成员贡献 3D 柱状图](${VIS_BASE}/contributors.svg)`,
    '',
    `> 数据由 \`Xili-AI/Xili-AI.github.io\` 仓库的 \`tools/gen-stats.js\` 直读 GitHub REST API 生成，覆盖闭源仓库。`,
  ].join('\n');
}

module.exports = { renderMeta, renderRepos, renderLanguages, renderContributors, esc };
