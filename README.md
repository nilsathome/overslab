# OVERSLAB

Website mockup: extended-art frames for PSA-graded Yu-Gi-Oh! Overframe cards.

- `index.html` – the complete site (HTML/CSS/JS, no build step)
- `img/cards/` – Overframe scans, one image per design
- Adding a design: drop the image at `img/cards/<slug>.jpg` and add one line to the `CARDS` array in `index.html`

Preview locally:

```bash
python3 -m http.server 8765
```

Image sources: Yugipedia card scans and own photos. Yu-Gi-Oh! and all artwork are the property of Konami.
