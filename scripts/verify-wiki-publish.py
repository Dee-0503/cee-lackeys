#!/usr/bin/env python3
"""Verify a generated Wiki publish revision without mutating it."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    args = parser.parse_args()
    package = args.package.resolve()
    manifest_path = package / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema") != "lackeys.wiki-publish-manifest.v1":
        raise SystemExit("unsupported publish manifest schema")
    if not isinstance(manifest.get("files"), list) or not manifest["files"]:
        raise SystemExit("manifest has no files")
    seen: set[str] = set()
    for entry in manifest["files"]:
        relative = entry["path"]
        path = Path(relative)
        if path.is_absolute() or ".." in path.parts or relative in seen:
            raise SystemExit(f"unsafe or duplicate manifest path: {relative}")
        seen.add(relative)
        target = package / "vault" / path
        if not target.is_file() or target.is_symlink():
            raise SystemExit(f"missing or symlinked file: {relative}")
        if target.stat().st_size != entry["size"] or digest(target) != entry["sha256"]:
            raise SystemExit(f"hash or size mismatch: {relative}")
    print(json.dumps({"revision": manifest["revision"], "files": len(seen), "valid": True}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
