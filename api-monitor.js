/* Hub API monitor (index.html#api): usage and estimated cost per app and provider, budgets,
 * killswitches, keys and the recent-call log. Reads and writes ApiMeter (scripts/api-meter/api-meter.js);
 * every demo on this origin shares the same state, and changes made here apply to open demo tabs at once. */
(function () {
  'use strict';
  var M = window.ApiMeter;
  var panel = document.getElementById('api-monitor');
  var openBtn = document.getElementById('btn-api');
  if (!M || !panel) return;

  var ICON = {
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M15 8l2 2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
  };
  var APP_ICON = { tradedesk: '🌾', langquest: '🗣️', tayoo: '🎙️', nexus: '🤝', tenderstrike: '📑', hub: '◻︎' };
  var PROV_ICON = { anthropic: '✳︎', openrouter: '◎', gemini: '✦', 'browser-speech': '🎤', 'browser-tts': '🔊' };
  function ic(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(c, w) { return c + ' ' + w + (c === 1 ? '' : 's'); }
  function plural(c, w) { return c + ' ' + w + (c === 1 ? '' : 's'); }
  function usd(v) { return v < 0.01 && v > 0 ? '<$0.01' : '$' + (Math.round(v * 100) / 100).toFixed(2); }
  function sum(obj, key) { return Object.keys(obj || {}).reduce(function (n, k) { return n + ((obj[k] || {})[key] || 0); }, 0); }
  function sw(id, on, label) {
    return '<button type="button" class="am-switch" role="switch" aria-checked="' + on + '" data-sw="' + id + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"><span></span></button>';
  }
  var openKey = null, logOpen = false;

  function cachedModels() { try { var c = JSON.parse(localStorage.getItem('project-demos:openrouter-models:v1') || 'null'); return (c && c.list) || []; } catch (e) { return []; } }
  function render() {
    var s = M.state(), t = s.totals, budget = s.budgets.global;
    var pct = budget ? Math.min(100, (s.spent / budget) * 100) : 0;
    var calls = Object.keys(t).reduce(function (n, a) { return n + sum(t[a], 'calls'); }, 0);
    var html = '';
    html += '<div class="am-head"><div><h2 id="am-title">API monitor</h2><span class="am-sub">' + esc(s.month) + ' · ' + plural(calls, 'call') + '</span></div>' +
      '<div class="am-tools">' +
      '<button type="button" class="am-icon" data-act="csv" title="Export CSV" aria-label="Export usage as CSV">' + ic('download') + '</button>' +
      '<button type="button" class="am-icon" data-act="reset" title="Reset usage" aria-label="Reset usage">' + ic('reset') + '</button>' +
      '<button type="button" class="am-icon" data-act="info" title="About" aria-label="About this monitor" aria-expanded="false">' + ic('info') + '</button>' +
      '<button type="button" class="am-icon" data-act="close" title="Close" aria-label="Close API monitor">' + ic('close') + '</button></div></div>';
    html += '<p class="am-info" hidden>Tracked in this browser only. Keys never leave it except in calls to their own provider. Also set hard limits in each provider’s console.</p>';

    html += '<div class="am-kill' + (s.kill.global ? ' off' : '') + '">' + ic('power') +
      '<div><strong>' + (s.kill.global ? 'All APIs off' : 'APIs on') + '</strong><span>' + usd(s.spent) + ' of ' + usd(budget) + '</span>' +
      '<div class="am-bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<label class="am-budget" title="Monthly budget (USD)">$<input type="number" min="0" step="0.5" value="' + budget + '" data-budget="global" aria-label="Monthly budget, all apps"></label>' +
      sw('global', !s.kill.global, 'All APIs') + '</div>';

    html += '<h3 class="am-h">' + 'Apps' + '</h3><div class="am-grid">';
    Object.keys(M.APPS).forEach(function (a) {
      var row = t[a] || {}, spent = s.spentByApp[a] || 0, b = s.budgets.apps[a], p = b ? Math.min(100, spent / b * 100) : 0, off = !!s.kill.apps[a];
      html += '<div class="am-card' + (off ? ' off' : '') + '"><div class="am-card-top"><span class="am-emoji" aria-hidden="true">' + APP_ICON[a] + '</span><strong>' + esc(M.APPS[a]) + '</strong>' + sw('app:' + a, !off, M.APPS[a] + ' APIs') + '</div>' +
        '<div class="am-num">' + usd(spent) + '<small>' + plural(sum(row, 'calls'), 'call') + '</small></div>' +
        '<div class="am-bar"><i style="width:' + p + '%"></i></div>' +
        '<label class="am-budget" title="Monthly budget (USD)">' + ic('edit') + '$<input type="number" min="0" step="0.5" value="' + (b == null ? '' : b) + '" data-budget="' + a + '" aria-label="' + esc(M.APPS[a]) + ' monthly budget"></label></div>';
    });
    html += '</div>';

    var eng = s.llm || M.llm(), orList = cachedModels();
    html += '<h3 class="am-h">Live AI engine</h3><div class="am-engine">' +
      '<div class="am-seg" role="radiogroup" aria-label="Live AI engine">' +
      '<button type="button" role="radio" data-engine="anthropic" aria-checked="' + (eng.provider === 'anthropic') + '">✳︎ Claude</button>' +
      '<button type="button" role="radio" data-engine="openrouter" aria-checked="' + (eng.provider === 'openrouter') + '">◎ OpenRouter</button></div>' +
      (eng.provider === 'openrouter'
        ? '<label class="am-engine-model"><span class="sr-only">OpenRouter model</span><input list="am-or-models" data-engine-model value="' + esc(eng.model) + '" placeholder="provider/model, e.g. google/gemini-…" aria-label="OpenRouter model for live AI"></label>' +
          '<datalist id="am-or-models">' + orList.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.name + ' · $' + m.input + ' / $' + m.output + ' per 1M') + '</option>'; }).join('') + '</datalist>' +
          '<button type="button" class="am-icon" data-act="or-models" title="' + (orList.length ? 'Refresh model list (' + orList.length + ')' : 'Load model list') + '" aria-label="Load OpenRouter model list">' + ic('reset') + '</button>'
        : '<span class="am-engine-model fixed">claude-opus-5-5</span>') +
      '</div>';

    html += '<h3 class="am-h">Providers</h3><div class="am-prov">';
    Object.keys(M.PROVIDERS).forEach(function (p) {
      var P = M.PROVIDERS[p], off = !!s.kill.providers[p], has = P.key ? M.keys.has(p) : true;
      var c = Object.keys(t).reduce(function (n, a) { return n + (((t[a] || {})[p] || {}).calls || 0); }, 0);
      var cost = Object.keys(t).reduce(function (n, a) { return n + (((t[a] || {})[p] || {}).cost || 0); }, 0);
      html += '<div class="am-row' + (off ? ' off' : '') + '"><span class="am-emoji" aria-hidden="true">' + PROV_ICON[p] + '</span>' +
        '<div class="am-row-main"><strong>' + esc(P.name) + '</strong><span>' + plural(c, 'call') + ' · ' + (P.paid ? usd(cost) : 'free') + '</span></div>' +
        (P.key ? '<button type="button" class="am-key' + (has ? ' set' : '') + '" data-key="' + p + '" aria-expanded="' + (openKey === p) + '" title="' + (has ? 'Key set' : 'Add key') + '" aria-label="' + esc(P.name) + (has ? ' key set' : ' add key') + '">' + ic('key') + '<span class="dot"></span></button>' : '') +
        sw('prov:' + p, !off, P.name) + '</div>';
      if (P.key && openKey === p) {
        html += '<form class="am-keyform" data-keyform="' + p + '"><input type="password" name="k" autocomplete="off" spellcheck="false" placeholder="' + (has ? '•••••••• (set)' : 'Paste key') + '" aria-label="' + esc(P.name) + ' API key">' +
          '<label title="Keep on this device"><input type="checkbox" name="r"' + (M.keys.remembered(p) ? ' checked' : '') + '> Remember</label>' +
          '<button type="submit">Save</button>' + (has ? '<button type="button" data-clear="' + p + '">Remove</button>' : '') + '</form>';
        if (p === 'gemini') {
          html += '<div class="am-models"><label>TTS <input data-model="tts" value="' + esc(s.models.tts) + '"></label><label>Speech-to-text <input data-model="transcribe" value="' + esc(s.models.transcribe) + '"></label></div>';
        }
      }
    });
    html += '</div>';

    panel.querySelector('.am-body').innerHTML = html;
    html = '<button type="button" class="am-logbtn" data-act="log" aria-expanded="' + logOpen + '">' + ic('list') + ' Recent calls <span>' + s.log.length + '</span></button>';
    if (logOpen) {
      html += s.log.length ? '<div class="am-log" role="table" aria-label="Recent API calls">' + s.log.slice(0, 60).map(function (e) {
        var u = e.usage || {}, units = [u.inputTokens && u.inputTokens + ' in', u.outputTokens && u.outputTokens + ' out', u.audioOutTokens && u.audioOutTokens + ' audio', u.audioInTokens && u.audioInTokens + ' audio in', u.chars && u.chars + ' chars'].filter(Boolean).join(' · ');
        return '<div role="row" class="' + (e.ok ? '' : 'err') + '"><span role="cell">' + new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span><span role="cell">' + APP_ICON[e.app] + ' ' + esc(e.op) + '</span><span role="cell">' + esc(e.model || M.PROVIDERS[e.provider].name) + '</span><span role="cell">' + esc(units || (e.error || '')) + '</span><span role="cell">' + (e.cost ? usd(e.cost) : '—') + '</span></div>';
      }).join('') + '</div>' : '<p class="am-empty">No calls yet.</p>';
    }
    panel.querySelector('.am-foot').innerHTML = html;
    if (window.ApiBench) window.ApiBench.refresh();
  }

  function show(on) {
    panel.hidden = !on;
    document.body.classList.toggle('am-open', on);
    if (openBtn) openBtn.setAttribute('aria-expanded', String(on));
    if (on) { render(); var t = panel.querySelector('#am-title'); if (t) { t.tabIndex = -1; t.focus(); } }
  }
  function route() { show(location.hash === '#api'); }

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sw) {
      var on = b.getAttribute('aria-checked') !== 'true', id = b.dataset.sw;
      if (id === 'global') M.setKill('global', null, !on);
      else { var parts = id.split(':'); M.setKill(parts[0] === 'app' ? 'apps' : 'providers', parts[1], !on); }
    } else if (b.dataset.key) { openKey = openKey === b.dataset.key ? null : b.dataset.key; render(); }
    else if (b.dataset.clear) { M.keys.clear(b.dataset.clear); }
    else if (b.dataset.act === 'close') { history.pushState('', document.title, location.pathname + location.search); show(false); if (openBtn) openBtn.focus(); }
    else if (b.dataset.act === 'log') { logOpen = !logOpen; render(); }
    else if (b.dataset.engine) { var cur = M.llm(); M.setLlm(b.dataset.engine, b.dataset.engine === 'openrouter' ? (cur.provider === 'openrouter' ? cur.model : '') : 'claude-opus-5-5'); }
    else if (b.dataset.act === 'or-models') { b.disabled = true; M.openrouter.models({ refresh: true }).then(render, function (err) { b.disabled = false; b.title = err.message; alert('Could not load the OpenRouter model list: ' + err.message); }); }
    else if (b.dataset.act === 'info') { var i = panel.querySelector('.am-info'); i.hidden = !i.hidden; b.setAttribute('aria-expanded', String(!i.hidden)); }
    else if (b.dataset.act === 'reset') { if (confirm('Reset all recorded usage in this browser?')) M.resetUsage(); }
    else if (b.dataset.act === 'csv') {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([M.exportCsv()], { type: 'text/csv' }));
      a.download = 'api-usage-' + M.month() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    }
  });
  panel.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.budget) M.setBudget(el.dataset.budget === 'global' ? 'global' : 'apps', el.dataset.budget, el.value);
    if (el.dataset.model) M.setModel(el.dataset.model, el.value.trim());
    if (el.hasAttribute('data-engine-model')) M.setLlm('openrouter', el.value.trim());
  });
  panel.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-keyform]'); if (!f) return;
    e.preventDefault();
    try { M.keys.set(f.dataset.keyform, f.k.value, f.r.checked); openKey = null; render(); } catch (err) { f.k.setCustomValidity(err.message); f.k.reportValidity(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) panel.querySelector('[data-act="close"]').click(); });
  M.onChange(function () { if (!panel.hidden) render(); updateBadge(); });
  function updateBadge() {
    if (!openBtn) return;
    var s = M.state();
    openBtn.classList.toggle('killed', !!s.kill.global);
    openBtn.querySelector('.api-spend').textContent = usd(s.spent);
  }
  window.addEventListener('hashchange', route);
  updateBadge(); route();
})();
