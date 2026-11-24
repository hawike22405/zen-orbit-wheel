# Fix Orbit Wheel when Zen Nebula is installed

This guide applies to **[hawike22405/zen-orbit-wheel](https://github.com/hawike22405/zen-orbit-wheel)**. Its main branch preserves the improved native tab-wheel behavior (active workspace, seven visible tabs, and Show all tabs).

## Why the shortcut can stop responding
Zen Nebula is commonly installed using **Sine**, which installs its own chrome JavaScript loader. An Orbit file previously installed for **fx-autoconfig** may no longer load, so Ctrl+Alt+O does nothing. This is a likely explanation, not an established diagnosis on your machine.

## Restore both mods through Sine
1. Open Zen's `about:profiles`, identify your **active** profile and back it up.
2. In **Zen Settings → Sine**, keep **Nebula enabled**.
3. Inspect `chrome/JS/OrbitWheel.uc.js` and, if you trust it, enable **JavaScript from unofficial sources** in Sine. Privileged browser scripts have access beyond normal extensions.
4. In Sine, install this repository as a custom/external mod:
   `https://github.com/hawike22405/zen-orbit-wheel`
5. Verify the Orbit mod is enabled and that its JS and CSS components load. Fully restart Zen.
6. Test **Ctrl+Alt+O**. This is the safer initial test because native Ctrl+Tab handling is version-dependent.
7. Only **after** the Sine version loads, disable duplicate Orbit files manually installed through fx-autoconfig, if present. Do **not** remove Nebula or Sine's loader.

## If Ctrl+Alt+O still does nothing
- Verify Sine allows unofficial JavaScript and that the mod's **JavaScript script**, not only its CSS, is enabled.
- Verify the active profile matches the one that contains Sine and Nebula.
- In **Browser Console** (often Ctrl+Shift+J), look for `[OrbitWheel]` initialization errors or Sine loading errors.
- On Linux, locate any old manual Orbit copies with:
  `find ~/.config/zen ~/.zen -type f \\( -name 'OrbitWheel.uc.js' -o -name 'OrbitWheel.uc.css' \\) 2>/dev/null`
- If the overlay is present but invisible, inspect the computed styles for `#orbit-wheel-root` and check whether Nebula overrides its visibility.
- If Ctrl+Alt+O works but Ctrl+Tab does not, there may be a native shortcut conflict. Use Ctrl+Alt+O until the precise Zen version is verified.
- If Sine rejects this repository's manifest, record the Sine version and installation error so the packaging can be adapted rather than replacing core loader files.

## Safe rollback
Disable **Zen Orbit Wheel** under Sine. Leave **Nebula** installed. Do not overwrite application-level `config.js` or delete shared Sine files.

## Important limitations
- Changes have been checked against the source and tests; they have **not** been runtime verified inside your Zen/Sine installation.
- The original wheel is browser-chrome JavaScript, not an ordinary Firefox WebExtension.
- No changes to Nebula itself are needed for this packaging.
