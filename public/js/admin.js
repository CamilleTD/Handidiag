/*
 * HandiDiag - espace administrateur (integre au site : #/admin). Charge a la demande.
 * Affiche UNIQUEMENT des donnees agregees et anonymes, avec un seuil minimal d'affichage (valeurs "<k" masquees).
 * Connexion par compte (identifiant + mot de passe) ; la session est conservee seulement dans l'onglet (sessionStorage).
 */
(function () {
  'use strict';
  var KEY = 'hd-admin-session';
  var LOCALE = function () { return 'fr-FR'; };
  var SVGNS = 'http://www.w3.org/2000/svg';

  var T = function (k) { return k; };
  function rich(str) { return String(str).split('`').map(function (x, i) { return i % 2 ? h('code', null, x) : x; }); }
  function maps() {
    LEVELS = { explore: T('admin.lv_explore'), talk: T('admin.lv_talk'), talk_soon: T('admin.lv_talk_soon'), already: T('admin.lv_already') };
    PROFILES = { student: T('admin.pr_student'), employee: T('admin.pr_employee'), jobseeker: T('admin.pr_jobseeker'), public_agent: T('admin.pr_public_agent') };
    LANGS = { fr: 'Français', en: 'English' };
    DOCS = { rqth_mph: T('admin.d_rqth_mph'), mdph_portal: T('admin.d_mdph_portal'), service_public_rqth: T('admin.d_service_public_rqth'), agefiph: 'Agefiph', fiphfp: 'FIPHFP', france_travail: 'France Travail', print: T('admin.d_print'), pdf_download: T('admin.d_pdf_download'), summary_download: T('admin.d_summary_download') };
  }
  var LEVELS = {};
  var PROFILES = {};
  var DOCS = {};
  var LANGS = {};
  function h(tag, attrs) {
    var el = document.createElement(tag), a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k]; if (v === false || v === null || v === undefined) return;
      if (k === 'class') el.className = v; else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { add(el, k); }); return; }
    el.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) e.appendChild(arguments[i]);
    return e;
  }
  var isNum = function (v) { return typeof v === 'number'; };
  function fmt(v, k) { return isNum(v) ? String(v) : (v === undefined || v === null ? '–' : T('admin.under_k', { n: String(v).replace(/[^0-9]/g, '') })); }
  function pct(part, whole) { return whole > 0 ? Math.round(part / whole * 100) : 0; }

  function mount(root, tfn, lang) {
    T = tfn; maps();
    LOCALE = function () { return lang === 'en' ? 'en-GB' : 'fr-FR'; };
    var S = { token: null, data: null, auto: true, error: '', busy: false, view: 'login' };
    try { S.token = window.sessionStorage.getItem(KEY); } catch (e) { /* ignore */ }
    var timer = null;

    function save(tok) { S.token = tok; try { if (tok) window.sessionStorage.setItem(KEY, tok); else window.sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
    function api(path, opts) {
      opts = opts || {};
      var headers = { 'Content-Type': 'application/json' };
      if (S.token) headers.Authorization = 'Bearer ' + S.token;
      return fetch(path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store', credentials: 'omit' });
    }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function logout(silent) {
      if (S.token && !silent) api('api/admin/logout', { method: 'POST', body: {} }).catch(function () {});
      stopTimer(); save(null); S.data = null; S.view = 'login'; render();
    }

    /* ---------------- connexion ---------------- */
    function loginView() {
      var err = h('p', { class: 'error', role: 'alert', hidden: !S.error }, S.error);
      var user = h('input', { id: 'adm-user', class: 'text-input', type: 'text', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: 'false', value: S.lastUser || '' });
      var pass = h('input', { id: 'adm-pass', class: 'text-input', type: 'password', autocomplete: 'current-password', required: true });
      var btn = h('button', { type: 'submit', class: 'btn btn-primary' }, T('admin.login_btn'));
      var formEl = h('form', { class: 'panel login-card', novalidate: true, onsubmit: function (e) {
        e.preventDefault();
        S.lastUser = user.value.trim();
        if (!user.value.trim() || !pass.value) { S.error = T('admin.err_fill'); return render(); }
        btn.disabled = true;
        api('api/admin/login', { method: 'POST', body: { username: user.value.trim(), password: pass.value } }).then(function (r) {
          if (r.status === 429) throw new Error(T('admin.err_many'));
          if (r.status === 404) throw new Error(T('admin.err_off'));
          if (!r.ok) throw new Error(T('admin.err_wrong'));
          return r.json();
        }).then(function (d) { S.error = ''; S.isDefault = d.isDefault; save(d.token); S.view = 'dash'; return load(); })
          .catch(function (e2) { S.error = e2.message || T('admin.err_conn'); render(); });
      } },
        h('h2', null, T('admin.login_title')),
        h('div', { class: 'field' }, h('label', { for: 'adm-user' }, T('admin.login_user')), user),
        h('div', { class: 'field' }, h('label', { for: 'adm-pass' }, T('admin.login_pass')), pass),
        err,
        h('div', { class: 'actions' }, btn));
      return h('div', { class: 'narrow' },
        h('h1', null, T('admin.title')),
        h('p', { class: 'lead' }, T('admin.lead_login')),
        privacyChips(), formEl,
        h('p', { class: 'hint' }, T('admin.hint_login')));
    }
    function privacyChips() {
      return h('ul', { class: 'chips', 'aria-label': T('admin.chips_label') },
        [T('admin.chip1'), T('admin.chip2'), T('admin.chip3'), T('admin.chip4')].map(function (t) { return h('li', null, t); }));
    }

    /* ---------------- chargement ---------------- */
    function load() {
      S.busy = true;
      return api('api/stats').then(function (r) {
        if (r.status === 401) { S.error = T('admin.err_expired'); logout(true); throw new Error('expired'); }
        if (r.status === 404) throw new Error(T('admin.err_stats_off'));
        if (!r.ok) throw new Error(T('admin.err_server', { n: r.status }));
        return r.json();
      }).then(function (d) { S.data = d; S.busy = false; S.view = 'dash'; render(); startTimer(); })
        .catch(function (e) { S.busy = false; if (e.message !== 'expired') { S.error = e.message; S.view = S.data ? 'dash' : 'login'; render(); } });
    }
    function startTimer() {
      stopTimer();
      timer = setInterval(function () {
        if (!root.isConnected) return stopTimer();
        var last = root.querySelector('[data-last]');
        if (last && S.data) last.textContent = since(S.data.lastEventAt);
        S.tick = (S.tick || 0) + 1;
        if (S.auto && S.tick % 15 === 0 && S.view === 'dash') {
          api('api/stats').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && root.isConnected) { S.data = d; render(true); } }).catch(function () {});
        }
      }, 1000);
    }
    function since(ts) {
      if (!ts) return T('admin.none_yet');
      var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
      if (s < 60) return T('admin.ago_s', { n: s });
      if (s < 3600) return T('admin.ago_min', { n: Math.round(s / 60) });
      if (s < 86400) return T('admin.ago_h', { n: Math.round(s / 3600) });
      return T('admin.on_date', { d: new Date(ts).toLocaleDateString(LOCALE()) });
    }

    /* ---------------- composants visuels ---------------- */
    function kpi(label, value, caption, extra) {
      return h('li', { class: 'kpi' }, h('p', { class: 'kpi-label' }, label), h('p', { class: 'kpi-value' }, value), extra || null, h('p', { class: 'kpi-cap' }, caption));
    }
    function ring(percent) {
      var r = 34, c = 2 * Math.PI * r;
      return svg('svg', { class: 'ring', viewBox: '0 0 84 84', 'aria-hidden': 'true', focusable: 'false' },
        svg('circle', { cx: 42, cy: 42, r: r, class: 'ring-bg' }),
        svg('circle', { cx: 42, cy: 42, r: r, class: 'ring-fg', 'stroke-dasharray': (c * percent / 100).toFixed(1) + ' ' + c.toFixed(1), transform: 'rotate(-90 42 42)' }));
    }
    // Graphique en barres horizontales avec le nombre de cas pris en compte
    function bars(title, nValue, unit, obj, labels, explain, opts) {
      opts = opts || {};
      var keys = Object.keys(obj);
      if (opts.sort) keys.sort(function (a, b) { return (isNum(obj[b]) ? obj[b] : -1) - (isNum(obj[a]) ? obj[a] : -1); });
      var total = isNum(nValue) ? nValue : keys.reduce(function (s, k2) { return s + (isNum(obj[k2]) ? obj[k2] : 0); }, 0);
      var max = Math.max.apply(null, keys.map(function (k2) { return isNum(obj[k2]) ? obj[k2] : 0; }).concat([1]));
      var rows = keys.map(function (k2) {
        var v = obj[k2], num = isNum(v);
        var fill = h('span', { class: 'bar-fill' + (opts.accentKey === k2 ? ' is-sun' : '') });
        fill.style.width = (num && v > 0 ? Math.max(3, Math.round(v / max * 100)) : 0) + '%';
        return h('li', { class: 'bar-row' },
          h('span', { class: 'bar-label' }, labels[k2] || k2),
          h('span', { class: 'bar-track', 'aria-hidden': 'true' }, fill),
          h('span', { class: 'bar-val' }, num ? v + (total > 0 ? ' · ' + pct(v, total) + ' %' : '') : fmt(v)));
      });
      var nText = isNum(nValue) ? [h('strong', null, 'n = ' + nValue), T('admin.base_of', { u: unit })] : [T('admin.base_hidden', { u: unit, n: String(nValue).replace(/[^0-9]/g, '') })];
      return h('section', { class: 'chart-card', 'aria-label': title },
        h('h2', null, title), h('p', { class: 'chart-n' }, nText),
        h('ul', { class: 'bars' }, rows), h('p', { class: 'hint' }, explain));
    }
    function dailyChart(daily, k) {
      // 30 derniers jours calendaires, jours sans activite = 0
      var map = {}; daily.forEach(function (d) { map[d.date] = d; });
      var days = [];
      for (var i = 29; i >= 0; i--) { var dt = new Date(Date.now() - i * 86400000); days.push(dt.toISOString().slice(0, 10)); }
      var val = function (d, key) { var v = map[d] ? map[d][key] : 0; return isNum(v) ? v : 0; };
      var hidden = function (d, key) { return !!map[d] && !isNum(map[d][key]); };
      var max = Math.max.apply(null, days.map(function (d) { return Math.max(val(d, 'start'), val(d, 'complete')); }).concat([1]));
      var W = 600, H = 190, pad = 24, bw = (W - pad) / 30, base = H - 26;
      var g = svg('svg', { class: 'day-chart', viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
      g.appendChild(svg('line', { x1: pad, y1: base, x2: W, y2: base, class: 'axis' }));
      [0, 0.5, 1].forEach(function (f) {
        var y = base - f * (base - 14);
        g.appendChild(svg('line', { x1: pad, y1: y, x2: W, y2: y, class: 'grid' }));
        var t = svg('text', { x: pad - 4, y: y + 4, class: 'tick', 'text-anchor': 'end' }); t.textContent = String(Math.round(max * f)); g.appendChild(t);
      });
      days.forEach(function (d, idx) {
        var x = pad + idx * bw, hs = val(d, 'start') / max * (base - 14), hc = val(d, 'complete') / max * (base - 14);
        if (hidden(d, 'start')) g.appendChild(svg('rect', { x: x + 1, y: base - 5, width: bw / 2 - 1, height: 5, class: 'bar-m' }));
        else g.appendChild(svg('rect', { x: x + 1, y: base - hs, width: bw / 2 - 1, height: hs, class: 'bar-s' }));
        if (hidden(d, 'complete')) g.appendChild(svg('rect', { x: x + bw / 2, y: base - 5, width: bw / 2 - 1, height: 5, class: 'bar-m' }));
        else g.appendChild(svg('rect', { x: x + bw / 2, y: base - hc, width: bw / 2 - 1, height: hc, class: 'bar-c' }));
      });
      [0, 14, 29].forEach(function (idx) {
        var t = svg('text', { x: pad + idx * bw + bw / 2, y: H - 8, class: 'tick', 'text-anchor': idx === 0 ? 'start' : (idx === 29 ? 'end' : 'middle') });
        t.textContent = days[idx].slice(8, 10) + '/' + days[idx].slice(5, 7); g.appendChild(t);
      });
      var tot = days.reduce(function (s, d) { return { s: s.s + val(d, 'start'), c: s.c + val(d, 'complete') }; }, { s: 0, c: 0 });
      var rowsT = days.filter(function (d) { return map[d]; }).map(function (d) {
        return h('tr', null, h('th', { scope: 'row' }, d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4)), h('td', null, fmt(map[d].start)), h('td', null, fmt(map[d].complete)));
      });
      return h('section', { class: 'chart-card chart-wide', 'aria-label': T('admin.daily_title') },
        h('h2', null, T('admin.daily_title')),
        h('p', { class: 'chart-n' }, [h('strong', null, 'n = ' + tot.s), T('admin.daily_a'), h('strong', null, String(tot.c)), T('admin.daily_b', { k: k })]),
        h('ul', { class: 'legend' }, h('li', null, h('span', { class: 'sw sw-s', 'aria-hidden': 'true' }), T('admin.lg_s')), h('li', null, h('span', { class: 'sw sw-c', 'aria-hidden': 'true' }), T('admin.lg_c')), h('li', null, h('span', { class: 'sw sw-m', 'aria-hidden': 'true' }), T('admin.lg_m', { k: k }))),
        g,
        h('details', null, h('summary', null, T('admin.tbl_sum')),
          rowsT.length ? h('div', { class: 'table-wrap' }, h('table', null, h('caption', { class: 'sr-only' }, T('admin.tbl_cap')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, T('admin.tbl_day')), h('th', { scope: 'col' }, T('admin.lg_s')), h('th', { scope: 'col' }, T('admin.lg_c')))), h('tbody', null, rowsT))) : h('p', null, T('admin.tbl_none'))));
    }

    /* ---------------- tableau de bord ---------------- */
    function dashView() {
      var d = S.data, k = d.k, t = d.totals;
      var masked = [t.starts, t.completes, t.deep].some(function (v) { return !isNum(v) && v !== undefined; }) ||
        ['byProfile', 'byLevel', 'byLang', 'docs'].some(function (key) { return Object.keys(d[key]).some(function (x) { return !isNum(d[key][x]); }); });
      var rate = t.completionRate;
      var pwBox = h('details', { class: 'panel' }, h('summary', null, T('admin.pw_title')), passwordForm());
      var demoMsg = h('p', { role: 'status', class: 'hint' });
      var demoBox = h('details', { class: 'panel' }, h('summary', null, T('admin.demo_title')),
        h('p', null, T('admin.demo_text')),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn', onclick: function () { demoCall('api/admin/demo-data', { sessions: 120 }, T('admin.demo_added'), demoMsg); } }, T('admin.demo_add')),
          h('button', { type: 'button', class: 'btn btn-quiet', onclick: function () { if (window.confirm(T('admin.demo_confirm'))) demoCall('api/admin/reset', { confirm: true }, T('admin.demo_done'), demoMsg); } }, T('admin.demo_reset'))),
        demoMsg);

      var verify = h('details', { class: 'panel help-panel' }, h('summary', null, T('admin.verify_title')),
        h('ol', { class: 'plain-list' },
          ['v1', 'v2', 'v3', 'v4', 'v5'].map(function (key) { return h('li', null, rich(T('admin.' + key, { k: k }))); })));
      var glossary = h('details', { class: 'panel help-panel', open: true }, h('summary', null, T('admin.gl_title')),
        h('dl', { class: 'glossary' },
          [1, 2, 3, 4, 5, 6].map(function (x) { return [h('dt', null, T('admin.gl' + x + 't', { k: k })), h('dd', null, T('admin.gl' + x + 'd'))]; })));

      return h('div', { class: 'admin-dash' },
        h('div', { class: 'admin-head' },
          h('div', null, h('h1', null, T('admin.dash_title')), h('p', { class: 'lead' }, T('admin.dash_lead'))),
          h('div', { class: 'admin-actions' },
            h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { load(); }, disabled: S.busy }, T('admin.refresh')),
            h('button', { type: 'button', class: 'btn', onclick: exportCsv }, T('admin.export')),
            h('button', { type: 'button', class: 'btn btn-quiet', onclick: function () { logout(); } }, T('admin.logout')))),
        privacyChips(),
        S.error ? h('p', { class: 'error', role: 'alert' }, S.error) : null,
        S.flash ? h('p', { class: 'notice', role: 'status' }, S.flash) : null,
        d.demo ? h('p', { class: 'notice' }, T('admin.demo_notice')) : null,
        S.isDefault ? h('p', { class: 'notice' }, T('admin.default_pw')) : null,
        h('p', { class: 'live-row' }, T('admin.last_event'), h('strong', { 'data-last': true }, since(d.lastEventAt)),
          h('label', { class: 'check inline' }, h('input', { type: 'checkbox', checked: S.auto, onchange: function (e) { S.auto = e.target.checked; } }), h('span', null, T('admin.auto')))),
        masked ? h('p', { class: 'notice' }, T('admin.masked', { k: k })) : null,

        h('ul', { class: 'kpis' },
          kpi(T('admin.k1'), fmt(t.starts), T('admin.k1c')),
          kpi(T('admin.k2'), fmt(t.completes), T('admin.k2c')),
          kpi(T('admin.k3'), rate === null ? '–' : rate + ' %', rate === null ? T('admin.k3n', { k: k }) : T('admin.k3c'), rate === null ? null : ring(rate)),
          kpi(T('admin.k4'), fmt(t.deep), t.deepRate === null ? T('admin.k4n') : T('admin.k4c', { r: t.deepRate }))),

        h('div', { class: 'charts' },
          bars(T('admin.c1'), d.n.level, T('admin.u_completed'), d.byLevel, LEVELS, T('admin.c1e'), { accentKey: 'talk_soon' }),
          bars(T('admin.c3'), d.n.lang, T('admin.u_started'), d.byLang, LANGS, T('admin.c3e')),
          bars(T('admin.c4'), d.n.docs, T('admin.u_views'), d.docs, DOCS, T('admin.c4e'), { sort: true }),
          dailyChart(d.daily, k)),
        glossary, verify, demoBox, pwBox);
    }

    function passwordForm() {
      var msg = h('p', { role: 'status', class: 'hint' });
      var cur = h('input', { id: 'pw-cur', class: 'text-input', type: 'password', autocomplete: 'current-password', required: true });
      var nw = h('input', { id: 'pw-new', class: 'text-input', type: 'password', autocomplete: 'new-password', required: true, 'aria-describedby': 'pw-rule' });
      var cf = h('input', { id: 'pw-conf', class: 'text-input', type: 'password', autocomplete: 'new-password', required: true });
      return h('form', { novalidate: true, onsubmit: function (e) {
        e.preventDefault(); msg.className = 'hint';
        if (nw.value !== cf.value) { msg.className = 'error'; msg.textContent = T('admin.pw_mismatch'); return; }
        api('api/admin/password', { method: 'POST', body: { current: cur.value, next: nw.value } }).then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); }).then(function (r) {
          if (r.status === 200) { msg.textContent = T('admin.pw_ok'); S.isDefault = false; cur.value = nw.value = cf.value = ''; }
          else { msg.className = 'error'; msg.textContent = ['wrong_current_password', 'too_short', 'too_weak', 'too_many_attempts'].indexOf(r.body.error) !== -1 ? T('admin.pw_' + r.body.error) : T('admin.pw_fail'); }
        }).catch(function () { msg.className = 'error'; msg.textContent = T('admin.net'); });
      } },
        h('div', { class: 'field' }, h('label', { for: 'pw-cur' }, T('admin.pw_cur')), cur),
        h('div', { class: 'field' }, h('label', { for: 'pw-new' }, T('admin.pw_new')), nw, h('p', { id: 'pw-rule', class: 'hint' }, T('admin.pw_rule'))),
        h('div', { class: 'field' }, h('label', { for: 'pw-conf' }, T('admin.pw_conf')), cf),
        msg, h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'btn' }, T('admin.pw_save'))));
    }

    function demoCall(path, body, okText, msgEl) {
      api(path, { method: 'POST', body: body }).then(function (r) {
        if (r.status === 403) throw new Error(T('admin.prod'));
        if (!r.ok) throw new Error(T('admin.refused', { n: r.status }));
        S.error = ''; return load();
      }).then(function () { S.flash = okText; render(true); }).catch(function (e) { S.error = e.message; render(true); });
    }

    function exportCsv() {
      api('api/export.csv').then(function (r) { if (!r.ok) throw new Error(T('admin.export_fail', { n: r.status })); return r.blob(); }).then(function (b) {
        var url = URL.createObjectURL(b), a = document.createElement('a');
        a.href = url; a.download = 'handidiag-stats.csv'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }).catch(function (e) { S.error = e.message; render(); });
    }

    function render(keepFocus) {
      var active = keepFocus && document.activeElement && document.activeElement.id;
      root.replaceChildren(S.view === 'dash' && S.data ? dashView() : loginView());
      if (S.view !== 'dash' && S.error) { var pw = document.getElementById('adm-pass'); if (pw) { pw.focus(); return; } }
      if (active) { var el = document.getElementById(active); if (el) el.focus(); }
      else { var head = root.querySelector('h1'); if (head) { head.setAttribute('tabindex', '-1'); head.focus(); } }
    }

    if (S.token) {
      api('api/admin/me').then(function (r) { if (!r.ok) throw new Error('x'); return r.json(); }).then(function (me) { S.isDefault = me.isDefault; S.view = 'dash'; return load(); }).catch(function () { save(null); render(); });
    } else render();
  }

  window.HandiAdmin = { mount: mount };
})();
