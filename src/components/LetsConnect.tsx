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
const BLUSH = "rgba(255,10,138,0.3)";

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

      <h2 className="lc-heading" aria-label="Let's Connect">
        <span className="mask"><span>Let&apos;s Connect</span></span>
      </h2>
      <p className="lc-para">
        Have a project in mind? Let&apos;s create something amazing together.
      </p>
      {/* CONTACT link removed per user request */}

      <div className="lc-stage">
        <svg viewBox="0 0 900 520" role="group" aria-label="A group of friendly cartoon shape characters">
          <g fill="rgba(255,255,255,0.25)">
            <circle className="lc-sparkle" cx="120" cy="120" r="4" style={{ animationDelay: "0s" }} />
            <circle className="lc-sparkle" cx="780" cy="90" r="5" style={{ animationDelay: "1.5s" }} />
            <circle className="lc-sparkle" cx="700" cy="200" r="3" style={{ animationDelay: "3s" }} />
            <circle className="lc-sparkle" cx="180" cy="260" r="3.5" style={{ animationDelay: "2s" }} />
          </g>
          <g className="fx-layer" />

          {/* ══ 1. CIRCLE (#A58CF4) — one hand waving, other on hip ══ */}
          <g className="mover" data-slot="0" data-home="100" data-cx="100" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the circle character run to a new spot">
            <ellipse cx="100" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-circle" className="lc-char"
               style={{ "--rise-delay": "0s", "--idle-anim": "lc-breathe", "--idle-d": "3.8s", "--idle-delay": "1s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.6">
                <g transform="translate(100,486)">
                  <g className="legs">
                    <g className="leg-l">
                      <line x1="-20" y1="-34" x2="-20" y2="-8" stroke="#A58CF4" strokeWidth="12" strokeLinecap="round" />
                      <path d="M-35,-14 L-5,-14 L-5,-6 Q-5,0 -13,0 L-27,0 Q-35,0 -35,-8 Z" fill="#A58CF4" />
                      <line x1="-12" y1="-11" x2="-12" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g className="leg-r">
                      <line x1="20" y1="-34" x2="20" y2="-8" stroke="#A58CF4" strokeWidth="12" strokeLinecap="round" />
                      <path d="M5,-14 L35,-14 L35,-6 Q35,0 27,0 L13,0 Q5,0 5,-8 Z" fill="#A58CF4" />
                      <line x1="28" y1="-11" x2="28" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="arm-back">
                    <path d="M-46,-86 Q-58,-66 -54,-48" stroke="#A58CF4" strokeWidth="12" fill="none" strokeLinecap="round" />
                    <circle cx="-54" cy="-44" r="11" fill="#A58CF4" />
                    <path d="M-62,-50 Q-54,-57 -46,-50" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="-58" y1="-38" x2="-60" y2="-32" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <line x1="-51" y1="-37" x2="-52" y2="-31" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <g className="body">
                    <circle cx="0" cy="-94" r="60" fill="#A58CF4" />
                  </g>
                  <g className="face">
                    <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-31,-121 Q-21,-127 -11,-121" />
                      <path d="M11,-121 Q21,-127 31,-121" />
                    </g>
                    <g className="lc-eyes">
                      <g className="dots" fill={INK}>
                        <circle cx="-21" cy="-106" r="4.5" />
                        <circle cx="21" cy="-106" r="4.5" />
                      </g>
                      <g className="happy" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                        <path d="M-29,-106 Q-21,-115 -13,-106" />
                        <path d="M13,-106 Q21,-115 29,-106" />
                      </g>
                    </g>
                    <g className="mouth">
                      <path className="mouth-normal" d="M-30,-70 Q0,-44 30,-70" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                      <path className="mouth-happy" d="M-34,-68 Q0,-36 34,-68" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
                    </g>
                    <g fill={BLUSH}>
                      <ellipse cx="-41" cy="-86" rx="8" ry="5" />
                      <ellipse cx="41" cy="-86" rx="8" ry="5" />
                    </g>
                  </g>
                  <g className="arm-front wave-hand">
                    <path d="M46,-86 Q64,-98 72,-138" stroke="#A58CF4" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M38,-78 Q50,-82 56,-90" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <circle cx="74" cy="-144" r="11" fill="#A58CF4" />
                    <path d="M66,-150 Q74,-157 82,-150" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="70" y1="-138" x2="68" y2="-132" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <line x1="77" y1="-137" x2="77" y2="-131" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <rect className="hit" x="-75" y="-175" width="150" height="179" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ 2. TRIANGLE (#FFD60A) — hand cupped by mouth, shouting ══ */}
          <g className="mover" data-slot="1" data-home="222" data-cx="222" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the triangle character run to a new spot">
            <ellipse cx="222" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-triangle" className="lc-char"
               style={{ "--rise-delay": "0.1s", "--idle-anim": "lc-breathe", "--idle-d": "4s", "--idle-delay": "0.9s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.5">
                <g transform="translate(222,486)">
                  <g className="legs">
                    <g className="leg-l">
                      <line x1="-20" y1="-30" x2="-20" y2="-8" stroke="#FFD60A" strokeWidth="12" strokeLinecap="round" />
                      <path d="M-35,-14 L-5,-14 L-5,-6 Q-5,0 -13,0 L-27,0 Q-35,0 -35,-8 Z" fill="#FFD60A" />
                      <line x1="-12" y1="-11" x2="-12" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g className="leg-r">
                      <line x1="20" y1="-30" x2="20" y2="-8" stroke="#FFD60A" strokeWidth="12" strokeLinecap="round" />
                      <path d="M5,-14 L35,-14 L35,-6 Q35,0 27,0 L13,0 Q5,0 5,-8 Z" fill="#FFD60A" />
                      <line x1="28" y1="-11" x2="28" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="arm-back">
                    <path d="M-42,-70 Q-50,-54 -48,-36" stroke="#FFD60A" strokeWidth="12" fill="none" strokeLinecap="round" />
                    <circle cx="-48" cy="-30" r="11" fill="#FFD60A" />
                    <path d="M-56,-36 Q-48,-43 -40,-36" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="-52" y1="-24" x2="-54" y2="-18" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <line x1="-45" y1="-23" x2="-46" y2="-17" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <g className="body">
                    <path d="M0,-142 L56,-18 L-56,-18 Z" fill="#FFD60A" stroke="#FFD60A" strokeWidth="12" strokeLinejoin="round" />
                  </g>
                  <g className="face">
                    <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-31,-105 Q-21,-113 -11,-105" />
                      <path d="M11,-105 Q21,-113 31,-105" />
                    </g>
                    <g className="lc-eyes">
                      <g className="dots" fill={INK}>
                        <circle cx="-20" cy="-90" r="4.5" />
                        <circle cx="20" cy="-90" r="4.5" />
                      </g>
                      <g className="happy" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                        <path d="M-28,-90 Q-20,-99 -12,-90" />
                        <path d="M12,-90 Q20,-99 28,-90" />
                      </g>
                    </g>
                    <g className="mouth">
                      <ellipse className="mouth-normal" cx="0" cy="-54" rx="9" ry="11" fill={INK} />
                      <ellipse className="mouth-happy" cx="0" cy="-54" rx="12" ry="15" fill={INK} />
                    </g>
                  </g>
                  <g className="arm-front cup-bob">
                    <path d="M40,-70 Q32,-62 27,-55" stroke="#FFD60A" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M34,-64 Q28,-60 24,-56" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <circle cx="25" cy="-51" r="11" fill="#FFD60A" />
                    <path d="M17,-57 Q25,-64 33,-57" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="21" y1="-45" x2="19" y2="-39" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <line x1="28" y1="-44" x2="28" y2="-38" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <rect className="hit" x="-70" y="-160" width="140" height="164" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ 3. ROUNDED SQUARE (#FF0A8A) — shy, hands clasped ══ */}
          <g className="mover" data-slot="2" data-home="344" data-cx="344" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the rounded square character run to a new spot">
            <ellipse cx="344" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-square" className="lc-char"
               style={{ "--rise-delay": "0.2s", "--idle-anim": "lc-shy-sway", "--idle-d": "4.5s", "--idle-delay": "1.2s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.5">
                <g transform="translate(344,486)">
                  <g className="legs">
                    <g className="leg-l">
                      <line x1="-20" y1="-32" x2="-20" y2="-8" stroke="#FF0A8A" strokeWidth="12" strokeLinecap="round" />
                      <path d="M-35,-14 L-5,-14 L-5,-6 Q-5,0 -13,0 L-27,0 Q-35,0 -35,-8 Z" fill="#FF0A8A" />
                      <line x1="-12" y1="-11" x2="-12" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g className="leg-r">
                      <line x1="20" y1="-32" x2="20" y2="-8" stroke="#FF0A8A" strokeWidth="12" strokeLinecap="round" />
                      <path d="M5,-14 L35,-14 L35,-6 Q35,0 27,0 L13,0 Q5,0 5,-8 Z" fill="#FF0A8A" />
                      <line x1="28" y1="-11" x2="28" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="arm-back">
                    <path d="M-44,-76 Q-28,-60 -14,-52" stroke="#FF0A8A" strokeWidth="12" fill="none" strokeLinecap="round" />
                  </g>
                  <g className="body">
                    <rect x="-54" y="-146" width="108" height="128" rx="26" fill="#FF0A8A" />
                  </g>
                  <g className="face">
                    <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-21,-102 Q-13,-106 -5,-102" />
                      <path d="M13,-102 Q21,-106 29,-102" />
                    </g>
                    <g className="lc-eyes">
                      <g className="dots" fill={INK}>
                        <circle cx="-13" cy="-90" r="4.5" />
                        <circle cx="21" cy="-90" r="4.5" />
                      </g>
                      <g className="happy" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                        <path d="M-21,-90 Q-13,-99 -5,-90" />
                        <path d="M13,-90 Q21,-99 29,-90" />
                      </g>
                    </g>
                    <g className="mouth">
                      <path className="mouth-normal" d="M-13,-55 Q1,-47 15,-55" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path className="mouth-happy" d="M-15,-53 Q1,-41 17,-53" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="arm-front">
                    <path d="M44,-76 Q28,-60 14,-52" stroke="#FF0A8A" strokeWidth="12" fill="none" strokeLinecap="round" />
                    <g className="clasp-wiggle">
                      <circle cx="-8" cy="-48" r="11" fill="#FF0A8A" />
                      <circle cx="8" cy="-48" r="11" fill="#FF0A8A" />
                      <path d="M-16,-54 Q-8,-61 0,-54" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <path d="M0,-54 Q8,-61 16,-54" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <line x1="-8" y1="-42" x2="-8" y2="-36" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                      <line x1="8" y1="-42" x2="8" y2="-36" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </g>
                  <rect className="hit" x="-68" y="-164" width="136" height="168" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ 4. SUN (#FF5A00) — both arms raised high, waving ══ */}
          <g className="mover" data-slot="3" data-home="466" data-cx="466" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the sun character run to a new spot">
            <ellipse cx="466" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-sun" className="lc-char"
               style={{ "--rise-delay": "0.3s", "--idle-anim": "lc-breathe", "--idle-d": "3.5s", "--idle-delay": "0.8s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.25">
                <g transform="translate(466,486)">
                  <g className="legs">
                    <g className="leg-l">
                      <line x1="-18" y1="-30" x2="-18" y2="-8" stroke="#FF5A00" strokeWidth="12" strokeLinecap="round" />
                      <path d="M-35,-14 L-5,-14 L-5,-6 Q-5,0 -13,0 L-27,0 Q-35,0 -35,-8 Z" fill="#FF5A00" />
                      <line x1="-12" y1="-11" x2="-12" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g className="leg-r">
                      <line x1="18" y1="-30" x2="18" y2="-8" stroke="#FF5A00" strokeWidth="12" strokeLinecap="round" />
                      <path d="M5,-14 L35,-14 L35,-6 Q35,0 27,0 L13,0 Q5,0 5,-8 Z" fill="#FF5A00" />
                      <line x1="28" y1="-11" x2="28" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="body">
                    <circle cx="0" cy="-104" r="60" fill="#FF5A00" />
                    <g fill="#FF5A00">
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
                        <path key={a} d="M-13,-158 L13,-158 L0,-184 Z" transform={`rotate(${a} 0 -104)`} />
                      ))}
                    </g>
                  </g>
                  <g className="face">
                    <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-33,-124 Q-23,-130 -13,-124" />
                      <path d="M13,-124 Q23,-130 33,-124" />
                    </g>
                    <g className="lc-eyes">
                      <g className="dots" fill={INK}>
                        <circle cx="-22" cy="-110" r="4.5" />
                        <circle cx="22" cy="-110" r="4.5" />
                      </g>
                      <g className="happy" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                        <path d="M-30,-110 Q-22,-119 -14,-110" />
                        <path d="M14,-110 Q22,-119 30,-110" />
                      </g>
                    </g>
                    <g className="mouth">
                      <path className="mouth-normal" d="M-33,-68 Q0,-36 33,-68" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                      <path className="mouth-happy" d="M-37,-66 Q0,-28 37,-66" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
                    </g>
                    <g fill={BLUSH}>
                      <ellipse cx="-42" cy="-88" rx="8" ry="5" />
                      <ellipse cx="42" cy="-88" rx="8" ry="5" />
                    </g>
                  </g>
                  <g className="arm-front">
                    <g className="sun-arm-l">
                      <path d="M-46,-96 Q-62,-118 -70,-156" stroke="#FF5A00" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M-40,-88 Q-50,-94 -54,-104" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <circle cx="-72" cy="-162" r="11" fill="#FF5A00" />
                      <path d="M-80,-168 Q-72,-175 -64,-168" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <line x1="-76" y1="-156" x2="-78" y2="-150" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                      <line x1="-69" y1="-155" x2="-69" y2="-149" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g className="sun-arm-r">
                      <path d="M46,-96 Q62,-118 70,-156" stroke="#FF5A00" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M40,-88 Q50,-94 54,-104" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <circle cx="72" cy="-162" r="11" fill="#FF5A00" />
                      <path d="M64,-168 Q72,-175 80,-168" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <line x1="76" y1="-156" x2="78" y2="-150" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                      <line x1="69" y1="-155" x2="69" y2="-149" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </g>
                  <rect className="hit" x="-95" y="-200" width="190" height="204" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ 5. WHITE PILL (#FAFAFA) — cool, arms crossed ══ */}
          <g className="mover" data-slot="4" data-home="588" data-cx="588" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the white pill character run to a new spot">
            <ellipse cx="588" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-pill" className="lc-char"
               style={{ "--rise-delay": "0.4s", "--idle-anim": "lc-think", "--idle-d": "4.8s", "--idle-delay": "1.3s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.25">
                <g transform="translate(588,486)">
                  <g className="legs">
                    <g className="leg-l">
                      <line x1="-18" y1="-32" x2="-18" y2="-8" stroke="#FAFAFA" strokeWidth="12" strokeLinecap="round" />
                      <path d="M-35,-14 L-5,-14 L-5,-6 Q-5,0 -13,0 L-27,0 Q-35,0 -35,-8 Z" fill="#FAFAFA" />
                      <line x1="-12" y1="-11" x2="-12" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g className="leg-r">
                      <line x1="18" y1="-32" x2="18" y2="-8" stroke="#FAFAFA" strokeWidth="12" strokeLinecap="round" />
                      <path d="M5,-14 L35,-14 L35,-6 Q35,0 27,0 L13,0 Q5,0 5,-8 Z" fill="#FAFAFA" />
                      <line x1="28" y1="-11" x2="28" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="arm-back crossed-breathe">
                    <path d="M-34,-88 Q-8,-76 20,-64" stroke="#FAFAFA" strokeWidth="12" fill="none" strokeLinecap="round" />
                    <circle cx="24" cy="-62" r="11" fill="#FAFAFA" />
                    <path d="M16,-68 Q24,-75 32,-68" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="20" y1="-56" x2="18" y2="-50" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <line x1="27" y1="-55" x2="27" y2="-49" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <g className="body">
                    <rect x="-40" y="-180" width="80" height="162" rx="40" fill="#FAFAFA" />
                  </g>
                  <g className="face">
                    <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-29,-123 Q-19,-128 -9,-123" />
                      <path d="M9,-131 Q19,-137 29,-131" />
                    </g>
                    <g className="lc-eyes">
                      <g className="dots" fill={INK}>
                        <circle cx="-18" cy="-108" r="4.5" />
                        <circle cx="18" cy="-108" r="4.5" />
                      </g>
                      <g className="happy" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                        <path d="M-26,-108 Q-18,-117 -10,-108" />
                        <path d="M10,-108 Q18,-117 26,-108" />
                      </g>
                    </g>
                    <g className="mouth">
                      <path className="mouth-normal" d="M-14,-68 Q0,-60 14,-68" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path className="mouth-happy" d="M-16,-66 Q0,-54 16,-66" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="arm-front crossed-breathe">
                    <path d="M34,-88 Q8,-76 -20,-64" stroke="#FAFAFA" strokeWidth="12" fill="none" strokeLinecap="round" />
                    <path d="M-10,-80 L8,-72" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M-4,-66 L12,-74" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="-24" cy="-62" r="11" fill="#FAFAFA" />
                    <path d="M-32,-68 Q-24,-75 -16,-68" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="-28" y1="-56" x2="-30" y2="-50" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <line x1="-21" y1="-55" x2="-21" y2="-49" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <rect className="hit" x="-58" y="-196" width="116" height="200" rx="24" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ 6. STAR (#FF9F0A) — giggling, hands on cheeks ══ */}
          <g className="mover" data-slot="5" data-home="706" data-cx="706" data-cy="486" data-x="0"
             tabIndex={0} role="button" aria-label="Make the star character run to a new spot">
            <ellipse cx="706" cy="490" rx="46" ry="7" fill="rgba(13,13,13,0.25)" />
            <g id="char-star" className="lc-char"
               style={{ "--rise-delay": "0.5s", "--idle-anim": "lc-giggle", "--idle-d": "3.2s", "--idle-delay": "1.1s" } as React.CSSProperties}>
              <g className="scroll-shift" data-depth="0.65">
                <g transform="translate(706,486)">
                  <g className="legs">
                    <g className="leg-l">
                      <line x1="-14" y1="-34" x2="-14" y2="-8" stroke="#FF9F0A" strokeWidth="12" strokeLinecap="round" />
                      <path d="M-31,-14 L-1,-14 L-1,-6 Q-1,0 -9,0 L-23,0 Q-31,0 -31,-8 Z" fill="#FF9F0A" />
                      <line x1="-8" y1="-11" x2="-8" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                    <g className="leg-r">
                      <line x1="14" y1="-34" x2="14" y2="-8" stroke="#FF9F0A" strokeWidth="12" strokeLinecap="round" />
                      <path d="M1,-14 L31,-14 L31,-6 Q31,0 23,0 L9,0 Q1,0 1,-8 Z" fill="#FF9F0A" />
                      <line x1="24" y1="-11" x2="24" y2="-3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </g>
                  <g className="body">
                    <path d="M0,-130 L13,-95 L50,-92 L21,-68 L31,-32 L0,-52 L-31,-32 L-21,-68 L-50,-92 L-13,-95 Z"
                          fill="#FF9F0A" stroke="#FF9F0A" strokeWidth="10" strokeLinejoin="round" />
                  </g>
                  <g className="face">
                    <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-29,-112 Q-21,-117 -13,-112" />
                      <path d="M13,-112 Q21,-117 29,-112" />
                    </g>
                    <g className="lc-eyes">
                      <g className="dots" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
                        <path d="M-29,-96 Q-21,-106 -13,-96" />
                        <path d="M13,-96 Q21,-106 29,-96" />
                      </g>
                      <g className="happy" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none">
                        <path d="M-31,-96 Q-21,-108 -11,-96" />
                        <path d="M11,-96 Q21,-108 31,-96" />
                      </g>
                    </g>
                    <g className="mouth">
                      <ellipse className="mouth-normal" cx="0" cy="-54" rx="12" ry="14" fill={INK} />
                      <ellipse className="mouth-happy" cx="0" cy="-54" rx="15" ry="18" fill={INK} />
                    </g>
                    <g fill={BLUSH}>
                      <ellipse cx="-34" cy="-78" rx="7" ry="4.5" />
                      <ellipse cx="34" cy="-78" rx="7" ry="4.5" />
                    </g>
                  </g>
                  <g className="arm-front cheek-tap">
                    <path d="M-36,-68 Q-32,-58 -28,-52" stroke="#FF9F0A" strokeWidth="12" fill="none" strokeLinecap="round" />
                    <circle cx="-26" cy="-48" r="11" fill="#FF9F0A" />
                    <path d="M-34,-54 Q-26,-61 -18,-54" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="-30" y1="-42" x2="-32" y2="-36" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <line x1="-23" y1="-41" x2="-23" y2="-35" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <path d="M36,-68 Q32,-58 28,-52" stroke="#FF9F0A" strokeWidth="12" fill="none" strokeLinecap="round" />
                    <circle cx="26" cy="-48" r="11" fill="#FF9F0A" />
                    <path d="M18,-54 Q26,-61 34,-54" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="30" y1="-42" x2="32" y2="-36" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                    <line x1="23" y1="-41" x2="23" y2="-35" stroke={INK} strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <rect className="hit" x="-66" y="-146" width="132" height="150" rx="24" />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </section>
  );
}
