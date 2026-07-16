# Site color themes

## Active theme

`theme-sage-cream.css` — warm cream background with sage green accents.

## Revert to navy

In `index.html` and `resume.html`, change the theme stylesheet:

```html
<link rel="stylesheet" href="themes/theme-navy.css?v=1">
```

Then bump the `?v=` on `style.css` / `home.css` to bust cache.

## Files

| File | Description |
|------|-------------|
| `theme-navy.css` | Original dark navy + blue accent palette |
| `theme-sage-cream.css` | Cream + sage green palette |

Both files define the same CSS custom properties (`--bg`, `--accent`, etc.) used by `style.css`, `home.css`, and `hero-backgrounds.js`.
