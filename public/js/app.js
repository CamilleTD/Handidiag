/*
 * HandiDiag - application front-end (JavaScript natif, aucune dependance).
 * - Les reponses ne sont JAMAIS ecrites sur disque ni envoyees : elles vivent dans `state.answers`.
 * - Seuls des evenements anonymes (compteurs) peuvent etre envoyes, si l'utilisateur ne s'y oppose pas.
 * - Seuls les REGLAGES D'AFFICHAGE peuvent etre memorises (localStorage), et uniquement sur demande.
 */
(function () {
  'use strict';

  var SIZE_MIN = 50, SIZE_MAX = 300, SIZE_STEP = 10, STORE_KEY = 'hd-prefs';
  var LANGS = ['fr', 'en'];
  var FONTS = ['system', 'atkinson', 'dyslexic', 'lexend'];
  var THEMES = ['auto', 'light', 'dark', 'contrast'];
  var DISPLAY_DEFAULTS = { font: 'system', size: 100, theme: 'auto', dys: false, ruler: false, falc: false };
  var PROFILES = {
    dys: { font: 'dyslexic', dys: true, size: 110 },
    adhd: { font: 'lexend', dys: true, falc: true, ruler: true, size: 105 },
    lowvision: { font: 'atkinson', size: 150, theme: 'contrast' }
  };
  var VIEWS = { info: renderInfo, quiz: renderQuiz, more: renderMore, result: renderResult, kit: renderKit, admin: renderAdmin, settings: function () { return document.createDocumentFragment(); } };

  var state = {
    lang: 'fr',
    prefs: { falc: false, size: 100, theme: 'auto', dys: false, font: 'system', ruler: false, voice: '', rate: 0.95, remember: false },
    stats: true,
    data: {}, i18n: {},
    answers: { profile: 'student' }, idx: 0, maxIdx: 0, quizTitle: '', started: false, deep: false, deepSent: false, settingsFrom: null, result: null, checklist: {}
  };

  var main = document.getElementById('main');
  function $(id) { return document.getElementById(id); }

  /* ---------- Utilitaires DOM ---------- */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === false || v === null || v === undefined) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { append(el, k); }); return; }
    el.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }

  /* ---------- Icones (SVG en ligne, aucun fichier) ---------- */

  var SVGNS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    compass: [['circle', { cx: 12, cy: 12, r: 10 }], ['polygon', { points: '16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9' }]],
    ban: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M5 5l14 14' }]],
    lock: [['rect', { x: 4.5, y: 11, width: 15, height: 10, rx: 2 }], ['path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }]],
    book: [['path', { d: 'M4 19.5V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2zm0 0A2 2 0 0 0 6 21h14' }]],
    chat: [['path', { d: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z' }]],
    clock: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 6v6l4 2' }]],
    badge: [['path', { d: 'M12 2l2.4 1.9 3-.2 1 2.9 2.6 1.6-.9 2.9.9 2.9-2.6 1.6-1 2.9-3-.2L12 22l-2.4-1.9-3 .2-1-2.9L3 15.8l.9-2.9L3 10l2.6-1.6 1-2.9 3 .2z' }], ['path', { d: 'M8.5 12l2.5 2.5 4.5-5' }]],
    user: [['circle', { cx: 12, cy: 8, r: 4 }], ['path', { d: 'M4 21a8 8 0 0 1 16 0' }]],
    building: [['rect', { x: 4, y: 3, width: 16, height: 18, rx: 1.5 }], ['path', { d: 'M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-4h4v4' }]],
    shield: [['path', { d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z' }], ['path', { d: 'M8.5 12l2.5 2.5 4.5-5' }]],
    doc: [['path', { d: 'M7 3h8l4 4v14H7z' }], ['path', { d: 'M15 3v4h4M10 12h6M10 16h6' }]],
    link: [['path', { d: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' }]],
    print: [['path', { d: 'M6 9V3h12v6M6 17H4v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6h-2M7 14h10v7H7z' }]],
    download: [['path', { d: 'M12 3v12M7 11l5 5 5-5M4 21h16' }]],
    speaker: [['path', { d: 'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13' }]],
    stop: [['rect', { x: 6, y: 6, width: 12, height: 12, rx: 2 }]],
    restart: [['path', { d: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5' }]],
    leaf: [['path', { d: 'M5 19C5 10 10 5 20 5c0 10-5 15-14 15' }], ['path', { d: 'M5 19l8-8' }]],
    arrow: [['path', { d: 'M5 12h14M13 6l6 6-6 6' }]],
    check: [['path', { d: 'M4 12.5l5 5L20 6.5' }]],
    back: [['path', { d: 'M19 12H5M11 6l-6 6 6 6' }]]
  };
  function icon(name) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'ico');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    (ICONS[name] || []).forEach(function (spec) {
      var e = document.createElementNS(SVGNS, spec[0]);
      Object.keys(spec[1]).forEach(function (k) { e.setAttribute(k, spec[1][k]); });
      svg.appendChild(e);
    });
    return svg;
  }
  function medal(name) { return h('span', { class: 'medal' }, icon(name)); }

  // Illustration decorative de l'accueil : un sentier en 4 etapes qui monte vers un drapeau.
  var HERO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" class="scene" viewBox="0 0 480 420" aria-hidden="true" focusable="false">' +
    '<defs><clipPath id="scene-clip"><rect width="480" height="420" rx="36"/></clipPath></defs>' +
    '<g clip-path="url(#scene-clip)">' +
    '<rect class="sc-sky" width="480" height="420"/>' +
    '<circle class="sc-sun" cx="372" cy="92" r="36"/>' +
    '<path class="sc-hill-back" d="M0 290C70 240 150 240 230 270S400 300 480 250V420H0Z"/>' +
    '<path class="sc-hill-front" d="M0 350C100 310 210 335 300 350S440 365 480 335V420H0Z"/>' +
    '<path class="sc-road" pathLength="1" d="M70 385C150 355 95 310 180 285S330 275 300 215S215 170 292 118"/>' +
    '<path class="sc-dash" pathLength="1" d="M70 385C150 355 95 310 180 285S330 275 300 215S215 170 292 118"/>' +
    '<g class="sc-pin p1"><circle cx="70" cy="385" r="17"/><text x="70" y="391">1</text></g>' +
    '<g class="sc-pin p2"><circle cx="180" cy="285" r="17"/><text x="180" y="291">2</text></g>' +
    '<g class="sc-pin p3"><circle cx="300" cy="215" r="17"/><text x="300" y="221">3</text></g>' +
    '<g class="sc-pin p4"><circle cx="292" cy="118" r="17"/><text x="292" y="124">4</text></g>' +
    '<g class="sc-flag-g"><line class="sc-flag-pole" x1="292" y1="100" x2="292" y2="58"/><path class="sc-flag" d="M292 58l34 12-34 12z"/></g>' +
    '</g></svg>';
  function heroSvg() {
    var doc = new DOMParser().parseFromString(HERO_SVG, 'image/svg+xml');
    return document.importNode(doc.documentElement, true);
  }

  /* ---------- Textes (i18n) ---------- */

  function lookup(dict, path) {
    var cur = dict;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  // Cherche d'abord la variante simplifiee (cle_falc) si le mode est actif, puis la langue, puis le francais.
  function find(path) {
    var langs = state.lang === 'fr' ? ['fr'] : [state.lang, 'fr'];
    for (var i = 0; i < langs.length; i++) {
      var d = state.i18n[langs[i]];
      if (!d) continue;
      if (state.prefs.falc) {
        var f = lookup(d, path.replace(/([^.]+)$/, '$1_falc'));
        if (f !== undefined) return f;
      }
      var v = lookup(d, path);
      if (v !== undefined) return v;
    }
    return undefined;
  }
  function loadLang(l) {
    if (state.i18n[l]) return Promise.resolve();
    return loadJSON('i18n/' + l + '.json').then(function (d) { state.i18n[l] = d; });
  }
  function t(path, vars) {
    var v = find(path);
    if (v === undefined) return path;
    if (typeof v === 'string' && vars) {
      Object.keys(vars).forEach(function (k) { v = v.replace('{' + k + '}', vars[k]); });
    }
    return v;
  }
  function announce(msg) {
    var live = $('live');
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 50);
  }

  /* ---------- Statistiques anonymes (compteurs) ---------- */

  function sendEvent(ev) {
    if (!state.stats) return;
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    try {
      fetch('api/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ev), keepalive: true, credentials: 'omit', cache: 'no-store'
      }).catch(function () {});
    } catch (e) { /* hebergement statique : on ignore */ }
  }

  /* ---------- Reglages d'affichage ---------- */

  function clamp(n, lo, hi) { n = Number(n); return isNaN(n) ? lo : Math.min(hi, Math.max(lo, n)); }
  function sanitize(o) {
    o = o || {};
    return {
      lang: LANGS.indexOf(o.lang) !== -1 ? o.lang : null,
      falc: o.falc === true,
      size: Math.round(clamp(o.size === undefined ? 100 : o.size, SIZE_MIN, SIZE_MAX) / SIZE_STEP) * SIZE_STEP,
      theme: THEMES.indexOf(o.theme) !== -1 ? o.theme : 'auto',
      dys: o.dys === true,
      font: FONTS.indexOf(o.font) !== -1 ? o.font : 'system',
      ruler: o.ruler === true,
      voice: typeof o.voice === 'string' ? o.voice.slice(0, 200) : '',
      rate: clamp(o.rate === undefined ? 0.95 : o.rate, 0.6, 1.4),
      remember: o.remember === true
    };
  }
  function loadPrefs() {
    try { var raw = window.localStorage.getItem(STORE_KEY); return raw ? sanitize(JSON.parse(raw)) : null; } catch (e) { return null; }
  }
  function savePrefs() {
    try {
      if (state.prefs.remember) {
        var p = Object.assign({}, state.prefs, { lang: state.lang });
        window.localStorage.setItem(STORE_KEY, JSON.stringify(p));
      } else { window.localStorage.removeItem(STORE_KEY); }
    } catch (e) { /* stockage indisponible : on ignore */ }
  }

  function formatRate(r) { return (Math.round(r * 100) / 100).toString().replace('.', state.lang === 'fr' ? ',' : '.') + '×'; }

  function applyPrefs() {
    var root = document.documentElement, p = state.prefs;
    root.lang = state.lang;
    root.setAttribute('data-theme', p.theme);
    root.setAttribute('data-font', p.font);
    root.style.setProperty('--fs', String(p.size));
    root.classList.toggle('dys', p.dys);
    $('ruler').hidden = !p.ruler;
    $('set-lang').value = state.lang;
    $('lang-quick').textContent = t('ui.lang_switch');
    $('lang-quick').setAttribute('lang', state.lang === 'fr' ? 'en' : 'fr');
    $('set-theme').value = p.theme;
    $('set-font').value = p.font;
    $('set-size').value = p.size;
    $('size-out').textContent = p.size + ' %';
    $('size-down').disabled = p.size <= SIZE_MIN;
    $('size-up').disabled = p.size >= SIZE_MAX;
    $('set-falc').checked = p.falc;
    $('set-dys').checked = p.dys;
    $('set-ruler').checked = p.ruler;
    $('set-remember').checked = p.remember;
    $('set-rate').value = p.rate;
    $('rate-out').textContent = formatRate(p.rate);
  }

  function applyStaticI18n() {
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', t('ui.meta_description'));
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-attr]'), function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        el.setAttribute(p[0], t(p[1]));
      });
    });
  }

  function changed(rerender) {
    applyPrefs(); savePrefs();
    if (rerender) refresh();
  }

  function applyProfile(name) {
    Object.assign(state.prefs, DISPLAY_DEFAULTS, PROFILES[name]);
    changed(true);
    announce(t('ui.profile_applied', { name: t('ui.profile_' + name) }));
  }
  function resetDisplay() {
    Object.assign(state.prefs, DISPLAY_DEFAULTS);
    changed(true);
    announce(t('ui.profile_reset_done'));
  }

  // Les reglages sont une PAGE (#/settings) : « Retour » ramene a l'ecran d'ou l'on vient (le questionnaire reste en l'etat).
  function leaveSettings() {
    if (state.settingsFrom) { state.settingsFrom = null; history.back(); } else go('info');
  }
  function bindSettings() {
    $('settings-close').addEventListener('click', leaveSettings);
    $('settings-x').addEventListener('click', leaveSettings);
    $('settings').addEventListener('keydown', function (e) { if (e.key === 'Escape') leaveSettings(); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-profile]'), function (b) {
      b.addEventListener('click', function () { applyProfile(b.getAttribute('data-profile')); });
    });
    $('profile-reset').addEventListener('click', resetDisplay);

    function setLang(l) {
      if (LANGS.indexOf(l) === -1) return;
      loadLang(l).then(function () {
        state.lang = l; state.prefs.voice = ''; changed(true); refreshVoices(); announce(t('meta.name'));
      });
    }
    $('set-lang').addEventListener('change', function (e) { setLang(e.target.value); });
    $('lang-quick').addEventListener('click', function () { setLang(state.lang === 'fr' ? 'en' : 'fr'); });
    $('set-theme').addEventListener('change', function (e) { state.prefs.theme = e.target.value; changed(); });
    $('set-font').addEventListener('change', function (e) { state.prefs.font = e.target.value; changed(); });
    $('set-falc').addEventListener('change', function (e) { state.prefs.falc = e.target.checked; changed(true); });
    $('set-dys').addEventListener('change', function (e) { state.prefs.dys = e.target.checked; changed(); });
    $('set-ruler').addEventListener('change', function (e) { state.prefs.ruler = e.target.checked; changed(); });
    $('set-remember').addEventListener('change', function (e) { state.prefs.remember = e.target.checked; changed(); });
    $('set-size').addEventListener('input', function (e) { state.prefs.size = clamp(e.target.value, SIZE_MIN, SIZE_MAX); changed(); });
    $('size-down').addEventListener('click', function () { state.prefs.size = Math.max(SIZE_MIN, state.prefs.size - SIZE_STEP); changed(); });
    $('size-up').addEventListener('click', function () { state.prefs.size = Math.min(SIZE_MAX, state.prefs.size + SIZE_STEP); changed(); });
    $('size-reset').addEventListener('click', function () { state.prefs.size = 100; changed(); });
    $('set-voice').addEventListener('change', function (e) { state.prefs.voice = e.target.value; changed(); });
    $('set-rate').addEventListener('input', function (e) { state.prefs.rate = clamp(e.target.value, 0.6, 1.4); changed(); });

    bindRuler();
  }

  /* ---------- Repere de lecture ---------- */

  function bindRuler() {
    var ruler = $('ruler');
    function move(y) {
      if (!state.prefs.ruler) return;
      var hgt = ruler.offsetHeight || 70;
      ruler.style.top = Math.max(0, Math.min(window.innerHeight - hgt, y - hgt / 2)) + 'px';
    }
    document.addEventListener('pointermove', function (e) { move(e.clientY); }, { passive: true });
    document.addEventListener('touchmove', function (e) { if (e.touches[0]) move(e.touches[0].clientY); }, { passive: true });
    document.addEventListener('focusin', function (e) {
      if (!state.prefs.ruler || !e.target.getBoundingClientRect) return;
      var r = e.target.getBoundingClientRect();
      move(r.top + r.height / 2);
    });
  }

  /* ---------- Lecture a voix haute naturelle ---------- */

  var speech = { active: false, timer: null, chunks: [], i: 0, btn: null, mark: null, opts: null };
  function canSpeak() { return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'; }

  function refreshVoices() {
    var group = $('voice-group'), sel = $('set-voice');
    if (!canSpeak()) {
      sel.replaceChildren(h('option', { value: '' }, t('ui.voice_unavailable')));
      sel.disabled = true; $('set-rate').disabled = true;
      return;
    }
    var voices = window.speechSynthesis.getVoices().filter(function (v) { return (v.lang || '').toLowerCase().indexOf(state.lang) === 0; });
    var opts = [h('option', { value: '' }, t('ui.voice_auto'))];
    voices.forEach(function (v) {
      opts.push(h('option', { value: v.voiceURI }, v.name + (v.localService === false ? ' (' + t('ui.voice_online') + ')' : '')));
    });
    sel.replaceChildren.apply(sel, opts);
    sel.value = voices.some(function (v) { return v.voiceURI === state.prefs.voice; }) ? state.prefs.voice : '';
    group.hidden = false;
  }

  function setMark(el) {
    if (speech.mark) speech.mark.classList.remove('is-reading');
    speech.mark = el || null;
    if (el) {
      el.classList.add('is-reading');
      if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth' });
    }
  }
  function setSpeakButton(btn, speaking, labelKey) {
    if (!btn) return;
    btn.replaceChildren(icon(speaking ? 'stop' : 'speaker'), document.createTextNode(t(speaking ? 'quiz.stop_reading' : labelKey)));
    btn.setAttribute('aria-pressed', speaking ? 'true' : 'false');
  }
  function stopSpeaking() {
    var was = speech.active;
    speech.active = false;
    clearTimeout(speech.timer);
    setMark(null);
    if (canSpeak()) window.speechSynthesis.cancel();
    if (was && speech.btn && speech.btn.isConnected) setSpeakButton(speech.btn, false, speech.opts.label);
    speech.btn = null;
  }
  function speakNext() {
    if (!speech.active) return;
    if (speech.i >= speech.chunks.length) { stopSpeaking(); return; }
    var c = speech.chunks[speech.i++];
    setMark(c.el);
    var u = new window.SpeechSynthesisUtterance(c.text);
    u.lang = t('meta.speech');
    var voice = HandiVoice.pickVoice(window.speechSynthesis.getVoices(), state.lang,
      { preferred: state.prefs.voice, allowOnline: speech.opts.allowOnline || !!state.prefs.voice });
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.rate = state.prefs.rate;
    u.pitch = 1;
    u.onend = function () { speech.timer = setTimeout(speakNext, c.pause); };
    u.onerror = function () { if (speech.active) stopSpeaking(); };
    window.speechSynthesis.speak(u);
  }
  // parts : [{ text, el, pause }]. opts : { btn, label, allowOnline }
  function toggleSpeech(parts, opts) {
    if (!canSpeak()) return;
    if (speech.active) { stopSpeaking(); return; }
    speech = { active: true, timer: null, chunks: HandiVoice.makeChunks(parts), i: 0, btn: opts.btn, mark: null, opts: opts };
    setSpeakButton(opts.btn, true, opts.label);
    speakNext();
  }
  function speakButton(labelKey) {
    var b = h('button', { type: 'button', class: 'btn btn-quiet btn-small', 'aria-pressed': 'false' });
    b.appendChild(icon('speaker')); b.appendChild(document.createTextNode(t(labelKey)));
    return b;
  }

  /* ---------- Routage par hash (#/info, #/quiz, #/result, #/kit) ---------- */

  function parseHash() {
    var parts = (location.hash || '').replace(/^#\/?/, '').split('/');
    return { name: parts[0], arg: parts[1] };
  }
  function currentView() {
    var n = parseHash().name;
    return VIEWS[n] ? n : 'info';
  }
  function go(view) {
    if (location.hash === '#/' + view) route({ focus: true });
    else location.hash = '#/' + view;
  }
  function route(opts) {
    stopSpeaking();
    var view = currentView();
    if (view === 'result' && !state.result) { view = 'info'; history.replaceState(null, '', '#/info'); }
    var isSettings = view === 'settings';
    main.hidden = isSettings;
    $('settings').hidden = !isSettings;
    var target = isSettings ? $('settings') : main;
    if (!isSettings) {
      main.className = 'wrap view-' + view;
      main.replaceChildren(VIEWS[view]());
    }
    // Titre unique a chaque ecran (WCAG 2.4.2) : pour le questionnaire, il contient « Question n sur 12 »
    document.title = (view === 'quiz' && state.quizTitle ? state.quizTitle + ' – ' : '') + t('pages.' + view) + ' – ' + t('ui.page_title_suffix');
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      var on = a.getAttribute('data-nav') === (view === 'result' || view === 'more' ? 'quiz' : view);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (!opts || opts.focus !== false) {
      var head = target.querySelector('h1');
      if (head) { head.setAttribute('tabindex', '-1'); head.focus(); }
      window.scrollTo(0, 0);
    }
  }
  function refresh() { applyPrefs(); applyStaticI18n(); refreshVoices(); route({ focus: false }); }

  /* ---------- Vue : informations ---------- */

  // Bouton « Lire cette page » (FR / EN selon la langue choisie) : build() renvoie les parties a lire
  function pageReader(build) {
    if (!canSpeak()) return null;
    var btn = speakButton('ui.read_page');
    btn.addEventListener('click', function () { toggleSpeech(build(), { btn: btn, label: 'ui.read_page', allowOnline: true }); });
    return h('p', { class: 'read-row' }, btn);
  }
  function listParts(arr, pause) { return arr.map(function (x) { return { text: x, pause: pause || 450 }; }); }

  function bulletList(key) {
    return h('ul', { class: 'plain-list' }, t(key).map(function (x) { return h('li', null, x); }));
  }
  function feature(cls, ico, id, titleKey, listKey) {
    return h('section', { class: 'feature ' + cls, 'aria-labelledby': id },
      medal(ico), h('h2', { id: id }, t(titleKey)), bulletList(listKey));
  }

  function renderInfo() {
    return h('div', null,
      h('section', { class: 'hero' },
        h('div', { class: 'hero-copy' },
          h('h1', null, t('info.title')),
          h('p', { class: 'lead' }, t('info.lead')),
          h('div', { class: 'actions' },
            h('button', { type: 'button', class: 'btn btn-primary', onclick: startQuiz }, t('info.start'), icon('arrow')),
            h('a', { class: 'btn', href: '#/kit' }, t('info.kit_link'))),
          h('p', { class: 'hint hero-hint' }, t('info.start_hint')),
          pageReader(function () {
            return [{ text: t('info.title'), pause: 600 }, { text: t('info.lead'), pause: 600 }, { text: t('info.path_title'), pause: 400 }]
              .concat(t('info.path').map(function (x) { return { text: x.title + '. ' + x.text, pause: 450 }; }))
              .concat([{ text: t('info.what_title'), pause: 400 }, { text: t('info.what'), pause: 600 }])
              .concat([{ text: t('info.does_title'), pause: 400 }], listParts(t('info.does')), [{ text: t('info.not_title'), pause: 400 }], listParts(t('info.not')),
                [{ text: t('info.privacy_title'), pause: 400 }], listParts(t('info.privacy')), [{ text: t('info.eco_title'), pause: 400 }], listParts(t('info.eco')));
          })),
        h('div', { class: 'hero-art' }, heroSvg())),

      h('section', { 'aria-labelledby': 's-route' },
        h('h2', { id: 's-route', class: 'route-title' }, t('info.path_title')),
        h('ol', { class: 'route' }, t('info.path').map(function (s) {
          return h('li', null, h('strong', null, s.title), h('span', null, s.text));
        }))),

      h('section', { class: 'callout', 'aria-labelledby': 's-what' },
        medal('book'),
        h('div', null, h('h2', { id: 's-what' }, t('info.what_title')), h('p', null, t('info.what')))),

      h('div', { class: 'trio' },
        feature('f-does', 'compass', 's-does', 'info.does_title', 'info.does'),
        feature('f-not', 'ban', 's-not', 'info.not_title', 'info.not'),
        feature('f-priv', 'lock', 's-priv', 'info.privacy_title', 'info.privacy')),

      h('section', { class: 'callout eco', 'aria-labelledby': 's-eco' },
        medal('leaf'), h('div', null, h('h2', { id: 's-eco' }, t('info.eco_title')), bulletList('info.eco'))),

      h('div', { class: 'panel optin' },
        h('label', { class: 'check', for: 'stats-opt' },
          h('input', { type: 'checkbox', id: 'stats-opt', checked: state.stats, onchange: function (e) { state.stats = e.target.checked; } }),
          h('span', null, t('info.stats_label')))),

      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn-primary', onclick: startQuiz }, t('info.start'), icon('arrow')))
    );
  }

  function resetSession() {
    state.answers = { profile: 'student' }; state.idx = 0; state.maxIdx = 0; state.started = false; state.deep = false; state.deepSent = false; state.result = null; state.checklist = {};
    stopSpeaking();
  }
  function startQuiz() { resetSession(); go('quiz'); }

  /* ---------- Vue : questionnaire (12 questions par parcours, dont 1 propre au profil) ---------- */

  // Questions « essentielles » (core, 8 a 12 par parcours) puis questions « complementaires » (deep, facultatives et adaptatives)
  function visibleIn(phase, answers) {
    return state.data.questions.questions.filter(function (q) {
      return !q.hidden && (q.phase || 'core') === phase && (!q.showIf || HandiEngine.check(q.showIf, answers));
    });
  }
  function coreList() { return visibleIn('core', state.answers); }
  function deepList() { return visibleIn('deep', state.answers); }
  function flowList() { return coreList().concat(state.deep ? deepList() : []); }
  // Total affiche : avant que le profil / la situation soient connus, on suppose le cas le plus courant
  function estimatedTotal() {
    var a = Object.assign({}, state.answers);
    if (!a.profile) a.profile = 'student';
    if (!a.duration) a.duration = 'long';
    return visibleIn('core', a).length + (state.deep ? deepList().length : 0);
  }
  function pruneAnswers() {
    var ids = coreList().concat(deepList()).map(function (q) { return q.id; });
    Object.keys(state.answers).forEach(function (k) { if (k !== 'profile' && ids.indexOf(k) === -1) delete state.answers[k]; });
    state.answers.profile = 'student';
  }

  function renderMore() {
    var core = coreList();
    if (state.maxIdx < core.length - 1) { history.replaceState(null, '', '#/quiz'); return renderQuiz(); }
    state.quizTitle = '';
    var n = deepList().length, mins = Math.max(1, Math.round(n * 25 / 60));
    return h('div', { class: 'narrow' },
      h('div', { class: 'quiz-card more-card' },
        medal('badge'),
        h('h1', null, t('quiz.more_title')),
        h('p', { class: 'lead' }, t('quiz.more_text', { n: n, m: mins })),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { startDeep(); } }, t('quiz.more_continue'), icon('arrow')),
          h('button', { type: 'button', class: 'btn', onclick: finish }, t('quiz.more_skip'))),
        h('p', { class: 'hint' }, t('quiz.more_later'))),
      h('p', null, h('button', { type: 'button', class: 'linklike', onclick: function () { location.hash = '#/quiz/' + core.length; } }, icon('back'), t('quiz.back'))));
  }
  function startDeep() {
    var core = coreList();
    state.deep = true;
    if (!state.deepSent) { state.deepSent = true; sendEvent({ t: 'deep' }); }
    state.maxIdx = Math.max(state.maxIdx, core.length);
    location.hash = '#/quiz/' + (core.length + 1);
  }

  // Panneau affiche quand la personne souhaite rejoindre le pole handicap : sujets traites + contacts par e-mail
  function emailLink(addr) { return h('a', { href: 'mailto:' + addr }, addr); }
  function poleJoinPanel() {
    var res = state.data.resources;
    return h('section', { class: 'panel pole-panel', 'aria-labelledby': 'pole-title', hidden: true },
      h('h2', { id: 'pole-title' }, t('quiz.pole_panel_title')),
      h('p', { class: 'hint' }, t('quiz.pole_panel_subjects') + ' :'),
      h('ul', { class: 'chips' }, t('quiz.pole_subjects').map(function (x) { return h('li', null, x); })),
      h('p', null, t('quiz.pole_panel_write')),
      h('ul', { class: 'cards' }, (res.pole_contacts || []).map(function (id) {
        return h('li', null, medal('user'), h('h3', null, t('contacts.' + id + '.name')),
          h('p', null, t('quiz.email_label') + ' : ', emailLink(res.contact_defs[id].email)));
      })),
      h('p', { class: 'hint' }, t('quiz.pole_panel_then')));
  }

  function renderQuiz() {
    var core = coreList(), qs = flowList();
    // La question affichee vient de l'adresse (#/quiz/N) : le bouton retour du navigateur revient donc a la question precedente.
    // On ne peut pas sauter au-dela de la question la plus avancee deja atteinte.
    var wanted = parseInt(parseHash().arg, 10);
    var want = isNaN(wanted) ? state.idx : wanted - 1;
    // Acces direct a une question complementaire sans l'avoir choisie : on passe par l'ecran de choix
    if (!state.deep && want >= core.length && state.maxIdx >= core.length - 1) { history.replaceState(null, '', '#/more'); return renderMore(); }
    state.idx = Math.max(0, Math.min(want, state.maxIdx, qs.length - 1));
    if (parseHash().arg !== String(state.idx + 1)) history.replaceState(null, '', '#/quiz/' + (state.idx + 1));
    var q = qs[state.idx];
    var total = estimatedTotal();
    var n = state.idx + 1;
    var isMulti = q.type === 'multiple';

    if (!state.started) { state.started = true; sendEvent({ t: 'start', lang: state.lang }); }

    var progressText = t('quiz.progress', { n: n, total: total }) + (state.idx >= core.length ? ' · ' + t('quiz.deep_tag') : '');
    state.quizTitle = progressText;
    var text = t('questions.' + q.id + '.text');
    var help = find('questions.' + q.id + '.help');
    var current = state.answers[q.id];
    var selected = isMulti ? (current || []) : (current ? [current] : []);

    var error = h('p', { class: 'error', id: 'q-error', role: 'alert', hidden: true });
    var describedBy = ['q-hint'].concat(help ? ['q-help'] : []).join(' ');
    var optionEls = [];

    var fieldset = h('fieldset', { class: 'choices', 'aria-labelledby': 'q-title', 'aria-describedby': describedBy },
      q.options.map(function (o) {
        var id = 'o-' + q.id + '-' + o.id;
        var input = h('input', {
          type: isMulti ? 'checkbox' : 'radio', name: q.id, id: id, value: o.id,
          checked: selected.indexOf(o.id) !== -1, onchange: onChange
        });
        var label = h('label', { class: 'choice', for: id }, input, h('span', null, t('questions.' + q.id + '.options.' + o.id)));
        optionEls.push({ id: o.id, el: label });
        return label;
      })
    );

    var polePanel = q.id === 'pole_join' ? poleJoinPanel() : null;
    function syncPanel() { if (polePanel) polePanel.hidden = state.answers.pole_join !== 'yes'; }
    syncPanel();

    function onChange(e) {
      error.hidden = true;
      if (!isMulti) {
        state.answers[q.id] = e.target.value;
        if (q.id === 'pole') pruneAnswers();
        syncPanel();
        return;
      }
      var boxes = Array.prototype.slice.call(fieldset.querySelectorAll('input'));
      var opt = q.options.filter(function (o) { return o.id === e.target.value; })[0];
      if (e.target.checked) {
        boxes.forEach(function (b) {
          var o = q.options.filter(function (x) { return x.id === b.value; })[0];
          if (b !== e.target && (opt.exclusive || o.exclusive)) b.checked = false;
        });
      }
      var vals = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
      if (vals.length) state.answers[q.id] = vals; else delete state.answers[q.id];
    }

    function hasAnswer() { var a = state.answers[q.id]; return Array.isArray(a) ? a.length > 0 : !!a; }
    function next() {
      if (!hasAnswer()) {
        error.textContent = t(q.required ? 'quiz.required' : 'quiz.required_optional');
        error.hidden = false;
        return;
      }
      advance();
    }
    function skip() { delete state.answers[q.id]; advance(); }
    function advance() {
      if (state.idx < flowList().length - 1) {
        state.maxIdx = Math.max(state.maxIdx, state.idx + 1);
        location.hash = '#/quiz/' + (state.idx + 2);
      } else if (!state.deep && deepList().length) {
        state.maxIdx = Math.max(state.maxIdx, state.idx);
        location.hash = '#/more';
      } else finish();
    }
    function back() { if (state.idx > 0) location.hash = '#/quiz/' + state.idx; }

    var title = h('h1', { class: 'q-title', id: 'q-title' }, h('span', { class: 'sr-only' }, progressText + ' : '), text);
    var helpEl = help ? h('p', { class: 'q-help', id: 'q-help' }, help) : null;
    var readBtn = canSpeak() ? speakButton('quiz.read_aloud') : null;
    if (readBtn) {
      readBtn.addEventListener('click', function () {
        var parts = [{ text: text, el: title, pause: 550 }];
        if (help) parts.push({ text: help, el: helpEl, pause: 450 });
        parts.push({ text: t('quiz.read_intro'), pause: 450 });
        q.options.forEach(function (o, i) {
          parts.push({ text: t('questions.' + q.id + '.options.' + o.id), el: optionEls[i].el, pause: 500 });
        });
        toggleSpeech(parts, { btn: readBtn, label: 'quiz.read_aloud', allowOnline: true });
      });
    }

    var steps = [];
    for (var si = 0; si < total; si++) steps.push(h('li', { class: si < state.idx ? 'done' : (si === state.idx ? 'current' : '') }));
    var trail = h('ol', { class: 'trail', 'aria-hidden': 'true' }, steps);

    return h('div', { class: 'narrow' },
      h('div', { class: 'quiz-card' },
        h('p', { class: 'q-meta', 'aria-hidden': 'true' }, progressText),
        trail,
        title,
        helpEl,
        h('p', { class: 'hint', id: 'q-hint' }, t(isMulti ? 'quiz.multi_hint' : 'quiz.single_hint')),
        readBtn ? h('p', { class: 'read-row' }, readBtn) : null,
        fieldset,
        polePanel,
        error,
        h('div', { class: 'validate-bar' },
          h('button', { type: 'button', class: 'btn btn-primary btn-validate', onclick: next },
            icon('check'), (state.deep || !deepList().length) && state.idx === qs.length - 1 ? t('quiz.finish') : t('quiz.next'))),
        h('div', { class: 'nav-row' },
          state.idx > 0 ? h('button', { type: 'button', class: 'btn', onclick: back }, icon('back'), t('quiz.back')) : null,
          h('span', { class: 'spacer' }),
          h('button', { type: 'button', class: 'btn btn-quiet', onclick: skip }, t('quiz.skip')))),
      h('p', null, h('button', { type: 'button', class: 'linklike', onclick: function () { resetSession(); go('info'); } }, t('quiz.cancel')))
    );
  }

  function finish() {
    pruneAnswers();
    var res = HandiEngine.evaluate(state.answers, state.data.rules);
    state.result = {
      score: res.score, level: res.level, matched: res.matched, flags: res.flags, todo: res.todo || [],
      overridden: res.overridden, profile: state.answers.profile
    };
    sendEvent({ t: 'complete', profile: state.result.profile, level: res.level, lang: state.lang });
    go('result');
  }

  /* ---------- Vue : resultat ---------- */

  function officialLink(id, label) {
    var def = state.data.resources.official_links.filter(function (l) { return l.id === id; })[0];
    if (!def) return null;
    return h('a', {
      href: def.url, target: '_blank', rel: 'noopener noreferrer',
      onclick: function () { sendEvent({ t: 'doc', doc: id }); }
    }, label, h('span', { class: 'sr-only' }, ' ' + t('ui.new_tab')));
  }

  function orderedContacts(profile, flags) {
    var res = state.data.resources;
    var ids = (res.contacts[profile] || ['mdph']).slice();
    var sensitive = flags.indexOf('employer') !== -1 || flags.indexOf('stigma') !== -1;
    if (sensitive) {
      ids.sort(function (a, b) {
        var ca = res.confidential_first.indexOf(a) !== -1 ? 0 : 1;
        var cb = res.confidential_first.indexOf(b) !== -1 ? 0 : 1;
        return ca - cb;
      });
    }
    return { ids: ids, sensitive: sensitive };
  }

  var CONTACT_ICON = {
    pole_social: 'user', pole_rse: 'user', school_officer: 'user', student_health: 'shield', registrar: 'doc', occ_physician: 'shield',
    hr_officer: 'user', prevention_physician: 'shield', cap_emploi: 'compass',
    france_travail: 'building', agefiph: 'building', fiphfp: 'building', mdph: 'building'
  };
  var LEVEL_ICON = { explore: 'book', talk: 'chat', talk_soon: 'clock', already: 'badge' };

  function contactCard(id) {
    var res = state.data.resources;
    var def = res.contact_defs[id] || {};
    var secret = res.confidential_first.indexOf(id) !== -1;
    var link = def.link ? officialLink(def.link, t('links.' + def.link + '.label')) : null;
    return h('li', null,
      medal(CONTACT_ICON[id] || 'user'),
      secret ? h('span', { class: 'badge' }, t('result.secret_badge')) : null,
      h('h3', null, t('contacts.' + id + '.name')),
      h('p', null, t('contacts.' + id + '.role')),
      def.email ? h('p', null, t('quiz.email_label') + ' : ', emailLink(def.email)) : null,
      link ? h('p', null, link) : null);
  }

  function renderResult() {
    var r = state.result;
    var reasons = r.matched.filter(function (m) { return m.points > 0 || m.id === 'R_already_rqth' || m.id === 'R_no_signal'; });
    var flagOrder = ['urgent', 'psych_support_none', 'already_rqth', 'see_doctor', 'no_support', 'informal_adjust', 'student_exam', 'student_work',
      'shift_work', 'long_search', 'public_status', 'emp_unaware', 'emp_leave', 'life_sleep', 'for_relative', 'for_support', 'sup_confidentiality',
      'goal_info_only', 'needs_info', 'employer', 'stigma', 'complexity', 'who', 'time'];
    var flags = flagOrder.filter(function (f) { return r.flags.indexOf(f) !== -1; });
    var contacts = orderedContacts(r.profile, r.flags);

    var lvTitle = h('h2', { id: 'lvl' }, t('levels.' + r.level + '.title'));
    var lvBody = h('p', null, t('levels.' + r.level + '.body'));
    var notice = h('p', { class: 'notice' }, t('result.notdecision'));
    var flagEls = flags.map(function (f) { return h('li', null, t('flags.' + f)); });
    var todos = r.todo || [];
    var todoEls = todos.map(function (id) { return h('li', null, t('todo.' + id)); });
    var deepN = deepList().length;
    var contactEls = contacts.ids.map(contactCard);

    var listenBtn = canSpeak() ? speakButton('result.read_aloud') : null;
    if (listenBtn) {
      listenBtn.addEventListener('click', function () {
        var parts = [{ text: t('levels.' + r.level + '.title'), el: lvTitle, pause: 500 },
          { text: t('levels.' + r.level + '.body'), el: lvBody, pause: 600 },
          { text: t('result.notdecision'), el: notice, pause: 700 }];
        flags.forEach(function (f, i) { parts.push({ text: t('flags.' + f), el: flagEls[i], pause: 500 }); });
        todos.forEach(function (id, i) { parts.push({ text: t('todo.' + id), el: todoEls[i], pause: 500 }); });
        parts.push({ text: t('result.contacts_title'), pause: 450 });
        contacts.ids.forEach(function (id, i) { parts.push({ text: t('contacts.' + id + '.name'), el: contactEls[i], pause: 450 }); });
        // Le texte du resultat reflete les reponses : voix locale par defaut, voix en ligne seulement si choisie.
        toggleSpeech(parts, { btn: listenBtn, label: 'result.read_aloud', allowOnline: false });
      });
    }

    return h('div', { class: 'narrow' },
      h('h1', null, t('result.title')),
      h('section', { class: 'panel level lv-' + r.level, 'aria-labelledby': 'lvl' },
        medal(LEVEL_ICON[r.level] || 'book'),
        h('div', null, lvTitle, lvBody)),
      notice,
      listenBtn ? h('p', { class: 'read-row' }, listenBtn) : null,

      flags.length ? h('section', { 'aria-labelledby': 's-att' },
        h('h2', { id: 's-att' }, t('result.attention_title')),
        h('ul', { class: 'plain-list' }, flagEls)) : null,

      todos.length ? h('section', { 'aria-labelledby': 's-todo' },
        h('h2', { id: 's-todo' }, t('result.todo_title')),
        h('p', { class: 'notice' }, t('result.todo_note')),
        h('ul', { class: 'plain-list todo-list' }, todoEls)) : null,

      (!state.deep && deepN) ? h('section', { class: 'panel refine', 'aria-labelledby': 's-refine' },
        h('h2', { id: 's-refine' }, t('result.refine_title')),
        h('p', null, t('result.refine_text', { n: deepN })),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: startDeep }, t('result.refine_btn'), icon('arrow'))) : null,

      h('section', { 'aria-labelledby': 's-who' },
        h('h2', { id: 's-who' }, t('result.contacts_title')),
        h('p', null, t('result.contacts_intro')),
        contacts.sensitive ? h('p', { class: 'hint' }, t('result.confidential_tip')) : null,
        h('ul', { class: 'cards' }, contactEls)),

      h('section', { 'aria-labelledby': 's-why' },
        h('h2', { id: 's-why' }, t('result.why_title')),
        h('p', null, t('result.why_intro')),
        h('ul', { class: 'plain-list' }, reasons.map(function (m) {
          return h('li', null, t('rules.' + m.id), ' ',
            m.points > 0 ? h('span', { class: 'pts' }, '(+' + (m.points === 1 ? t('result.points', { n: m.points }) : t('result.points_plural', { n: m.points })) + ')') : null);
        })),
        r.overridden ? null : h('p', { class: 'hint' }, t('result.score_line', { score: r.score }))),

      h('section', { 'aria-labelledby': 's-next' },
        h('h2', { id: 's-next' }, t('result.next_title')),
        h('div', { class: 'actions' },
          h('a', { class: 'btn btn-primary', href: '#/kit' }, t('result.to_kit'), icon('arrow')),
          h('button', { type: 'button', class: 'btn', onclick: printPage }, icon('print'), t('result.print')),
          h('button', { type: 'button', class: 'btn', onclick: function () { downloadPdf(resultPdfBlocks(), 'handidiag-orientation.pdf', t('pdf.result_title')); } }, icon('doc'), t('result.pdf')),
          h('button', { type: 'button', class: 'btn btn-quiet', onclick: downloadSummary }, icon('download'), t('result.download')),
          h('button', { type: 'button', class: 'btn btn-quiet', onclick: function () { resetSession(); go('info'); } }, icon('restart'), t('result.restart'))),
        h('p', { class: 'hint no-print' }, t('result.summary_note')))
    );
  }

  // Resume texte : ne contient PAS les reponses detaillees, seulement l'orientation et les contacts.
  function downloadSummary() {
    var r = state.result;
    var contacts = orderedContacts(r.profile, r.flags).ids;
    var lines = ['HandiDiag', '', t('levels.' + r.level + '.title'), t('levels.' + r.level + '.body'), '', t('result.contacts_title').toUpperCase()];
    contacts.forEach(function (id) { var d = state.data.resources.contact_defs[id] || {}; lines.push('- ' + t('contacts.' + id + '.name') + ' : ' + t('contacts.' + id + '.role') + (d.email ? ' (' + d.email + ')' : '')); });
    if (r.todo && r.todo.length) { lines.push('', t('pdf.todo').toUpperCase(), t('result.todo_note')); r.todo.forEach(function (id) { lines.push('- ' + t('todo.' + id)); }); }
    lines.push('', t('kit.checklist_title').toUpperCase());
    t('kit.checklist').forEach(function (c) { lines.push('[ ] ' + c); });
    lines.push('', t('result.notdecision'), t('ui.footer_disclaimer'));
    saveBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), 'handidiag-resume.txt');
    sendEvent({ t: 'doc', doc: 'summary_download' });
  }

  /* ---------- Impression et PDF (fabriques sur l'appareil, rien n'est envoye) ---------- */

  function printPage() { sendEvent({ t: 'doc', doc: 'print' }); window.print(); }

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  // Le generateur de PDF (10 Ko) n'est charge qu'au moment du premier telechargement (eco-conception)
  function downloadPdf(blocks, filename, title) {
    (window.HandiPdf ? Promise.resolve() : loadScript('js/pdf.js')).then(function () {
      var bytes = HandiPdf.build({ title: title, lang: state.lang === 'fr' ? 'fr-FR' : 'en-GB', footer: t('pdf.footer'), blocks: blocks });
      saveBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
      sendEvent({ t: 'doc', doc: 'pdf_download' });
    });
  }
  function checklistBlocks() {
    var out = [{ type: 'h2', text: t('pdf.checklist') }];
    t('kit.checklist').forEach(function (c) { out.push({ type: 'check', text: c }); });
    return out;
  }
  // Le PDF du resultat ne contient PAS les reponses detaillees : orientation, contacts, checklist.
  function resultPdfBlocks() {
    var r = state.result, b = [];
    b.push({ type: 'title', text: t('pdf.result_title') });
    b.push({ type: 'h2', text: t('levels.' + r.level + '.title') });
    b.push({ type: 'p', text: t('levels.' + r.level + '.body') });
    b.push({ type: 'notice', text: t('result.notdecision') });
    b.push({ type: 'h2', text: t('result.contacts_title') });
    orderedContacts(r.profile, r.flags).ids.forEach(function (id) {
      b.push({ type: 'h3', text: t('contacts.' + id + '.name') });
      b.push({ type: 'p', text: t('contacts.' + id + '.role') });
      var def = state.data.resources.contact_defs[id] || {};
      if (def.email) b.push({ type: 'p', text: t('quiz.email_label') + ' : ' + def.email });
      var link = def.link && state.data.resources.official_links.filter(function (l) { return l.id === def.link; })[0];
      if (link) b.push({ type: 'url', text: link.url, url: link.url });
    });
    if (r.todo && r.todo.length) {
      b.push({ type: 'h2', text: t('pdf.todo') });
      b.push({ type: 'notice', text: t('result.todo_note') });
      r.todo.forEach(function (id) { b.push({ type: 'bullet', text: t('todo.' + id) }); });
    }
    b = b.concat(checklistBlocks());
    b.push({ type: 'small', text: t('ui.footer_disclaimer') });
    return b;
  }
  function kitPdfBlocks() {
    var b = [{ type: 'title', text: t('pdf.kit_title') }, { type: 'p', text: t('kit.intro') }];
    b.push({ type: 'h2', text: t('pdf.links') });
    state.data.resources.official_links.forEach(function (l) {
      b.push({ type: 'h3', text: t('links.' + l.id + '.label') });
      b.push({ type: 'p', text: t('links.' + l.id + '.desc') });
      b.push({ type: 'url', text: l.url, url: l.url });
    });
    b.push({ type: 'h2', text: t('pdf.guide') });
    t('kit.guide').forEach(function (s, i) { b.push({ type: 'h3', text: (i + 1) + '. ' + s.title }); b.push({ type: 'p', text: s.text }); });
    b = b.concat(checklistBlocks());
    b.push({ type: 'h2', text: t('kit.vigilance_title') });
    t('kit.vigilance').forEach(function (v) { b.push({ type: 'bullet', text: v }); });
    b.push({ type: 'small', text: t('ui.footer_disclaimer') });
    return b;
  }

  /* ---------- Vue : espace administrateur (charge a la demande : js/admin.js) ---------- */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.HandiAdmin) return resolve();
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function renderAdmin() {
    var root = h('div', { class: 'admin-root' }, h('h1', null, t('pages.admin')), h('p', null, t('ui.loading')));
    loadScript('js/admin.js').then(function () { window.HandiAdmin.mount(root, t, state.lang); }, function () {
      root.replaceChildren(h('h1', null, t('pages.admin')), h('p', { class: 'error' }, t('admin.unavailable')));
    });
    return root;
  }

  /* ---------- Vue : kit documentaire ---------- */

  function renderKit() {
    var links = state.data.resources.official_links;
    var items = t('kit.checklist');
    var count = h('span', { class: 'pts' }, '0 / ' + items.length);
    function updateCount() {
      var done = Object.keys(state.checklist).filter(function (k) { return state.checklist[k]; }).length;
      count.textContent = done + ' / ' + items.length;
    }
    updateCount();

    return h('div', { class: 'narrow' },
      h('h1', null, t('kit.title')),
      h('p', { class: 'lead' }, t('kit.intro')),
      pageReader(function () {
        return [{ text: t('kit.title'), pause: 500 }, { text: t('kit.intro'), pause: 600 }, { text: t('kit.links_title'), pause: 400 }]
          .concat(links.map(function (l) { return { text: t('links.' + l.id + '.label') + '. ' + t('links.' + l.id + '.desc'), pause: 450 }; }))
          .concat([{ text: t('kit.guide_title'), pause: 400 }], t('kit.guide').map(function (x) { return { text: x.title + '. ' + x.text, pause: 450 }; }),
            [{ text: t('kit.checklist_title'), pause: 400 }], listParts(items, 350), [{ text: t('kit.vigilance_title'), pause: 400 }], listParts(t('kit.vigilance')));
      }),

      h('section', { 'aria-labelledby': 'k-links' },
        h('h2', { id: 'k-links' }, t('kit.links_title')),
        h('ul', { class: 'cards kit-links two' }, links.map(function (l) {
          return h('li', null, h('h3', null, officialLink(l.id, t('links.' + l.id + '.label')), ' ', icon('link')), h('p', null, t('links.' + l.id + '.desc')));
        }))),

      h('section', { 'aria-labelledby': 'k-guide' },
        h('h2', { id: 'k-guide' }, t('kit.guide_title')),
        h('ol', { class: 'steps' }, t('kit.guide').map(function (s) {
          return h('li', null, h('h3', null, s.title), h('p', null, s.text));
        }))),

      h('section', { 'aria-labelledby': 'k-check' },
        h('h2', { id: 'k-check' }, t('kit.checklist_title'), ' ', count),
        h('p', { class: 'hint' }, t('kit.checklist_intro')),
        h('ul', { class: 'checklist' }, items.map(function (item, i) {
          var id = 'c-' + i;
          return h('li', null, h('label', { for: id },
            h('input', { type: 'checkbox', id: id, checked: !!state.checklist[i], onchange: function (e) { state.checklist[i] = e.target.checked; updateCount(); } }),
            h('span', null, item)));
        }))),

      h('section', { 'aria-labelledby': 'k-vig' },
        h('h2', { id: 'k-vig' }, t('kit.vigilance_title')), bulletList('kit.vigilance')),

      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { downloadPdf(kitPdfBlocks(), 'handidiag-kit.pdf', t('pdf.kit_title')); } }, icon('doc'), t('kit.pdf')),
        h('button', { type: 'button', class: 'btn', onclick: printPage }, icon('print'), t('kit.print')))
    );
  }

  /* ---------- Demarrage ---------- */

  function loadJSON(url) {
    return fetch(url, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  function init() {
    var saved = loadPrefs();
    var detected = (navigator.language || 'fr').slice(0, 2) === 'en' ? 'en' : 'fr';
    if (saved) { state.prefs = Object.assign(state.prefs, saved); state.lang = saved.lang || detected; }
    else { state.lang = detected; }

    Promise.all([
      loadJSON('data/questions.json'), loadJSON('data/rules.json'), loadJSON('data/resources.json'),
      loadLang(state.lang)
    ]).then(function (r) {
      state.data = { questions: r[0], rules: r[1], resources: r[2] };
      bindSettings();
      applyPrefs(); applyStaticI18n(); refreshVoices();
      if (canSpeak()) window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      window.addEventListener('hashchange', function (e) {
        var old = ((e && e.oldURL) || '').split('#')[1] || '';
        if (currentView() === 'settings') state.settingsFrom = (old && old.indexOf('/settings') === -1) ? '#' + old : null;
        else state.settingsFrom = null;
        route({ focus: true });
      });
      window.addEventListener('pagehide', stopSpeaking);
      route({ focus: false });
    }).catch(function () {
      var p = $('boot');
      if (p) p.textContent = 'Erreur de chargement / Loading error. Rechargez la page / Please reload.';
    });
  }

  init();
})();
