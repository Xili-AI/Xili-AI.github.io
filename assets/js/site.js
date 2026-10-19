/* XILI-AI site - renders the live org data into the stats and chart sections. */
(function () {
  'use strict';

  var DATA_URL = 'assets/stats/snapshot.json';

  var kfmt = function (n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  };

  var daysAgo = function (iso) {
    if (!iso) return 'never';
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 30) return d + 'd ago';
    if (d < 365) return Math.floor(d / 30) + 'mo ago';
    return Math.floor(d / 365) + 'y ago';
  };

  var sizeLabel = function (kb) {
    return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
  };

  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /* ------------------------------------------------------------- badges --- */

  function renderBadges(data) {
    var box = document.getElementById('hero-badges');
    if (!box) return;
    var org = data.org || {};
    var repos = (data.repos || []).filter(function (r) { return r.name !== '.github'; });
    var priv = repos.filter(function (r) { return r.private; }).length;
    var members = (data.contributors || []).length;
    var since = org.createdAt ? new Date(org.createdAt).getFullYear() : '';

    box.insertBefore(el('span', 'xl-badge', '👥 ' + (org.followers || 0) + ' Followers'), box.firstChild);
    box.insertBefore(el('span', 'xl-badge', '📦 ' + repos.length + ' Repos'), box.firstChild);
    box.insertBefore(el('span', 'xl-badge', '🔒 ' + priv + ' Private'), box.firstChild);
    box.insertBefore(el('span', 'xl-badge', '⚡ ' + members + ' Members'), box.firstChild);
    if (since) box.insertBefore(el('span', 'xl-badge', '📅 Since ' + since), box.firstChild);
  }

  /* --------------------------------------------------------------- meta --- */

  function renderMeta(data) {
    var box = document.getElementById('stat-meta');
    if (!box) return;
    var org = data.org || {};
    var repos = (data.repos || []).filter(function (r) { return r.name !== '.github'; });
    var priv = repos.filter(function (r) { return r.private; }).length;
    var members = (data.contributors || []).length;
    var since = org.createdAt ? new Date(org.createdAt).getFullYear() : '';
    var when = data.generatedAt ? ' · 更新于 ' + daysAgo(data.generatedAt) : '';

    box.innerHTML =
      '<b>' + (org.followers || 0) + '</b> Followers · <b>' + repos.length + '</b> Repos · ' +
      '<b>' + priv + '</b> Private · <b>' + members + '</b> Members' +
      (since ? ' · Since ' + since : '') + when;
  }

  /* ---------------------------------------------------------- repo cards --- */

  function renderRepos(data) {
    var box = document.getElementById('stat-repos');
    if (!box) return;
    var repos = (data.repos || []).filter(function (r) { return r.name !== '.github'; });
    if (!repos.length) { box.appendChild(el('p', 'xl-empty', 'no repositories')); return; }

    var maxCommits = Math.max.apply(null, repos.map(function (r) { return r.commits || 0; }).concat([1]));

    repos.forEach(function (r) {
      var pct = Math.max(3, Math.round(((r.commits || 0) / maxCommits) * 100));
      var topics = (r.topics || []).slice(0, 3).map(function (t) {
        return '<span class="xl-chip">' + esc(t) + '</span>';
      }).join('');

      var card = el('div', 'xl-repo');
      card.innerHTML =
        '<div class="xl-repo-top">' +
          '<span class="xl-repo-vis" title="' + (r.private ? 'private' : 'public') + '">' + (r.private ? '🔒' : '🌐') + '</span>' +
          '<span class="xl-repo-name">' + esc(r.name) + '</span>' +
        '</div>' +
        '<p class="xl-repo-desc">' + (esc(r.description) || '&nbsp;') + '</p>' +
        '<div class="xl-repo-stats">' +
          '<span class="xl-metric"><b>' + kfmt(r.commits || 0) + '</b> commits</span>' +
          '<span class="xl-metric"><b>' + kfmt(r.stars || 0) + '</b> ★</span>' +
          '<span class="xl-metric"><b>' + kfmt(r.forks || 0) + '</b> ⑂</span>' +
          '<span class="xl-metric"><b>' + esc(sizeLabel(r.sizeKb || 0)) + '</b> size</span>' +
        '</div>' +
        '<div class="xl-repo-bar"><i style="--w:' + pct + '%"></i></div>' +
        '<div class="xl-repo-foot">' +
          (r.language ? '<span class="xl-repo-langname">' + esc(r.language) + '</span><span class="xl-dotsep">·</span>' : '') +
          esc(daysAgo(r.pushedAt)) +
          (topics ? '<span class="xl-dotsep">·</span>' + topics : '') +
        '</div>';
      box.appendChild(card);
    });
  }

  /* ----------------------------------------------------------- languages --- */

  function renderLangs(data) {
    var box = document.getElementById('stat-langs');
    if (!box) return;
    var langs = data.languages || {};
    var entries = Object.keys(langs).map(function (k) { return [k, langs[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    if (!entries.length) { box.appendChild(el('p', 'xl-empty', 'no language data')); return; }

    var total = entries.reduce(function (s, e) { return s + e[1]; }, 0);
    entries.slice(0, 8).forEach(function (e) {
      var share = (e[1] / total) * 100;
      var row = el('div', 'xl-langrow');
      row.innerHTML =
        '<span class="xl-langname">' + esc(e[0]) + '</span>' +
        '<div class="xl-langtrack"><i style="--w:' + share.toFixed(1) + '%"></i></div>' +
        '<span class="xl-langpct">' + share.toFixed(1) + '%</span>';
      box.appendChild(row);
    });
  }

  /* -------------------------------------------------------- 3D bar chart --- */

  function renderChart(data) {
    var box = document.getElementById('contrib-chart');
    if (!box) return;
    var rows = (data.contributors || []).slice().sort(function (a, b) { return b.commits - a.commits; });
    if (!rows.length) { box.appendChild(el('p', 'xl-empty', 'no members found')); return; }

    var max = Math.max.apply(null, rows.map(function (r) { return r.commits; }).concat([1]));
    var totalCommits = rows.reduce(function (s, r) { return s + r.commits; }, 0);
    var repoNames = {};
    rows.forEach(function (r) { (r.repos || []).forEach(function (n) { repoNames[n] = 1; }); });
    var totalRepos = Object.keys(repoNames).length;

    var chart = el('div', 'xl-chart');
    var head = el('div', 'xl-chart-head');
    head.innerHTML =
      '<span class="xl-chart-title">COMMITS BY MEMBER</span>' +
      '<span class="xl-chart-sub">' + rows.length + ' member(s) · ' + kfmt(totalCommits) +
      ' commit(s) · ' + totalRepos + ' repo(s)</span>';
    chart.appendChild(head);

    var scene = el('div', 'xl-chart-scene');
    scene.appendChild(el('div', 'xl-chart-floor'));
    rows.forEach(function (r) {
      var h = r.commits > 0 ? Math.max(7, Math.round((r.commits / max) * 100)) : 3;
      var bar = el('div', 'xl-bar' + (r.commits > 0 ? '' : ' xl-bar-zero'));
      bar.style.setProperty('--h', h + '%');
      bar.innerHTML =
        '<span class="xl-bar-value">' + kfmt(r.commits) + '</span>' +
        '<div class="xl-bar-front"></div>' +
        '<div class="xl-bar-cap"></div>' +
        '<div class="xl-bar-side"></div>';
      scene.appendChild(bar);
    });
    chart.appendChild(scene);

    var labels = el('div', 'xl-chart-labels');
    rows.forEach(function (r) {
      var label = el('div', 'xl-label');
      label.title = r.login + ' · ' + r.commits + ' commits · ' + (r.repos || []).length + ' repo(s)';
      label.innerHTML =
        '<img class="xl-label-ava" src="' + esc(r.avatar) + '" alt="" loading="lazy" />' +
        '<span class="xl-label-name">' + esc(r.login) + '</span>' +
        '<b class="xl-label-num">' + kfmt(r.commits) + '</b>';
      labels.appendChild(label);
    });
    chart.appendChild(labels);

    box.appendChild(chart);
  }

  /* ---------------------------------------------------------------- boot --- */

  function render(data) {
    renderBadges(data);
    renderMeta(data);
    renderRepos(data);
    renderLangs(data);
    renderChart(data);
  }

  function fallback(err) {
    var box = document.getElementById('stat-meta');
    if (box) box.textContent = '数据暂不可用：' + (err && err.message ? err.message : err);
  }

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(render)
    .catch(fallback);
})();

/* ------------------------------------------------------------ mobile nav --- */
(function () {
  'use strict';

  var burger = document.getElementById('site-burger');
  var links = document.getElementById('site-links');
  if (!burger || !links) return;

  function setOpen(open) {
    links.classList.toggle('is-open', open);
    burger.classList.toggle('is-active', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  }

  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!links.classList.contains('is-open'));
  });

  // close after choosing a destination
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // close when tapping anywhere else
  document.addEventListener('click', function (e) {
    if (!links.classList.contains('is-open')) return;
    if (links.contains(e.target) || burger.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // a resize past the breakpoint should not leave the drawer stuck open
  var mq = window.matchMedia('(min-width: 901px)');
  var onChange = function (e) { if (e.matches) setOpen(false); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
})();
