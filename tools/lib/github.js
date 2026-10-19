'use strict';

const API = 'https://api.github.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildHeaders(token) {
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'xili-ai-profile-stats',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * GET wrapper with the retries the GitHub REST API actually needs:
 *  - 202: /stats/* endpoints answer "still computing", poll again
 *  - 409: empty repository has no contributor stats yet
 *  - 403/429 with x-ratelimit-remaining: 0 -> wait for the reset window
 */
async function request(path, token, { retries = 4 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const res = await fetch(API + path, { headers: buildHeaders(token) });

    if (res.status === 202 || res.status === 409) {
      await sleep(2500);
      continue;
    }
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        const reset = Number(res.headers.get('x-ratelimit-reset') || 0) * 1000;
        const wait = Math.max(reset - Date.now(), 1000);
        if (wait < 60000) {
          await sleep(wait + 500);
          continue;
        }
      }
      throw new Error(`GitHub API refused ${path} (${res.status})`);
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status} on ${path}`);

    return res.json();
  }
  throw new Error(`GitHub API gave up on ${path}`);
}

/** Collect every number the profile page shows, across public AND private repos. */
async function collect({ org, token, log = () => {} }) {
  const enc = encodeURIComponent(org);

  log(`org: ${org}`);
  const orgInfo = await request(`/orgs/${enc}`, token);
  log(`  followers=${orgInfo.followers} public_repos=${orgInfo.public_repos} created=${orgInfo.created_at}`);

  const members = await request(`/orgs/${enc}/members?per_page=100`, token).catch((e) => {
    log(`  ! members unavailable (${e.message}) - token needs 'read:org'`);
    return [];
  });
  log(`  members=${members.length}`);

  const allRepos = await request(`/orgs/${enc}/repos?type=all&per_page=100&sort=updated`, token);
  // The org profile repo is the page itself, never a project - drop it everywhere.
  const repos = allRepos.filter((r) => r.name !== '.github');
  log(`  repos=${repos.length} (token needs 'repo' scope to see private ones)`);

  const languages = {};
  const contributors = new Map();
  const repoRows = [];

  for (const repo of repos) {
    const langs = await request(`/repos/${enc}/${repo.name}/languages`, token).catch(() => ({}));
    for (const [lang, bytes] of Object.entries(langs)) {
      languages[lang] = (languages[lang] || 0) + bytes;
    }

    const stats = await request(`/repos/${enc}/${repo.name}/stats/contributors`, token).catch((e) => {
      log(`  ! contributors skipped for ${repo.name} (${e.message})`);
      return [];
    });
    let repoCommits = 0;
    for (const entry of stats) {
      const login = entry.author && entry.author.login;
      if (!login) continue;
      repoCommits += entry.total;
      const row = contributors.get(login) || {
        login,
        avatar: entry.author.avatar_url,
        commits: 0,
        repos: new Set(),
      };
      row.commits += entry.total;
      row.repos.add(repo.name);
      contributors.set(login, row);
    }

    repoRows.push({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || '',
      private: !!repo.private,
      fork: !!repo.fork,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      watchers: repo.subscribers_count || 0,
      issues: repo.open_issues_count || 0,
      sizeKb: repo.size || 0,
      language: repo.language || '',
      topics: repo.topics || [],
      license: repo.license ? repo.license.spdx_id : '',
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      defaultBranch: repo.default_branch || 'main',
      commits: repoCommits,
      commitAuthors: stats.length,
    });
    log(`  + ${repo.full_name} (${repo.private ? 'private' : 'public'}) stars=${repo.stargazers_count}`);
  }

  const memberRows = members.map((m) => {
    const c = contributors.get(m.login);
    return {
      login: m.login,
      avatar: m.avatar_url,
      commits: c ? c.commits : 0,
      repos: c ? [...c.repos] : [],
    };
  });

  for (const [login, c] of contributors) {
    if (!memberRows.some((m) => m.login === login)) {
      memberRows.push({
        login,
        avatar: c.avatar,
        commits: c.commits,
        repos: [...c.repos],
      });
    }
  }
  memberRows.sort((a, b) => b.commits - a.commits || a.login.localeCompare(b.login));

  return {
    org: {
      login: orgInfo.login,
      name: orgInfo.name,
      description: orgInfo.description || '',
      followers: orgInfo.followers || 0,
      publicRepos: orgInfo.public_repos || 0,
      createdAt: orgInfo.created_at,
    },
    repos: repoRows,
    languages,
    contributors: memberRows,
  };
}

module.exports = { collect, request, sleep };
