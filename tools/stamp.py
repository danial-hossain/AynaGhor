#!/usr/bin/env python3
"""Stamp a version onto every local module/asset URL so browsers never mix old cached files with new ones.
Run before each push:  python3 tools/stamp.py"""
import re, time, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
v = str(int(time.time()))
for f in list((root / "js").glob("*.js")) + [root / "index.html"]:
    s = f.read_text(encoding="utf-8")
    s = re.sub(r'((?:from\s+|import\s+)"\./[\w]+\.js)(?:\?v=\d+)?"', rf'\1?v={v}"', s)                 # ./x.js imports
    s = re.sub(r'("(?:css/style\.css|js/main\.js|assets/mirpur\.(?:json|glb)))(?:\?v=\d+)?"', rf'\1?v={v}"', s)
    f.write_text(s, encoding="utf-8")
print("stamped", v)
