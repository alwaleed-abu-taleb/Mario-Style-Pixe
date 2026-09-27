#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""example_usage.py — self-contained demo of vision_scanner.

Generates synthetic "photos" of the three paper templates (with corner
markers, perspective, rotation and sensor noise), teaches the scanner a
reference for each one, then scans a colored hero photo and prints the JSON
report. No camera or printed templates required.

Run:  python example_usage.py
"""

import json
import os
import tempfile

import cv2

from vision_scanner import TEMPLATE_TYPES, scan_image, simulate_camera, synth_template

_SEEDS = {"hero": 11, "mushroom": 22, "dragon": 33}


def main() -> int:
    work = tempfile.mkdtemp(prefix="vision_example_")
    refs = os.path.join(work, "templates")
    os.makedirs(refs, exist_ok=True)
    print(f"work dir: {work}")

    # 1) teach the scanner what each BLANK template looks like
    for kind in TEMPLATE_TYPES:
        path = os.path.join(work, f"blank_{kind}.png")
        cv2.imwrite(path, simulate_camera(synth_template(kind, colored=False), seed=_SEEDS[kind]))
        scan_image(path, ref_dir=refs, learn=kind)
    print("learned references for:", ", ".join(TEMPLATE_TYPES))

    # 2) simulate a user coloring the hero template and photographing it
    photo = os.path.join(work, "colored_hero.jpg")
    cv2.imwrite(photo, simulate_camera(synth_template("hero", colored=True), seed=7))

    # 3) scan it -> JSON report
    report = scan_image(photo, ref_dir=refs)
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
