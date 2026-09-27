#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
vision_scanner.py — scan a photographed paper coloring template and extract
the colors the user applied to each zone.

Pipeline
--------
1. Read the photo (Pillow, EXIF-rotation aware for phone photos) -> OpenCV BGR.
2. Detect the 4 dark corner markers on the page and correct the perspective so
   the template becomes axis-aligned and size-normalized.
3. Classify the template (hero / mushroom / dragon) by matching its line-art
   against reference masks in ./templates (built with --learn).
4. Extract the dominant paint color of every zone of that template.
5. Print / save a JSON report.

Example JSON output
-------------------
{
  "template_type": "hero",
  "colors": {"head": "#f8c090", "hair": "#1c1a20", "body": "#3498db", "legs": "#d03028"},
  "confidence": 0.92,
  "status": "success"
}

Usage examples
--------------
# scan a photo and print the JSON report
python vision_scanner.py photo.jpg

# scan and save the report to a file
python vision_scanner.py photo.jpg --out report.json

# skip classification (you already know it is the hero template)
python vision_scanner.py photo.jpg --template hero

# teach the classifier: scan a BLANK template -> reference image
python vision_scanner.py blank_hero.jpg --learn hero

# the photo has no corner markers: treat the whole frame as the template
python vision_scanner.py photo.jpg --allow-no-markers

# end-to-end check with synthetic templates (no camera needed)
python vision_scanner.py --selftest

Corner markers
--------------
The script looks for 4 compact, solid dark blobs (filled squares ~3-6% of the
page side, or filled circles) sitting near the page corners, one per quadrant.
Print them in high contrast (black on white).

Zone calibration
--------------
Zones are defined as fractions of the warped page (y0, y1, x0, x1) in
ZONES below. Every template layout differs, so after your first scan adjust
these fractions to match your print, or just use --template + the defaults.
Small decorative sub-zones that sit inside a bigger zone (e.g. the mushroom's
spots inside its cap) are reported as the surrounding color unless you give
them their own tight ROI - a majority-vote color picker cannot see them.

Dependencies: opencv-python, numpy, Pillow (see requirements.txt)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from typing import Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ImageOps

# --------------------------------------------------------------------------- config

TEMPLATE_TYPES = ("hero", "mushroom", "dragon")

CANONICAL_LONG_SIDE = 1000      # px of the warped template's long side

CLASSIFY_SIZE = 600             # canvas used to compare line-art shapes

# Zone ROIs as fractions of the warped page: (y0, y1, x0, x1).
ZONES = {
    # standing figure, portrait page
    "hero": {
        "hair":  (0.00, 0.13, 0.30, 0.70),
        "head":  (0.13, 0.26, 0.25, 0.75),
        "body":  (0.26, 0.63, 0.20, 0.80),
        "legs":  (0.63, 1.00, 0.25, 0.75),
    },
    "mushroom": {
        "cap":   (0.00, 0.45, 0.10, 0.90),
        "spots": (0.04, 0.40, 0.25, 0.75),
        "stem":  (0.45, 1.00, 0.32, 0.68),
    },
    "dragon": {
        "head":  (0.00, 0.30, 0.55, 0.95),
        "body":  (0.22, 0.62, 0.30, 0.70),
        "wings": (0.08, 0.55, 0.00, 1.00),
        "tail":  (0.55, 1.00, 0.00, 0.45),
    },
}

# HSV thresholds (OpenCV 8-bit: H 0-179, S/V 0-255) separating "paint" from
# white paper and black line-art.
COLOR_S_MIN = 55               # saturated paint (paper is low-saturation by construction)
COLOR_V_MIN = 35
DARK_V_MAX = 110                # very dark paint (e.g. black hair), RAW value


# --------------------------------------------------------------------------- io

def read_image(path: str) -> np.ndarray:
    """Read an image honoring phone EXIF rotation; return BGR uint8."""
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        arr = np.asarray(im)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


# --------------------------------------------------------------------------- shading

def normalize_shading(gray: np.ndarray) -> np.ndarray:
    """Divide out vignetting / uneven lighting so paper becomes uniform white."""
    h, w = gray.shape
    k = max(31, (min(h, w) // 8) | 1)
    blur = cv2.GaussianBlur(gray, (k, k), 0)
    norm = cv2.divide(gray, blur, scale=255)
    return norm


# --------------------------------------------------------------------------- blobs

def keep_solid_blobs(mask: np.ndarray, min_fill: float = 0.55, min_area: int = 40) -> np.ndarray:
    """Keep only connected components that are solid fills (not thin strokes)."""
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    out = np.zeros_like(mask)
    for i in range(1, n):
        a = stats[i, cv2.CC_STAT_AREA]
        bw = stats[i, cv2.CC_STAT_WIDTH]
        bh = stats[i, cv2.CC_STAT_HEIGHT]
        if a < min_area:
            continue
        fill = a / max(bw * bh, 1)
        if fill >= min_fill:
            out[lab == i] = 255
    return out


def page_bbox(gray_n: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """Bounding box of the bright page in the frame, or None if not found."""
    bright = (gray_n > 190).astype(np.uint8) * 255
    bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bright, 8)
    if n <= 1:
        return None
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    if stats[i, cv2.CC_STAT_AREA] < 0.15 * gray_n.size:
        return None
    return (int(stats[i, cv2.CC_STAT_LEFT]), int(stats[i, cv2.CC_STAT_TOP]),
            int(stats[i, cv2.CC_STAT_WIDTH]), int(stats[i, cv2.CC_STAT_HEIGHT]))


# --------------------------------------------------------------------------- corner markers

def detect_corner_markers(gray_n: np.ndarray, verbose: bool = False):
    """Find the 4 dark corner markers.

    Returns (corners, info) where corners is a 4x2 float32 array ordered
    TL, TR, BR, BL, or None when fewer than 4 markers are found.
    """
    h, w = gray_n.shape
    box = page_bbox(gray_n)
    if box is None:
        box = (0, 0, w, h)
    bx, by, bw, bh = box
    if verbose:
        print(f"[dbg] page bbox: {box}", file=sys.stderr)

    blur = cv2.GaussianBlur(gray_n, (5, 5), 0)
    _, th = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))

    contours, _ = cv2.findContours(th, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    img_area = h * w
    cands = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < 0.0004 * img_area or area > 0.05 * img_area:
            continue
        hull = cv2.convexHull(c)
        hull_area = cv2.contourArea(hull)
        if hull_area <= 0:
            continue
        solidity = area / hull_area
        if solidity < 0.75:
            continue
        x, y, bwid, bhgt = cv2.boundingRect(c)
        extent = area / max(bwid * bhgt, 1)
        if not (0.45 <= extent <= 1.0):
            continue
        if max(bwid, bhgt) > 0.25 * min(bw, bh):
            continue
        m = cv2.moments(c)
        if m["m00"] <= 0:
            continue
        cx = m["m10"] / m["m00"]
        cy = m["m01"] / m["m00"]
        cands.append({"cx": cx, "cy": cy, "area": area, "solidity": float(solidity)})

    # one best (largest) marker per quadrant of the page bbox
    midx, midy = bx + bw / 2.0, by + bh / 2.0
    bandx = 0.35 * bw
    bandy = 0.35 * bh
    best = [None, None, None, None]     # TL, TR, BL, BR
    for c in cands:
        if c["cx"] < midx - bandx / 2:
            qx = 0
        elif c["cx"] > midx + bandx / 2:
            qx = 1
        else:
            continue
        if c["cy"] < midy - bandy / 2:
            qy = 0
        elif c["cy"] > midy + bandy / 2:
            qy = 1
        else:
            continue
        if not (bx - 0.05 * w <= c["cx"] <= bx + bw + 0.05 * w and
                by - 0.05 * h <= c["cy"] <= by + bh + 0.05 * h):
            continue
        idx = qy * 2 + qx               # TL=0, TR=1, BL=2, BR=3
        if best[idx] is None or c["area"] > best[idx]["area"]:
            best[idx] = c

    found = [b for b in best if b is not None]
    info = {
        "n_candidates": len(cands),
        "n_quadrant_markers": len(found),
        "mean_solidity": float(np.mean([b["solidity"] for b in found])) if found else 0.0,
    }
    if len(found) < 4:
        return None, info

    # order TL, TR, BR, BL  (best[] is TL, TR, BL, BR)
    corners = np.float32([[best[0]["cx"], best[0]["cy"]],
                          [best[1]["cx"], best[1]["cy"]],
                          [best[3]["cx"], best[3]["cy"]],
                          [best[2]["cx"], best[2]["cy"]]])

    # geometric sanity: convex, reasonably large quad
    quad_area = cv2.contourArea(corners.reshape(-1, 1, 2))
    if quad_area < 0.15 * img_area:
        return None, info
    return corners, info


# --------------------------------------------------------------------------- warp

def warp_to_template(img: np.ndarray, corners: np.ndarray) -> Optional[np.ndarray]:
    """Perspective-correct the page into a normalized, aspect-preserving view."""
    def dist(a, b):
        return float(np.linalg.norm(np.asarray(a, np.float64) - np.asarray(b, np.float64)))

    w1 = (dist(corners[0], corners[1]) + dist(corners[3], corners[2])) / 2.0
    h1 = (dist(corners[0], corners[3]) + dist(corners[1], corners[2])) / 2.0
    if w1 <= 1 or h1 <= 1:
        return None
    scale = CANONICAL_LONG_SIDE / max(w1, h1)
    w2, h2 = max(8, int(round(w1 * scale))), max(8, int(round(h1 * scale)))
    dst = np.float32([[0, 0], [w2 - 1, 0], [w2 - 1, h2 - 1], [0, h2 - 1]])
    m = cv2.getPerspectiveTransform(corners, dst)
    return cv2.warpPerspective(img, m, (w2, h2))


# --------------------------------------------------------------------------- silhouette

def figure_silhouette(warped: np.ndarray) -> np.ndarray:
    """Solid silhouette of the drawn figure.

    Outlines are flood-filled so that a BLANK reference scan (outline art only)
    and a COLORED photo (outlines + paint) collapse to the same solid shape,
    which is what makes template matching reliable.
    """
    gray_n = normalize_shading(cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY))
    nonpaper = (gray_n < 225).astype(np.uint8) * 255

    # drop the corner fiducials: after the warp the markers sit exactly on the
    # 4 corners and would otherwise dominate the silhouette.
    hh, ww = gray_n.shape
    kx, ky = max(8, int(0.10 * ww)), max(8, int(0.10 * hh))
    nonpaper[0:ky, 0:kx] = 0
    nonpaper[0:ky, ww - kx:ww] = 0
    nonpaper[hh - ky:hh, 0:kx] = 0
    nonpaper[hh - ky:hh, ww - kx:ww] = 0

    # seal small gaps in the outline loops, then flood-fill the page background
    # from the border; everything the flood cannot reach is the figure.
    nonpaper = cv2.morphologyEx(nonpaper, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    inv = cv2.bitwise_not(nonpaper)
    pad = np.zeros((hh + 2, ww + 2), np.uint8)
    cv2.floodFill(inv, pad, (0, 0), 128)
    sil = (inv != 128).astype(np.uint8) * 255
    sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    return keep_solid_blobs(sil, min_fill=0.15, min_area=0.004 * hh * ww)


def fit_mask_to_canvas(mask: np.ndarray, size: int = CLASSIFY_SIZE) -> np.ndarray:
    """Center a mask's bounding box on a square canvas, preserving aspect."""
    canvas = np.zeros((size, size), np.uint8)
    ys, xs = np.where(mask > 0)
    if len(ys) == 0:
        return canvas
    sub = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    hh, ww = sub.shape
    scale = (size * 0.9) / max(hh, ww)
    nw, nh = max(1, int(round(ww * scale))), max(1, int(round(hh * scale)))
    small = cv2.resize(sub, (nw, nh), interpolation=cv2.INTER_NEAREST)
    oy, ox = (size - nh) // 2, (size - nw) // 2
    canvas[oy:oy + nh, ox:ox + nw] = small
    return canvas


def largest_contour(mask: np.ndarray):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    return max(contours, key=cv2.contourArea)


def shape_similarity(mask_a: np.ndarray, mask_b: np.ndarray) -> float:
    ca, cb = largest_contour(mask_a), largest_contour(mask_b)
    if ca is None or cb is None:
        return 0.0
    d = cv2.matchShapes(ca, cb, cv2.CONTOURS_MATCH_I1, 0)
    return float(np.clip(1.0 - d, 0.0, 1.0))


# --------------------------------------------------------------------------- classification

def load_references(ref_dir: str) -> dict:
    refs = {}
    if not os.path.isdir(ref_dir):
        return refs
    for t in TEMPLATE_TYPES:
        p = os.path.join(ref_dir, t + ".png")
        if not os.path.isfile(p):
            continue
        r = cv2.imread(p, cv2.IMREAD_COLOR)          # warped page saved by --learn
        if r is None:
            continue
        refs[t] = figure_silhouette(r)                # same rule as the probe
    return refs


def save_reference(warped: np.ndarray, ref_dir: str, name: str) -> str:
    os.makedirs(ref_dir, exist_ok=True)
    p = os.path.join(ref_dir, name + ".png")
    cv2.imwrite(p, warped)
    return p


def classify(warped: np.ndarray, refs: dict, verbose: bool = False):
    """Match the warped figure silhouette against references. Returns (type, conf, scores)."""
    if not refs:
        return None, 0.0, {}
    probe = fit_mask_to_canvas(figure_silhouette(warped))
    scores = {}
    for t, ref in refs.items():
        ref_n = fit_mask_to_canvas(ref)
        res = cv2.matchTemplate(probe, ref_n, cv2.TM_CCOEFF_NORMED)
        ncc = float(np.max(res)) if res.size else 0.0
        ncc = max(0.0, ncc)                       # clip negative correlations
        sh = shape_similarity(probe, ref_n)
        scores[t] = 0.6 * ncc + 0.4 * sh
        if verbose:
            print(f"[dbg] {t}: ncc={ncc:.3f} shape={sh:.3f} score={scores[t]:.3f}",
                  file=sys.stderr)
    best = max(scores, key=scores.get)
    srt = sorted(scores.values(), reverse=True)
    margin = (srt[0] - srt[1]) if len(srt) > 1 else srt[0]
    conf = float(np.clip(0.7 * srt[0] + 0.3 * margin, 0.0, 1.0))
    return best, conf, scores


def heuristic_classify(warped: np.ndarray):
    """Layout fallback when no references exist. Returns (type, conf) - low trust."""
    mask = figure_silhouette(warped)
    h, w = mask.shape
    ys, xs = np.where(mask > 0)
    if len(ys) < 10:
        return None, 0.0
    ink = mask > 0
    prof = ink.sum(axis=1) / w
    top = prof[: int(h * 0.35)].mean()
    mid = prof[int(h * 0.35): int(h * 0.7)].mean()
    bot = prof[int(h * 0.7):].mean()
    xspan = (xs.max() - xs.min() + 1) / w
    yspan = (ys.max() - ys.min() + 1) / h
    scores = {"hero": 0.34, "mushroom": 0.34, "dragon": 0.34}
    if top > mid and top > bot:
        scores["mushroom"] += 0.4
    if xspan > 0.72:
        scores["dragon"] += 0.4
    if 0.9 < (yspan / max(xspan, 1e-6)) < 1.8 and mid > 0.25 * top:
        scores["hero"] += 0.35
    best = max(scores, key=scores.get)
    return best, float(np.clip(scores[best], 0.0, 0.5))


# --------------------------------------------------------------------------- colors

def drop_border_blobs(mask: np.ndarray) -> np.ndarray:
    """Remove connected components that touch the image border.

    Vignette shadows and the corner fiducials (which sit on the warped page
    corners) both reach the frame edge; interior dark paint does not.
    """
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if n <= 1:
        return mask
    hh, ww = mask.shape
    border = np.zeros(n, bool)
    border[lab[0, :]] = True
    border[lab[hh - 1, :]] = True
    border[lab[:, 0]] = True
    border[lab[:, ww - 1]] = True
    out = np.zeros_like(mask)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 0.25 * hh * ww:
            continue                                # suspiciously huge: likely shadow
        if not border[i]:
            out[lab == i] = 255
    return out


def colored_mask(warped: np.ndarray) -> np.ndarray:
    """Mask of applied paint: saturated colors plus solid dark fills (black hair)."""
    hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
    s = hsv[:, :, 1].astype(np.int16)
    v = hsv[:, :, 2].astype(np.int16)

    # Saturated paint on raw values: white/off-white paper is low-saturation
    # regardless of vignette, so no shading division here (dividing by a bright
    # background would inflate bright paints towards 255 and drop them as paper).
    paint = ((s >= COLOR_S_MIN) & (v >= COLOR_V_MIN)).astype(np.uint8) * 255

    # Solid dark fills (e.g. black hair) on the RAW value. Shading normalization
    # cannot be used here: it whitens any dark region bigger than its blur
    # kernel, so a hair-sized fill vanishes. Opening with a kernel wider than
    # the line-art strokes deletes the thin black outlines (which otherwise
    # chain every region into one giant low-fill blob); vignette shadows are
    # separated out by the border-touch filter below.
    dark = (v <= DARK_V_MAX).astype(np.uint8) * 255
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    dark = keep_solid_blobs(dark, min_fill=0.55, min_area=200)   # fills, not outlines
    dark = drop_border_blobs(dark)

    m = cv2.bitwise_or(paint, dark)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    return keep_solid_blobs(m, min_fill=0.05, min_area=30)


def dominant_color(pixels_bgr: np.ndarray) -> np.ndarray:
    """Pick the most paint-like color: k-means, then rank clusters by size*saturation."""
    n = len(pixels_bgr)
    k = 3 if n > 300 else (2 if n > 60 else 1)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    data = pixels_bgr.astype(np.float32)
    _, labels, centers = cv2.kmeans(data, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    best, best_score = None, -1.0
    for ci in range(k):
        cnt = int((labels == ci).sum())
        if cnt < max(4, 0.05 * n):
            continue
        b, g, r = centers[ci]
        mx, mn = max(r, g, b), min(r, g, b)
        sat = (mx - mn) / mx if mx > 0 else 0.0
        score = cnt * (0.4 + 0.6 * sat)
        if score > best_score:
            best, best_score = centers[ci], score
    if best is None:
        best = centers[0]
    return np.clip(best, 0, 255)


def bgr_to_hex(bgr: np.ndarray) -> str:
    b, g, r = bgr
    return "#{:02x}{:02x}{:02x}".format(int(round(r)), int(round(g)), int(round(b)))


def extract_colors(warped: np.ndarray, template_type: str) -> dict:
    zones = ZONES[template_type]
    cmask = colored_mask(warped)
    h, w = cmask.shape
    out = {}
    for name, (y0, y1, x0, x1) in zones.items():
        r0, r1 = int(y0 * h), max(int(y1 * h), int(y0 * h) + 1)
        c0, c1 = int(x0 * w), max(int(x1 * w), int(x0 * w) + 1)
        sub = cmask[r0:r1, c0:c1]
        if sub.sum() == 0:
            out[name] = None
            continue
        ys, xs = np.where(sub > 0)
        pix = warped[r0:r1, c0:c1][ys, xs].reshape(-1, 3)
        out[name] = bgr_to_hex(dominant_color(pix))
    return out


# --------------------------------------------------------------------------- confidence / report

def compute_confidence(minfo: dict, class_conf: float, colors: dict) -> float:
    if minfo["n_quadrant_markers"] >= 4:
        marker_conf = 0.70 + 0.30 * min(1.0, minfo["mean_solidity"])
    elif minfo["n_quadrant_markers"] > 0:
        marker_conf = 0.25 * (minfo["n_quadrant_markers"] / 4.0)
    else:
        marker_conf = 0.50            # --allow-no-markers fallback
    filled = sum(1 for v in colors.values() if v)
    color_conf = filled / max(1, len(colors))
    total = 0.55 * marker_conf + 0.30 * class_conf + 0.15 * color_conf
    return round(float(np.clip(total, 0.0, 1.0)), 3)


def scan_image(path: str, ref_dir: str = "templates", force_template: Optional[str] = None,
               learn: Optional[str] = None, allow_no_markers: bool = False,
               verbose: bool = False) -> dict:
    try:
        img = read_image(path)
    except Exception as e:                                    # noqa: BLE001
        return {"template_type": None, "colors": {}, "confidence": 0.0,
                "status": "error", "error": f"cannot read image: {e}"}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray_n = normalize_shading(gray)
    corners, minfo = detect_corner_markers(gray_n, verbose=verbose)

    if corners is None:
        if not allow_no_markers:
            return {"template_type": None, "colors": {}, "confidence": 0.0,
                    "status": "markers_not_found",
                    "error": f"found {minfo['n_quadrant_markers']}/4 corner markers"}
        h, w = img.shape[:2]
        corners = np.float32([[0.02 * w, 0.02 * h], [0.98 * w, 0.02 * h],
                              [0.98 * w, 0.98 * h], [0.02 * w, 0.98 * h]])
        minfo["n_quadrant_markers"] = 0
    if verbose:
        print(f"[dbg] markers: {minfo}", file=sys.stderr)

    warped = warp_to_template(img, corners)
    if warped is None:
        return {"template_type": None, "colors": {}, "confidence": 0.0,
                "status": "error", "error": "degenerate corner geometry"}

    if learn:
        ref = save_reference(warped, ref_dir, learn)
        return {"template_type": learn, "colors": {}, "confidence": 1.0,
                "status": "reference_saved", "reference": ref}

    refs = load_references(ref_dir)
    if force_template:
        ttype, class_conf = force_template, 0.95
        if verbose:
            print(f"[dbg] template forced: {ttype}", file=sys.stderr)
    else:
        ttype, class_conf, scores = classify(warped, refs, verbose=verbose)
        if ttype is None:                                     # no references at all
            ttype, class_conf = heuristic_classify(warped)
            if verbose:
                print(f"[dbg] heuristic fallback: {ttype} conf={class_conf:.3f}",
                      file=sys.stderr)

    if ttype is None:
        return {"template_type": None, "colors": {}, "confidence": 0.0,
                "status": "unknown_template", "error": "could not classify the template"}

    colors = extract_colors(warped, ttype)
    conf = compute_confidence(minfo, class_conf, colors)

    all_filled = all(v is not None for v in colors.values())
    if minfo["n_quadrant_markers"] >= 4 and all_filled and conf >= 0.55:
        status = "success"
    else:
        status = "partial"

    return {"template_type": ttype, "colors": colors, "confidence": conf, "status": status}


# --------------------------------------------------------------------------- synthetic templates (testing)

# The 30px-inset 46px markers define the page quad (warp maps marker CENTERS to
# the canonical corners), so all content is drawn inside this rectangle and
# positioned to land exactly inside the ZONES bands after the warp.
_SYNTH_QUAD = (53, 53, 794, 1094)     # x0, y0, w, h of the marker-center quad
_SYNTH_SEEDS = {"hero": 11, "mushroom": 22, "dragon": 33}


def synth_template(kind: str, w: int = 900, h: int = 1200, colored: bool = True) -> np.ndarray:
    """Draw a synthetic paper template: line art + optional flat colors + markers."""
    img = np.full((h, w, 3), 255, np.uint8)
    qx, qy, qw, qh = _SYNTH_QUAD
    cx = qx + qw // 2
    ink = (0, 0, 0)

    def X(f):
        return int(qx + f * qw)

    def Y(f):
        return int(qy + f * qh)

    if kind == "hero":
        if colored:
            cv2.rectangle(img, (X(.42), Y(.63)), (X(.49), Y(.97)), (40, 48, 208), -1)     # #d03028
            cv2.rectangle(img, (X(.51), Y(.63)), (X(.58), Y(.97)), (40, 48, 208), -1)
            cv2.rectangle(img, (X(.30), Y(.26)), (X(.70), Y(.66)), (219, 152, 52), -1)    # #3498db
            cv2.circle(img, (cx, Y(.195)), int(qw * .09), (144, 192, 248), -1)            # #f8c090
            cv2.ellipse(img, (cx, Y(.065)), (int(qw * .10), int(qh * .055)), 0, 0, 360,
                        (32, 26, 28), -1)                                                # #1c1a20
        cv2.rectangle(img, (X(.42), Y(.63)), (X(.49), Y(.97)), ink, 3)
        cv2.rectangle(img, (X(.51), Y(.63)), (X(.58), Y(.97)), ink, 3)
        cv2.rectangle(img, (X(.30), Y(.26)), (X(.70), Y(.66)), ink, 3)
        cv2.circle(img, (cx, Y(.195)), int(qw * .09), ink, 3)
        cv2.ellipse(img, (cx, Y(.065)), (int(qw * .10), int(qh * .055)), 0, 0, 360, ink, 3)

    elif kind == "mushroom":
        cap_c = (cx, Y(.24))
        cap_ax = (int(qw * .30), int(qh * .17))
        stem = [(X(.44), Y(.42)), (X(.56), Y(.86))]
        if colored:
            cv2.ellipse(img, cap_c, cap_ax, 0, 0, 360, (0, 0, 220), -1)     # red cap
            cv2.circle(img, (X(.38), Y(.20)), 14, (239, 239, 173), -1)      # light spots
            cv2.circle(img, (X(.60), Y(.26)), 11, (239, 239, 173), -1)
            cv2.rectangle(img, *stem, (200, 180, 140), -1)
        cv2.ellipse(img, cap_c, cap_ax, 0, 0, 360, ink, 3)
        cv2.rectangle(img, *stem, ink, 3)

    elif kind == "dragon":
        body_c = (X(.46), Y(.52))
        body_ax = (int(qw * .16), int(qh * .09))
        head_c = (X(.72), Y(.28))
        r = int(qw * .05)
        wing_l = np.array([[X(.36), Y(.34)], [X(.05), Y(.20)], [X(.14), Y(.48)]], np.int32)
        wing_r = np.array([[X(.62), Y(.32)], [X(.92), Y(.18)], [X(.82), Y(.50)]], np.int32)
        if colored:
            cv2.ellipse(img, body_c, body_ax, 0, 0, 360, (60, 180, 60), -1)  # green
            cv2.circle(img, head_c, r, (200, 150, 40), -1)                   # tan head
            cv2.fillPoly(img, [wing_l], (0, 140, 255))                      # orange
            cv2.fillPoly(img, [wing_r], (0, 140, 255))
            cv2.line(img, (X(.40), Y(.60)), (X(.08), Y(.92)), (60, 180, 60), 18)
        cv2.ellipse(img, body_c, body_ax, 0, 0, 360, ink, 3)
        cv2.circle(img, head_c, r, ink, 3)
        cv2.polylines(img, [wing_l], True, ink, 3)
        cv2.polylines(img, [wing_r], True, ink, 3)
        cv2.line(img, (X(.40), Y(.60)), (X(.08), Y(.92)), ink, 3)

    # corner markers: solid black squares, one per corner
    m = 46
    for (x, y) in [(30, 30), (w - 30 - m, 30), (w - 30 - m, h - 30 - m), (30, h - 30 - m)]:
        cv2.rectangle(img, (x, y), (x + m, y + m), ink, -1)
    return img


def simulate_camera(img: np.ndarray, seed: int = 0) -> np.ndarray:
    """Apply perspective, rotation, brightness shift and sensor noise."""
    rng = np.random.default_rng(seed)
    h, w = img.shape[:2]
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    jitter = rng.uniform(-0.05, 0.05, (4, 2)) * np.array([w, h])
    dst = (src * rng.uniform(1.15, 1.35) + jitter).astype(np.float32)
    m = cv2.getPerspectiveTransform(src, dst)
    ow, oh = int(w * 1.4), int(h * 1.4)
    photo = cv2.warpPerspective(img, m, (ow, oh))
    ang = rng.uniform(-3, 3)
    rot = cv2.getRotationMatrix2D((ow / 2.0, oh / 2.0), ang, 1.0)
    photo = cv2.warpAffine(photo, rot, (ow, oh), borderValue=(245, 245, 245))
    photo = np.clip(photo.astype(np.int16) + rng.integers(-12, 13), 0, 255).astype(np.uint8)
    photo = cv2.GaussianBlur(photo, (3, 3), 0)
    photo = np.clip(photo.astype(np.int16) + rng.normal(0, 6, photo.shape), 0, 255).astype(np.uint8)
    return photo


# --------------------------------------------------------------------------- selftest

def run_selftest() -> int:
    tmp = tempfile.mkdtemp(prefix="vision_selftest_")
    refs = os.path.join(tmp, "templates")
    os.makedirs(refs, exist_ok=True)
    print(f"[selftest] work dir: {tmp}")

    for kind in TEMPLATE_TYPES:
        blank = simulate_camera(synth_template(kind, colored=False), seed=_SYNTH_SEEDS[kind])
        p = os.path.join(tmp, f"blank_{kind}.png")
        cv2.imwrite(p, blank)
        r = scan_image(p, ref_dir=refs, learn=kind)
        assert r["status"] == "reference_saved", r
        print(f"[selftest] learned reference: {r['reference']}")

    expected = {
        "hero": {"head": (144, 192, 248), "hair": (32, 26, 28),
                 "body": (219, 152, 52), "legs": (40, 48, 208)},
    }
    ok = True
    for kind in TEMPLATE_TYPES:
        photo = simulate_camera(synth_template(kind, colored=True), seed=7 + _SYNTH_SEEDS[kind])
        p = os.path.join(tmp, f"colored_{kind}.png")
        cv2.imwrite(p, photo)
        rep = scan_image(p, ref_dir=refs)
        print(f"[selftest] {kind}: {json.dumps(rep)}")
        if rep["template_type"] != kind or rep["status"] != "success":
            print(f"[selftest] FAIL: expected type={kind} status=success")
            ok = False
        if kind == "hero":
            for zone, bgr in expected["hero"].items():
                got = rep["colors"].get(zone)
                if got is None:
                    print(f"[selftest] FAIL: hero.{zone} missing")
                    ok = False
                    continue
                gb = tuple(int(got[i:i + 2], 16) for i in (5, 3, 1))   # hex -> BGR
                if any(abs(a - b) > 28 for a, b in zip(gb, bgr)):
                    print(f"[selftest] WARN: hero.{zone} {got} far from expected {bgr}")
    print("[selftest] " + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


# --------------------------------------------------------------------------- cli

def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description="Scan a photographed paper coloring template and extract zone colors.")
    ap.add_argument("image", nargs="?", help="path to the photo of the colored template")
    ap.add_argument("--out", help="write the JSON report to this file")
    ap.add_argument("--template", choices=TEMPLATE_TYPES,
                    help="skip classification, force this template type")
    ap.add_argument("--ref-dir", default="templates",
                    help="directory holding reference template images (default: templates)")
    ap.add_argument("--learn", choices=TEMPLATE_TYPES,
                    help="warp a BLANK template scan and save it as a reference")
    ap.add_argument("--allow-no-markers", action="store_true",
                    help="treat the full frame as the template if markers are missing")
    ap.add_argument("--verbose", action="store_true", help="print diagnostics to stderr")
    ap.add_argument("--selftest", action="store_true",
                    help="run the built-in synthetic end-to-end test")
    args = ap.parse_args(argv)

    if args.selftest:
        return run_selftest()
    if not args.image:
        ap.error("an image path is required (or use --selftest)")

    report = scan_image(args.image, ref_dir=args.ref_dir, force_template=args.template,
                        learn=args.learn, allow_no_markers=args.allow_no_markers,
                        verbose=args.verbose)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
    return 0 if report["status"] in ("success", "partial", "reference_saved") else 2


if __name__ == "__main__":
    raise SystemExit(main())
