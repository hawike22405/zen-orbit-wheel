# Orbit Wheel for Zen Browser

A **native browser-chrome experiment** that brings the rotating golden “summoning circle” window switcher concept from [`FlafyDev/fantasy_rice`](https://github.com/FlafyDev/fantasy_rice) to **Zen Browser** as a **tab switcher**.

It is **not** a standard Firefox WebExtension: Firefox/Zen does not let extensions replace all native Ctrl+Tab shortcuts or draw privileged elements inside browser chrome. The distribution includes the files for a **userChromeJS script loader** (we recommend [`MrOtherGuy/fx-autoconfig`](https://github.com/MrOtherGuy/fx-autoconfig)). Because userChromeJS operates with browser privileges, treat it like running a local program you trust.

**Status:** self-contained implementation and interactive browser demo. Syntax and installer tests pass. The privileged script was **not runtime-tested inside Zen** in our build environment. Treat this as a **testable beta**, not a guaranteed one-click mod.

## What's included

```text
zen-orbit-wheel/
├── README.md
├── LICENSE
├── ATTRIBUTION.md
├── package.json
├── chrome/
│   ├── JS/OrbitWheel.uc.js        <-- Native Zen tab logic and SVG magic wheel
│   └── CSS/OrbitWheel.uc.css      <-- Glowing ring, dark glass, cards, atmosphere
├── demo/
│   ├── index.html                <-- Open locally in any browser
│   ├── fake-browser.js           <-- In-memory sample tabs, never used in Zen
│   ├── demo.js                   <-- Demo button wiring
│   └── demo.css                  <-- Demo page styling
├── scripts/
│   └── install_profile.py        <-- Copies only 2 files to chosen Zen profile
└── tests/
    └── check.mjs                <-- Syntax and packaging checks
```

### What's faithful to the original animation?

- Two rotating golden circles, triangular spokes and a glowing ring of small nodes.
- The circle rotates clockwise continuously; the tab previews orbit counter-clockwise, like the original `WindowsOverlay`.
- `angle = tabIndex / totalTabs * 2π - rotation` with `x = sin(angle)`, `y = cos(angle)`.
- Amber glow around each thumbnail and mouse-responsive 3D tilt.
- Dark purple, forest-like backdrop (original artwork **not copied**).

### What's adapted for Zen?

- Live **browser tabs**, not Linux/Hyprland compositor windows.
- Native `gBrowser` to enumerate and activate tabs in the **current Zen window**.
- Optional `drawSnapshot()` content thumbnail previews, with a title/favicons fallback.
- Keyboard selection, mouse selection, mouse-wheel selection, Escape cancellation.
- Lists open tabs in the active Zen workspace, including loaded pins and Essentials. Unloaded pins, internal blank tabs, and Glance tabs are skipped.
- Up to seven previews rotate on the wheel. With more than seven eligible tabs, **Show all tabs** opens a scrollable list.

## 0. Preview first (no special privileges needed)

Open `demo/index.html` in Chrome, Firefox or Zen. No installation or internet connection is needed. Use **Open wheel**, or just explore the automatically opened demo. Choose tabs with **left/right arrow**, **mouse wheel**, or **mouse click**. Press **Enter** to select or **Escape** to cancel. In the demo, pressing **Ctrl+Alt+O** toggles the wheel.

The demo uses the **same** native wheel script and CSS with fake in-memory tabs; it is **not** a separate static mockup.

## 1. Back up and identify your Zen profile

1. Open Zen and visit `about:profiles`.
2. Find the profile marked **in use**, and click **Open Folder** beside its **Root Directory**. This directory should contain files like `prefs.js`.
3. Close Zen; back up the whole profile folder before changing anything.
4. Recommended: use a **separate testing profile** first.

Path examples (they vary by install and OS, so trust `about:profiles`):

- Windows: `%APPDATA%\zen\Profiles\<profile-folder>`
- Linux: often `~/.zen/<profile-folder>` or a distribution/Flatpak-specific profile path
- macOS: often `~/Library/Application Support/zen/Profiles/<profile-folder>`

## 2. Install fx-autoconfig (one-time prerequisite)

Official project: https://github.com/MrOtherGuy/fx-autoconfig

Follow the **current fx-autoconfig README** for your Zen version. **Do not overwrite an existing custom loader or config** without understanding and backing it up. If your Zen install is already using auto-config, the README describes possible conflicts; do not blindly replace its files.

The high-level steps for a fresh installation:

1. From the upstream repo's **`program/` directory**, copy its **contents** (not the `program` folder itself) into your **Zen program installation directory**, where the Zen executable is located. This generally includes `config.js` and `defaults/pref/...`.
2. From upstream **`profile/`**, copy the **contents** into the **Zen profile root** you found in step 1. The result should include `chrome/utils/boot.sys.mjs` plus the loader's supporting files and a `chrome/JS` directory.
3. Restart Zen. If the loader is not activating, visit `about:support` and click **Clear Startup Cache**. Zen restarts.

Example program-directory locations (may be different on your machine):

- Windows: `C:\Program Files\Zen Browser\`
- Linux: the install directory containing the `zen`/`zen-browser` executable, e.g. `/opt/zen-browser/`. AppImage, Flatpak, Nix and managed deployments require different instructions and may not allow program-file modifications.
- macOS: inside `Zen.app/Contents/Resources/` for the upstream AutoConfig mechanism; verify the installed bundle layout before proceeding.

**Security warning:** This is **privileged JavaScript** running inside your browser, not website JavaScript. AutoConfig setups may need the unsandboxed AutoConfig context (`general.config.sandbox_enabled=false`). That is a security-relevant change. Do not install scripts from untrusted sources, and keep Zen updated. Our installer does **not** disable sandboxes or change the Zen executable.

If you'd rather not modify the installation directory, stop here and use the standalone demo. A pure Zen CSS Mod cannot implement this wheel's tab-selection logic by itself.

## 3. Install Orbit into the Zen profile

Once the upstream loader is installed, use either method.

### Option A: Safe helper script

Close Zen. From inside this extracted project folder, run:

**Windows (PowerShell or Command Prompt):**

```powershell
py -3 scripts\install_profile.py --profile "C:\Users\YOU\AppData\Roaming\zen\Profiles\YOUR-PROFILE"
```

**Linux / macOS:**

```bash
python3 scripts/install_profile.py --profile "/the/profile/path/from/about:profiles"
```

**What the helper does:** verifies `chrome/utils/boot.sys.mjs`, copies exactly **two** Orbit files into the appropriate folders, and backs up any existing files with the same names. It does **not** install AutoConfig, patch Zen binaries, modify browser preferences, or touch other scripts. Use `--dry-run` to preview changes.

### Option B: Manually copy these two files

| From this ZIP | To your Zen profile |
|---|---|
| `chrome/JS/OrbitWheel.uc.js` | `<ZEN_PROFILE>/chrome/JS/OrbitWheel.uc.js` |
| `chrome/CSS/OrbitWheel.uc.css` | `<ZEN_PROFILE>/chrome/CSS/OrbitWheel.uc.css` |

The upstream loader supports both `*.uc.js` and `*.uc.css` in the respective directories; you do **not** need to modify `userChrome.css` for a current fx-autoconfig release.

Restart Zen. Clear the startup cache via `about:support` only if the script or stylesheet doesn't appear, especially after upgrading the loader.

## 4. Open and use Orbit

**Reliable first test:** press **Ctrl+Alt+O** (Windows/Linux), or **Control+Option+O** (macOS). This is implemented inside the privileged script and is independent of WebExtension shortcut reservations. If you have a Zen hotkey conflict, change `alternateKey` in the script.

- The **golden circle** spins continuously, while cards travel in the opposing direction.
- Use **arrow keys** or the **mouse wheel** to change the selected tab; **Enter** activates it.
- **Click** any card to activate its tab immediately.
- **Escape** dismisses the overlay without switching.
- Press the alternate shortcut again to dismiss the overlay.

**Experimental native Ctrl+Tab:** Hold **Ctrl** and press **Tab** to open the wheel and cycle forward. Add **Shift** to cycle backward, then release **Ctrl** to activate the highlighted tab. Orbit captures the shortcut in Gecko's system event group before the document-level native switcher. Compatibility can vary by Zen version.

With more than seven eligible tabs, the first seven presses select tab previews and the eighth highlights **Show all tabs**. Release **Ctrl** to open the list, then click a tab or use the arrow keys and **Enter**. You can also click **Show all tabs** directly from the wheel.

If Zen switches tabs as usual and Orbit does not appear, continue to use **Ctrl+Alt+O**. If you see both native switching and Orbit, change `interceptCtrlTab: true` to `false` in `OrbitWheel.uc.js` and restart Zen, preventing competing actions. Zen offers keyboard customizations at `about:keyboard`, but some Firefox-derived system shortcuts may not be remappable. Do **not** expect binding Ctrl+Tab in an ordinary WebExtension to solve this.

## 5. Configuration

Near the top of `chrome/JS/OrbitWheel.uc.js`:

```js
const CONFIG = Object.freeze({
  interceptCtrlTab: true,
  alternateKey: 'o',
  alternateRequiresCtrl: true,
  alternateRequiresAlt: true,
  angularSpeed: 2 * Math.PI / 100,
  thumbnailCapture: true,
  thumbnailLimit: 12,
  screenshotTTL: 25000,
  visibleWorkspaceOnly: true,
  ringDiameter: 444,
});
```

To rotate twice as fast, use `2 * Math.PI / 50`. To reduce screenshot work or improve privacy, set `thumbnailCapture: false`. To include hidden tabs/workspaces, set `visibleWorkspaceOnly: false`, but activation of tabs belonging to another Zen workspace may require extra Zen-specific logic not implemented here. Remember to copy the updated JS into the profile after editing the source and restart Zen.

## 6. Troubleshooting

| Symptom | What to check |
|---|---|
| Shortcut does nothing | `chrome/utils/boot.sys.mjs` exists; loader installed in Zen's **program** folder; correct profile selected; restart; clear startup cache |
| Wheel opens, no golden styling | `chrome/CSS/OrbitWheel.uc.css` copied under the **same profile**; loader version supports `.uc.css`; clear startup cache |
| Ctrl+Tab still opens the normal switcher | This can be expected due to native shortcut interception; use Ctrl+Alt+O instead |
| Ctrl+Tab switches twice | Set `interceptCtrlTab: false`; use alternate shortcut |
| Tab previews are blank or stylized | `drawSnapshot` is internal and only best-effort; Firefox/Zen may not allow all background tabs to be captured |
| Tabs from another workspace are missing | Switch to that workspace first, or change `visibleWorkspaceOnly` in the script |
| Screenshot/animation slows down | Set `thumbnailCapture: false` or reduce glow/blur in CSS |
| CSS/JS broken after Zen update | This uses unsupported browser internals; remove the Orbit files and retry after compatibility changes |
| Installer says loader missing | Install upstream fx-autoconfig to the correct profile and check its `chrome/utils` files; the helper never installs privileged loader files |

For diagnostics, open Zen's **Browser Console** (`Ctrl+Shift+J` on some platforms). Errors from this script are prefixed with `[OrbitWheel]`.

## 7. Uninstall / roll back

Close Zen, then run:

```bash
python3 scripts/install_profile.py --profile "/path/to/zen/profile" --uninstall
```

Or simply remove these two files:

- `<profile>/chrome/JS/OrbitWheel.uc.js`
- `<profile>/chrome/CSS/OrbitWheel.uc.css`

Restart Zen. If necessary, clear startup cache. **This removes Orbit only**, not the AutoConfig loader. If you installed the loader solely for this project and want to remove it, follow the upstream fx-autoconfig removal instructions and restore the copies of any prior configuration files. Never delete an existing AutoConfig setup used by other mods without checking it first.

## 8. Implementation notes / honest limitations

- Native mode can only list tabs for **the current browser window**. It is not an operating system window switcher like the original Flutter project.
- `drawSnapshot` may fail for protected, sleeping, remote, newly opened, or otherwise unavailable content; thumbnails are cached only in memory and never uploaded.
- Some active tabs could be hidden because Zen maintains a workspace abstraction not fully represented by `gBrowser.tabs` alone. A fully Zen-aware cross-workspace switcher will require further compatibility work.
- The system Ctrl+Tab handler is privileged and its execution order is **version-dependent**. The independent Ctrl+Alt+O opener is the recommended baseline.
- We have **not validated this inside an installed Zen build**. The interactive demo and static checks are available; do not install into your primary profile before testing and backing up.
- `fx-autoconfig` can affect multiple browser profiles at the executable level, even though Orbit's JS and CSS are profile-specific.
- The original project is Flutter/Dart plus Hyprland native code; this port rewrites the visual/mathematical idea in plain browser DOM, CSS and SVG. No original Flutter Dart implementation or unlicensed bitmap assets are bundled.

## References

- [Original window switcher component](https://github.com/FlafyDev/fantasy_rice/blob/main/fantasy_rice/lib/widgets/freeze/overlays/windows_overlay/windows_overlay.dart)
- [Original overlay/screen transitions](https://github.com/FlafyDev/fantasy_rice/blob/main/fantasy_rice/lib/widgets/freeze/freeze.dart)
- [Zen Browser Keyboard Shortcuts](https://docs.zen-browser.app/user-manual/shortcuts)
- [Zen Browser Extensions vs. Zen Mods](https://docs.zen-browser.app/user-manual/extensions)
- [fx-autoconfig installation and supported script/style directories](https://github.com/MrOtherGuy/fx-autoconfig)
