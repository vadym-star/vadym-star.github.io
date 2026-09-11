/* Third pass on the グローバルPR診断 landing page (18589), all of it from
   Vadym reading the page:

     "all the svgs should be the same teal color, little green lines should
      also be teal, the black background should be full wide, it currently
      has wide strips on the sides, グローバルPR・AI検索発見性の診断を
      始めましょう this sections background should be white and have a
      little line underneath it separating line. and this form - Pillar 1
      should be blue themed, and you should probably tweak it a little so
      everything is visible nicely and comfortable to click, this -
      実務基準に基づく15の設問 is not centered the number is lower then
      this text"

   Six changes, in that order. The diagnostic is not touched. */
(function () {
  var SENTINEL = 'ml-repaint v3';

  var htmlW = null;
  (function find(c) {
    (c.children || []).forEach(function (k) {
      if (k.model.get('widgetType') === 'html') { htmlW = k; }
      find(k);
    });
  })(elementor.getPreviewContainer());
  if (!htmlW) { throw new Error('no HTML widget on this document'); }

  var src = String(htmlW.settings.get('html') || '');
  if (src.indexOf(SENTINEL) >= 0) { return 'already at v3, nothing to do'; }
  if (src.indexOf('ml-repaint v2') < 0) { throw new Error('v2 has not run'); }

  var before = src.length;
  var counts = {};
  function swap(from, to) {
    var n = src.split(from).length - 1;
    if (n) { counts[from.slice(0, 44) + ' -> ' + to.slice(0, 26)] = n; }
    src = src.split(from).join(to);
  }

  /* the one icon tile v2 missed: Font Awesome's emerald */
  swap('bg-emerald-50 text-emerald-600', 'bg-[#D4E5E5] text-[#00595A]');

  /* the numeral and the heading beside it: centred as a pair, the disc
     floats halfway down a two-line heading and reads as sitting low. It
     belongs on the first line. */
  swap('class="flex items-center space-x-3 mb-4"',
       'class="flex items-start space-x-3 mb-4 ml-numrow"');

  /* the answer buttons take the card's blue rather than the page's green:
     green is the colour of a thing you do, and these are a choice */
  swap('hover:bg-[#54B435] text-white', 'hover:bg-[#2F6FD6] text-white');
  swap('hover:border-[#54B435]', 'hover:border-[#2F6FD6]');
  swap('active:bg-[#458F2C] active:border-[#458F2C]',
       'active:bg-[#2457AE] active:border-[#2457AE]');

  var css = [
    '<style>/* ' + SENTINEL + ' */',
    /* 3. the widget runs the full width of the window. The page took the
          site's ordinary template, which caps its content at 1100px, so the
          dark band had ten pixels of white down each side. Each section
          inside the document centres its own max-w-* container, so letting
          the widget bleed puts the bands full width and leaves the reading
          measure alone. */
    '.elementor-widget-html{width:100vw;max-width:100vw;margin-left:calc(50% - 50vw)}',
    /* 1. every icon the same teal; light teal on a dark ground, and the
          colour it is given inside a filled button */
    '.elementor-widget-html i[class*="fa-"]{color:var(--mlp-teal,#00595A)!important}',
    '[class*="bg-[#22324A]"] i[class*="fa-"],',
    '.bg-slate-900 i[class*="fa-"],.bg-slate-800 i[class*="fa-"]',
    '{color:var(--mlp-teal-lt,#7FC4C5)!important}',
    'button i[class*="fa-"],[class*="bg-[#54B435]"] i[class*="fa-"],',
    '[class*="bg-[#2F6FD6]"] i[class*="fa-"]{color:inherit!important}',
    /* 2. the short rule under a heading */
    '[class*="w-12"][class*="h-1"]{background-color:var(--mlp-teal,#00595A)!important}',
    /* 4. the closing call to action sits on white and is closed by a rule */
    'section.bg-slate-50.text-center{',
    ' background-color:#fff!important;',
    ' border-bottom:1px solid var(--mlp-line,#E9EEE3)!important}',
    /* 5. the question card is blue, and big enough to press */
    '#diagnostic-box{background:#EAF2FE!important;border-color:#D7E6FB!important;',
    ' box-shadow:0 10px 30px rgba(34,50,74,.06)!important}',
    '#pillar-indicator{color:#2F6FD6!important}',
    '#progress-bar{background-color:#2F6FD6!important}',
    '#diagnostic-box .grid > button{',
    ' background:#fff!important;border-color:#D7E6FB!important;',
    ' min-height:96px;cursor:pointer}',
    '#diagnostic-box .grid > button:hover{',
    ' background:#2F6FD6!important;border-color:#2F6FD6!important;color:#fff!important}',
    '#diagnostic-box .grid > button:hover span{color:#fff!important}',
    /* the second line under each answer was at 60% and hard to read */
    '#diagnostic-box .grid > button .opacity-60{opacity:.75}',
    '#diagnostic-box #question-text{color:#22324A!important}',
    '#back-btn:hover{color:#2F6FD6!important}',
    /* 6. the numeral sits on the heading's first line */
    '.ml-numrow > div:first-child{margin-top:1px;flex:0 0 auto}',
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
