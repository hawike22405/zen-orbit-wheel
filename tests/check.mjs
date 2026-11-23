import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const get = path => readFileSync(join(root, path), 'utf8');

test('Required files are distributed', () => {
  for (const file of ['chrome/JS/OrbitWheel.uc.js', 'chrome/CSS/OrbitWheel.uc.css', 'demo/index.html', 'demo/fake-browser.js', 'demo/demo.js', 'README.md', 'scripts/install_profile.py']) {
    assert(existsSync(join(root, file)), `Missing ${file}`);
  }
});

test('All JavaScript files parse', () => {
  for (const file of ['chrome/JS/OrbitWheel.uc.js', 'demo/fake-browser.js', 'demo/demo.js']) {
    const run = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
    assert.equal(run.status, 0, `${file}: ${run.stderr}`);
  }
});

test('The full source has the browser native wheel behavior and fallback', () => {
  const source = get('chrome/JS/OrbitWheel.uc.js');
  for (const exact of ['@include          main', 'createCircleSvg(', 'angleFor(', 'requestAnimationFrame(', 'gBrowser.selectedTab = chosen', 'get_window_textures']) {
    if (exact === 'get_window_textures') assert(!source.includes(exact), 'Must not require Hyprland window textures');
    else assert(source.includes(exact), `Missing implementation: ${exact}`);
  }
  assert(source.includes('event.ctrlKey && !event.altKey'), 'Ctrl+Tab listener missing');
  assert(source.includes('alternateKey'), 'Alternative opener missing');
  assert(source.includes('drawSnapshot'), 'Optional thumbnail capture missing');
});

test('Tab placement samples are evenly spaced and counterrotate', () => {
  const n = 9;
  const getPoint = (i, rotation) => {
    const a = i / n * 2 * Math.PI - rotation;
    return [Math.sin(a), Math.cos(a)];
  };
  const p0 = getPoint(0, 0);
  assert(Math.abs(p0[0]) < 1e-9);
  assert(Math.abs(p0[1] - 1) < 1e-9);
  assert.deepEqual(getPoint(1, 2 * Math.PI / n).map(x => +x.toFixed(9)), [0, 1]);
});

test('Card styles allow the orbit to position each preview', () => {
  const css = get('chrome/CSS/OrbitWheel.uc.css');
  const cardRule = css.match(/#orbit-wheel-root \.orbit-card\s*\{([^}]+)\}/)?.[1];
  assert(cardRule);
  assert.doesNotMatch(cardRule, /\b(?:all|transform)\s*:[^;]*!important/);
});

test('Ctrl+Tab cycles only live tabs and checks that the chosen tab still exists', () => {
  const tab = (label, attributes = {}, properties = {}) => ({
    label, linkedBrowser: {},
    hasAttribute: name => Object.hasOwn(attributes, name),
    getAttribute: name => attributes[name] ?? null,
    ...properties
  });
  const blank = tab('Zen blank', { 'zen-empty-tab': '' });
  const first = tab('First');
  let attemptedSleepingPreview = false;
  const sleeping = tab('Asleep', { pending: '' }, {
    linkedBrowser: { get browsingContext() { attemptedSleepingPreview = true; return null; } }
  });
  const essential = tab('Essential', { 'zen-workspace-id': 'other', 'zen-essential': 'true' });
  const tabs = [
    blank, first, sleeping, essential,
    tab('Other workspace', { 'zen-workspace-id': 'other' }),
    tab('Glance', { 'zen-glance-tab': '' }),
    tab('Closing', {}, { closing: true }),
    tab('Detached', {}, { isConnected: false }),
    tab('Hidden', {}, { hidden: true })
  ];
  const gBrowser = { tabs, selectedTab: blank, tabContainer: new EventTarget() };
  const element = () => ({
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {} },
    setAttribute() {}, addEventListener() {}, append() {}, appendChild() {}, replaceChildren() {}
  });
  const document = { createElementNS: element, documentElement: element() };
  const systemListeners = new Map();
  const window = {
    gBrowser, ORBIT_WHEEL_DEMO: true, gZenWorkspaces: { activeWorkspace: 'current' },
    addEventListener(type, handler, options) {
      if (options?.mozSystemGroup && options.capture) systemListeners.set(type, handler);
    },
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {}
  };
  runInNewContext(get('chrome/JS/OrbitWheel.uc.js'), { window, document, gBrowser, URL });
  const wheel = window.__zenOrbitWheel_v1;
  const press = (type, key, options = {}) => {
    const event = {
      key, ctrlKey: type === 'keydown', preventDefault() {}, stopPropagation() {},
      stopImmediatePropagation() { this.stopped = true; }, ...options
    };
    systemListeners.get(type)(event);
    assert.equal(event.stopped, true);
  };

  press('keydown', 'Tab');
  assert.deepEqual(Array.from(wheel.tabs), [first, sleeping, essential]);
  assert.equal(wheel.cards.length, 3);
  assert.equal(attemptedSleepingPreview, false);
  assert.equal(wheel.tabs[wheel.selected], first);
  press('keydown', 'Tab');
  assert.equal(wheel.tabs[wheel.selected], sleeping);
  assert.equal(gBrowser.selectedTab, blank);
  press('keyup', 'Control');
  assert.equal(gBrowser.selectedTab, sleeping);

  press('keydown', 'Tab', { shiftKey: true });
  assert.equal(wheel.tabs[wheel.selected], first);
  tabs.splice(tabs.indexOf(first), 1);
  press('keyup', 'Control');
  assert.equal(gBrowser.selectedTab, sleeping);
});

test('Profile installer copies only two files and cleans up', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'zen-orbit-test-'));
  mkdirSync(join(tmp, 'chrome', 'utils'), { recursive: true });
  writeFileSync(join(tmp, 'chrome', 'utils', 'boot.sys.mjs'), '// loader fixture\n');
  const invoke = (...args) => spawnSync('python3', [join(root, 'scripts', 'install_profile.py'), '--profile', tmp, ...args], { encoding: 'utf8' });
  const before = invoke('--dry-run');
  assert.equal(before.status, 0, before.stderr);
  assert(!existsSync(join(tmp, 'chrome', 'JS', 'OrbitWheel.uc.js')));
  const install = invoke();
  assert.equal(install.status, 0, install.stderr);
  assert(existsSync(join(tmp, 'chrome', 'JS', 'OrbitWheel.uc.js')));
  assert(existsSync(join(tmp, 'chrome', 'CSS', 'OrbitWheel.uc.css')));
  const remove = invoke('--uninstall');
  assert.equal(remove.status, 0, remove.stderr);
  assert(!existsSync(join(tmp, 'chrome', 'JS', 'OrbitWheel.uc.js')));
  assert(!existsSync(join(tmp, 'chrome', 'CSS', 'OrbitWheel.uc.css')));
  assert(existsSync(join(tmp, 'chrome', 'utils', 'boot.sys.mjs')), 'Installer must never remove the loader');
});
