# Quick start — Orbit Wheel on Zen

**Before installing:** open `demo/index.html` in Zen to see the wheel without modifying anything.

1. Open `about:profiles` in Zen, choose the profile **in use**, and copy its **Root Directory** path. Back up the profile. Close Zen.
2. Install [MrOtherGuy/fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) to your **Zen installation** and **that same Zen profile**. Follow upstream's instructions carefully; do not overwrite existing loader configs. Verify `<PROFILE>/chrome/utils/boot.sys.mjs` exists.
3. Copy these **two files** from this ZIP:

   - `chrome/JS/OrbitWheel.uc.js` → `<PROFILE>/chrome/JS/OrbitWheel.uc.js`
   - `chrome/CSS/OrbitWheel.uc.css` → `<PROFILE>/chrome/CSS/OrbitWheel.uc.css`

   Or install both via `python3 scripts/install_profile.py --profile "<PROFILE>"` (on Windows use `py -3`).
4. Restart Zen, optionally clear startup cache at `about:support` if it didn't load.
5. Press **Ctrl+Alt+O** to open. Use arrows, mouse-wheel, click, Enter, Escape. The **Ctrl+Tab takeover is experimental** and may conflict with Zen's built-in shortcut.
6. With more than seven eligible tabs, hold **Ctrl** and tap **Tab** eight times to highlight **Show all tabs**. Release **Ctrl** to open the list.

If the overlay doesn't work, remove the two files above and restart. The installer supports `--uninstall` and does not change any AutoConfig installation itself.

For platform-specific setup, security considerations and settings, read [README.md](README.md).
