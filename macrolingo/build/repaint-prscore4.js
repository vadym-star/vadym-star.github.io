/* Fourth pass on the グローバルPR診断 landing page (18589) - finishing the
   three of Vadym's six that the third pass only half did.

     1. The dark band still had a strip of white down each side. The
        full-bleed rule was written as `.elementor-widget-html`, two
        classes, and Elementor caps every widget in a container with
        `.e-con.e-con > .e-con-inner > .elementor-widget { max-width: 100% }`,
        which is four. Written in Elementor's own shape it holds.

     2. `[class*="h-1"]` also matches `h-10` and `h-12`, so the rule meant
        for the thin line under a heading was painting the round numeral
        discs solid teal as well - invisible teal numerals on a teal disc,
        on the panel that appears when the diagnostic finishes.
        `[class~="h-1"]` matches the class as a whole word.

     3. The icon discs on the dark band were mixed at 32% of a dark teal
        and read as smudges. Lighter tint, brighter icon. */
(function () {
  var SENTINEL = 'ml-repaint v4';

  var htmlW = null;
  (function find(c) {
    (c.children || []).forEach(function (k) {
      if (k.model.get('widgetType') === 'html') { htmlW = k; }
      find(k);
    });
  })(elementor.getPreviewContainer());
  if (!htmlW) { throw new Error('no HTML widget on this document'); }

  var src = String(htmlW.settings.get('html') || '');
  if (src.indexOf(SENTINEL) >= 0) { return 'already at v4, nothing to do'; }
  if (src.indexOf('ml-repaint v3') < 0) { throw new Error('v3 has not run'); }

  var before = src.length;

  var css = [
    '<style>/* ' + SENTINEL + ' */',
    '.e-con > .e-con-inner > .elementor-widget.elementor-widget-html{',
    ' width:100vw!important;max-width:100vw!important;',
    ' margin-left:calc(50% - 50vw)!important;margin-right:0!important}',
    /* the thin rule under a heading, and nothing else */
    '[class*="w-12"][class*="h-1"]{background-color:transparent}',
    '[class~="w-12"][class~="h-1"]{background-color:var(--mlp-teal,#00595A)!important}',
    /* the discs that were caught by the loose match go back to a tint */
    '[class~="h-10"][class*="bg-blue"],[class~="h-12"][class*="bg-blue"],',
    '[class~="h-8"][class*="bg-blue"]',
    '{background-color:var(--mlp-teal-tint,#D4E5E5)!important}',
    /* an icon disc on the dark band */
    '[class*="bg-blue-900/50"]{background-color:rgba(127,196,197,.16)!important}',
    '[class*="bg-blue-900/50"] i[class*="fa-"]{color:#A6DBDA!important}',
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

  return JSON.stringify({ before: before, after: src.length });
})()
