/* Second pass on the グローバルPR診断 landing page (18589).

   The first pass mapped the palette and stopped. Vadym looked at the whole
   page and was right about it: "not our colors, bad svgs, uncopatible
   geometry, you havent review it with ur own eyes havent you". I had checked
   the top of the page and the measurements and not the rest. Read at full
   length it has four real faults:

     1. The four statistics sit on the dark band, and the first pass gave
        them teal - which is the site's colour for a figure, and all but
        invisible on navy. They now take the light teal the rest of that
        band already uses for its accents.

     2. "90%以上" wrapped after the second character, so the number and its
        own suffix were on different lines. The figure is held on one line
        and sized to fit instead.

     3. Three icon tiles in 日本国内の広報手法 were still wearing Font
        Awesome's own red and amber. They are teal, like every other icon
        disc on the page.

     4. `**定量的監査システム**` was markdown that never ran, so the page
        showed the asterisks. It is a strong tag now.

   The diagnostic is not touched. Idempotent: it stamps its own sentinel. */
(function () {
  var SENTINEL = 'ml-repaint v2';

  var htmlW = null;
  (function find(c) {
    (c.children || []).forEach(function (k) {
      if (k.model.get('widgetType') === 'html') { htmlW = k; }
      find(k);
    });
  })(elementor.getPreviewContainer());
  if (!htmlW) { throw new Error('no HTML widget on this document'); }

  var src = String(htmlW.settings.get('html') || '');
  if (src.indexOf(SENTINEL) >= 0) { return 'already at v2, nothing to do'; }
  if (src.indexOf('ml-repaint v1') < 0) { throw new Error('v1 has not run'); }

  var before = src.length;
  var counts = {};
  function swap(from, to) {
    var n = src.split(from).length - 1;
    if (n) { counts[from.slice(0, 46) + ' -> ' + to.slice(0, 30)] = n; }
    src = src.split(from).join(to);
  }

  /* 4. the markdown that never ran */
  swap('**定量的監査システム**', '<strong>定量的監査システム</strong>');

  /* 3. Font Awesome's red and amber, on tiles whose neighbours are teal */
  swap('bg-red-50 text-red-600', 'bg-[#D4E5E5] text-[#00595A]');
  swap('bg-amber-50 text-amber-600', 'bg-[#D4E5E5] text-[#00595A]');

  var css = [
    '<style>/* ' + SENTINEL + ' */',
    /* 1. a figure on the dark band cannot be teal-on-navy */
    '[class*="bg-[#22324A]"] [class*="text-[#00595A]"],',
    '.bg-slate-950 [class*="text-[#00595A]"],',
    '.bg-slate-900 [class*="text-[#00595A]"],',
    '.bg-slate-800 [class*="text-[#00595A]"]',
    '{color:var(--mlp-teal-lt,#7FC4C5)!important}',
    /* 2. the number and its suffix stay on one line */
    '.font-extrabold[class*="text-[#00595A]"]{',
    ' white-space:nowrap;line-height:1.14;',
    ' font-size:clamp(24px,2.3vw,40px)!important}',
    /* the four stat cards are one row: same height, same inner rhythm */
    '[class*="bg-[#22324A]"] .grid > div{display:flex;flex-direction:column}',
    '[class*="bg-[#22324A]"] .grid > div > span:first-child{margin-top:auto;margin-bottom:12px}',
    '</style>',
  ].join('');

  var at = src.indexOf('</style>');
  if (at < 0) { throw new Error('no style block to anchor to'); }
  src = src.slice(0, at + 8) + css + src.slice(at + 8);

  $e.run('document/elements/settings', {
    container: htmlW,
    settings: { html: src },
    options: { external: true },
  });

  return JSON.stringify({ before: before, after: src.length, swaps: counts });
})()
