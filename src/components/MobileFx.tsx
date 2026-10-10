import { useEffect, useRef, useState } from "react";
import LetsConnect from "@/components/LetsConnect";

/* Mobile/tablet versions of the desktop animations. Everything here only runs
   inside MobileSite (<1280px); the desktop layout never renders it. All loops
   pause off-screen, animate transform/opacity/clip only, and respect
   prefers-reduced-motion. */

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Card scroll scrub (desktop home/work cards): clip-path opens from the
   centre as the card travels through the viewport and closes as it leaves;
   the image zooms 1.25 → 1.0. One shared passive scroll listener + rAF. ── */
type ScrubItem = { box: HTMLElement; img: HTMLElement | null; visible: boolean; clip: string; zoom: string };
const scrubItems = new Set<ScrubItem>();
let scrubScheduled = false;
let scrubListening = false;
const runScrub = () => {
  scrubScheduled = false;
  const vh = window.innerHeight;
  scrubItems.forEach((it) => {
    if (!it.visible) return;
    const rect = it.box.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
    const openP = Math.min(1, p / 0.3);
    const closeP = Math.min(1, (1 - p) / 0.3);
    const clip = (1 - Math.min(openP, closeP)) * 50; // percent of half-width
    const clipV = `inset(0 ${clip.toFixed(2)}% 0 ${clip.toFixed(2)}%)`;
    if (clipV !== it.clip) { it.box.style.clipPath = clipV; it.clip = clipV; }
    if (it.img) {
      const zoomV = `scale(${(1.25 - 0.25 * p).toFixed(4)})`;
      if (zoomV !== it.zoom) { it.img.style.transform = zoomV; it.zoom = zoomV; }
    }
  });
};
const scheduleScrub = () => {
  if (scrubScheduled) return;
  scrubScheduled = true;
  requestAnimationFrame(runScrub);
};
export function useScrollScrub(enabled: boolean) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const box = boxRef.current;
    if (!enabled || !box || reducedMotion()) return;
    setActive(true);
    const item: ScrubItem = { box, img: imgRef.current, visible: false, clip: "", zoom: "" };
    scrubItems.add(item);
    if (!scrubListening) {
      scrubListening = true;
      window.addEventListener("scroll", scheduleScrub, { passive: true });
      window.addEventListener("resize", scheduleScrub);
    }
    // observe the (unclipped) parent: IO applies the box's own clip-path
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { item.visible = e.isIntersecting; });
      scheduleScrub();
    });
    io.observe(box.parentElement ?? box);
    return () => {
      io.disconnect();
      scrubItems.delete(item);
      box.style.clipPath = "";
      if (item.img) item.img.style.transform = "";
      if (scrubItems.size === 0) {
        window.removeEventListener("scroll", scheduleScrub);
        window.removeEventListener("resize", scheduleScrub);
        scrubListening = false;
      }
    };
  }, [enabled]);
  return { boxRef, imgRef, active };
}

/* ── Dot portrait (desktop home hero): the photo is drawn through a grid of
   dots that spring-pop in from the centre, and expand toward the finger on
   touch (cursor proximity on desktop). Canvas repaints only while something
   changes and only while on screen. ── */
export function DotPortrait({ src, alt, ratio = "4 / 5" }: { src: string; alt: string; ratio?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cvsRef = useRef<HTMLCanvasElement>(null);
  const [reduce] = useState(reducedMotion);
  useEffect(() => {
    const wrap = wrapRef.current, cvs = cvsRef.current;
    if (!wrap || !cvs || reduce) return;
    const ctx = cvs.getContext("2d")!;
    const img = new Image();
    img.decoding = "async";
    img.src = src;

    type Dot = { x: number; y: number; r: number; v: number; tr: number; base: number; at: number; drawnR: number };
    let dots: Dot[] = [];
    let W = 0, H = 0, pitch = 0, rMin = 1.5, rFull = 0, rMax = 0, HOVER_R = 300;
    let revealAt = 0; // 0 = not started
    let fit: { s: number; dx: number; dy: number } | null = null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const computeFit = () => {
      if (!img.naturalWidth || !W) return;
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      fit = { s, dx: (W - img.naturalWidth * s) / 2, dy: (H - img.naturalHeight * s) / 2 };
    };
    const build = () => {
      W = wrap.clientWidth; H = wrap.clientHeight;
      if (!W || !H) return;
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // same proportions as the desktop 669px portrait (14 columns, 7px gap)
      const k = W / 669;
      const COLS = 14;
      pitch = W / COLS;
      rMin = 1.5 * k;
      rFull = (pitch - 7 * k) / 2;
      rMax = (pitch * Math.SQRT2) / 2;
      HOVER_R = 300 * k;
      const rows = Math.ceil(H / pitch);
      const CX = W / 2, CY = H / 2, maxDist = Math.hypot(CX, CY);
      const old = dots;
      dots = [];
      for (let c = 0; c < COLS; c++) for (let row = 0; row < rows; row++) {
        const x = c * pitch + pitch / 2;
        const y = (H - rows * pitch) / 2 + row * pitch + pitch / 2;
        const dist = Math.hypot(x - CX, y - CY);
        const prev = old[dots.length];
        const delay = 200 + (dist / maxDist) * 750;
        dots.push({
          x, y, r: prev ? Math.min(prev.r, rMax) : rMin, v: 0, tr: rMin, base: rMin,
          at: revealAt ? revealAt + delay : Infinity, drawnR: -1,
        });
      }
      computeFit();
      wake();
    };

    const touch = { x: -9999, y: -9999, on: false };
    let leaveT = 0;
    const setTouch = (clientX: number, clientY: number) => {
      const r = wrap.getBoundingClientRect();
      touch.x = (clientX - r.left) * (W / r.width);
      touch.y = (clientY - r.top) * (H / r.height);
      touch.on = true;
      window.clearTimeout(leaveT);
      wake();
    };
    const release = () => {
      window.clearTimeout(leaveT);
      leaveT = window.setTimeout(() => { touch.on = false; wake(); }, 1100);
    };
    const onTS = (e: TouchEvent) => { const t = e.touches[0]; if (t) setTouch(t.clientX, t.clientY); };
    const onTM = (e: TouchEvent) => { const t = e.touches[0]; if (t) setTouch(t.clientX, t.clientY); };
    const onMM = (e: MouseEvent) => setTouch(e.clientX, e.clientY);
    wrap.addEventListener("touchstart", onTS, { passive: true });
    wrap.addEventListener("touchmove", onTM, { passive: true });
    wrap.addEventListener("touchend", release, { passive: true });
    wrap.addEventListener("touchcancel", release, { passive: true });
    wrap.addEventListener("mousemove", onMM);
    wrap.addEventListener("mouseleave", release);

    let onScreen = false, raf = 0, running = false, drawnWithImage = false;
    const K = 0.16, D = 0.65;
    const loop = (now: number) => {
      raf = 0;
      let moving = false;
      for (const dot of dots) {
        if (now >= dot.at) dot.base = rFull;
        let hover = 0;
        if (touch.on) {
          const d = Math.hypot(touch.x - dot.x, touch.y - dot.y);
          const n = Math.max(0, 1 - d / HOVER_R);
          hover = n * n;
        }
        dot.tr = dot.base + (rMax - dot.base) * hover;
        dot.v += (dot.tr - dot.r) * K - dot.v * D;
        dot.r = Math.max(rMin, dot.r + dot.v);
        if (Math.abs(dot.v) > 0.001 || Math.abs(dot.tr - dot.r) > 0.002 || dot.at > now && dot.at !== Infinity) moving = true;
      }
      const imgReady = !!(img.complete && img.naturalWidth && fit);
      let dirty = imgReady !== drawnWithImage;
      if (!dirty) for (const dot of dots) if (Math.abs(dot.r - dot.drawnR) > 0.002) { dirty = true; break; }
      if (dirty) {
        drawnWithImage = imgReady;
        ctx.clearRect(0, 0, W, H);
        for (const dot of dots) {
          dot.drawnR = dot.r;
          ctx.save();
          ctx.translate(dot.x, dot.y);
          ctx.beginPath();
          ctx.arc(0, 0, dot.r, 0, Math.PI * 2);
          if (imgReady && fit) {
            ctx.clip();
            const sw = (dot.r * 2) / fit.s;
            const sx = (dot.x - dot.r - fit.dx) / fit.s;
            const sy = (dot.y - dot.r - fit.dy) / fit.s;
            ctx.drawImage(img, sx, sy, sw, sw, -dot.r, -dot.r, dot.r * 2, dot.r * 2);
          } else {
            ctx.fillStyle = "#d4d4d4";
            ctx.fill();
          }
          ctx.restore();
        }
      }
      if ((moving || dirty || touch.on) && onScreen) raf = requestAnimationFrame(loop);
      else running = false;
    };
    function wake() {
      if (running || !onScreen) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }
    img.addEventListener("load", () => { computeFit(); wake(); });

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        onScreen = e.isIntersecting;
        if (onScreen && !revealAt) {
          revealAt = performance.now();
          const CX = W / 2, CY = H / 2, maxDist = Math.hypot(CX, CY) || 1;
          for (const dot of dots) dot.at = revealAt + 200 + (Math.hypot(dot.x - CX, dot.y - CY) / maxDist) * 750;
        }
        if (onScreen) wake();
      });
    }, { threshold: 0.1 });
    io.observe(wrap);
    const ro = new ResizeObserver(() => build());
    ro.observe(wrap);
    build();

    return () => {
      io.disconnect(); ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(leaveT);
      wrap.removeEventListener("touchstart", onTS);
      wrap.removeEventListener("touchmove", onTM);
      wrap.removeEventListener("touchend", release);
      wrap.removeEventListener("touchcancel", release);
      wrap.removeEventListener("mousemove", onMM);
      wrap.removeEventListener("mouseleave", release);
    };
  }, [src, reduce]);

  if (reduce) {
    return (
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: ratio }}>
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden" style={{ aspectRatio: ratio }} role="img" aria-label={alt}>
      <canvas ref={cvsRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/* ── Let's Connect band: the desktop interactive characters scene, scaled to
   the screen width (the scene is authored at 1920×763). ── */
export function MobileConnect() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState(0);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => setZ(wrap.clientWidth / 1920);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrapRef} className="m-connect relative z-10 w-full overflow-hidden" style={{ height: z ? 763 * z : undefined, aspectRatio: z ? undefined : "1920 / 763" }}>
      <style>{`
        /* keep the authored desktop geometry; the whole scene is zoomed */
        .m-connect #connect .lc-stage { width: 1800px; height: 1040px; }
        .m-connect #connect .lc-heading { font-size: 150px; letter-spacing: -6px; top: 70px; }
        /* all six characters, like desktop (desktop CSS hides two under 480px) */
        .m-connect #connect #char-sun, .m-connect #connect #char-pill { display: inline; }
        /* phones: copy sits under the band (readable size); tablets: in-scene */
        .m-connect #connect .lc-para { display: none; }
        @media (min-width: 768px) {
          .m-connect #connect .lc-para { display: block; font-size: 44px; width: 760px; max-width: 760px; right: 90px; top: 90px; }
          .m-connect-copy-wrap { display: none; }
        }
      `}</style>
      {z > 0 && (
        <div style={{ width: 1920, height: 763, zoom: z }}>
          <LetsConnect />
        </div>
      )}
    </div>
  );
}

/* Let's Connect copy (desktop shows it inside the scene; at phone scale it would
   be unreadably small, so it sits under the scaled band, same wording). */
export function MobileConnectCopy() {
  return (
    <div className="m-connect-copy-wrap relative z-10 bg-[#111111] px-[24px] md:px-[40px] pb-[8px]">
      <p className="m-connect-copy max-w-[560px] font-geist-regular-ss text-[18px] md:text-[22px] leading-[1.55] text-[rgba(244,244,242,0.78)]">
        Have a project in mind? Let&apos;s create something amazing together.
      </p>
    </div>
  );
}

/* ── Tap confetti (desktop click burst from the custom cursor): a quick tap
   anywhere throws 5 tiny dots/stars in the brand colours. Scroll swipes don't. ── */
const CCOLS = ["#FFD60A", "#FF0A8A", "#A58CF4", "#FF5A00"];
export function TapConfetti() {
  useEffect(() => {
    if (reducedMotion()) return;
    let sx = 0, sy = 0, st = 0, moved = false;
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:80;overflow:hidden;";
    document.body.appendChild(layer);
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return;
      sx = t.clientX; sy = t.clientY; st = performance.now(); moved = false;
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return;
      if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) moved = true;
    };
    const onEnd = () => {
      if (moved || performance.now() - st > 350) return;
      for (let k = 0; k < 5; k++) {
        const c = document.createElement("span");
        const size = 8 + Math.random() * 4;
        const star = Math.random() < 0.5;
        const ang = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 26;
        c.style.cssText =
          `position:absolute;left:${sx - size / 2}px;top:${sy - size / 2}px;width:${size}px;height:${size}px;` +
          `background:${CCOLS[(Math.random() * CCOLS.length) | 0]};` +
          (star ? "clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);" : "border-radius:50%;") +
          `--dx:${(Math.cos(ang) * dist).toFixed(1)}px;--dy:${(Math.sin(ang) * dist).toFixed(1)}px;--rot:${((Math.random() * 360) | 0)}deg;` +
          "animation:mTapConfetti 0.6s cubic-bezier(0.22,1,0.36,1) forwards;will-change:transform,opacity;";
        layer.appendChild(c);
        window.setTimeout(() => c.remove(), 650);
      }
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      layer.remove();
    };
  }, []);
  return (
    <style>{`
      @keyframes mTapConfetti {
        from { transform: translate3d(0,0,0) rotate(0deg) scale(1); opacity: 1; }
        to   { transform: translate3d(var(--dx), var(--dy), 0) rotate(var(--rot)) scale(0.4); opacity: 0; }
      }
    `}</style>
  );
}
