/* Fifth pass on the グローバルPR診断 landing page (18589): the strips at the
   sides of the dark band, properly this time.

   Measured rather than guessed. The widget's parent is not `.e-con-inner`
   as on every other page - this page's single container is `e-con-full` and
   the widget is its direct child - so the selector the fourth pass used
   never matched anything. What is actually happening is simpler than a
   width problem: the container carries 10px of horizontal padding, so its
   content box is 1420 inside a 1440 window, and the widget fills that.

   The container's padding goes, the widget fills it, and the band reaches
   both edges. No viewport units and no negative margins, which is what was
   making it fragile. */
(function () {
  var SENTINEL = 'ml-repaint v5';

  var htmlW = null;
  (function find(c) {
    (c.children || []).forEach(function (k) {
      if (k.model.get('widgetType') === 'html') { htmlW = k; }
      find(k);
    });
  })(elementor.getPreviewContainer());
  if (!htmlW) { throw new Error('no HTML widget on this document'); }

  var src = String(htmlW.settings.get('html') || '');
  if (src.indexOf(SENTINEL) >= 0) { return 'already at v5, nothing to do'; }
  if (src.indexOf('ml-repaint v4') < 0) { throw new Error('v4 has not run'); }

  var before = src.length;

  var css = [
    '<style>/* ' + SENTINEL + ' */',
    '.elementor-18589 > .e-con{padding-left:0!important;padding-right:0!important}',
    '.elementor-18589 .elementor-widget-html{',
    ' width:100%!important;max-width:100%!important;',
    ' margin-left:0!important;margin-right:0!important}',
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
