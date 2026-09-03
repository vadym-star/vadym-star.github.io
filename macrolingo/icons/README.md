# Icons

The line drawings from concept A-6, one file each. They are the source for the
`ml-i-*` classes in the site stylesheet: `build_css.py` reads every file in this
folder and writes it into `ml-site-css.css` as a mask, so the icon takes
whatever colour the text around it has.

To change an icon, replace the file and run `python build_css.py`. To add one,
drop `ml-<name>.svg` in here; it becomes the class `ml-i-<name>`.

Keep `stroke="currentColor"` (or `fill="currentColor"`) in the file. The stroke
widths are the concept's own: 1.7 for the service icons, 1.8 for the contact
icons and the arrow, 2 for the tick.
