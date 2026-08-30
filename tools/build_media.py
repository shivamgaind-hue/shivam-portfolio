#!/usr/bin/env python3
"""
Regenerate everything in media/ from the original assets in images/, videos/ and files/.

media/ is entirely derived output. Nothing here reads or writes the originals;
they are inputs only. Safe to delete media/ and re-run.

Requires: ffmpeg, libreoffice, pdftoppm (poppler-utils), Pillow.
Run from the repository root:  python3 tools/build_media.py
"""

import os
import glob
import re
import shutil
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

VIDEO_SRC = "videos/bee-entering-trap.mov"
DECK_SRC = "files/optimization-project-slides.pptx"
RESUME_SRC = "pdfs/shivam-gaind-resume.pdf"

# Images that get responsive derivatives. Brand logos are excluded on purpose —
# the pages use the originals inside a light chip so the marks stay legible.
IMAGE_SRCS = [
    "images/insect-detection-1.png",
    "images/insect-detection-2.png",
    "images/insect-detection-3.png",
    "images/insect-detection-4.png",
    "images/optimization-techniques-title.png",
    "images/shivamphoto.jpg",
    "images/cooling-system.jpg",
    "images/clean-energy.jpg",
    "images/formboard.jpg",
    "images/automata.jpg",
    "images/puzzle.jpg",
    "images/wall-robot.jpg",
    "images/ai-chatbot.jpg",
    "images/plateoptimize-tool.png",
    "images/plateoptimize-tool-settings.png",
    "images/plateoptimize-icon.png",
    "images/plateoptimize-app-store.jpg",
    "media/bee-entering-trap-poster.jpg",  # produced by build_video() first
]

WIDTHS = [640, 1024, 1600]
FLATTEN_BG = (10, 12, 14)  # transparency composites onto the page's near-black


def run(cmd, **kw):
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True, **kw)


def need(binary):
    if shutil.which(binary) is None:
        sys.exit(f"error: '{binary}' not found on PATH")


def build_video():
    """
    The source is HEVC in a QuickTime container, which Chrome and Firefox cannot
    play. Re-encode to H.264/AAC with faststart, and pull a poster frame.
    """
    os.makedirs("media", exist_ok=True)
    run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", VIDEO_SRC,
        "-vf", "scale=1280:-2,hqdn3d=2:1:3:3",
        "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-crf", "30", "-preset", "veryslow", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "80k",
        "media/bee-entering-trap.mp4",
    ])
    run([
        "ffmpeg", "-y", "-loglevel", "error", "-ss", "2", "-i", VIDEO_SRC,
        "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "4",
        "media/bee-entering-trap-poster.jpg",
    ])


def build_images():
    os.makedirs("media/img", exist_ok=True)
    for src in IMAGE_SRCS:
        if not os.path.exists(src):
            print(f"  skip (missing): {src}", flush=True)
            continue
        im = Image.open(src)
        if im.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", im.size, FLATTEN_BG)
            rgba = im.convert("RGBA")
            bg.paste(rgba, mask=rgba.split()[-1])
            base = bg
        else:
            base = im.convert("RGB")

        stem = os.path.splitext(os.path.basename(src))[0]
        W, H = base.size
        made = []
        for w in WIDTHS:
            if w > W and made:
                continue
            w2 = min(w, W)
            r = base.resize((w2, round(H * w2 / W)), Image.LANCZOS)
            r.save(f"media/img/{stem}-{w2}.webp", "WEBP", quality=82, method=6)
            made.append(w2)
        # JPEG fallback at the largest size actually produced
        w2 = made[-1]
        base.resize((w2, round(H * w2 / W)), Image.LANCZOS).save(
            f"media/img/{stem}-{w2}.jpg", "JPEG",
            quality=82, optimize=True, progressive=True,
        )
        print(f"  {src} -> {made}", flush=True)


def build_deck():
    """pptx -> pdf (readable in-browser) -> per-slide images for the inline viewer."""
    os.makedirs("media/slides", exist_ok=True)
    run(["libreoffice", "--headless", "--convert-to", "pdf",
         "--outdir", "media", DECK_SRC])

    for old in glob.glob("media/slides/*.webp") + glob.glob("media/slides/s-*.png"):
        os.remove(old)

    run(["pdftoppm", "-r", "96", "-png",
         "media/optimization-project-slides.pdf", "media/slides/s"])

    for f in sorted(glob.glob("media/slides/s-*.png")):
        n = int(re.search(r"s-(\d+)", f).group(1))
        im = Image.open(f).convert("RGB")
        im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS).save(
            f"media/slides/slide-{n:02d}.webp", "WEBP", quality=80, method=6)
        im.resize((200, round(im.height * 200 / im.width)), Image.LANCZOS).save(
            f"media/slides/t-{n:02d}.webp", "WEBP", quality=72, method=6)
        os.remove(f)
    print(f"  slides: {len(glob.glob('media/slides/slide-*.webp'))}", flush=True)


def build_resume_thumb():
    run(["pdftoppm", "-r", "80", "-png", "-f", "1", "-l", "1",
         RESUME_SRC, "media/resume"])
    src = "media/resume-1.png"
    im = Image.open(src).convert("RGB")
    im.resize((700, round(im.height * 700 / im.width)), Image.LANCZOS).save(
        "media/resume-thumb.webp", "WEBP", quality=80)
    os.remove(src)


def main():
    for b in ("ffmpeg", "libreoffice", "pdftoppm"):
        need(b)
    print("== video ==", flush=True);  build_video()
    print("== deck ==", flush=True);   build_deck()
    print("== resume ==", flush=True); build_resume_thumb()
    print("== images ==", flush=True); build_images()

    total = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, _, fs in os.walk("media") for f in fs
    )
    print(f"\nmedia/ total: {total / 1024 / 1024:.1f} MB", flush=True)


if __name__ == "__main__":
    main()
