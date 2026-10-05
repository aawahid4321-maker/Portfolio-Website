// Lerp-based smooth scroll — intercepts wheel events and eases the page
// to the target position each rAF tick. LERP factor 0.09 = slow/soft,
// 0.18 = snappier. Adjust to taste.
const LERP = 0.10;
const WHEEL_SCALE = 1.0; // multiplier on deltaY — keep at 1 for natural speed

let target = 0;
let current = 0;
let running = false;

function clamp(v: number): number {
  return Math.max(0, Math.min(v, document.body.scrollHeight - window.innerHeight));
}

function tick() {
  const diff = target - current;
  if (Math.abs(diff) < 0.5) {
    current = target;
    running = false;
    return;
  }
  current += diff * LERP;
  window.scrollTo(0, current);
  requestAnimationFrame(tick);
}

function onWheel(e: WheelEvent) {
  // Let the browser handle horizontal scrolls and zoomed pinch gestures
  if (e.ctrlKey) return;

  e.preventDefault();

  // Normalize delta across different deltaMode values
  let delta = e.deltaY;
  if (e.deltaMode === 1) delta *= 32;  // line mode → px
  if (e.deltaMode === 2) delta *= window.innerHeight; // page mode → px

  target = clamp(target + delta * WHEEL_SCALE);

  if (!running) {
    running = true;
    current = window.scrollY;
    requestAnimationFrame(tick);
  }
}

export function initSmoothScroll() {
  window.addEventListener("scroll", () => {
    // If a programmatic jump (instant nav) moved scroll far from where the
    // lerp thinks it is, snap both pointers so the next wheel starts cleanly.
    if (!running || Math.abs(window.scrollY - current) > 4) {
      current = window.scrollY;
      target  = window.scrollY;
      running = false;
    }
  }, { passive: true });

  window.addEventListener("wheel", onWheel, { passive: false });
}
