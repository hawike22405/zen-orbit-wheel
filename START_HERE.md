# Quick start — Orbit Wheel on Zen

**Nebula installed through Sine? Use these steps first.** The original fx-autoconfig instructions further down are for users *without* Sine.

1. Open Zen `about:profiles` and back up the active profile.
2. In **Settings → Sine**, leave **Nebula enabled**.
3. Inspect `chrome/JS/OrbitWheel.uc.js`. Enable Sine's option to install JS from unofficial sources only if you trust the code.
4. Add `https://github.com/hawike22405/zen-orbit-wheel` as an external/custom GitHub mod in Sine.
5. Enable the **Zen Orbit Wheel** script and stylesheet, then restart Zen.
6. Test **Ctrl+Alt+O**. Native Ctrl+Tab replacement remains experimental.
7. After Orbit works through Sine, remove any duplicate **manually installed** Orbit copies left in your profile's `chrome/JS` and `chrome/CSS` folders.

See [SINE_NEBULA_FIX.md](SINE_NEBULA_FIX.md) for troubleshooting.

## Alternative: legacy fx-autoconfig installation (without Sine)

**Before installing:** open `demo/index.html` in Zen to preview the wheel.

1. In `about:profiles`, identify and back up your active Zen profile.
2. Follow the current [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) instructions only if you do **not** already have Sine managing browser-chrome scripts. Never overwrite a shared loader.
3. Copy `chrome/JS/OrbitWheel.uc.js` → `<PROFILE>/chrome/JS/OrbitWheel.uc.js`.
4. Copy `chrome/CSS/OrbitWheel.uc.css` → `<PROFILE>/chrome/CSS/OrbitWheel.uc.css`.
5. Restart Zen. Press **Ctrl+Alt+O**, navigate with arrow keys and Enter, or Escape to cancel.
6. The wheel rotates up to seven eligible tabs. On the eighth Ctrl+Tab press (when applicable), **Show all tabs** is available.

See [README.md](README.md) for the detailed installation, security caveats and limitations.
