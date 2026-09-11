/* Repaints the グローバルPR診断 landing page (18589) in the MacroLingo palette.

   Adam asked for "just basic design to fit new site" on this one. The page
   is not an ordinary page: it is an Elementor Canvas template holding one
   HTML widget that contains a complete Tailwind document - a fifteen-
   question diagnostic with live scoring, three pillar scores and a hidden
   Forminator form behind it. Rebuilding it with the section builder would
   delete a working tool, so nothing here touches the structure.

   What changes is colour and type:

     the indigo call to action   -> MacroLingo green
     the four big figures        -> teal, which is what the site uses for a
                                    number ("green does, blue reaches, teal
                                    proves")
     every small uppercase label,
       icon disc and pill        -> teal, its accent-only role
     the slate greys             -> the site's warm ground, hairlines and
                                    body ink
     near-black section grounds  -> the site's own ink, #22324A
     Inter / system faces        -> the site's serif for headings and its
                                    sans for the rest

   The dark sections stay dark. They carry the credentials and the
   authority argument and the contrast is deliberate; what changed is that
   the dark is now the site's ink rather than a colder near-black. Worth
   showing Adam: a full-bleed dark band is not otherwise in the system.

   Idempotent - it stamps a sentinel and refuses to run twice. */
(function () {
  var SENTINEL = 'ml-repaint v1';

  var htmlW = null;
  (function find(c) {
    (c.children || []).forEach(function (k) {
      if (k.model.get('widgetType') === 'html') { htmlW = k; }
      find(k);
    });
  })(elementor.getPreviewContainer());
  if (!htmlW) { throw new Error('no HTML widget on this document'); }

  var src = String(htmlW.settings.get('html') || '');
  if (src.indexOf(SENTINEL) >= 0) { return 'already repainted, nothing to do'; }

  var before = src.length;
  var counts = {};
  function swap(from, to) {
    var n = src.split(from).length - 1;
    if (n) { counts[from + ' -> ' + to] = n; src = src.split(from).join(to); }
  }

  /* The figures first: text-[#5C54F2] is the four statistics, and a number
     is teal on this site. Everything left on that hex is a button. */
  swap('text-[#5C54F2]', 'text-[#00595A]');
  swap('#5C54F2', '#54B435');
  swap('#4f46e5', '#458F2C');
  swap('#16A34A', '#458F2C');
  swap('#0F172A', '#22324A');
  swap('rgba(92,84,242,', 'rgba(84,180,53,');
  swap('rgba(22,163,74,', 'rgba(69,143,44,');

  /* The logo in the embedded header is asked for by a bare filename, which
     resolves against the page URL and 404s; an onerror handler catches it.
     Point it at the file. */
  swap('src="MacroLingo-Full-Color_logo.webp"',
       'src="https://staging1.macrolingo.com/wp-content/uploads/2024/06/'
       + 'MacroLingo-Full-Color_logo.png"');

  /* Tailwind's own utilities are remapped rather than rewritten class by
     class: there are several hundred of them and a rename would be a
     hundred chances to break the diagnostic. The page is an Elementor
     Canvas holding nothing but this widget, so an unscoped override is
     safe here in a way it would not be on an ordinary page.

     The two selectors carrying a slash are written as attribute matches so
     that no backslash has to survive being pasted through a console. */
  var css = [
    '<style>/* ' + SENTINEL + ' - MacroLingo palette over the Tailwind classes */',
    ':root{--mlp-green:#54B435;--mlp-green-dark:#458F2C;--mlp-ink:#22324A;',
    ' --mlp-ink-2:#2B3E5A;--mlp-body:#4C5769;--mlp-muted:#7C8797;',
    ' --mlp-warm:#F6F8F2;--mlp-line:#E9EEE3;--mlp-line-2:#DDE6D6;',
    ' --mlp-teal:#00595A;--mlp-teal-lt:#7FC4C5;--mlp-teal-tint:#D4E5E5;}',
    /* grounds */
    '.bg-slate-50{background-color:var(--mlp-warm)!important}',
    '.bg-slate-200{background-color:var(--mlp-line)!important}',
    '.bg-slate-700,.bg-slate-900,.bg-slate-950{background-color:var(--mlp-ink)!important}',
    '.bg-slate-800{background-color:var(--mlp-ink-2)!important}',
    /* words */
    '.text-slate-900,.text-slate-800{color:var(--mlp-ink)!important}',
    '.text-slate-700,.text-slate-600{color:var(--mlp-body)!important}',
    '.text-slate-500{color:var(--mlp-muted)!important}',
    '.text-slate-400{color:#A9B7C6!important}',
    '.text-slate-300{color:#CBD7E2!important}',
    '.text-slate-200{color:#E3EAF1!important}',
    /* lines */
    '.border-slate-100{border-color:#F0F4EC!important}',
    '.border-slate-200{border-color:var(--mlp-line)!important}',
    '.border-slate-300{border-color:var(--mlp-line-2)!important}',
    '.border-slate-600,.border-slate-700,.border-slate-800,.border-slate-950',
    '{border-color:rgba(255,255,255,.14)!important}',
    /* labels, discs and pills are teal; buttons are green */
    '.text-blue-600,.text-blue-700{color:var(--mlp-teal)!important}',
    '.text-blue-400{color:var(--mlp-teal-lt)!important}',
    '.bg-blue-50,.bg-blue-100{background-color:var(--mlp-teal-tint)!important}',
    '.border-blue-200{border-color:#B3D1D2!important}',
    '[class*="bg-blue-900/50"]{background-color:rgba(0,103,104,.32)!important}',
    '.bg-blue-500,.bg-blue-600{background-color:var(--mlp-green)!important}',
    '.border-blue-500{border-color:var(--mlp-green)!important}',
    '.ring-blue-500{--tw-ring-color:var(--mlp-green)!important}',
    /* faces */
    'body,.font-sans,input,select,textarea,button',
    '{font-family:var(--e-global-typography-text-font-family,"Figtree"),',
    ' "Noto Sans JP",Arial,sans-serif!important}',
    'h1,h2,h3,h4',
    '{font-family:var(--e-global-typography-primary-font-family,"Newsreader"),',
    ' "Noto Serif JP",Georgia,serif!important;letter-spacing:.01em}',
    '</style>',
  ].join('');

  /* straight after the document's own <style> block, so anything it sets
     deliberately is still overruled by ours */
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
