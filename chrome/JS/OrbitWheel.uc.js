// ==UserScript==
// @name             Orbit Wheel for Zen
// @description      Firefox/Zen privileged tab wheel based on fantasy_rice's window switcher visual concept
// @include          main
// ==/UserScript==
/*
 * Orbit Wheel - browser-chrome script (not a WebExtension).
 * Requires a trusted userChromeJS loader, e.g. MrOtherGuy/fx-autoconfig.
 * Does not change Zen installation binaries or persist page screenshots.
 * Source inspiration: https://github.com/FlafyDev/fantasy_rice
 * Copyright (c) 2026 Orbit Wheel contributors. MIT license applies to this original port.
 */
(() => {
  'use strict';

  const KEY = '__zenOrbitWheel_v1';
  if (window[KEY]) return;
  if (!window.ORBIT_WHEEL_DEMO && !document.location.href.startsWith('chrome://browser/content/browser.x')) return;

  const CONFIG = Object.freeze({
    // When supported by Zen's event routing, catch the browser's original Ctrl+Tab.
    interceptCtrlTab: true,
    // Always-available alternative (Windows/Linux Ctrl+Alt+O, macOS Control+Alt+O).
    alternateKey: 'o',
    alternateRequiresCtrl: true,
    alternateRequiresAlt: true,
    // Original Flutter animation used 2*pi/100 radians/second.
    angularSpeed: 2 * Math.PI / 100,
    thumbnailCapture: true,
    thumbnailLimit: 12,
    screenshotTTL: 25000,
    maxTabs: 24,
    // Hide hidden Zen workspace tabs; also display the current tab if hidden.
    visibleWorkspaceOnly: true,
    ringDiameter: 444,
  });

  const HTML_NS = 'http://www.w3.org/1999/xhtml';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const elt = (tag, cl, text) => {
    const e = document.createElementNS(HTML_NS, tag);
    if (cl) e.className = cl;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const modulo = (value, max) => ((value % max) + max) % max;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const angleFor = (index, count, rotation) => (index / count) * Math.PI * 2 - rotation;

  // The magic geometry follows the original Flutter SummoningCirclePaint:
  // two concentric rings, N nodes, and alternating polygon corner points.
  function createCircleSvg(count) {
    const N = Math.max(3, count);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 500 500');
    svg.setAttribute('class', 'orbit-summoning-svg');
    svg.setAttribute('aria-hidden', 'true');
    const node = (tag, attrs, parent = svg) => {
      const el = document.createElementNS(SVG_NS, tag);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
      parent.appendChild(el);
      return el;
    };
    const defs = node('defs', {});
    const glow = node('filter', { id: 'orbit-gold-glow', x: '-70%', y: '-70%', width: '240%', height: '240%' }, defs);
    node('feGaussianBlur', { stdDeviation: '8', result: 'blur' }, glow);
    const nPoint = (i, radius) => {
      const a = (i / N) * Math.PI * 2;
      return { x: 250 + Math.sin(a) * radius, y: 250 + Math.cos(a) * radius };
    };
    const pathData = [];
    for (let i = 0; i < N; i++) {
      const p1 = nPoint(i, 207);
      const pmid = nPoint(i + 0.5, 207 - 42 - 295 / N);
      if (!i) pathData.push(`M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`);
      pathData.push(`L ${p1.x.toFixed(3)} ${p1.y.toFixed(3)} L ${pmid.x.toFixed(3)} ${pmid.y.toFixed(3)}`);
    }
    pathData.push('Z');
    const paths = [
      { d: 'M 457 250 A 207 207 0 1 1 43 250 A 207 207 0 1 1 457 250', w: 11 },
      { d: 'M 407 250 A 157 157 0 1 1 93 250 A 157 157 0 1 1 407 250', w: 10 },
      { d: pathData.join(' '), w: 9 },
    ];
    for (const p of paths) {
      node('path', { d: p.d, fill: 'none', stroke: '#ffbd20', 'stroke-width': p.w * 2.1, opacity: '.78', filter: 'url(#orbit-gold-glow)', 'stroke-linejoin': 'round' });
      node('path', { d: p.d, fill: 'none', stroke: '#ffd348', 'stroke-width': p.w, 'stroke-linejoin': 'round' });
    }
    for (let i = 0; i < N; i++) {
      const p = nPoint(i, 207 - 25);
      node('circle', { cx: p.x, cy: p.y, r: 20, fill: '#ffb828', filter: 'url(#orbit-gold-glow)', opacity: '.82' });
      node('circle', { cx: p.x, cy: p.y, r: 18, fill: '#ffd12d' });
      node('circle', { cx: p.x, cy: p.y, r: 5, fill: '#ffef94', opacity: '.85' });
    }
    return svg;
  }

  class OrbitWheel {
    constructor() {
      this.tabs = [];
      this.cards = [];
      this.selected = 0;
      this.origin = null;
      this.opened = false;
      this.holdControl = false;
      this.rotation = 0;
      this.lastTime = 0;
      this.rafId = 0;
      this.snapshotCache = new WeakMap();
      this.cardPointer = new Map();
      this.closed = false;
      this.captureGeneration = 0;
      this.onKeydown = this.onKeydown.bind(this);
      this.onKeyup = this.onKeyup.bind(this);
      this.onWindowBlur = this.onWindowBlur.bind(this);
      this.onTabChange = this.onTabChange.bind(this);
      this.frame = this.frame.bind(this);
      this.build();
      this.listen();
    }

    build() {
      const root = elt('div', 'orbit-wheel-root');
      root.id = 'orbit-wheel-root';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Orbit Wheel tab switcher');
      root.setAttribute('aria-hidden', 'true');
      const sky = elt('div', 'orbit-sky');
      const forest = elt('div', 'orbit-forest');
      const vignette = elt('div', 'orbit-vignette');
      const caption = elt('header', 'orbit-head');
      const left = elt('div', 'orbit-brand', '✦ ORBIT');
      const meta = elt('div', 'orbit-counter', '0 TABS');
      caption.append(left, meta);
      const center = elt('div', 'orbit-center');
      const circle = elt('div', 'orbit-circle');
      const cards = elt('div', 'orbit-cards');
      center.append(circle, cards);
      const footer = elt('footer', 'orbit-foot');
      const hint = elt('div', 'orbit-hint', 'CTRL + TAB · CYCLE   /   ESC · CANCEL');
      const action = elt('div', 'orbit-action', 'CLICK A WINDOW TO SWITCH');
      footer.append(hint, action);
      root.append(sky, forest, vignette, caption, center, footer);
      document.documentElement.appendChild(root);
      this.root = root;
      this.circle = circle;
      this.cardHost = cards;
      this.counter = meta;
      this.hint = hint;
      root.addEventListener('wheel', event => {
        if (!this.opened) return;
        event.preventDefault();
        this.step(event.deltaY > 0 ? 1 : -1);
      }, { passive: false });
      root.addEventListener('click', event => {
        if (event.target === root || event.target === sky || event.target === vignette) this.dismiss(false);
      });
    }

    listen() {
      window.addEventListener('keydown', this.onKeydown, true);
      window.addEventListener('keyup', this.onKeyup, true);
      window.addEventListener('blur', this.onWindowBlur, true);
      gBrowser.tabContainer.addEventListener('TabClose', this.onTabChange);
      gBrowser.tabContainer.addEventListener('TabOpen', this.onTabChange);
      window.addEventListener('unload', () => this.destroy(), { once: true });
    }

    onTabChange() {
      if (this.opened) this.dismiss(false);
    }

    listTabs() {
      let tabs = Array.from(gBrowser.tabs).filter(tab => tab && tab.linkedBrowser && !tab.closing);
      if (CONFIG.visibleWorkspaceOnly) {
        const visible = tabs.filter(tab => (!tab.hidden && !tab.hasAttribute('hidden')) || tab === gBrowser.selectedTab);
        // Zen can mark tabs hidden during workspace transitions: don't show a blank wheel.
        if (visible.length) tabs = visible;
      }
      return tabs.slice(0, CONFIG.maxTabs);
    }

    isTrigger(event) {
      const key = String(event.key).toLowerCase();
      return key === CONFIG.alternateKey &&
        event.ctrlKey === CONFIG.alternateRequiresCtrl &&
        event.altKey === CONFIG.alternateRequiresAlt && !event.metaKey;
    }

    swallow(event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    }

    onKeydown(event) {
      if (event.defaultPrevented && !this.opened) return;
      // A separate shortcut works when Zen keeps Ctrl+Tab at a higher priority.
      if (this.isTrigger(event)) {
        this.swallow(event);
        if (event.repeat) return;
        if (this.opened) this.dismiss(false);
        else this.show(false);
        return;
      }
      if (CONFIG.interceptCtrlTab && event.ctrlKey && !event.altKey && !event.metaKey && event.key === 'Tab') {
        this.swallow(event);
        if (!this.opened) this.show(true);
        if (this.opened) this.step(event.shiftKey ? -1 : +1);
        return;
      }
      if (!this.opened) return;
      if (event.key === 'Escape') {
        this.swallow(event);
        this.dismiss(false);
      } else if (event.key === 'Enter' || event.key === ' ') {
        this.swallow(event);
        this.dismiss(true);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Tab') {
        this.swallow(event);
        this.step(event.shiftKey ? -1 : +1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        this.swallow(event);
        this.step(-1);
      }
    }

    onKeyup(event) {
      if (!this.opened || !this.holdControl) return;
      if (event.key === 'Control' || !event.ctrlKey) {
        this.swallow(event);
        this.dismiss(true);
      }
    }

    onWindowBlur() {
      if (this.opened) this.dismiss(false);
    }

    show(modifierHeld) {
      if (this.opened) return;
      this.tabs = this.listTabs();
      if (!this.tabs.length) return;
      this.origin = gBrowser.selectedTab;
      this.selected = Math.max(0, this.tabs.indexOf(this.origin));
      this.opened = true;
      this.holdControl = modifierHeld;
      this.rotation = 0;
      this.lastTime = 0;
      this.captureGeneration++;
      this.root.setAttribute('aria-hidden', 'false');
      this.root.classList.add('orbit-visible');
      this.hint.textContent = modifierHeld
        ? 'HOLD CTRL + TAB TO CYCLE  ·  RELEASE CTRL TO SWITCH  ·  ESC TO CANCEL'
        : 'ARROW KEYS / SCROLL TO SELECT  ·  ENTER TO SWITCH  ·  ESC TO CANCEL';
      this.renderCards();
      this.tickCircle();
      this.updateFocus();
      this.rafId = window.requestAnimationFrame(this.frame);
      this.captureThumbnails(this.captureGeneration).catch(error => this.log('Thumbnail capture issue', error));
    }

    async captureThumbnails(generation) {
      if (!CONFIG.thumbnailCapture || !this.opened) return;
      // Screenshot-only; never written to disk, uploaded, or retained after window exit.
      for (let i = 0; i < Math.min(CONFIG.thumbnailLimit, this.tabs.length); i++) {
        if (generation !== this.captureGeneration || !this.opened) break;
        const tab = this.tabs[i];
        const card = this.cards[i];
        if (!tab || !card) break;
        const cached = this.snapshotCache.get(tab);
        if (cached && Date.now() - cached.timestamp < CONFIG.screenshotTTL) {
          this.setScreenshot(card, cached.url);
          continue;
        }
        try {
          const browsingContext = tab.linkedBrowser.browsingContext;
          const global = browsingContext?.currentWindowGlobal;
          if (!global || typeof global.drawSnapshot !== 'function') continue;
          // 0.2x is deliberately low resolution. A missing compositor surface
          // or inaccessible page will be skipped without stopping switching.
          const bitmap = await global.drawSnapshot(null, 0.20, 'rgb(12,16,23)');
          if (generation !== this.captureGeneration || !this.opened) {
            bitmap?.close?.();
            break;
          }
          const canvas = elt('canvas');
          canvas.width = Math.max(1, Math.min(280, bitmap.width));
          canvas.height = Math.max(1, Math.min(180, bitmap.height));
          canvas.getContext('2d', { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          bitmap?.close?.();
          const url = canvas.toDataURL('image/jpeg', 0.72);
          this.snapshotCache.set(tab, { url, timestamp: Date.now() });
          this.setScreenshot(card, url);
        } catch (_) {
          // Zen may not expose drawSnapshot on some pages, minimized windows,
          // or versions. The thumbnail placeholder remains visible.
        }
      }
    }

    setScreenshot(card, url) {
      const visual = card.querySelector('.orbit-preview-shot');
      if (!visual) return;
      visual.style.backgroundImage = `url("${url}")`;
      card.classList.add('orbit-has-shot');
    }

    renderCards() {
      this.cardPointer.clear();
      this.cards = [];
      this.cardHost.replaceChildren();
      this.counter.textContent = `${String(this.tabs.length).padStart(2, '0')} OPEN TABS`;
      for (const [index, tab] of this.tabs.entries()) {
        const card = elt('button', 'orbit-card');
        card.type = 'button';
        card.setAttribute('title', tab.label || 'Untitled');
        card.setAttribute('aria-label', `Switch to ${tab.label || 'Untitled'}`);
        const preview = elt('div', 'orbit-preview');
        const shot = elt('div', 'orbit-preview-shot');
        const ornament = elt('div', 'orbit-preview-lines');
        for (let i = 0; i < 6; i++) ornament.appendChild(elt('i', 'orbit-preview-line'));
        const urlBar = elt('div', 'orbit-preview-top');
        const favicon = elt('img', 'orbit-favicon');
        favicon.alt = '';
        let iconURL = '';
        try { iconURL = tab.getAttribute('image') || ''; } catch (_) {}
        if (iconURL) {
          favicon.src = iconURL;
          favicon.onerror = () => favicon.classList.add('orbit-hidden');
        } else favicon.classList.add('orbit-hidden');
        const originURL = (() => {
          try { return tab.linkedBrowser.currentURI?.spec ?? ''; } catch (_) { return ''; }
        })();
        const site = elt('span', 'orbit-site', (() => {
          try { return new URL(originURL).hostname || 'ZEN'; } catch (_) { return 'ZEN BROWSER'; }
        })());
        urlBar.append(favicon, site);
        const headline = elt('div', 'orbit-preview-headline', tab.label || 'New tab');
        preview.append(shot, ornament, urlBar, headline);
        const bottom = elt('div', 'orbit-card-bottom');
        bottom.appendChild(elt('span', 'orbit-card-name', tab.label || 'Untitled'));
        card.append(preview, bottom);
        card.addEventListener('click', event => {
          event.stopPropagation();
          this.selected = this.tabs.indexOf(tab);
          this.dismiss(true);
        });
        card.addEventListener('pointermove', event => {
          const box = card.getBoundingClientRect();
          this.cardPointer.set(card, { x: clamp((event.clientX - box.left) / box.width - .5, -.5, .5), y: clamp((event.clientY - box.top) / box.height - .5, -.5, .5) });
        });
        card.addEventListener('pointerleave', () => this.cardPointer.delete(card));
        this.cardHost.appendChild(card);
        this.cards.push(card);
      }
    }

    tickCircle() {
      this.circle.replaceChildren(createCircleSvg(this.tabs.length));
      this.circle.style.setProperty('--ring-size', `${CONFIG.ringDiameter}px`);
    }

    step(delta) {
      if (!this.opened || !this.tabs.length) return;
      this.selected = modulo(this.selected + delta, this.tabs.length);
      // Phase-snap selection into lower arc when using the keyboard, without
      // stopping the continuously rotating original summoning ring.
      this.updateFocus();
    }

    updateFocus() {
      for (let i = 0; i < this.cards.length; i++) {
        const selected = i === this.selected;
        this.cards[i].classList.toggle('orbit-selected', selected);
        this.cards[i].setAttribute('aria-current', selected ? 'true' : 'false');
      }
    }

    frame(now) {
      if (!this.opened || this.closed) return;
      const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, .05) : 0;
      this.lastTime = now;
      this.rotation = modulo(this.rotation + dt * CONFIG.angularSpeed, Math.PI * 2);
      const bounds = this.root.getBoundingClientRect();
      const rx = Math.min(bounds.width * .33, 410);
      const ry = Math.min(bounds.height * .33, 312);
      const cardScale = clamp(Math.min(bounds.width / 1200, bounds.height / 760), .56, 1.0);
      this.circle.style.transform = `translate(-50%, -50%) rotate(${this.rotation}rad)`;
      this.circle.style.width = `${Math.min(CONFIG.ringDiameter, bounds.width * .42, bounds.height * .63)}px`;
      this.circle.style.height = this.circle.style.width;
      const total = this.tabs.length;
      for (let i = 0; i < total; i++) {
        const card = this.cards[i];
        const angle = angleFor(i, total, this.rotation);
        const x = Math.sin(angle) * rx;
        const y = Math.cos(angle) * ry;
        const depth = (Math.cos(angle) + 1) / 2;
        const hover = this.cardPointer.get(card);
        const sx = hover ? -hover.y * 15 : 0;
        const sy = hover ? hover.x * 15 : 0;
        const focus = i === this.selected ? 1.08 : 1.0;
        const size = (0.82 + 0.18 * depth) * cardScale * focus;
        card.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0) perspective(650px) rotateX(${sx.toFixed(2)}deg) rotateY(${sy.toFixed(2)}deg) scale(${size.toFixed(3)})`;
        card.style.zIndex = String(Math.round(depth * 50) + (i === this.selected ? 100 : 1));
        card.style.opacity = String(clamp(.7 + .30 * depth, .7, 1));
      }
      this.rafId = window.requestAnimationFrame(this.frame);
    }

    dismiss(activate) {
      if (!this.opened) return;
      const chosen = this.tabs[this.selected];
      this.captureGeneration++;
      this.opened = false;
      this.holdControl = false;
      this.root.classList.remove('orbit-visible');
      this.root.setAttribute('aria-hidden', 'true');
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.cardPointer.clear();
      if (activate && chosen && !chosen.closing) {
        try { gBrowser.selectedTab = chosen; } catch (error) { this.log('Could not select this tab', error); }
      }
    }

    log(...args) {
      try { console.warn('[OrbitWheel]', ...args); } catch (_) {}
    }

    destroy() {
      if (this.closed) return;
      this.dismiss(false);
      this.closed = true;
      window.removeEventListener('keydown', this.onKeydown, true);
      window.removeEventListener('keyup', this.onKeyup, true);
      window.removeEventListener('blur', this.onWindowBlur, true);
      gBrowser?.tabContainer?.removeEventListener('TabClose', this.onTabChange);
      gBrowser?.tabContainer?.removeEventListener('TabOpen', this.onTabChange);
      this.root?.remove();
      window[KEY] = null;
    }
  }

  const initialize = () => {
    if (window[KEY] || !window.gBrowser?.tabContainer) return;
    try { window[KEY] = new OrbitWheel(); }
    catch (error) { console.error('[OrbitWheel] failed to initialize:', error); }
  };

  // fx-autoconfig runs at DOMContentLoaded; tabbrowser can be initialized later.
  if (window.gBrowser?.tabContainer) initialize();
  else if (window.UC_API?.Windows?.waitWindowLoading) window.UC_API.Windows.waitWindowLoading(window).then(initialize).catch(console.error);
  else window.addEventListener('load', initialize, { once: true });
})();
