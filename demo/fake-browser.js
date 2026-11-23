/* Browser simulator only; never loaded by real Zen. No network access. */
(() => {
  'use strict';
  window.ORBIT_WHEEL_DEMO = true;
  const examples = [
    ['GitHub — Projects', 'https://github.com/'],
    ['Zen Browser', 'https://zen-browser.app/'],
    ['VS Code — orbit-wheel', 'https://code.visualstudio.com/'],
    ['Flutter documentation', 'https://flutter.dev/'],
    ['MDN Web Docs', 'https://developer.mozilla.org/'],
    ['Figma — Orbit Design', 'https://www.figma.com/'],
    ['YouTube — Music', 'https://www.youtube.com/'],
    ['Notion — Workspace', 'https://www.notion.so/'],
    ['WebGL shaders', 'https://webglfundamentals.org/']
  ];
  const tabs = examples.map(([label, spec]) => ({
    label,
    linkedBrowser: { currentURI: { spec }, browsingContext: null },
    hidden: false,
    hasAttribute: () => false,
    getAttribute: () => '',
    closing: false
  }));
  let selectedTab = tabs[0];
  window.gBrowser = {
    tabs,
    tabContainer: new EventTarget(),
    get selectedTab() { return selectedTab; },
    set selectedTab(value) {
      selectedTab = value;
      window.dispatchEvent(new CustomEvent('orbit-demo-selected', { detail: { label: value.label } }));
    }
  };
})();
