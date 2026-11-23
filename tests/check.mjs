import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

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
