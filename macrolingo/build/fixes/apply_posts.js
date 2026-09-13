// Run in a wp-admin tab. window.ML_FIXES = [{id, fixes:[{old,new}]}...]
// Reads each post's raw content, title and excerpt through the REST API,
// applies each fix where the old text occurs exactly once (trying the
// entity forms WordPress stores), and saves only posts that changed.
window.mlApplyPosts = async function (batch, dryRun) {
  if (!window.__mlNonce) {
    window.__mlNonce = (await (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce', { credentials: 'same-origin' })).text()).trim();
  }
  const H = { 'X-WP-Nonce': window.__mlNonce, 'Content-Type': 'application/json' };
  const MAP = [['’', '&#8217;'], ['‘', '&#8216;'], ['“', '&#8220;'], ['”', '&#8221;'], ['–', '&#8211;'], ['—', '&#8212;'], ['…', '&#8230;']];
  const mapEnt = s => { let m = s; MAP.forEach(([x, y]) => { m = m.split(x).join(y); }); return m; };
  const amp = s => s.replace(/&/g, '&amp;');
  // each transform is applied to both old and new, so the replacement is
  // stored in the same form as the text it replaces
  const TRANSFORMS = [s => s, amp, mapEnt, s => mapEnt(amp(s)), s => s.replace(/ /g, '&nbsp;'), s => s.replace(/ /g, ' ')];
  const count = (hay, needle) => { let n = 0, i = -1; while ((i = hay.indexOf(needle, i + 1)) >= 0) n++; return n; };
  const report = [];
  for (const job of batch) {
    const r = await fetch(`/wp-json/wp/v2/posts/${job.id}?context=edit&_fields=id,content,title,excerpt`, { headers: H, credentials: 'same-origin' });
    if (!r.ok) { report.push({ id: job.id, error: 'get ' + r.status }); continue; }
    const p = await r.json();
    const fields = { content: p.content.raw, title: p.title.raw, excerpt: p.excerpt.raw };
    const res = { id: job.id, done: 0, miss: [] };
    for (const f of job.fixes) {
      let hit = false;
      for (const field of ['content', 'title', 'excerpt']) {
        for (const T of TRANSFORMS) {
          const o = T(f.old);
          const c = count(fields[field], o);
          if (c === 1) { const nw = T(f.new); fields[field] = fields[field].replace(o, () => nw); hit = true; res.done++; break; }
          if (c > 1) { res.miss.push({ old: f.old, why: 'occurs ' + c + ' times in ' + field }); hit = 'multi'; break; }
        }
        if (hit) break;
      }
      if (!hit) res.miss.push({ old: f.old, why: 'not found' });
    }
    const changed = fields.content !== p.content.raw || fields.title !== p.title.raw || fields.excerpt !== p.excerpt.raw;
    if (changed && !dryRun) {
      const body = {};
      if (fields.content !== p.content.raw) body.content = fields.content;
      if (fields.title !== p.title.raw) body.title = fields.title;
      if (fields.excerpt !== p.excerpt.raw) body.excerpt = fields.excerpt;
      const u = await fetch(`/wp-json/wp/v2/posts/${job.id}`, { method: 'POST', headers: H, credentials: 'same-origin', body: JSON.stringify(body) });
      res.saved = u.ok ? 'ok' : 'save ' + u.status;
    }
    report.push(res);
  }
  return report;
};
'ready';
