window.addEventListener('DOMContentLoaded', () => {
  const wheel = window.__zenOrbitWheel_v1;
  if (!wheel) {
    document.getElementById('chosen').textContent = 'The wheel could not load. Check the browser console.';
    return;
  }
  document.getElementById('open').addEventListener('click', () => wheel.show(false));
  document.getElementById('prev').addEventListener('click', () => wheel.opened ? wheel.step(-1) : wheel.show(false));
  document.getElementById('next').addEventListener('click', () => wheel.opened ? wheel.step(1) : wheel.show(false));
  document.getElementById('close').addEventListener('click', () => wheel.dismiss(false));
  window.addEventListener('orbit-demo-selected', event => {
    document.getElementById('chosen').textContent = 'Selected: ' + event.detail.label;
  });
  wheel.show(false);
});
