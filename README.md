# rohitkottomtharayil.github.io

Personal portfolio site — minimal, black-and-white, generative art grid.

Built with plain HTML, CSS, and vanilla JavaScript. No frameworks, no build tools.

## Structure

```
index.html          Landing page (sidebar + 4×4 generative tile grid)
about.html          About page (bio, timeline, interests)
resume.html         Résumé page (embedded PDF viewer)
style.css           Global stylesheet
grid.js             Tile animations, spotlight effect, custom cursor
assets/
  resume.pdf        Your resume (replace with your own)
  favicon.ico       Site favicon
```

## How to Update

### Bio text
Open `about.html` and edit the `<p>` tags inside the `.about-bio` div. The first paragraph renders in white (primary), the rest in gray (secondary).

### Resume PDF
Replace `assets/resume.pdf` with your own PDF file. Keep the filename the same, or update the `src` attribute in `resume.html` and the `href` in the download button.

### Tile patterns
Each tile in `index.html` contains an inline SVG inside a `.tile-front` div. Edit the SVG markup directly to change patterns. All SVGs use a 200×200 viewBox with white strokes on a `#0a0a0a` background.

### Social links
Edit the sidebar `<a>` tags in each HTML file. The sidebar is duplicated across pages for zero-dependency simplicity.

## Deploy to GitHub Pages

1. Push this repo to `github.com/<your-username>/<your-username>.github.io`
2. Go to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose `main` branch, root `/` folder
5. Save — your site will be live at `https://<your-username>.github.io`

## Design

- **Colors**: Pure black (#000), white (#fff), and grays only
- **Fonts**: Space Grotesk (headings), Inter (body), JetBrains Mono (labels)
- **Interactions**: Tile hover with spring animation, click-to-flip, spotlight cursor ripple, page fade transitions
- **Responsive**: Desktop 4×4 grid → Tablet 3×3 → Mobile 2×4

## License

MIT
