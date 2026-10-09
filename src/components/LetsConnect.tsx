import { useEffect, useRef } from "react";

/* ── Colors via CSS variables ───────────────────────────────────────────── */
const CSS_VARS = {
  "--connect-bg": "#111111", /* dark section bg, blends with footer */
  "--lc-bg": "#111111",
  "--lc-heading": "#f4f4f2",
  "--lc-text": "rgba(244,244,242,0.78)",
  "--lc-pink": "#ff0a8a",
  "--lc-purple-light": "#A58CF4",
  "--lc-soft-white": "#FAFAFA",
  "--lc-orange": "#ff5a00",
  "--lc-amber": "#ff9f0a",
  "--lc-yellow": "#ffd60a",
  "--lc-black": "#0D0D0D",
} as React.CSSProperties;

const INK = "#0D0D0D";

export default function LetsConnect() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const svg = section.querySelector("svg");
    const fx = section.querySelector<SVGGElement>(".fx-layer");
    const movers = Array.from(section.querySelectorAll<SVGGElement>(".mover"));
    if (!svg || !fx || movers.length === 0) return;
    const svgEl = svg; // non-null alias for use inside closures

    let io: IntersectionObserver | null = null;
    let pauseIO: IntersectionObserver | null = null;
    let gridIO: IntersectionObserver | null = null;
    const blinkTimers: number[] = [];
    const safetyTimer: number[] = [];
    const cleanups: Array<() => void> = [];
    const noop = () => {};

    /* ── slots: N evenly spaced ground positions (N = visible character count) ── */
    const FULL = [100, 222, 344, 466, 588, 706];
    let slots: number[] = [...FULL];
    const compact = () => window.innerWidth < 480;
    const visMovers = () =>
      movers.filter((m) => getComputedStyle(m).display !== "none");
    const moverAt = (s: number) =>
      visMovers().find((m) => Number(m.dataset.slot) === s);
    const randOther = (from: number, n: number) => {
      if (n < 2) return from;
      let t = from;
      while (t === from) t = Math.floor(Math.random() * n);
      return t;
    };
    const commitX = (m: SVGGElement, x: number) => {
      m.style.transform = `translateX(${x}px)`;
      m.dataset.x = String(x);
    };
    const setSlot = (m: SVGGElement, s: number, instant = false) => {
      if (instant) {
        // cancel this mover's in-flight animations, then snap
        activeAnims
          .filter((a) => (a as unknown as { _m?: unknown })._m === m)
          .forEach((a) => { try { a.cancel(); } catch { /* noop */ } });
        running.delete(m);
        delete m.dataset.queued;
      }
      commitX(m, slots[s] - Number(m.dataset.home));
      m.dataset.slot = String(s);
      m.dataset.cx = String(slots[s]);
    };
    const layoutSlots = () => {
      const vis = visMovers();
      const n = vis.length;
      if (n >= 6) slots = [...FULL];
      else if (n === 0) slots = [];
      else slots = vis.map((_, i) => 100 + (i * (706 - 100)) / Math.max(n - 1, 1));
      vis.forEach((m, i) => setSlot(m, i, true));
    };

    /* ── particles (dust puffs + sparkles), drawn in .fx-layer ── */
    const NS = "http://www.w3.org/2000/svg";
    const dust = (x: number, y: number) => {
      if (reduceMotion) return;
      for (let i = 0; i < 4; i++) {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", String(x + (Math.random() * 28 - 14)));
        c.setAttribute("cy", String(y - 4));
        c.setAttribute("r", String(3 + Math.random() * 2));
        c.setAttribute("fill", "rgba(250,250,250,0.35)");
        fx.appendChild(c);
        const dx = Math.random() * 48 - 24;
        const dy = -(Math.random() * 18);
        const a = c.animate(
          [
            { transform: "translate(0px,0px) scale(1)", opacity: 0.35 },
            { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(0.4)`, opacity: 0 },
          ],
          { duration: 500, easing: "ease-out", fill: "forwards" }
        );
        a.finished.then(() => c.remove()).catch(() => c.remove());
      }
    };
    const sparkles = (x: number, y: number) => {
      if (reduceMotion) return;
      const cols = ["#ffd60a", "#ff0a8a"];
      for (let i = 0; i < 4; i++) {
        const g = document.createElementNS(NS, "g");
        g.setAttribute(
          "transform",
          `translate(${(x + (Math.random() * 80 - 40)).toFixed(1)},${(y + (Math.random() * 60 - 30)).toFixed(1)})`
        );
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", "M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z");
        p.setAttribute("fill", cols[i % 2]);
        (p as SVGPathElement).style.transformBox = "fill-box";
        (p as SVGPathElement).style.transformOrigin = "center";
        g.appendChild(p);
        fx.appendChild(g);
        const a = p.animate(
          [
            { transform: "scale(0)", opacity: 0 },
            { transform: "scale(1.2)", opacity: 1, offset: 0.35 },
            { transform: "scale(0.9)", opacity: 0 },
          ],
          { duration: 700, easing: "ease-out", fill: "forwards" }
        );
        a.finished.then(() => g.remove()).catch(() => g.remove());
      }
    };

    /* ── movement engine (Web Animations API on the OUTER .mover only) ── */
    const running = new Set<SVGGElement>();
    const activeAnims: Animation[] = [];
    const tag = (a: Animation, m: SVGGElement) => {
      (a as unknown as { _m: SVGGElement })._m = m;
      activeAnims.push(a);
      a.finished
        .then(() => {
          const i = activeAnims.indexOf(a);
          if (i >= 0) activeAnims.splice(i, 1);
        })
        .catch(noop);
      return a;
    };
    // finish every in-flight move instantly (keeps everyone in a valid slot)
    const finishMoves = () => {
      activeAnims.slice().forEach((a) => {
        try { a.finish(); } catch { /* noop */ }
      });
    };

    async function runTo(
      m: SVGGElement,
      to: number,
      opts: { hopOver?: boolean; delay?: number } = {}
    ): Promise<void> {
      const n = visMovers().length;
      const from = Number(m.dataset.slot);
      if (to === from || to < 0 || to >= n || running.has(m)) return;
      const fromX = slots[from];
      const toX = slots[to];
      if (fromX === undefined || toX === undefined) return;
      const startX = Number(m.dataset.x || 0);
      const dx = toX - fromX;
      const targetX = startX + dx;
      console.log("slot", from, "to", to); // DEBUG (temporary)
      if (reduceMotion) {
        // click = small jump + instant swap (200ms fade)
        tag(
          m.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], {
            duration: 200,
            fill: "forwards",
          }),
          m
        );
        setSlot(m, to, true);
        return;
      }
      running.add(m);
      try {
        if (opts.delay) await new Promise((r) => setTimeout(r, opts.delay));
        if (opts.hopOver) svgEl.appendChild(m); // mid-jump runner paints on top
        dust(fromX, 486);
        sparkles(fromX, 300);
        // a) anticipation squash (80ms)
        await tag(
          m.animate(
            [
              { transform: `translateX(${startX}px) scale(1,1)` },
              { transform: `translateX(${startX}px) scale(1.08,0.88)` },
            ],
            { duration: 80, easing: "ease-out", fill: "forwards" }
          ),
          m
        ).finished.catch(noop);
        // b) jump up 40px, happy stretch (220ms)
        await tag(
          m.animate(
            [
              { transform: `translateX(${startX}px) scale(1.08,0.88)` },
              { transform: `translateX(${startX}px) translateY(-40px) scale(0.96,1.06)` },
            ],
            { duration: 220, easing: "ease-out", fill: "forwards" }
          ),
          m
        ).finished.catch(noop);
        // c) run to the new slot with 3-4 small hops; legs alternate, body tilts
        const dur = 600 + Math.random() * 300;
        const tilt = dx > 0 ? 4 : -4;
        const steps = 4;
        const kf: Keyframe[] = [];
        for (let i = 0; i <= steps; i++) {
          const x = startX + (dx * i) / steps;
          let y = -40 + (40 * i) / steps;
          if (i > 0 && i < steps && i % 2 === 1) y -= 10; // hops
          if (opts.hopOver && i === 2) y -= 26; // hop over the other character
          kf.push({ transform: `translateX(${x}px) translateY(${y}px) rotate(${tilt}deg)` });
        }
        const legL = m.querySelector(".leg-l");
        const legR = m.querySelector(".leg-r");
        const iters = Math.max(1, Math.ceil(dur / 280));
        const legAnims = [legL, legR].map((leg, i) =>
          leg
            ? tag(
                (leg as SVGGElement).animate(
                  [{ transform: "rotate(16deg)" }, { transform: "rotate(-16deg)" }],
                  {
                    duration: 280,
                    iterations: iters,
                    easing: "ease-in-out",
                    direction: i ? "alternate-reverse" : "alternate",
                  }
                ),
                m
              )
            : null
        );
        await tag(
          m.animate(kf, { duration: dur, easing: "ease-in-out", fill: "forwards" }),
          m
        ).finished.catch(noop);
        legAnims.forEach((a) => {
          try { a && a.cancel(); } catch { /* noop */ }
        });
        // d) landing squash + spring, dust, little one-hand wave
        dust(toX, 486);
        await tag(
          m.animate(
            [
              { transform: `translateX(${targetX}px) rotate(0deg) scale(1.1,0.9)` },
              { transform: `translateX(${targetX}px) scale(1,1)` },
            ],
            { duration: 260, easing: "cubic-bezier(0.34,1.56,0.64,1)", fill: "forwards" }
          ),
          m
        ).finished.catch(noop);
        const armF = m.querySelector(".arm-front");
        if (armF) {
          tag(
            (armF as SVGGElement).animate(
              [{ transform: "rotate(0deg)" }, { transform: "rotate(-26deg)" }, { transform: "rotate(0deg)" }],
              { duration: 400, easing: "ease-in-out" }
            ),
            m
          );
        }
      } finally {
        // always land in a valid slot, even if the animation was cancelled
        commitX(m, targetX);
        m.dataset.slot = String(to);
        m.dataset.cx = String(toX);
        running.delete(m);
        const q = m.dataset.queued;
        if (q !== undefined) {
          delete m.dataset.queued;
          void runTo(m, Number(q));
        }
      }
    }

    // 1-2 neighbors do a small surprised hop as the runner passes
    const hopNeighbors = (m: SVGGElement, to: number) => {
      if (reduceMotion) return;
      visMovers()
        .filter((x) => x !== m && !running.has(x))
        .sort((a, b) => Math.abs(Number(a.dataset.slot) - to) - Math.abs(Number(b.dataset.slot) - to))
        .slice(0, 2)
        .forEach((nb, i) => {
          const nx = Number(nb.dataset.x || 0);
          window.setTimeout(() => {
            tag(
              nb.animate(
                [
                  { transform: `translateX(${nx}px)` },
                  { transform: `translateX(${nx}px) translateY(-10px)` },
                  { transform: `translateX(${nx}px)` },
                ],
                { duration: 300, easing: "ease-out" }
              ),
              nb
            );
          }, 150 + i * 120);
        });
    };

    const shuffleIdx = (arr: number[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // triple-click: big spin jump, then everyone cheers, then a full shuffle
    async function triple(m: SVGGElement) {
      const x = Number(m.dataset.x || 0);
      dust(Number(m.dataset.cx), 486);
      sparkles(Number(m.dataset.cx), 300);
      await tag(
        m.animate(
          [
            { transform: `translateX(${x}px) rotate(0deg)` },
            { transform: `translateX(${x}px) translateY(-70px) rotate(360deg)` },
            { transform: `translateX(${x}px) rotate(360deg)` },
          ],
          { duration: 650, easing: "ease-in-out", fill: "forwards" }
        ),
        m
      ).finished.catch(noop);
      commitX(m, x);
      const vis = [...visMovers()].sort(
        (a, b) => Number(a.dataset.slot) - Number(b.dataset.slot)
      );
      vis.forEach((nb, i) => {
        const nx = Number(nb.dataset.x || 0);
        window.setTimeout(() => {
          tag(
            nb.animate(
              [
                { transform: `translateX(${nx}px)` },
                { transform: `translateX(${nx}px) translateY(-16px)` },
                { transform: `translateX(${nx}px)` },
              ],
              { duration: 320, easing: "ease-out" }
            ),
            nb
          );
        }, i * 80);
      });
      await new Promise((r) => setTimeout(r, vis.length * 80 + 380));
      const perm = shuffleIdx(vis.map((_, i) => i));
      vis.forEach((nb, i) => {
        if (!running.has(nb)) void runTo(nb, perm[i], { delay: i * 60 });
      });
    }

    const clickTimes = new Map<SVGGElement, number[]>();
    const activate = (m: SVGGElement, forcedTo?: number) => {
      const now = performance.now();
      const arr = (clickTimes.get(m) || []).filter((t) => now - t < 2000);
      arr.push(now);
      clickTimes.set(m, arr);
      if (arr.length >= 3 && forcedTo === undefined) {
        clickTimes.set(m, []);
        void triple(m);
        return;
      }
      if (running.has(m)) {
        // queue at most 1 pending move
        if (m.dataset.queued === undefined) {
          const n = visMovers().length;
          m.dataset.queued = String(
            forcedTo !== undefined ? forcedTo : randOther(Number(m.dataset.slot), n)
          );
        }
        return;
      }
      const from = Number(m.dataset.slot);
      const n = visMovers().length;
      const to = forcedTo !== undefined ? forcedTo : randOther(from, n);
      if (to === from || to < 0 || to >= n) return;
      const other = moverAt(to);
      hopNeighbors(m, to);
      void runTo(m, to, { hopOver: true });
      if (other && other !== m) {
        window.setTimeout(() => {
          if (!running.has(other)) void runTo(other, from);
        }, 100);
      }
    };

    const init = () => {
      io?.disconnect();
      pauseIO?.disconnect();
      gridIO?.disconnect();
      blinkTimers.forEach((t) => window.clearTimeout(t));
      blinkTimers.length = 0;
      safetyTimer.forEach((t) => window.clearTimeout(t));
      safetyTimer.length = 0;

      section.classList.add("is-ready");
      layoutSlots();

      // entrance observer: ~30% visible, play once
      let played = section.dataset.played === "1";
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio >= 0.3) {
              section.classList.add("is-visible");
              if (!played) {
                played = true;
                section.dataset.played = "1";
              }
            }
          });
        },
        { threshold: [0, 0.3, 0.6, 1] }
      );
      io.observe(section);

      // pause idle animations off-screen; finish any in-flight move instantly
      pauseIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            const off = !e.isIntersecting;
            section.classList.toggle("is-paused", off);
            if (off) finishMoves();
          });
        },
        { threshold: 0 }
      );
      pauseIO.observe(section);

      // grid lines toggle
      gridIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            document.body.classList.toggle("connect-in-view", e.isIntersecting);
          });
        },
        { threshold: 0.1 }
      );
      gridIO.observe(section);

      // blink: random 3-6s per character, eyes always return to scaleY 1
      // star has closed laughing eyes — doesn't blink
      movers.forEach((m) => {
        const ch = m.querySelector(".lc-char");
        if (!ch || ch.id === "char-star" || reduceMotion) return;
        const eyes = ch.querySelector(".lc-eyes");
        if (!eyes) return;
        const schedule = () => {
          const t = window.setTimeout(() => {
            eyes.classList.add("is-blinking");
            window.setTimeout(() => {
              eyes.classList.remove("is-blinking");
              schedule();
            }, 180);
          }, 3000 + Math.random() * 3000);
          blinkTimers.push(t);
        };
        schedule();
      });

      // safety: if observer never fires, show everything
      safetyTimer.push(
        window.setTimeout(() => {
          if (!section.classList.contains("is-visible")) {
            section.classList.add("is-fallback", "is-visible");
          }
        }, 4000)
      );
    };

    const onPageShow = () => init();
    window.addEventListener("pageshow", onPageShow);

    // eyes follow cursor (dots shift up to 3px, skip on touch; star's closed eyes don't follow)
    const onMouseMove = (e: MouseEvent) => {
      if (isTouch || reduceMotion) return;
      const r = section.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const scaleX = r.width / 900;
      const scaleY = r.height / 520;
      movers.forEach((m) => {
        const ch = m.querySelector<SVGGElement>(".lc-char");
        if (!ch || ch.id === "char-star") return;
        const eyes = ch.querySelector<SVGGElement>(".lc-eyes");
        if (!eyes) return;
        const cx = Number(m.dataset.cx || 0) * scaleX;
        const cy = Number(m.dataset.cy || 0) * scaleY;
        const dx = Math.max(-3, Math.min(3, (mx - cx) * 0.02));
        const dy = Math.max(-3, Math.min(3, (my - cy) * 0.02));
        eyes.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    };
    if (!isTouch) window.addEventListener("mousemove", onMouseMove);

    // scroll parallax: characters drift at different depths (transform only, rAF-throttled)
    const shifts = Array.from(section.querySelectorAll<SVGGElement>(".scroll-shift"));
    let parallaxTicking = false;
    const onScrollParallax = () => {
      if (parallaxTicking || reduceMotion) return;
      parallaxTicking = true;
      requestAnimationFrame(() => {
        parallaxTicking = false;
        const r = section.getBoundingClientRect();
        const progress = (window.innerHeight / 2 - (r.top + r.height / 2)) / window.innerHeight;
        shifts.forEach((el) => {
          const depth = parseFloat(el.dataset.depth || "0.3");
          el.style.transform = `translateY(${(progress * 70 * depth).toFixed(1)}px)`;
        });
      });
    };
    window.addEventListener("scroll", onScrollParallax, { passive: true });
    onScrollParallax();
    cleanups.push(() => window.removeEventListener("scroll", onScrollParallax));

    // hover: jump + cheer, expression gets bigger, neighbors lean away 6px
    movers.forEach((m) => {
      const ch = m.querySelector(".lc-char");
      if (!ch) return;
      const onEnter = () => {
        if (reduceMotion) return;
        ch.classList.add("is-happy");
        movers.forEach((other) => {
          if (other === m) return;
          const ox = Number(other.dataset.cx || 0) - Number(m.dataset.cx || 0);
          other.style.setProperty("--nudge-x", ox > 0 ? "6px" : "-6px");
          other.style.setProperty("--mx", `${Number(other.dataset.x || 0)}px`);
          other.classList.add("is-nudged");
          window.setTimeout(() => other.classList.remove("is-nudged"), 450);
        });
      };
      const onLeave = () => ch.classList.remove("is-happy");
      const onClick = () => activate(m);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(m);
        }
      };
      m.addEventListener("mouseenter", onEnter);
      m.addEventListener("mouseleave", onLeave);
      m.addEventListener("click", onClick);
      m.addEventListener("keydown", onKey);
      cleanups.push(() => {
        m.removeEventListener("mouseenter", onEnter);
        m.removeEventListener("mouseleave", onLeave);
        m.removeEventListener("click", onClick);
        m.removeEventListener("keydown", onKey);
      });
    });

    // click empty ground: nearest character runs toward that spot (snaps to nearest slot)
    const onGroundClick = (e: MouseEvent) => {
      if ((e.target as Element).closest(".mover")) return; // character clicks handled above
      if (reduceMotion) return;
      const r = (svg as SVGSVGElement).getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 900;
      const vis = visMovers();
      if (vis.length === 0) return;
      const nearest = vis.reduce((a, b) =>
        Math.abs(Number(a.dataset.cx) - x) < Math.abs(Number(b.dataset.cx) - x) ? a : b
      );
      let best = 0;
      let bd = Infinity;
      slots.forEach((sx, i) => {
        const d = Math.abs(sx - x);
        if (d < bd) { bd = d; best = i; }
      });
      activate(nearest, best);
    };
    svg.addEventListener("click", onGroundClick);
    cleanups.push(() => svg.removeEventListener("click", onGroundClick));

    // responsive: re-layout slots when crossing the 480px breakpoint
    let lastCompact = compact();
    const onResize = () => {
      const c = compact();
      if (c !== lastCompact) {
        lastCompact = c;
        layoutSlots();
      }
    };
    window.addEventListener("resize", onResize);
    cleanups.push(() => window.removeEventListener("resize", onResize));

    init();

    return () => {
      io?.disconnect();
      pauseIO?.disconnect();
      gridIO?.disconnect();
      document.body.classList.remove("connect-in-view");
      blinkTimers.forEach((t) => window.clearTimeout(t));
      safetyTimer.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      finishMoves();
      fx.querySelectorAll("*").forEach((n) => n.remove());
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <section ref={sectionRef} id="connect" className="lc-section" data-theme="dark" style={CSS_VARS} aria-label="Let's Connect">
      <style>{`
        #connect.lc-section {
          position: relative;
          z-index: 1;
          width: 1920px; height: 763px;
          /* night landscape bg image (purple/dark, matches site) */
          background: var(--connect-bg) url("/Portfolio-Website/assets/lets-connect-bg.webp?v=2") center / cover no-repeat;
          overflow: hidden;
        }
        body.connect-in-view [class*="h-[11035px]"][class*="border-l"] {
          border-left-color: rgba(255,255,255,0.08) !important;
          border-right-color: rgba(255,255,255,0.08) !important;
          pointer-events: none;
        }
        #connect .lc-heading, #connect .lc-para {
          position: absolute;
          z-index: 2;
        }
        #connect .lc-heading {
          left: 106px; top: 78px;
          margin: 0;
          font-family: inherit;
          font-weight: 600;
          font-size: 95px;
          line-height: 1;
          letter-spacing: -3.8px;
          color: #f4f4f2 !important;
          white-space: nowrap;
        }
        #connect .lc-heading .mask { display: block; overflow: hidden; }
        #connect .lc-heading .mask > span { display: block; }
        #connect.is-ready .lc-heading .mask > span { transform: translateY(110%); }
        #connect.is-ready.is-visible .lc-heading .mask > span {
          transform: translateY(0);
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        #connect .lc-para {
          right: 120px; top: 96px;
          width: 520px; max-width: 520px;
          margin: 0;
          font-size: 30px;
          line-height: 1.55;
          color: rgba(244,244,242,0.78) !important;
        }
        #connect.is-ready .lc-para { opacity: 0; transform: translateY(40px); }
        #connect.is-ready.is-visible .lc-para {
          opacity: 1; transform: translateY(0);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s,
                      transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s;
        }
        #connect.is-fallback .lc-heading .mask > span,
        #connect.is-fallback .lc-para { transform: none; opacity: 1; transition: opacity 0.5s ease; }

        /* ── transparent purple forest overlay (above night-sky bg, below characters/text) ── */
        #connect .lc-forest-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: url("/Portfolio-Website/assets/lc-forest-overlay.png") left top / auto 100% repeat-x;
          opacity: 0.5;
          pointer-events: none;
        }

        /* ── character stage ── */
        #connect .lc-stage {
          position: absolute;
          z-index: 1;
          left: 50%; bottom: 0;
          transform: translateX(-50%);
          width: 1800px;
          height: 1040px;
          display: block;
        }
        #connect .lc-stage svg {
          width: 100%; height: 100%; display: block;
          overflow: visible;
        }
        /* mover: outer wrapper, owns ONLY the move transform (Web Animations API) */
        #connect .mover {
          transform-box: fill-box;
          transform-origin: bottom center;
          cursor: pointer;
        }
        #connect .mover .hit {
          fill: transparent;
          stroke: none;
          pointer-events: all;
        }
        #connect .mover:focus { outline: none; }
        #connect .mover:focus-visible .hit {
          stroke: #FFD60A;
          stroke-width: 3;
        }
        /* inner character: entrance + idle live here, never fight the mover */
        #connect .lc-char {
          transform-box: fill-box;
          transform-origin: bottom center;
        }
        #connect.is-ready .lc-char { transform: scaleY(0.5); opacity: 0; }
        #connect.is-ready.is-visible .lc-char {
          animation:
            lc-rise 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            var(--idle-anim, lc-breathe) var(--idle-d, 4s) ease-in-out var(--idle-delay, 0s) infinite;
          animation-delay: var(--rise-delay, 0s), calc(var(--rise-delay, 0s) + 0.8s);
        }
        #connect.is-fallback .lc-char { animation: none; transform: scaleY(1); opacity: 1; }
        /* entrance: squash-and-stretch pop from the ground */
        @keyframes lc-rise {
          0% { transform: scaleY(0.5) scaleX(1.25); opacity: 0; }
          55% { transform: scaleY(1.12) scaleX(0.92); opacity: 1; }
          75% { transform: scaleY(0.96) scaleX(1.03); opacity: 1; }
          100% { transform: scaleY(1) scaleX(1); opacity: 1; }
        }
        /* idle: each character its own rhythm (3-5s, different delays) */
        @keyframes lc-breathe {
          0%, 100% { transform: scaleY(1) translateY(0); }
          50% { transform: scaleY(1.03) translateY(-4px); }
        }
        @keyframes lc-shy-sway {
          0%, 100% { transform: rotate(-2.5deg) translateX(-4px); }
          50% { transform: rotate(2.5deg) translateX(4px); }
        }
        @keyframes lc-giggle {
          0%, 100% { transform: rotate(-5deg) scale(1); }
          50% { transform: rotate(5deg) scale(1.04); }
        }
        @keyframes lc-think {
          0%, 100% { transform: rotate(-1.5deg); }
          50% { transform: rotate(1.5deg); }
        }
        /* arms + legs: transform-box so rotations pivot at the joint */
        #connect .arm-front, #connect .arm-back {
          transform-box: fill-box;
          transform-origin: 50% 15%;
          transition: translate 0.3s ease;
        }
        /* raised arms pivot at the shoulder (bottom of bbox) */
        #connect .arm-up { transform-origin: 50% 85%; }
        #connect .leg-l, #connect .leg-r {
          transform-box: fill-box;
          transform-origin: top center;
        }
        /* per-character idle limb motion */
        #connect .wave-hand { animation: lc-wave-hand 3s ease-in-out infinite; }
        @keyframes lc-wave-hand {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(20deg); }
        }
        #connect .cup-bob { animation: lc-cup-bob 3.5s ease-in-out infinite; }
        @keyframes lc-cup-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        #connect .sun-arm-l, #connect .sun-arm-r { animation: lc-sun-wave 3s ease-in-out infinite; }
        #connect .sun-arm-r { animation-delay: 0.4s; }
        @keyframes lc-sun-wave {
          0%, 100% { transform: rotate(-18deg); }
          50% { transform: rotate(18deg); }
        }
        #connect .cheek-tap { animation: lc-cheek-tap 2.8s ease-in-out infinite; }
        @keyframes lc-cheek-tap {
          0%, 88%, 100% { transform: scale(1); }
          92%, 96% { transform: scale(1.12); }
        }
        #connect .clasp-wiggle { animation: lc-clasp-wiggle 4s ease-in-out infinite; }
        @keyframes lc-clasp-wiggle {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        #connect .crossed-breathe { animation: lc-crossed-breathe 4.2s ease-in-out infinite; }
        @keyframes lc-crossed-breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
        /* pause everything when off-screen (WAAPI moves are finished instantly in JS) */
        #connect.is-paused .lc-char,
        #connect.is-paused .lc-char * { animation-play-state: paused !important; }

        /* eyes: blink (dot eyes scaleY), star's closed eyes don't blink */
        #connect .lc-eyes { transition: transform 0.15s ease-out; }
        #connect .lc-eyes .dots { transition: transform 0.12s ease; transform-box: fill-box; transform-origin: center; }
        #connect .lc-eyes.is-blinking .dots { transform: scaleY(0.1); }
        /* hover: jump 18px + squash landing, arms cheer up, expression gets bigger */
        #connect .lc-char.is-happy { animation: lc-jump 0.55s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes lc-jump {
          0% { transform: translateY(0) scaleY(1); }
          40% { transform: translateY(-18px) scaleY(1.06); }
          70% { transform: translateY(0) scaleY(0.9); } /* feet squash on landing */
          100% { transform: translateY(0) scaleY(1); }
        }
        #connect .lc-char.is-happy .arm-front,
        #connect .lc-char.is-happy .arm-back { translate: 0 -12px; } /* cheer! */
        #connect .mover.is-nudged { animation: lc-nudge 0.4s ease; }
        @keyframes lc-nudge {
          0%, 100% { transform: translateX(var(--mx, 0px)); }
          50% { transform: translateX(calc(var(--mx, 0px) + var(--nudge-x, 6px))); }
        }
        #connect .lc-eyes .happy { opacity: 0; transition: opacity 0.15s ease; }
        #connect .lc-char.is-happy .lc-eyes .happy { opacity: 1; }
        #connect .lc-char.is-happy .lc-eyes .dots { opacity: 0; }
        #connect .lc-char.is-happy .mouth-normal { opacity: 0; }
        #connect .lc-char.is-happy .mouth-happy { opacity: 1; }
        #connect .mouth-happy { opacity: 0; transition: opacity 0.15s ease; }
        #connect .mouth-normal { transition: opacity 0.15s ease; }
        #connect .lc-sparkle { opacity: 0.7; animation: lc-drift 6s ease-in-out infinite; }
        @keyframes lc-drift {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-14px); opacity: 0.9; }
        }
        #connect.is-paused .lc-sparkle { animation-play-state: paused; }
        #connect .fx-layer { pointer-events: none; }

        /* inline CONTACT link */
        #connect .lc-contact {
          position: absolute;
          z-index: 2;
          right: 120px; top: 480px;
          font-family: inherit;
          font-weight: 600;
          font-size: 28px;
          letter-spacing: 0.04em;
          color: #f4f4f2 !important;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 0.25s ease;
        }
        #connect .lc-contact .lc-arrow {
          display: inline-block;
          transition: transform 0.25s ease;
        }
        #connect .lc-contact:hover { color: #ffd60a !important; }
        #connect .lc-contact:hover .lc-arrow { transform: translate(4px, -4px); }
        #connect.is-ready .lc-contact { opacity: 0; transform: translateY(40px); }
        #connect.is-ready.is-visible .lc-contact {
          opacity: 1; transform: translateY(0);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s,
                      transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s,
                      color 0.25s ease;
        }
        #connect.is-fallback .lc-contact { opacity: 1; transform: none; }

        /* mobile: scale group to fit; hide sun + pill below 480px if crowded */
        @media (max-width: 768px) {
          #connect .lc-stage { width: 100vw; height: 35vh; }
        }
        @media (max-width: 480px) {
          #connect #char-sun, #connect #char-pill { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          #connect.is-ready .lc-char, #connect .lc-char { animation: none; transform: scaleY(1); opacity: 1; }
          #connect .arm-front, #connect .arm-back,
          #connect .wave-hand, #connect .cup-bob,
          #connect .sun-arm-l, #connect .sun-arm-r,
          #connect .cheek-tap, #connect .clasp-wiggle,
          #connect .crossed-breathe { animation: none; }
          #connect.is-ready .lc-heading .mask > span { transform: none; transition: none; }
          #connect.is-ready .lc-para, #connect.is-ready .lc-contact { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      <div className="lc-forest-overlay" aria-hidden="true" />
      <h2 className="lc-heading" aria-label="Let's Connect">
        <span className="mask"><span>Let&apos;s Connect</span></span>
      </h2>
      <p className="lc-para">
        Have a project in mind? Let&apos;s create something amazing together.
      </p>
      {/* CONTACT link removed per user request */}

      <div className="lc-stage">
        <svg viewBox="0 0 900 520" role="group" aria-label="A group of friendly cartoon shape characters" style={{ shapeRendering: "geometricPrecision" }}>
          <g fill="rgba(255,255,255,0.25)">
            <circle className="lc-sparkle" cx="120" cy="120" r="4" style={{ animationDelay: "0s" }} />
            <circle className="lc-sparkle" cx="780" cy="90" r="5" style={{ animationDelay: "1.5s" }} />
            <circle className="lc-sparkle" cx="700" cy="200" r="3" style={{ animationDelay: "3s" }} />
            <circle className="lc-sparkle" cx="180" cy="260" r="3.5" style={{ animationDelay: "2s" }} />
          </g>
          <g className="fx-layer" />

          {/* == 1. CIRCLE (#A58CF4) — laughing, one arm waving up == */}
          <g className="mover" data-cursor="poke" data-slot="0" data-home="100" data-cx="100" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the circle character run to a new spot">
            <ellipse cx="100" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-circle" className="lc-char"
               style={{ "--rise-delay": "0s", "--idle-anim": "lc-breathe", "--idle-d": "3.8s", "--idle-delay": "1s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.6">
                <g transform="translate(100,486)">
                  <g className="legs">
            <g className="leg-l">
              <rect x="-29" y="-22" width="14" height="22" rx="7" fill="#A58CF4" />
              <ellipse cx="-22" cy="-5.5" rx="12" ry="5.5" fill="#A58CF4" />
            </g>
            <g className="leg-r">
              <rect x="15" y="-22" width="14" height="22" rx="7" fill="#A58CF4" />
              <ellipse cx="22" cy="-5.5" rx="12" ry="5.5" fill="#A58CF4" />
            </g>
          </g>
                  <g className="arm-back">
                    <path d="M-70,-108 L-72,-64" stroke="#A58CF4" strokeWidth="14" strokeLinecap="round" />
                    <circle cx="-72" cy="-58" r="9" fill="#A58CF4" />
                  </g>
                  <g className="body">
                    <circle cx="0" cy="-100" r="80" fill="#A58CF4" />
                  </g>
                  <g className="face">
                    <g className="lc-eyes">
                      <g className="dots">
                        <circle cx="-22" cy="-118" r="13" fill="#FFFFFF" />
              <circle cx="22" cy="-118" r="13" fill="#FFFFFF" />
              <circle cx="-22" cy="-122" r="6" fill="#0D0D0D" />
              <circle cx="22" cy="-122" r="6" fill="#0D0D0D" />
              <circle cx="-20" cy="-124" r="2" fill="#FFFFFF" />
              <circle cx="24" cy="-124" r="2" fill="#FFFFFF" />
                      </g>
                      <g className="happy" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M-35,-118 Q-22,-130 -9,-118" />
              <path d="M9,-118 Q22,-130 35,-118" />
                      </g>
                    </g>
                    <g className="mouth">
                      <g className="mouth-normal">
              <path d="M-28,-84 Q0,-58 28,-84" stroke="#2B1840" strokeWidth="6" fill="none" strokeLinecap="round" />
            </g>
                      <g className="mouth-happy">
              <ellipse cx="0" cy="-70" rx="25" ry="29" fill="#2B1840" />
              <ellipse cx="0" cy="-56" rx="12" ry="14" fill="#FF5FA2" />
            </g>
                    </g>
                  </g>
                  <g className="arm-front wave-hand arm-up">
                    <g transform="translate(70,-108) rotate(-18)">
                      <path d="M0,0 L0,-40" stroke="#917BD7" strokeWidth="14" strokeLinecap="round" />
                      <circle cx="0" cy="-46" r="9" fill="#917BD7" />
                    </g>
                  </g>
                  <rect className="hit" x="-90" y="-190" width="180" height="194" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* == 2. TRIANGLE (#FFD60A) — cheeky grin, hand cupped by mouth == */}
          <g className="mover" data-cursor="poke" data-slot="1" data-home="222" data-cx="222" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the triangle character run to a new spot">
            <ellipse cx="222" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-triangle" className="lc-char"
               style={{ "--rise-delay": "0.1s", "--idle-anim": "lc-breathe", "--idle-d": "4s", "--idle-delay": "0.9s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.5">
                <g transform="translate(222,486)">
                  <g className="legs">
            <g className="leg-l">
              <rect x="-29" y="-22" width="14" height="22" rx="7" fill="#FFD60A" />
              <ellipse cx="-22" cy="-5.5" rx="12" ry="5.5" fill="#FFD60A" />
            </g>
            <g className="leg-r">
              <rect x="15" y="-22" width="14" height="22" rx="7" fill="#FFD60A" />
              <ellipse cx="22" cy="-5.5" rx="12" ry="5.5" fill="#FFD60A" />
            </g>
          </g>
                  <g className="arm-back">
                    <path d="M-62,-95 L-64,-58" stroke="#FFD60A" strokeWidth="14" strokeLinecap="round" />
                    <circle cx="-64" cy="-52" r="9" fill="#FFD60A" />
                  </g>
                  <g className="body">
                    <path d="M0,-170 L68,-20 Q70,-14 64,-14 L-64,-14 Q-70,-14 -68,-20 Z" fill="#FFD60A" stroke="#FFD60A" strokeWidth="12" strokeLinejoin="round" />
                  </g>
                  <g className="face">
                    <g className="lc-eyes">
                      <g className="dots">
                        <circle cx="-22" cy="-118" r="13" fill="#FFFFFF" />
              <circle cx="22" cy="-118" r="13" fill="#FFFFFF" />
              <circle cx="-17" cy="-118" r="6" fill="#0D0D0D" />
              <circle cx="27" cy="-118" r="6" fill="#0D0D0D" />
              <circle cx="-15" cy="-120" r="2" fill="#FFFFFF" />
              <circle cx="29" cy="-120" r="2" fill="#FFFFFF" />
                      </g>
                      <g className="happy" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M-35,-118 Q-22,-130 -9,-118" />
              <path d="M9,-118 Q22,-130 35,-118" />
                      </g>
                    </g>
                    <g className="mouth">
                      <g className="mouth-normal">
                        <path d="M-32,-80 Q0,-58 32,-80" stroke="#2B1840" strokeWidth="4" fill="none" strokeLinecap="round" />
                        <rect x="-15" y="-76" width="11" height="13" rx="3" fill="#FFFFFF" />
                        <rect x="-3" y="-76" width="11" height="13" rx="3" fill="#FFFFFF" />
                      </g>
                      <g className="mouth-happy">
                        <path d="M-36,-78 Q0,-50 36,-78" stroke="#2B1840" strokeWidth="4" fill="none" strokeLinecap="round" />
                        <rect x="-16" y="-74" width="12" height="14" rx="3" fill="#FFFFFF" />
                        <rect x="-3" y="-74" width="12" height="14" rx="3" fill="#FFFFFF" />
                      </g>
                    </g>
                  </g>
                  <g className="arm-front cup-bob arm-up">
                    <path d="M56,-92 L48,-76 L34,-72" stroke="#E0BC09" strokeWidth="14" strokeLinecap="round" fill="none" />
                    <circle cx="30" cy="-71" r="9" fill="#E0BC09" />
                  </g>
                  <rect className="hit" x="-78" y="-178" width="156" height="182" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* == 3. ROUNDED SQUARE (#FF0A8A) — X eyes laughing, arms out == */}
          <g className="mover" data-cursor="poke" data-slot="2" data-home="344" data-cx="344" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the rounded square character run to a new spot">
            <ellipse cx="344" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-square" className="lc-char"
               style={{ "--rise-delay": "0.2s", "--idle-anim": "lc-shy-sway", "--idle-d": "4.5s", "--idle-delay": "1.2s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.5">
                <g transform="translate(344,486)">
                  <g className="legs">
            <g className="leg-l">
              <rect x="-29" y="-22" width="14" height="22" rx="7" fill="#FF0A8A" />
              <ellipse cx="-22" cy="-5.5" rx="12" ry="5.5" fill="#FF0A8A" />
            </g>
            <g className="leg-r">
              <rect x="15" y="-22" width="14" height="22" rx="7" fill="#FF0A8A" />
              <ellipse cx="22" cy="-5.5" rx="12" ry="5.5" fill="#FF0A8A" />
            </g>
          </g>
                  <g className="arm-back">
                    <path d="M-64,-100 L-92,-94" stroke="#FF0A8A" strokeWidth="14" strokeLinecap="round" />
                    <circle cx="-98" cy="-93" r="9" fill="#FF0A8A" />
                  </g>
                  <g className="body">
                    <rect x="-70" y="-160" width="140" height="140" rx="28" fill="#FF0A8A" />
                  </g>
                  <g className="face">
                    <g className="lc-eyes">
                      <g className="dots" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round">
                        <path d="M-30,-126 L-14,-110" />
                        <path d="M-14,-126 L-30,-110" />
                        <path d="M14,-126 L30,-110" />
                        <path d="M30,-126 L14,-110" />
                      </g>
                      <g className="happy" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M-35,-118 Q-22,-130 -9,-118" />
              <path d="M9,-118 Q22,-130 35,-118" />
                      </g>
                    </g>
                    <g className="mouth">
                      <g className="mouth-normal">
              <path d="M-24,-80 Q0,-60 24,-80" stroke="#2B1840" strokeWidth="6" fill="none" strokeLinecap="round" />
            </g>
                      <g className="mouth-happy">
              <ellipse cx="0" cy="-70" rx="24" ry="26" fill="#2B1840" />
              <ellipse cx="0" cy="-56" rx="12" ry="14" fill="#FF5FA2" />
            </g>
                    </g>
                  </g>
                  <g className="arm-front clasp-wiggle">
                    <path d="M64,-100 L92,-94" stroke="#E00979" strokeWidth="14" strokeLinecap="round" />
                    <circle cx="98" cy="-93" r="9" fill="#E00979" />
                  </g>
                  <rect className="hit" x="-112" y="-168" width="224" height="172" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* == 4. SUN (#FF5A00) — grumpy, fists on sides == */}
          <g className="mover" data-cursor="poke" data-slot="3" data-home="466" data-cx="466" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the sun character run to a new spot">
            <ellipse cx="466" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-sun" className="lc-char"
               style={{ "--rise-delay": "0.3s", "--idle-anim": "lc-breathe", "--idle-d": "3.5s", "--idle-delay": "0.8s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.25">
                <g transform="translate(466,486)">
                  <g className="legs">
                    <g className="leg-l">
                      <rect x="-29" y="-24" width="14" height="26" rx="7" fill="#FF5A00" />
                      <ellipse cx="-22" cy="-5.5" rx="12" ry="5.5" fill="#FF5A00" />
                    </g>
                    <g className="leg-r">
                      <rect x="15" y="-24" width="14" height="26" rx="7" fill="#FF5A00" />
                      <ellipse cx="22" cy="-5.5" rx="12" ry="5.5" fill="#FF5A00" />
                    </g>
                  </g>
                  <g className="arm-back">
                    <g className="sun-arm-l">
                      <path d="M-48,-88 L-60,-66 L-56,-48" stroke="#FF5A00" strokeWidth="14" strokeLinecap="round" fill="none" />
                      <circle cx="-55" cy="-44" r="9" fill="#FF5A00" />
                    </g>
                  </g>
                  <g className="body">
                    <circle cx="0" cy="-105" r="46" fill="#FF5A00" />
                    <path d="M45.4,-112.2L80.0,-105.0L45.4,-97.8Z M42.9,-88.5L69.3,-65.0L35.7,-76.1Z M28.9,-69.3L40.0,-35.7L16.5,-62.1Z M7.2,-59.6L0.0,-25.0L-7.2,-59.6Z M-16.5,-62.1L-40.0,-35.7L-28.9,-69.3Z M-35.7,-76.1L-69.3,-65.0L-42.9,-88.5Z M-45.4,-97.8L-80.0,-105.0L-45.4,-112.2Z M-42.9,-121.5L-69.3,-145.0L-35.7,-133.9Z M-28.9,-140.7L-40.0,-174.3L-16.5,-147.9Z M-7.2,-150.4L-0.0,-185.0L7.2,-150.4Z M16.5,-147.9L40.0,-174.3L28.9,-140.7Z M35.7,-133.9L69.3,-145.0L42.9,-121.5Z" fill="#FF5A00"/>
                  </g>
                  <g className="face">
                    <g className="brows" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round">
                      <path d="M-38,-132 L-16,-124" />
                      <path d="M38,-132 L16,-124" />
                    </g>
                    <g className="lc-eyes">
                      <g className="dots">
                        <circle cx="-22" cy="-110" r="13" fill="#FFFFFF" />
              <circle cx="22" cy="-110" r="13" fill="#FFFFFF" />
              <circle cx="-22" cy="-110" r="6" fill="#0D0D0D" />
              <circle cx="22" cy="-110" r="6" fill="#0D0D0D" />
              <circle cx="-20" cy="-112" r="2" fill="#FFFFFF" />
              <circle cx="24" cy="-112" r="2" fill="#FFFFFF" />
                      </g>
                      <g className="happy" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M-35,-110 Q-22,-122 -9,-110" />
              <path d="M9,-110 Q22,-122 35,-110" />
                      </g>
                    </g>
                    <g className="mouth">
                      <g className="mouth-normal">
                        <path d="M-26,-68 Q0,-82 26,-68" stroke="#2B1840" strokeWidth="4" fill="none" strokeLinecap="round" />
                      </g>
                      <g className="mouth-happy">
                        <ellipse cx="0" cy="-66" rx="12" ry="14" fill="#2B1840" />
                        <ellipse cx="0" cy="-58" rx="7" ry="6" fill="#FF5FA2" />
                      </g>
                    </g>
                  </g>
                  <g className="arm-front">
                    <g className="sun-arm-r">
                      <path d="M48,-88 L60,-66 L56,-48" stroke="#E04F00" strokeWidth="14" strokeLinecap="round" fill="none" />
                      <circle cx="55" cy="-44" r="9" fill="#E04F00" />
                    </g>
                  </g>
                  <rect className="hit" x="-95" y="-195" width="190" height="199" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* == 5. WHITE PILL (#FAFAFA) — surprised, hands near cheeks == */}
          <g className="mover" data-cursor="poke" data-slot="4" data-home="588" data-cx="588" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the white pill character run to a new spot">
            <ellipse cx="588" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-pill" className="lc-char"
               style={{ "--rise-delay": "0.4s", "--idle-anim": "lc-think", "--idle-d": "4.8s", "--idle-delay": "1.3s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.25">
                <g transform="translate(588,486)">
                  <g className="legs">
            <g className="leg-l">
              <rect x="-27" y="-22" width="14" height="22" rx="7" fill="#FAFAFA" />
              <ellipse cx="-20" cy="-5.5" rx="12" ry="5.5" fill="#FAFAFA" />
            </g>
            <g className="leg-r">
              <rect x="13" y="-22" width="14" height="22" rx="7" fill="#FAFAFA" />
              <ellipse cx="20" cy="-5.5" rx="12" ry="5.5" fill="#FAFAFA" />
            </g>
          </g>
                  <g className="arm-back arm-up">
                    <path d="M-38,-108 L-50,-122 L-46,-136" stroke="#FAFAFA" strokeWidth="14" strokeLinecap="round" fill="none" />
                    <circle cx="-45" cy="-140" r="9" fill="#FAFAFA" />
                  </g>
                  <g className="body">
                    <rect x="-45" y="-190" width="90" height="170" rx="45" fill="#FAFAFA" />
                  </g>
                  <g className="face">
                    <g className="brows" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                      <path d="M-36,-150 Q-24,-158 -12,-150" />
                      <path d="M12,-150 Q24,-158 36,-150" />
                    </g>
                    <g className="lc-eyes">
                      <g className="dots">
                        <circle cx="-22" cy="-128" r="13" fill="#FFFFFF" />
              <circle cx="22" cy="-128" r="13" fill="#FFFFFF" />
              <circle cx="-22" cy="-128" r="6" fill="#0D0D0D" />
              <circle cx="22" cy="-128" r="6" fill="#0D0D0D" />
              <circle cx="-20" cy="-130" r="2" fill="#FFFFFF" />
              <circle cx="24" cy="-130" r="2" fill="#FFFFFF" />
                      </g>
                      <g className="happy" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M-35,-128 Q-22,-140 -9,-128" />
              <path d="M9,-128 Q22,-140 35,-128" />
                      </g>
                    </g>
                    <g className="mouth">
                      <g className="mouth-normal">
                        <circle cx="0" cy="-88" r="9" fill="#2B1840" />
                      </g>
                      <g className="mouth-happy">
                        <circle cx="0" cy="-86" r="12" fill="#2B1840" />
                      </g>
                    </g>
                  </g>
                  <g className="arm-front crossed-breathe arm-up">
                    <path d="M38,-108 L50,-122 L46,-136" stroke="#D9D9D9" strokeWidth="14" strokeLinecap="round" fill="none" />
                    <circle cx="45" cy="-140" r="9" fill="#D9D9D9" />
                  </g>
                  <rect className="hit" x="-60" y="-198" width="120" height="202" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* == 6. STAR (#FF9F0A) — giggling, hands on hips == */}
          <g className="mover" data-cursor="poke" data-slot="5" data-home="706" data-cx="706" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the star character run to a new spot">
            <ellipse cx="706" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-star" className="lc-char"
               style={{ "--rise-delay": "0.5s", "--idle-anim": "lc-giggle", "--idle-d": "3.2s", "--idle-delay": "1.1s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.65">
                <g transform="translate(706,486)">
                  <g className="legs">
            <g className="leg-l">
              <rect x="-23" y="-22" width="14" height="22" rx="7" fill="#FF9F0A" />
              <ellipse cx="-16" cy="-5.5" rx="12" ry="5.5" fill="#FF9F0A" />
            </g>
            <g className="leg-r">
              <rect x="9" y="-22" width="14" height="22" rx="7" fill="#FF9F0A" />
              <ellipse cx="16" cy="-5.5" rx="12" ry="5.5" fill="#FF9F0A" />
            </g>
          </g>
                  <g className="arm-back">
                    <path d="M-50,-78 L-64,-62 L-58,-48" stroke="#FF9F0A" strokeWidth="14" strokeLinecap="round" fill="none" />
                    <circle cx="-56" cy="-44" r="9" fill="#FF9F0A" />
                  </g>
                  <g className="body">
                    <path d="M0,-178 L20,-127.5 L74.2,-124.1 L32.3,-89.5 L45.9,-36.9 L0,-66 L-45.9,-36.9 L-32.3,-89.5 L-74.2,-124.1 L-20,-127.5 Z" fill="#FF9F0A" stroke="#FF9F0A" strokeWidth="10" strokeLinejoin="round" />
                  </g>
                  <g className="face">
                    <g className="lc-eyes">
                      <g className="dots" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M-35,-118 Q-22,-130 -9,-118" />
              <path d="M9,-118 Q22,-130 35,-118" />
                      </g>
                      <g className="happy" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M-35,-118 Q-22,-130 -9,-118" />
              <path d="M9,-118 Q22,-130 35,-118" />
                      </g>
                    </g>
                    <g className="mouth">
                      <g className="mouth-normal">
              <path d="M-24,-82 Q0,-62 24,-82" stroke="#2B1840" strokeWidth="6" fill="none" strokeLinecap="round" />
            </g>
                      <g className="mouth-happy">
              <ellipse cx="0" cy="-72" rx="26" ry="22" fill="#2B1840" />
              <ellipse cx="0" cy="-63" rx="11" ry="9" fill="#FF5FA2" />
            </g>
                    </g>
                  </g>
                  <g className="arm-front cheek-tap">
                    <path d="M50,-78 L64,-62 L58,-48" stroke="#E08C09" strokeWidth="14" strokeLinecap="round" fill="none" />
                    <circle cx="56" cy="-44" r="9" fill="#E08C09" />
                  </g>
                  <rect className="hit" x="-80" y="-184" width="160" height="188" rx="24" />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </section>
  );
}
