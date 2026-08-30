# shivamgaind.com

Static site, no build step, no dependencies. Hosted on GitHub Pages behind the `CNAME`
(`www.shivamgaind.com`). Open `index.html` through any local web server and it runs — paths are
root-relative, so `file://` won't work.

```bash
python3 -m http.server 8000    # then visit http://localhost:8000
```

## Structure

```
index.html                       homepage
work/mplab/index.html            case study — WRSM testing, Columbia MPLab
work/plateoptimize/index.html    case study — PlateOptimize
work/insect-detection/index.html case study — AI insect detection
work/topology-optimization/      case study — multiphysics & topology optimization
assets/instrument.css            the whole design system
assets/instrument.js             all behaviour (hero scope, timeline, lightbox, deck, filters)
images/  pdfs/  videos/  files/  ORIGINAL source assets — untouched, never delete
media/                           generated web-optimized derivatives of the above
robots.txt  sitemap.xml
styles.css  script.js            previous design, kept unreferenced as a fallback
```

## The `media/` folder

Nothing in `images/`, `pdfs/`, `videos/` or `files/` was modified or removed. `media/` holds
web-optimized *derivatives* generated from them, and the pages load those:

| Generated | From | Why |
|---|---|---|
| `media/img/*-{640,1024,1600}.webp` + `.jpg` | `images/*` | 37 MB of full-size PNG/JPEG became 4.9 MB of responsive WebP with JPEG fallbacks |
| `media/bee-entering-trap.mp4` | `videos/bee-entering-trap.mov` | The original is **HEVC in a QuickTime container — Chrome and Firefox cannot play it.** Re-encoded to H.264/AAC with `faststart` |
| `media/bee-entering-trap-poster.jpg` | same | Poster frame, so the video costs nothing until played |
| `media/optimization-project-slides.pdf` | `files/optimization-project-slides.pptx` | The deck is now readable in the browser instead of a 6.5 MB download |
| `media/slides/slide-NN.webp` (25) | that PDF | Inline slide viewer |
| `media/slides/t-NN.webp` (25) | that PDF | Filmstrip thumbnails |
| `media/resume-thumb.webp` | `pdfs/shivam-gaind-resume.pdf` | Résumé preview card |

The `.mov` is still linked on the insect-detection page as a secondary `<source>` and a direct
download, so nothing is lost.

### Regenerating

Requires `ffmpeg`, `libreoffice`, `pdftoppm` and Python `Pillow`.

```bash
# video
ffmpeg -i videos/bee-entering-trap.mov -vf "scale=1280:-2,hqdn3d=2:1:3:3" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 30 -preset veryslow \
  -movflags +faststart -c:a aac -b:a 80k media/bee-entering-trap.mp4

# deck -> pdf -> slide images
libreoffice --headless --convert-to pdf --outdir media files/optimization-project-slides.pptx
pdftoppm -r 96 -png media/optimization-project-slides.pdf media/slides/s
# then downscale to slide-NN.webp (1200px) and t-NN.webp (200px) with Pillow
```

## Adding a project

**Index tier** (homepage `#index`) — copy an `.idx-row` block. `data-cat` takes any of
`robotics controls software hardware energy`; the filter buttons read it. The `.thumb` span is the
hover preview and is optional.

**Flagship** (homepage `#work`) — copy a `.flag` article. Add `rev` to the class to flip the media to
the other side. `.spec` rows are the mono key/value table.

**New case study** — copy any file in `work/`. The head, header, drawer and footer are identical
across all four; only `<main>` changes.

## Components in `instrument.js`

| Hook | What it does |
|---|---|
| `.scope canvas` | Hero oscilloscope. Pauses when scrolled out of view; renders one static frame under `prefers-reduced-motion` |
| `.rv` | Reveal-on-scroll. Add `data-d="1..3"` to stagger |
| `.tl-shell` | Timeline. Pins and scrubs horizontally ≥960px; becomes a swipeable rail below that and under reduced motion |
| `[data-gallery]` + `[data-lb]` | Lightbox. `data-lb` is the full-size source, `data-lb-alt` the caption, `data-lb-label` the eyebrow |
| `[data-deck]` | Slide viewer. Arrow keys work when focused |
| `[data-doc]` | Opens a PDF in the modal viewer. `data-doc-title` names it |
| `.filters` | Project filtering, with an `aria-live` count for screen readers |

## Conventions

- Every colour, size and easing is a custom property at the top of `instrument.css`. Change the
  palette there, not in components.
- Monospace (`--mono`) is reserved for data: dates, units, labels, specs, counts. Prose is `--sans`.
- Fonts come from Google Fonts with full local fallback stacks; the site is fully legible if that
  request fails.
- Every animation respects `prefers-reduced-motion`.
- Images use `<picture>` with WebP plus a JPEG fallback, explicit `width`/`height` to avoid layout
  shift, and `loading="lazy"` below the fold.
