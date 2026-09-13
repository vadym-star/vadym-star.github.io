// Text fixes that survive markup. The stored HTML of a post or widget is read
// as a sequence of visible characters (tags and comments skipped, entities
// decoded, curly and straight quotes treated as the same letter), the old
// text is found in that sequence, and only the characters that differ
// between old and new are replaced - so a link, an <em> or a <span> that
// happens to sit across the phrase stays exactly where it was.
(function () {
  const ENT = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };
  const norm = c => c === '‘' || c === '’' ? "'" : c === '“' || c === '”' ? '"' : c === ' ' ? ' ' : c;

  function units(raw) {
    const u = [];
    let i = 0;
    while (i < raw.length) {
      const ch = raw[i];
      if (ch === '<') {
        const end = raw.startsWith('<!--', i) ? raw.indexOf('-->', i) + 3 : raw.indexOf('>', i) + 1;
        if (end <= i) { u.push({ c: ch, s: i, e: i + 1 }); i++; continue; }
        i = end; continue;
      }
      if (ch === '&') {
        const m = /^&(#x[0-9a-f]+|#\d+|[a-z]+);/i.exec(raw.slice(i, i + 12));
        if (m) {
          let c = m[1][0] === '#' ? String.fromCodePoint(m[1][1] === 'x' || m[1][1] === 'X' ? parseInt(m[1].slice(2), 16) : parseInt(m[1].slice(1), 10)) : ENT[m[1].toLowerCase()];
          if (c !== undefined) { u.push({ c, s: i, e: i + m[0].length }); i += m[0].length; continue; }
        }
      }
      const cp = raw.codePointAt(i); const len = cp > 0xffff ? 2 : 1;
      u.push({ c: raw.slice(i, i + len), s: i, e: i + len });
      i += len;
    }
    return u;
  }

  function findAll(us, old) {
    const o = Array.from(old).map(norm);
    const hits = [];
    outer: for (let i = 0; i + o.length <= us.length; i++) {
      for (let j = 0; j < o.length; j++) if (norm(us[i + j].c) !== o[j]) continue outer;
      hits.push(i);
    }
    return hits;
  }

  const emit = s => s.replace(/’/g, '&#8217;').replace(/‘/g, '&#8216;').replace(/“/g, '&#8220;').replace(/”/g, '&#8221;');

  // returns {text, n} ; mode 'one' requires exactly one hit, 'all' replaces every hit
  window.mlFixText = function (raw, old, neu, mode) {
    let us = units(raw);
    const hits = findAll(us, old);
    if (!hits.length) return { text: raw, n: 0, why: 'not found' };
    if (hits.length > 1 && mode !== 'all') return { text: raw, n: 0, why: 'occurs ' + hits.length + ' times' };
    const O = Array.from(old), N = Array.from(neu);
    // character alignment (LCS): unchanged characters keep their place, so
    // markup between them is never moved
    const L = Array.from({ length: O.length + 1 }, () => new Array(N.length + 1).fill(0));
    for (let i = O.length - 1; i >= 0; i--) for (let j = N.length - 1; j >= 0; j--)
      L[i][j] = O[i] === N[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ops = []; // {t:'del', i} | {t:'ins', i, c}  (ins goes before old index i)
    let i = 0, j = 0;
    while (i < O.length || j < N.length) {
      if (i < O.length && j < N.length && O[i] === N[j]) { i++; j++; }
      else if (j < N.length && (i === O.length || L[i][j + 1] >= L[i + 1][j])) { ops.push({ t: 'ins', i, c: N[j] }); j++; }
      else { ops.push({ t: 'del', i }); i++; }
    }
    let text = raw;
    for (const h of hits.slice().reverse()) {
      // apply from the end so earlier offsets stay valid
      const groups = [];
      for (const op of ops) {
        const g = groups[groups.length - 1];
        if (g && op.t === 'ins' && g.ins !== undefined && g.at === op.i) { g.ins += op.c; continue; }
        if (op.t === 'ins') groups.push({ at: op.i, ins: op.c });
        else groups.push({ del: op.i });
      }
      for (const g of groups.slice().reverse()) {
        if (g.del !== undefined) {
          const u = us[h + g.del];
          text = text.slice(0, u.s) + text.slice(u.e);
        } else {
          const pos = g.at < O.length ? us[h + g.at].s : us[h + O.length - 1].e;
          text = text.slice(0, pos) + emit(g.ins) + text.slice(pos);
        }
      }
    }
    // a removal that emptied a block leaves an empty element behind
    if (neu === '') text = text.replace(/<!-- wp:paragraph -->\s*<p[^>]*>\s*<\/p>\s*<!-- \/wp:paragraph -->\s*/g, '')
               .replace(/<!-- wp:list-item -->\s*<li[^>]*>\s*<\/li>\s*<!-- \/wp:list-item -->\s*/g, '');
    return { text, n: hits.length };
  };

  window.mlApplyPosts2 = async function (batch, dryRun) {
    if (!window.__mlNonce) window.__mlNonce = (await (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce', { credentials: 'same-origin' })).text()).trim();
    const H = { 'X-WP-Nonce': window.__mlNonce, 'Content-Type': 'application/json' };
    const report = [];
    for (const job of batch) {
      const r = await fetch(`/wp-json/wp/v2/posts/${job.id}?context=edit&_fields=id,content,title,excerpt`, { headers: H, credentials: 'same-origin' });
      if (!r.ok) { report.push({ id: job.id, error: 'get ' + r.status }); continue; }
      const p = await r.json();
      const f0 = { content: p.content.raw, title: p.title.raw, excerpt: p.excerpt.raw };
      const f = Object.assign({}, f0);
      const res = { id: job.id, done: 0, miss: [] };
      for (const fx of job.fixes) {
        let ok = false, why = 'not found';
        for (const field of ['content', 'title', 'excerpt']) {
          const mode = fx.new === '' ? 'one' : 'all';
          const out = window.mlFixText(f[field], fx.old, fx.new, mode);
          if (out.n) { f[field] = out.text; res.done += 1; ok = true; break; }
          if (out.why !== 'not found') why = out.why + ' in ' + field;
        }
        if (!ok) res.miss.push({ old: fx.old, why });
      }
      const body = {};
      ['content', 'title', 'excerpt'].forEach(k => { if (f[k] !== f0[k]) body[k] = f[k]; });
      if (Object.keys(body).length && !dryRun) {
        const u = await fetch(`/wp-json/wp/v2/posts/${job.id}`, { method: 'POST', headers: H, credentials: 'same-origin', body: JSON.stringify(body) });
        res.saved = u.ok ? 'ok' : 'save ' + u.status;
      }
      report.push(res);
    }
    return report;
  };

  // Elementor: apply fixes to every string setting of every element in the
  // open document, repeater items included. Returns counts; does not save.
  window.mlApplyElementor = function (fixes) {
    const res = { done: 0, miss: [] };
    const strings = [];
    const walk = c => {
      if (!c) return;
      if (c.model && c.settings) {
        const s = c.settings.attributes;
        for (const k in s) if (typeof s[k] === 'string' && s[k] && !/^(_|css_|custom_css|link|url|html_tag|image)/.test(k)) strings.push({ c, k });
        if (c.repeaters) Object.values(c.repeaters).forEach(rep => (rep.children || []).forEach(item => {
          const a = item.settings.attributes;
          for (const k in a) if (typeof a[k] === 'string' && a[k] && !/^(_id|link|url|image)/.test(k)) strings.push({ c: item, k });
        }));
      }
      (c.children || []).forEach(walk);
    };
    walk(elementor.getPreviewContainer());
    for (const fx of fixes) {
      const hits = strings.map(x => ({ x, n: window.mlFixText(x.c.settings.get(x.k), fx.old, fx.new, 'all').n })).filter(h => h.n);
      const total = hits.reduce((a, h) => a + h.n, 0);
      if (!total) { res.miss.push({ old: fx.old, why: 'not found' }); continue; }
      if (fx.new === '' && total > 1) { res.miss.push({ old: fx.old, why: 'removal matches ' + total }); continue; }
      hits.forEach(h => {
        const v = window.mlFixText(h.x.c.settings.get(h.x.k), fx.old, fx.new, 'all').text;
        $e.run('document/elements/settings', { container: h.x.c, settings: { [h.x.k]: v }, options: { external: true } });
      });
      res.done++;
    }
    return res;
  };
})();
'mlfix ready';
