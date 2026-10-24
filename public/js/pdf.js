/*
 * HandiDiag - generateur de PDF minimal, sans dependance, 100 % dans le navigateur.
 * Rien n'est envoye nulle part : le fichier est fabrique sur l'appareil puis telecharge.
 * Texte seulement (polices standard Helvetica, accents francais pris en charge), A4, plusieurs pages,
 * liens cliquables, pied de page numerote, langue du document declaree.
 * Limite connue : le PDF n'est pas "balise" (pas de structure d'accessibilite avancee) ;
 * la version imprimee depuis le navigateur ou le resume texte restent disponibles.
 * Utilisable dans le navigateur (window.HandiPdf) et dans Node (tests).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HandiPdf = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Largeurs Helvetica (AFM) pour les caracteres ASCII 32..126, en millièmes d'em
  var REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278, 556,556,556,556,556,556,556,556,556,556,
    278,278,584,584,584,556,1015, 667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
    278,278,278,469,556,333, 556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,
    334,260,334,584];
  var BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278, 556,556,556,556,556,556,556,556,556,556,
    333,333,584,584,584,611,975, 722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
    333,278,333,584,556,333, 556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,
    389,280,389,584];
  var SPECIAL_W = { '\u2019': 278, '\u2018': 278, '\u201c': 500, '\u201d': 500, '\u2013': 556, '\u2014': 1000, '\u2026': 1000, '\u2022': 350,
    '\u0153': 944, '\u0152': 1000, '\u00ab': 556, '\u00bb': 556, '\u00a0': 278, '\u00d7': 584 };
  // Caracteres hors Latin-1 representables en WinAnsi (cp1252)
  var WINANSI = { '\u20ac': 0x80, '\u2018': 0x91, '\u2019': 0x92, '\u201c': 0x93, '\u201d': 0x94, '\u2022': 0x95,
    '\u2013': 0x96, '\u2014': 0x97, '\u2026': 0x85, '\u0152': 0x8c, '\u0153': 0x9c };

  function clean(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/[\u2192\u27f6]/g, '->').replace(/\u2265/g, '>=').replace(/\u2264/g, '<=')
      .replace(/[\u2713\u2714]/g, '+').replace(/[\u202f\u2009\u200a\u2007]/g, ' ').replace(/\s+/g, ' ');
  }
  function toBytes(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), c = s.charCodeAt(i);
      if (c >= 32 && c < 127) out.push(c);
      else if (c >= 0xa0 && c <= 0xff) out.push(c);
      else if (WINANSI[ch] !== undefined) out.push(WINANSI[ch]);
      else out.push(63); // ?
    }
    return out;
  }
  function hex(bytes) {
    var h = '';
    for (var i = 0; i < bytes.length; i++) h += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16).toUpperCase();
    return '<' + h + '>';
  }
  function charW(ch, bold) {
    var c = ch.charCodeAt(0), tbl = bold ? BOLD : REG;
    if (c >= 32 && c <= 126) return tbl[c - 32];
    if (SPECIAL_W[ch] !== undefined) return SPECIAL_W[ch];
    var base = ch.normalize ? ch.normalize('NFD').charAt(0) : ch;
    var bc = base.charCodeAt(0);
    if (bc >= 32 && bc <= 126) return tbl[bc - 32];
    return 556;
  }
  function textW(s, size, bold) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += charW(s.charAt(i), bold);
    return w * size / 1000;
  }
  // Coupe un texte en lignes qui tiennent dans maxW (mots longs coupes si necessaire)
  function wrap(text, size, bold, maxW) {
    var words = clean(text).split(' ').filter(Boolean), lines = [], line = '';
    words.forEach(function (w) {
      while (textW(w, size, bold) > maxW) {                 // mot plus large qu'une ligne
        var cut = w.length;
        while (cut > 1 && textW(w.slice(0, cut), size, bold) > maxW) cut--;
        if (line) { lines.push(line); line = ''; }
        lines.push(w.slice(0, cut)); w = w.slice(cut);
      }
      var test = line ? line + ' ' + w : w;
      if (textW(test, size, bold) * 1.015 <= maxW) line = test;
      else { if (line) lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
  function n2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function esc(s) { return String(s).replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, ''); }
  function utf16hex(s) {
    var h = 'FEFF';
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h += ('0000' + c.toString(16).toUpperCase()).slice(-4); }
    return '<' + h + '>';
  }

  var INK = '0.071 0.149 0.227', TEAL = '0.027 0.318 0.306', GREY = '0.30 0.35 0.40', BLUE = '0.05 0.30 0.55';

  /* doc : { title, lang, footer, blocks:[{type,text,url?}] } -> Uint8Array
     types : title, h2, h3, p, small, bullet, check, url, notice */
  function build(doc) {
    var PW = 595.28, PH = 841.89, M = 56, maxW = PW - 2 * M, bottom = M + 14;
    var pages = [], cur, y;
    function newPage() { cur = { ops: [], annots: [] }; pages.push(cur); y = PH - M; }
    function ensure(h) { if (y - h < bottom) newPage(); }
    function text(str, x, yy, font, size, color) {
      cur.ops.push(color + ' rg BT /' + font + ' ' + n2(size) + ' Tf 1 0 0 1 ' + n2(x) + ' ' + n2(yy) + ' Tm ' + hex(toBytes(str)) + ' Tj ET');
    }
    function lines(arr, x, font, size, lead, color, url) {
      arr.forEach(function (ln) {
        ensure(lead); y -= lead;
        text(ln, x, y + (lead - size) * 0.3, font, size, color);
        if (url) cur.annots.push({ rect: [x, y, x + textW(ln, size, false), y + lead], url: url });
      });
    }
    newPage();

    (doc.blocks || []).forEach(function (b) {
      var t = b.text;
      switch (b.type) {
        case 'title': {
          lines(wrap(t, 22, true, maxW), M, 'F2', 22, 27, TEAL);
          y -= 9;
          cur.ops.push(TEAL + ' RG 1.4 w ' + n2(M) + ' ' + n2(y) + ' m ' + n2(M + 90) + ' ' + n2(y) + ' l S');
          y -= 8; break;
        }
        case 'h2': ensure(60); y -= 12; lines(wrap(t, 14, true, maxW), M, 'F2', 14, 18, TEAL); y -= 3; break;
        case 'h3': ensure(40); y -= 6; lines(wrap(t, 11.5, true, maxW), M, 'F2', 11.5, 15, INK); break;
        case 'p': lines(wrap(t, 11, false, maxW), M, 'F1', 11, 15, INK); y -= 5; break;
        case 'small': lines(wrap(t, 9, false, maxW), M, 'F1', 9, 12, GREY); y -= 4; break;
        case 'url': lines(wrap(t, 8.5, false, maxW), M, 'F1', 8.5, 11, BLUE, b.url || t); y -= 4; break;
        case 'bullet': {
          var bl = wrap(t, 11, false, maxW - 16); ensure(15);
          text('\u2022', M + 3, y - 15 + 4.5, 'F1', 11, TEAL);
          lines(bl, M + 16, 'F1', 11, 15, INK); y -= 3; break;
        }
        case 'check': {
          var cl = wrap(t, 11, false, maxW - 22); ensure(15);
          cur.ops.push(INK + ' RG 0.9 w ' + n2(M + 1) + ' ' + n2(y - 15 + 2) + ' 9 9 re S');
          lines(cl, M + 22, 'F1', 11, 15, INK); y -= 4; break;
        }
        case 'notice': {
          var nl = wrap(t, 10.5, false, maxW - 22), h = nl.length * 14 + 14;
          ensure(h + 6); y -= 4;
          cur.ops.push('1 0.953 0.839 rg ' + n2(M) + ' ' + n2(y - h) + ' ' + n2(maxW) + ' ' + n2(h) + ' re f');
          cur.ops.push('0.949 0.694 0.204 rg ' + n2(M) + ' ' + n2(y - h) + ' 4 ' + n2(h) + ' re f');
          var save = y; y -= 7;
          lines(nl, M + 14, 'F3', 10.5, 14, '0.36 0.23 0.0');
          y = save - h - 8; break;
        }
        default: lines(wrap(t, 11, false, maxW), M, 'F1', 11, 15, INK);
      }
    });

    // pieds de page numerotes
    var total = pages.length;
    pages.forEach(function (pg, i) {
      var foot = clean((doc.footer || 'HandiDiag - page {n}/{total}').replace('{n}', i + 1).replace('{total}', total));
      var save = cur; cur = pg;
      text(foot, M, M - 10, 'F1', 8.5, GREY);
      cur = save;
    });

    // ---- assemblage des objets PDF ----
    var objs = [];                                     // index 0 => objet 1
    function add(s) { objs.push(s); return objs.length; }
    add('<< /Type /Catalog /Pages 2 0 R /Lang (' + esc(doc.lang || 'fr-FR') + ') /ViewerPreferences << /DisplayDocTitle true >> >>');
    add(null);                                         // Pages (rempli plus bas)
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
    add('<< /Title ' + utf16hex(clean(doc.title || 'HandiDiag')) + ' /Creator (HandiDiag) /Producer (HandiDiag) >>');
    var kids = [];
    pages.forEach(function (pg) {
      var stream = pg.ops.join('\n');
      var cid = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      var aids = pg.annots.map(function (a) {
        return add('<< /Type /Annot /Subtype /Link /Rect [' + a.rect.map(n2).join(' ') + '] /Border [0 0 0] /A << /S /URI /URI (' + esc(a.url) + ') >> >>');
      });
      var pid = add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + n2(PW) + ' ' + n2(PH) + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ' + cid + ' 0 R' +
        (aids.length ? ' /Annots [' + aids.map(function (i) { return i + ' 0 R'; }).join(' ') + ']' : '') + ' >>');
      kids.push(pid + ' 0 R');
    });
    objs[1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pages.length + ' >>';

    var out = '%PDF-1.4\n', offsets = [];
    objs.forEach(function (o, i) { offsets.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';

    var bytes = new Uint8Array(out.length);
    for (var i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }

  return { build: build, wrap: wrap, textW: textW, toBytes: toBytes };
});
