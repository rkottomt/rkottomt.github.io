# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **static personal portfolio website** (hand-written HTML, CSS, and vanilla JavaScript). There is **no build step, no package manager, no backend, and no runtime dependencies**. It is deployed as static files via GitHub Pages (`.nojekyll` is present).

### Structure
- `index.html` — landing/home page (hero canvas particle animation, generative SVG tiles, About/Experience/Coursework/Projects/Contact sections). Loads `style.css`, `home.css`, `home.js`, `grid.js`, `hero-backgrounds.js`.
- `resume.html` — résumé page with an embedded PDF viewer (`assets/resume.pdf`). Loads `resume.css`, `resume.js`.
- `assets/` — images, `favicon.ico`, `resume.pdf`, and `projects/` figures.
- `extract_assets.py` — a one-time, offline helper that extracts images from the bundled PDFs using PyMuPDF (`fitz`). NOT part of the runtime site; only needed to regenerate `assets/projects/`. Install with `pip install PyMuPDF` if you ever need to run it.

### Running / testing (dev)
- Serve the repo root over HTTP and open in a browser. Example: `python3 -m http.server 8000` from `/workspace`, then open `http://localhost:8000/index.html`.
- Use a local HTTP server rather than `file://` so relative asset paths and the résumé PDF `<iframe>` behave like production.
- There are no automated tests, no lint config, and no build. "Testing" means loading the pages in a browser and checking rendering/interactions.

### Gotchas
- JS/CSS are loaded with `?v=N` cache-busting query params; hard-refresh if edits don't appear.
- Google Fonts load via CDN; offline the site still renders with fallback fonts.
