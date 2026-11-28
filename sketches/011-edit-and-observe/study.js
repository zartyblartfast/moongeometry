const frame = document.querySelector('iframe');
const params = new URLSearchParams(location.search);
const variant = document.body.dataset.variant || 'current';
const capture = params.has('capture');
if (capture) document.body.classList.add('capture');
let observer;
let child;
let marking = false;
function mark() {
  if (!child || marking) return;
  marking = true;
  const tag = (element, key, value = '') => { if (element && element.getAttribute('data-study-' + key) !== value) element.setAttribute('data-study-' + key, value); };
  const main = child.querySelector('main');
  const place = child.querySelector('section[aria-label="Place and time"]');
  const svg = child.querySelector('svg:not([data-share-sky-chart]):has([data-sky-horizon])');
  const sky = svg?.closest('section');
  if (main && place && sky) {
    tag(main, 'main'); tag(place, 'place'); tag(sky, 'sky'); tag(sky.parentElement, 'diagrams');
    tag(sky.parentElement.querySelector('section'), 'orbit');
    tag(svg.parentElement, 'stage');
    tag(child.querySelector('input[type=time]')?.parentElement, 'time');
    tag(child.querySelector('input[type=range][min="-90"]')?.parentElement, 'latitude');
    const skyHeader = sky.querySelector('[data-local-sky-header]');
    let detail = 0;
    let notice = 0;
    let pastStage = false;
    for (const item of sky.children) {
      if (pastStage) tag(item, 'detail', String(++detail));
      if (item === svg.parentElement) pastStage = true;
      if (item.tagName === 'P' && item.textContent.startsWith('The Moon is ')) tag(item, 'status');
      if (item !== skyHeader && item !== svg.parentElement && item.tagName !== 'DL' && !item.hasAttribute('data-study-status') && [...sky.children].indexOf(item) < [...sky.children].indexOf(svg.parentElement)) tag(item, 'notice', String(++notice));
    }
    tag(child.documentElement, 'variant', variant);
    tag(child.documentElement, 'expanded', String(place.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded') === 'true'));
    for (const button of sky.querySelectorAll('button')) if (button.textContent.trim() === 'Preview') tag(button, 'preview');
    document.body.dataset.ready = 'true';
    document.querySelector('#state').textContent = `${variant.toUpperCase()} · live local app · ${frame.contentWindow.innerWidth} × ${frame.contentWindow.innerHeight}`;
  }
  marking = false;
}
frame.addEventListener('load', async () => {
  observer?.disconnect();
  child = frame.contentDocument;
  if (!child) return;
  // The settled civil-time marker is produced after mount, not by the SSR fallback.
  for (let i = 0; i < 300 && !child.querySelector('[title^="IANA zone:"]'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  if (!child.querySelector('main')) return;
  const css = child.createElement('link'); css.rel = 'stylesheet'; css.href = '/__study/layout.css'; css.id = 'study-presentation'; child.head.append(css);
  await new Promise(resolve => { css.onload = resolve; css.onerror = resolve; });
  mark();
  observer = new MutationObserver(mark);
  observer.observe(child.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded', 'class'] });
  frame.contentWindow.addEventListener('resize', mark);
  // Review convenience only; capture harness opens native disclosure explicitly.
  if (!capture && !params.has('collapsed') && frame.contentWindow.innerWidth >= 640 && frame.contentWindow.innerWidth <= 1023 && frame.contentWindow.innerHeight <= 540) placeButton()?.click();
  mark();
});
function placeButton() { return child?.querySelector('section[aria-label="Place and time"] button[aria-expanded]'); }
const sizes = { landscape: [844,390], desktop: [1280,800], wide: [1440,900], portrait: [390,844] };
function setSize(value) {
  if (value === 'fit') { frame.style.width = '100%'; frame.style.height = 'calc(100dvh - 156px)'; }
  else { const [w,h] = sizes[value]; frame.style.width = w + 'px'; frame.style.height = h + 'px'; }
}
document.querySelector('select')?.addEventListener('change', event => setSize(event.target.value));
document.querySelector('#position')?.addEventListener('click', () => {
  const stage = child?.querySelector('[data-study-stage]');
  const anchor = variant === 'a' ? child?.querySelector('[data-study-time]') : stage;
  if (anchor) frame.contentWindow.scrollTo({ top: anchor.getBoundingClientRect().top + frame.contentWindow.scrollY - (variant === 'a' ? 80 : 145), behavior: 'instant' });
});
document.querySelector('#toggle')?.addEventListener('click', () => placeButton()?.click());
frame.src = params.get('app')?.startsWith('/?') ? params.get('app') : '/?lat=40.7&lon=-74&date=2026-11-27&time=20:00';
