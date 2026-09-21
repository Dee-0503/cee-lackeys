#!/usr/bin/env python3
"""Build an immutable, allowlisted Wiki publish revision."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path


ALLOWLIST = (".claude-obsidian.json", "inbox", ".raw", "wiki")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def checked_relative(path: Path, root: Path) -> str:
    relative = path.relative_to(root).as_posix()
    if relative.startswith("../") or relative == ".." or "\\x00" in relative:
        raise ValueError(f"unsafe path: {relative}")
    return relative


def collect(source: Path, staging: Path) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for name in ALLOWLIST:
        candidate = source / name
        if not candidate.exists() and not candidate.is_symlink():
            raise FileNotFoundError(f"required Vault path is missing: {candidate}")
        if candidate.is_symlink():
            raise ValueError(f"symlink is not allowed in Vault root: {candidate}")
        targets = [candidate] if candidate.is_file() else sorted(candidate.rglob("*"))
        for item in targets:
            if item.is_symlink():
                raise ValueError(f"symlink is not allowed: {item}")
            if not item.is_file():
                continue
            relative = checked_relative(item, source)
            destination = staging / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, destination)
            entries.append({"path": relative, "sha256": sha256(item), "size": item.stat().st_size})
    return sorted(entries, key=lambda entry: str(entry["path"]))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--revision", required=True)
    args = parser.parse_args()

    source = args.vault.resolve()
    output = args.output.resolve()
    if not source.is_dir():
        parser.error(f"Vault is not a directory: {source}")
    if output == source or source in output.parents:
        parser.error("output must be outside the source Vault")
    if not args.revision or "/" in args.revision or "\\" in args.revision:
        parser.error("revision must be a single safe path component")

    output.mkdir(parents=True, exist_ok=True)
    final = output / args.revision
    if final.exists():
        parser.error(f"revision already exists: {final}")

    with tempfile.TemporaryDirectory(prefix=f".{args.revision}.", dir=output) as temp:
        root = Path(temp)
        vault_dir = root / "vault"
        files = collect(source, vault_dir)
        manifest = {
            "schema": "lackeys.wiki-publish-manifest.v1",
            "revision": args.revision,
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            # Do not leak the builder's local absolute path into a deployable package.
            "source": {"vault_root": "cee-wiki", "allowlist": list(ALLOWLIST)},
            "files": files,
        }
        (root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
        (root / "SHA256SUMS").write_text(
            "".join(f"{entry['sha256']}  vault/{entry['path']}\n" for entry in files), encoding="utf-8"
        )
        os.replace(root, final)
    print(json.dumps({"revision": args.revision, "path": str(final), "files": len(files)}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
