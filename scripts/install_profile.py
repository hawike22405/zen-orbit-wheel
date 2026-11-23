#!/usr/bin/env python3
"""Install only Orbit's profile files; never edit Zen program files or enable privileged JS."""
from __future__ import annotations

import argparse
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    (Path('chrome/JS/OrbitWheel.uc.js'), Path('chrome/JS/OrbitWheel.uc.js')),
    (Path('chrome/CSS/OrbitWheel.uc.css'), Path('chrome/CSS/OrbitWheel.uc.css')),
]


def main():
    parser = argparse.ArgumentParser(description='Install Orbit Wheel into an existing Zen profile')
    parser.add_argument('--profile', type=Path, required=True, help='Root profile directory shown in about:profiles')
    parser.add_argument('--uninstall', action='store_true', help='Remove only the 2 Orbit Wheel files')
    parser.add_argument('--dry-run', action='store_true', help='Print proposed changes without changing files')
    parser.add_argument('--skip-loader-check', action='store_true', help='For inspection/testing only')
    args = parser.parse_args()

    profile = args.profile.expanduser().resolve()
    if not profile.is_dir():
        parser.error(f'Profile directory does not exist: {profile}')
    chrome = profile / 'chrome'
    loader_marker = chrome / 'utils' / 'boot.sys.mjs'
    if not args.uninstall and not args.skip_loader_check and not loader_marker.exists():
        parser.error('fx-autoconfig profile loader not found at chrome/utils/boot.sys.mjs. Follow README installation steps first. No files changed.')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    for relative_source, relative_dest in FILES:
        dest = profile / relative_dest
        if args.uninstall:
            if dest.exists():
                print(f"{'Would remove' if args.dry_run else 'Removing'} {dest}")
                if not args.dry_run:
                    dest.unlink()
            else:
                print(f'Already absent: {dest}')
            continue
        src = ROOT / relative_source
        if not src.is_file():
            parser.error(f'Missing distributed file: {src}')
        if dest.exists() and src.read_bytes() == dest.read_bytes():
            print(f'Already current: {dest}')
            continue
        print(f"{'Would install' if args.dry_run else 'Installing'} {src} -> {dest}")
        if not args.dry_run:
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists():
                backup = dest.with_name(dest.name + f'.backup-{stamp}')
                print(f'Backing up existing file to {backup}')
                shutil.copy2(dest, backup)
            shutil.copy2(src, dest)
    print('Finish by restarting Zen. If necessary: about:support → Clear Startup Cache.')


if __name__ == '__main__':
    main()
