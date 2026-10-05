import Frame9 from "@/imports/Frame9";
import Frame5 from "@/imports/Frame5";
import Frame7 from "@/imports/Frame7";
import ProjectPage from "@/components/ProjectPage";
import NodaliqSite from "@/components/NodaliqSite";
import Preloader from "@/components/Preloader";
import MobileSite from "@/components/MobileSite";
import { projects, getProjectById, getNextProject, getProjectCanvasH } from "@/data/projects";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The imported Figma frame is authored at a fixed canvas size.
// We scale the whole canvas to the viewport width so it fits every
// screen (desktop, tablet, mobile) while keeping the exact layout.
const BASE_W = 1920;
const BASE_H = 11836;
// The About page (Frame5) is authored at the same width. It is a separate
// view reached from the navbar, not stacked below the home page. The imported
// grid columns run the full 7272px artboard, but the dark footer ends at
// ~7037px — clip the canvas there so no empty grey space trails the footer.
const ABOUT_H = 5893;
const WORK_H = 8795;
const HERO_TOP = 420;
const HERO_SIZE = 669;
const SCROLL_DOWN_BOTTOM_INSET = 14;

type View = "home" | "about" | "work" | "project" | "nodaliq-site";

export default function App() {
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [showPreloader, setShowPreloader] = useState(true);
  const [view, setView] = useState<View>("home");
  const [currentProjectId, setCurrentProjectId] = useState<string>("voyage-studio");
  const canvasRef = useRef<HTMLDivElement>(null);

  const navigateToProject = (id: string) => {
    setCurrentProjectId(id);
    setView("project");
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const navigateToNodaliqSite = () => {
    // Open the NODALiQ site in a new tab via hash routing
    const base = window.location.href.split("#")[0];
    window.open(base + "#nodaliq-site", "_blank");
  };

  // Detect hash-based routing for the NODALiQ site (opened in new tab)
  useEffect(() => {
    if (window.location.hash === "#nodaliq-site") {
      setView("nodaliq-site");
    }
  }, []);

  // ── Browser back/forward support ─────────────────────────────────────────
  // Navigation between views is driven by React state, so without pushing to the
  // history stack the browser's Back button would leave the site entirely on the
  // first press. We push a history entry on every view change and restore the
  // matching view on popstate, so Back walks back through the visited pages.
  const isPopping = useRef(false);
  const firstHistoryRun = useRef(true);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      isPopping.current = true;
      const s = e.state as { view?: View; projectId?: string } | null;
      if (s?.view) {
        setView(s.view);
        if (s.projectId) setCurrentProjectId(s.projectId);
      } else {
        setView("home");
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", onPop);
    // Seed the current entry so the first Back has somewhere to return to.
    window.history.replaceState({ view, projectId: currentProjectId }, "");
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    // Skip the initial mount (already seeded via replaceState above) and any
    // change that originated from a popstate event (that view came FROM history).
    if (firstHistoryRun.current) { firstHistoryRun.current = false; return; }
    if (isPopping.current) { isPopping.current = false; return; }
    window.history.pushState({ view, projectId: currentProjectId }, "");
  }, [view, currentProjectId]);

  useEffect(() => {
    // `innerWidth` includes the vertical scrollbar. The artwork is then a
    // scrollbar-width too wide and its right-hand gutter gets clipped. Use the
    // layout viewport instead so the canvas and its containing block agree.
    const update = () => {
      setScale(Math.min(1, document.documentElement.clientWidth / BASE_W));
      setIsMobile(window.innerWidth < 768);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // Wire the imported navbar links (present in both frames) to switch views
  // without editing the imported source. Runs whenever the active view or
  // scale changes so the handlers rebind to the freshly-rendered canvas.
  // useLayoutEffect ensures DOM mutations (nav slider rebuild, HIRE arrow clone)
  // happen synchronously before the browser paints — eliminating the visible jerk
  // on page transitions.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cleanups: Array<() => void> = [];

    // ── Navbar: vertical text-slide on hover, routing on click ──────────────────
    // The Figma import already ships the mechanism for a clean roll-up hover:
    // each link has the visible <p> plus an absolute duplicate one line below,
    // sitting inside an overflow-clip window. We simply translate that stack up
    // by one line so the duplicate rolls into view. Because both copies are the
    // same word, the text is *always* on screen — nothing ever disappears.
    // (The old 3D navFlipY spin rotated the text edge-on, which is what made it
    // vanish on hover.) WORK ships as a single <p>, so we synthesize a matching
    // duplicate for it so all three links animate identically.
    const wireNavLink = (labelText: string, target?: View) => {
      Array.from(canvas.querySelectorAll("p"))
        .filter((p) => p.textContent?.trim() === labelText && !p.className.includes("absolute"))
        .forEach((p) => {
          const linkEl = (p.closest('[data-name="Link"]') as HTMLElement) ?? p;
          linkEl.style.cursor = "pointer";
          linkEl.classList.remove("hover:opacity-60");

          // offsetHeight is in CSS pixels — unaffected by the canvas CSS zoom.
          // getBoundingClientRect returns viewport pixels (zoom × CSS px) which
          // would produce the wrong translateY distance at scale < 1.
          const cs = window.getComputedStyle(p);
          const lineH = p.offsetHeight || 26;

          // Snapshot so cleanup can fully restore the original DOM, letting the
          // effect re-wire correctly when scale changes.
          const savedHTML      = linkEl.innerHTML;
          const savedOverflow  = linkEl.style.overflow;
          const savedPadding   = linkEl.style.padding;
          const savedAlign     = linkEl.style.alignItems;
          const savedDisplay   = linkEl.style.display;

          // Dedicated clip window — exact line height, no padding — so clipping
          // is independent of the outer link element's padding / alignment.
          const clip = document.createElement("div");
          clip.style.cssText = `height:${lineH}px;overflow:hidden;position:relative;`;

          const slider = document.createElement("div");
          slider.style.cssText = [
            "display:flex",
            "flex-direction:column",
            "transition:transform 0.55s cubic-bezier(0.77,0,0.18,1)",
            "will-change:transform",
          ].join(";");

          const makeWord = () => {
            const el = document.createElement("span");
            el.textContent = labelText;
            el.style.cssText = [
              "display:block",
              `font-size:${cs.fontSize}`,
              `font-family:${cs.fontFamily}`,
              `font-weight:${cs.fontWeight}`,
              `letter-spacing:${cs.letterSpacing}`,
              `text-transform:${cs.textTransform}`,
              `color:${cs.color}`,
              `height:${lineH}px`,
              `line-height:${lineH}px`,
              "white-space:nowrap",
              "flex-shrink:0",
            ].join(";");
            return el;
          };

          slider.appendChild(makeWord());
          slider.appendChild(makeWord());
          clip.appendChild(slider);

          linkEl.innerHTML = "";
          linkEl.style.display   = "flex";
          linkEl.style.alignItems = "center";
          linkEl.style.padding   = "0";
          linkEl.style.overflow  = "visible";
          linkEl.appendChild(clip);

          const onEnter = () => { slider.style.transform = `translateY(-${lineH}px)`; };
          const onLeave = () => { slider.style.transform = ""; };
          linkEl.addEventListener("mouseenter", onEnter);
          linkEl.addEventListener("mouseleave", onLeave);

          cleanups.push(() => {
            linkEl.removeEventListener("mouseenter", onEnter);
            linkEl.removeEventListener("mouseleave", onLeave);
            linkEl.innerHTML    = savedHTML;
            linkEl.style.overflow  = savedOverflow;
            linkEl.style.padding   = savedPadding;
            linkEl.style.alignItems = savedAlign;
            linkEl.style.display   = savedDisplay;
          });

          if (target) {
            const onClick = () => { setView(target); window.scrollTo({ top: 0, behavior: 'instant' }); };
            linkEl.addEventListener("click", onClick);
            cleanups.push(() => linkEl.removeEventListener("click", onClick));
          }
        });
    };

    wireNavLink("Home", "home");
    wireNavLink("About", "about");
    wireNavLink("WORK", "work"); // all-caps in the Figma import

    // Abdul logo → reload the page (returns to home with fresh animations).
    Array.from(canvas.querySelectorAll("p"))
      .filter((p) => p.textContent?.trim() === "Abdul")
      .forEach((p) => {
        const el = (p.closest('[data-name="Link"]') as HTMLElement) ?? p;
        el.style.cursor = "pointer";
        const onClick = () => { window.location.reload(); };
        el.addEventListener("click", onClick);
        cleanups.push(() => el.removeEventListener("click", onClick));
      });

    // ── Dark CTA buttons: diagonal slide-up in arrow direction + subtle background color shift ──
    Array.from(canvas.querySelectorAll<HTMLElement>("div"))
      .filter((el) => el.className.includes("bg-[#1e1e1f]"))
      .forEach((btn) => {
        btn.style.transition =
          "background-color 300ms cubic-bezier(0.22, 1, 0.36, 1), transform 350ms cubic-bezier(0.22, 1, 0.36, 1)";

        const arrowBox = Array.from(btn.querySelectorAll<HTMLElement>("div")).find(
          (d) => d.className.includes("overflow-clip") && d.className.includes("w-[18px]"),
        );

        if (arrowBox) {
          // Ensure two arrow children for the slide effect.
          // Figma imports typically ship one arrow — clone it so the second
          // can enter from below while the first exits upward.
          if (arrowBox.children.length === 1) {
            const clone = arrowBox.children[0].cloneNode(true) as HTMLElement;
            arrowBox.appendChild(clone);
          }
          arrowBox.style.position = "relative";
          arrowBox.style.overflow = "hidden";

          const [a1, a2] = [
            arrowBox.children[0] as HTMLElement,
            arrowBox.children[1] as HTMLElement,
          ];
          // Position both arrows absolutely so they stack in the same box.
          [a1, a2].forEach((a) => {
            a.style.position = "absolute";
            a.style.inset = "0";
            a.style.display = "flex";
            a.style.alignItems = "center";
            a.style.justifyContent = "center";
            a.style.transition = "transform 0.45s cubic-bezier(0.77, 0, 0.18, 1)";
          });
          // a1 visible at center; a2 waits at bottom-left (SW)
          a1.style.transform = "translate(0, 0)";
          a2.style.transform = "translate(-120%, 120%)";
        }

        const onEnter = () => {
          btn.style.backgroundColor = "#38383a";
          if (arrowBox && arrowBox.children.length >= 2) {
            (arrowBox.children[0] as HTMLElement).style.transform = "translate(120%, -120%)";
            (arrowBox.children[1] as HTMLElement).style.transform = "translate(0, 0)";
          }
        };
        const onLeave = () => {
          btn.style.backgroundColor = "";
          if (arrowBox && arrowBox.children.length >= 2) {
            (arrowBox.children[0] as HTMLElement).style.transform = "translate(0, 0)";
            (arrowBox.children[1] as HTMLElement).style.transform = "translate(-120%, 120%)";
          }
        };
        btn.addEventListener("mouseenter", onEnter);
        btn.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          btn.removeEventListener("mouseenter", onEnter);
          btn.removeEventListener("mouseleave", onLeave);
          btn.style.backgroundColor = "";
          btn.style.transition = "";
          if (arrowBox) {
            // Remove the cloned second arrow on cleanup
            if (arrowBox.children.length >= 2) {
              arrowBox.children[1].remove();
            }
            if (arrowBox.children[0]) {
              const a = arrowBox.children[0] as HTMLElement;
              a.style.transform = "";
              a.style.transition = "";
              a.style.position = "";
              a.style.inset = "";
              a.style.display = "";
              a.style.alignItems = "";
              a.style.justifyContent = "";
            }
            arrowBox.style.position = "";
            arrowBox.style.overflow = "";
          }
        });
      });

    // ── White HIRE button (project page) — same arrow animation, white palette ──
    Array.from(canvas.querySelectorAll<HTMLElement>("[data-hire-btn='white']")).forEach((btn) => {
      btn.style.transition = "background-color 300ms cubic-bezier(0.22, 1, 0.36, 1)";

      const arrowBox = Array.from(btn.querySelectorAll<HTMLElement>("div")).find(
        (d) => d.className.includes("overflow-clip") && d.className.includes("w-[18px]"),
      );

      if (arrowBox) {
        if (arrowBox.children.length === 1) {
          const clone = arrowBox.children[0].cloneNode(true) as HTMLElement;
          arrowBox.appendChild(clone);
        }
        arrowBox.style.position = "relative";
        arrowBox.style.overflow = "hidden";

        const [a1, a2] = [
          arrowBox.children[0] as HTMLElement,
          arrowBox.children[1] as HTMLElement,
        ];
        [a1, a2].forEach((a) => {
          a.style.position = "absolute";
          a.style.inset = "0";
          a.style.display = "flex";
          a.style.alignItems = "center";
          a.style.justifyContent = "center";
          a.style.transition = "transform 0.45s cubic-bezier(0.77, 0, 0.18, 1)";
        });
        a1.style.transform = "translate(0, 0)";
        a2.style.transform = "translate(-120%, 120%)";
      }

      const onEnter = () => {
        btn.style.backgroundColor = "rgba(242,242,242,0.85)";
        if (arrowBox && arrowBox.children.length >= 2) {
          (arrowBox.children[0] as HTMLElement).style.transform = "translate(120%, -120%)";
          (arrowBox.children[1] as HTMLElement).style.transform = "translate(0, 0)";
        }
      };
      const onLeave = () => {
        btn.style.backgroundColor = "";
        if (arrowBox && arrowBox.children.length >= 2) {
          (arrowBox.children[0] as HTMLElement).style.transform = "translate(0, 0)";
          (arrowBox.children[1] as HTMLElement).style.transform = "translate(-120%, 120%)";
        }
      };
      btn.addEventListener("mouseenter", onEnter);
      btn.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        btn.removeEventListener("mouseenter", onEnter);
        btn.removeEventListener("mouseleave", onLeave);
        btn.style.backgroundColor = "";
        btn.style.transition = "";
        if (arrowBox) {
          if (arrowBox.children.length >= 2) arrowBox.children[1].remove();
          if (arrowBox.children[0]) {
            const a = arrowBox.children[0] as HTMLElement;
            a.style.transform = ""; a.style.transition = ""; a.style.position = "";
            a.style.inset = ""; a.style.display = ""; a.style.alignItems = ""; a.style.justifyContent = "";
          }
          arrowBox.style.position = ""; arrowBox.style.overflow = "";
        }
      });
    });

    // ── HIRE buttons: navbar → scroll to footer; project-page buttons → mailto ──
    const CONTACT = "mailto:abdul@thevoyage.studio";
    Array.from(canvas.querySelectorAll<HTMLElement>("p"))
      .filter((p) => p.textContent?.trim() === "HIRE")
      .forEach((p) => {
        // Project-page white HIRE buttons are marked with data-hire-btn="white".
        // Navbar HIRE lives inside a [data-name="Link"] without that marker.
        const hireBtn = p.closest("[data-hire-btn]") as HTMLElement | null;
        const navLink = p.closest('[data-name="Link"]') as HTMLElement | null;
        const btn = hireBtn ?? navLink ?? (p.parentElement as HTMLElement);
        if (!btn) return;
        btn.style.cursor = "pointer";
        const isNavHire = !hireBtn;
        const onClick = () => {
          if (isNavHire) {
            // Scroll to bottom of canvas where the footer/contact section lives
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          } else {
            window.open(CONTACT, "_blank");
          }
        };
        btn.addEventListener("click", onClick);
        cleanups.push(() => { btn.removeEventListener("click", onClick); btn.style.cursor = ""; });
      });

    // ── LEARN MORE button → navigate to About page ──
    Array.from(canvas.querySelectorAll<HTMLElement>("p"))
      .filter((p) => p.textContent?.trim() === "LEARN MORE")
      .forEach((p) => {
        // Walk up to the dark pill [data-name="Link"] container (the whole button)
        const btn = (p.closest('[data-name="Link"]') as HTMLElement) ?? (p.closest('[data-name="Container"]') as HTMLElement) ?? p.parentElement as HTMLElement;
        if (!btn) return;
        btn.style.cursor = "pointer";

        // Find the dark bg div inside the button and apply hover transition
        const darkDiv = Array.from(btn.querySelectorAll<HTMLElement>("div")).find(
          (d) => d.className.includes("bg-[#1e1e1f]")
        ) ?? (btn.className.includes("bg-[#1e1e1f]") ? btn : null);
        const hoverTarget = darkDiv ?? btn;
        hoverTarget.style.transition = "background-color 300ms cubic-bezier(0.22, 1, 0.36, 1)";

        const onEnter = () => { hoverTarget.style.backgroundColor = "#38383a"; };
        const onLeave = () => { hoverTarget.style.backgroundColor = ""; };
        btn.addEventListener("mouseenter", onEnter);
        btn.addEventListener("mouseleave", onLeave);

        const onClick = () => { setView("about"); window.scrollTo({ top: 0, behavior: 'instant' }); };
        btn.addEventListener("click", onClick);
        cleanups.push(() => {
          btn.removeEventListener("click", onClick);
          btn.removeEventListener("mouseenter", onEnter);
          btn.removeEventListener("mouseleave", onLeave);
          btn.style.cursor = "";
          hoverTarget.style.backgroundColor = "";
          hoverTarget.style.transition = "";
        });
      });

    return () => cleanups.forEach((fn) => fn());
  }, [view, scale, showPreloader]);

  // Background preload: once preloader finishes, fetch all project/page images
  // silently so every page opens instantly on first visit.
  useEffect(() => {
    if (showPreloader) return;
    const urls: string[] = [];
    projects.forEach((p) => {
      urls.push(p.heroImage, p.thumbnail);
      p.images.forEach((img) => { if (img) urls.push(img); });
      if (p.heroLogo) urls.push(p.heroLogo);
    });
    const imgs = urls.map((src) => { const i = new Image(); i.src = src; return i; });
    return () => { imgs.forEach((i) => { i.src = ""; }); };
  }, [showPreloader]);

  // Wire clicks on work cards (Frame7 work page + Frame9 home page featured cards)
  // to navigate to individual project pages.
  useEffect(() => {
    if (view !== "work" && view !== "home") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Case-insensitive title → id lookup
    const titleToId: Record<string, string> = {};
    projects.forEach((p) => { titleToId[p.title.toUpperCase()] = p.id; });

    const cleanups: Array<() => void> = [];
    const wired = new Set<HTMLElement>();

    const wireCard = (card: HTMLElement, projectId: string) => {
      if (wired.has(card)) return;
      wired.add(card);
      card.style.cursor = "pointer";
      const onClick = () => navigateToProject(projectId);
      card.addEventListener("click", onClick);
      cleanups.push(() => { card.removeEventListener("click", onClick); card.style.cursor = ""; });
    };

    // Frame7: cards marked with data-name="work-card"
    Array.from(canvas.querySelectorAll<HTMLElement>("[data-name='work-card']")).forEach((card) => {
      const labelPs = Array.from(card.querySelectorAll("p")).filter(
        (p) => !p.className.includes("absolute") && p.textContent?.trim()
      );
      const titleEl = labelPs.find((p) => titleToId[p.textContent?.trim().toUpperCase() ?? ""]);
      const projectId = titleEl ? titleToId[titleEl.textContent!.trim().toUpperCase()] : undefined;
      if (projectId) wireCard(card, projectId);
    });

    // Frame9: cards marked with data-project-id (set directly on image containers)
    Array.from(canvas.querySelectorAll<HTMLElement>("[data-project-id]")).forEach((card) => {
      const projectId = card.dataset.projectId;
      if (projectId) wireCard(card, projectId);
    });

    return () => cleanups.forEach((fn) => fn());
  }, [view, scale, showPreloader]);

  // Page-enter transition: a cover overlay fades out over the content area,
  // starting BELOW the navbar (≈87 CSS px in canvas coordinates) so the navbar
  // is never hidden or moved. The canvas itself has no animation.
  const [overlayKey, setOverlayKey] = useState(0);
  useEffect(() => {
    setOverlayKey((k) => k + 1);
  }, [view, showPreloader]);

  // Home-only baseline/alignment fixes from the visual editor. These target
  // Frame9-specific instances, so only run while the home view is mounted.
  useEffect(() => {
    if (view !== "home") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // These are the two explicitly selected instances from the imported
    // composition. Keep their offset in one place so their baseline alignment
    // remains intact without changing shared imported classes.
    const portrait = canvas
      .querySelector('img[src*="a802e39c0a569dd08888c01370ae28cb47976544"]')
      ?.closest(".group");
    const scrollDown = Array.from(canvas.querySelectorAll("p")).find(
      (element) => element.textContent === "Scroll Down",
    );
    const workCount = Array.from(canvas.querySelectorAll("p")).find(
      (element) => element.textContent === "/ 30",
    );
    const introLine = Array.from(canvas.querySelectorAll("p")).find((element) =>
      element.textContent?.startsWith(
        "I build brands, digital experiences, and visual systems",
      ),
    );
    const gridLines = canvas.querySelectorAll<HTMLElement>(
      '[class*="h-[11035px]"][class*="border-l"][class*="border-r"]',
    );

    if (portrait instanceof HTMLElement) {
      portrait.style.top = `${HERO_TOP}px`;
      portrait.style.animation = "none";
    }

    if (scrollDown instanceof HTMLElement) {
      scrollDown.style.top = `${HERO_TOP + HERO_SIZE - SCROLL_DOWN_BOTTOM_INSET}px`;
    }

    if (workCount instanceof HTMLElement) {
      workCount.style.visibility = "hidden";
    }

    if (introLine instanceof HTMLElement) {
      // Selected-instance edit from the visual editor: clear the shorthand and
      // set explicit horizontal margins on this one paragraph only.
      introLine.style.marginInline = "";
      introLine.style.marginLeft = "28px";
      introLine.style.marginRight = "28px";
    }

    gridLines.forEach((line) => {
      line.style.pointerEvents = "none";
      line.style.userSelect = "none";
      // Restore pointer-events on any interactive elements nested inside grid columns
      Array.from(line.querySelectorAll<HTMLElement>('[data-name="Link"]')).forEach((el) => {
        el.style.pointerEvents = "auto";
      });
    });
  }, [scale, view, showPreloader]);

  // Portrait dot-bubble reveal + interactive hover (replaces clip-path animation).
  // Dots spring-pop in from centre outward on load, then cursor proximity
  // expands them on hover — matching the MagneticGrid component style.
  useEffect(() => {
    if (view !== "home") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const portrait = canvas
      .querySelector('img[src*="a802e39c0a569dd08888c01370ae28cb47976544"]')
      ?.closest(".group") as HTMLElement | null;
    if (!portrait) return;

    const portraitImg = portrait.querySelector("img") as HTMLImageElement | null;
    if (portraitImg) portraitImg.style.visibility = "hidden";

    // ── Canvas ───────────────────────────────────────────────
    const W = HERO_SIZE, H = HERO_SIZE; // 669 × 669
    const dpr = window.devicePixelRatio || 1;
    const cvs = document.createElement("canvas");
    cvs.width  = Math.round(W * dpr);
    cvs.height = Math.round(H * dpr);
    cvs.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    portrait.style.overflow = "hidden";
    portrait.appendChild(cvs);

    const ctx = cvs.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ── Dot grid ─────────────────────────────────────────────
    const COLS   = 14;
    const GAP    = 7;
    const pitch  = W / COLS;
    const rMin   = 1.5;                        // radius when hidden
    const rFull  = (pitch - GAP) / 2;          // radius fully revealed
    const rMax   = pitch * Math.SQRT2 / 2;     // radius seamless (hover)
    const CX = W / 2, CY = H / 2;
    const maxDist = Math.hypot(CX, CY);
    const rows = Math.ceil(H / pitch);

    type Dot = { x: number; y: number; r: number; v: number; tr: number; base: number; at: number };
    const now0 = performance.now();
    const dots: Dot[] = [];

    for (let c = 0; c < COLS; c++) {
      for (let row = 0; row < rows; row++) {
        const x = c * pitch + pitch / 2;
        const y = (H - rows * pitch) / 2 + row * pitch + pitch / 2;
        const dist = Math.hypot(x - CX, y - CY);
        // Centre dots appear first, edges staggered up to 750 ms later
        const at = now0 + 200 + (dist / maxDist) * 750;
        dots.push({ x, y, r: rMin, v: 0, tr: rMin, base: rMin, at });
      }
    }

    // ── Image — reuse the already-loaded DOM element directly ────
    // Using portraitImg avoids CORS taint issues with same-origin Vite assets.
    let fit: { s: number; dx: number; dy: number } | null = null;
    const computeFit = () => {
      if (!portraitImg || !portraitImg.naturalWidth) return;
      const s = Math.max(W / portraitImg.naturalWidth, H / portraitImg.naturalHeight);
      fit = { s, dx: (W - portraitImg.naturalWidth * s) / 2, dy: (H - portraitImg.naturalHeight * s) / 2 };
    };
    if (portraitImg?.complete) computeFit();
    else portraitImg?.addEventListener("load", computeFit, { once: true });

    // ── Mouse ────────────────────────────────────────────────
    const mouse = { x: -9999, y: -9999, on: false };
    const HOVER_R = 300; // larger trigger area
    const capturedScale = scale;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    const onMove = (e: MouseEvent) => {
      if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
      const rect = portrait.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / capturedScale;
      mouse.y = (e.clientY - rect.top)  / capturedScale;
      mouse.on = true;
    };
    // Delay collapse so the viewer can read the image before dots close
    const onLeave = () => {
      leaveTimer = setTimeout(() => { mouse.on = false; leaveTimer = null; }, 1100);
    };
    portrait.addEventListener("mousemove", onMove);
    portrait.addEventListener("mouseleave", onLeave);

    // ── Spring loop ──────────────────────────────────────────
    const K = 0.16, D = 0.65; // spring stiffness / damping (slight overshoot = pop)

    let rafId = 0;
    const loop = (now: number) => {
      ctx.clearRect(0, 0, W, H);

      for (const dot of dots) {
        // Auto-reveal target
        if (now >= dot.at) dot.base = rFull;

        // Hover boost: cursor proximity expands toward rMax
        let hover = 0;
        if (mouse.on) {
          const d = Math.hypot(mouse.x - dot.x, mouse.y - dot.y);
          const n = Math.max(0, 1 - d / HOVER_R);
          hover = n * n; // smooth falloff
        }
        dot.tr = dot.base + (rMax - dot.base) * hover;

        // Spring physics → natural bubble pop
        dot.v += (dot.tr - dot.r) * K - dot.v * D;
        dot.r  = Math.max(rMin, dot.r + dot.v);

        // Draw dot
        ctx.save();
        ctx.translate(dot.x, dot.y);
        ctx.beginPath();
        ctx.arc(0, 0, dot.r, 0, Math.PI * 2);
        if (portraitImg && portraitImg.complete && portraitImg.naturalWidth && fit) {
          ctx.clip();
          const sw = (dot.r * 2) / fit.s;
          const sx = (dot.x - dot.r - fit.dx) / fit.s;
          const sy = (dot.y - dot.r - fit.dy) / fit.s;
          ctx.drawImage(portraitImg, sx, sy, sw, sw, -dot.r, -dot.r, dot.r * 2, dot.r * 2);
        } else {
          ctx.fillStyle = "#d4d4d4";
          ctx.fill();
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      portrait.removeEventListener("mousemove", onMove);
      portrait.removeEventListener("mouseleave", onLeave);
      if (leaveTimer) clearTimeout(leaveTimer);
      cvs.remove();
      portrait.style.overflow = "";
      if (portraitImg) portraitImg.style.visibility = "";
    };
  }, [view, scale, showPreloader]);

  // About-page hero: same top-to-bottom clip reveal as the home portrait.
  // The wide container (w-[1362px] h-[669px]) acts as the mask; the image
  // inside settles from scale(1.08) -> 1.0 in sync with the reveal.
  useEffect(() => {
    if (view !== "about") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const REVEAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
    const REVEAL_DURATION = "2.6s";

    // Find the hero container by filtering on className in JS — more reliable
    // than CSS attribute selectors with Tailwind's bracket-notation class names.
    const heroContainer = Array.from(
      canvas.querySelectorAll<HTMLElement>("div"),
    ).find(
      (el) =>
        el.className.includes("w-[1362px]") &&
        el.className.includes("h-[669px]") &&
        el.className.includes("overflow-clip"),
    );

    if (!heroContainer) return;

    // Cancel any baked-in animation on the container.
    heroContainer.style.animation = "none";
    heroContainer.style.clipPath = "inset(0 0 100% 0)";

    const heroImg = heroContainer.querySelector("img");
    if (heroImg instanceof HTMLElement) {
      heroImg.style.transform = "scale(1.08)";
    }

    // Promote to its own compositor layer so clip-path animates on the GPU
    heroContainer.style.willChange = "clip-path";

    const startReveal = () => {
      requestAnimationFrame(() => {
        heroContainer.style.animation = `revealClipDown ${REVEAL_DURATION} ${REVEAL_EASE} both`;
        if (heroImg instanceof HTMLElement) {
          heroImg.style.transition = `transform ${REVEAL_DURATION} ${REVEAL_EASE}`;
          heroImg.style.transform = "scale(1)";
          heroImg.addEventListener(
            "transitionend",
            () => {
              heroImg.style.transition = "";
              heroImg.style.transform = "";
              heroContainer.style.willChange = "";
            },
            { once: true },
          );
        }
      });
    };

    // Wait for the image to fully decode before starting — prevents mid-animation jerk
    if (heroImg instanceof HTMLImageElement) {
      const run = () => (heroImg as HTMLImageElement).decode().then(startReveal).catch(startReveal);
      if (heroImg.complete) {
        run();
      } else {
        heroImg.addEventListener("load", run, { once: true });
      }
    } else {
      startReveal();
    }

    return () => {
      heroContainer.style.animation = "";
      heroContainer.style.clipPath = "";
      heroContainer.style.willChange = "";
      if (heroImg instanceof HTMLElement) {
        heroImg.style.transition = "";
        heroImg.style.transform = "";
      }
    };
  }, [view, scale, showPreloader]);

  // Premium editorial scroll reveals applied across both views without editing
  // the imported frames: images reveal bottom-to-top (clip-path) with a subtle
  // 1.08 -> 1.0 zoom, and major text rises into place with a light stagger.
  // The canvas uses CSS `zoom`, which breaks IntersectionObserver's geometry,
  // so we gate reveals with getBoundingClientRect (which honors zoom) on a
  // throttled scroll/resize loop. Honors prefers-reduced-motion; fires once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
    const restore: HTMLElement[] = [];

    type Reveal = { el: HTMLElement; play: () => void };
    const pending: Reveal[] = [];

    // ---- Selected Works cards: scroll-triggered horizontal expansion ----
    // Use data-project-id as the selector — it's set directly on every card
    // container in Frame9 and is immune to Tailwind class-name variations.
    const workCards = Array.from(
      canvas.querySelectorAll<HTMLElement>("[data-project-id]"),
    );
    // Pre-collect every img inside any work card so the generic reveal loop
    // can skip them regardless of nesting depth.
    const workCardImgSet = new Set(
      workCards.flatMap((c) => Array.from(c.querySelectorAll("img"))),
    );
    const CARD_MOTION = "1.4s cubic-bezier(0.76, 0, 0.24, 1)";
    const injectedOverlays: HTMLElement[] = [];
    const cardEventCleanups: Array<() => void> = [];

    // ── Shared fixed-position VIEW badge ─────────────────────────────────────
    const gbEl = document.createElement("div");
    gbEl.className = "cursor-badge-global";
    const gbRing = document.createElement("span");
    gbRing.className = "card-cursor-ring";
    const gbPill = document.createElement("div");
    gbPill.className = "card-cursor-pill";
    gbPill.textContent = "VIEW";
    gbEl.appendChild(gbRing);
    gbEl.appendChild(gbPill);
    document.body.appendChild(gbEl);

    let gbTX = 0, gbTY = 0, gbCX = 0, gbCY = 0;
    let gbRaf = 0, gbRunning = false;
    let gbLeaveTimer: ReturnType<typeof setTimeout> | null = null;
    let gbDocMove: ((e: MouseEvent) => void) | null = null;
    // Last known screen cursor — updated by a single global mousemove listener.
    let globalCX = 0, globalCY = 0;

    const gbLerp = () => {
      gbCX += (gbTX - gbCX) * 0.12;
      gbCY += (gbTY - gbCY) * 0.12;
      gbEl.style.left = `${gbCX}px`;
      gbEl.style.top  = `${gbCY}px`;
      gbRaf = requestAnimationFrame(gbLerp);
    };

    const gbShow = (clientX: number, clientY: number) => {
      if (gbLeaveTimer) { clearTimeout(gbLeaveTimer); gbLeaveTimer = null; }
      if (gbDocMove) { document.removeEventListener("mousemove", gbDocMove); gbDocMove = null; }
      // Snap position immediately so badge appears at cursor with no delay.
      gbTX = gbCX = clientX; gbTY = gbCY = clientY;
      gbEl.style.left = `${gbCX}px`; gbEl.style.top = `${gbCY}px`;
      gbEl.classList.add("visible");
      if (!gbRunning) { gbRunning = true; gbLerp(); }
    };

    // immediate=true  → scroll triggered: stop lerp right away, just fade
    // immediate=false → physical leave: follow cursor globally during the fade
    const gbHide = (immediate = false) => {
      if (gbLeaveTimer) { clearTimeout(gbLeaveTimer); gbLeaveTimer = null; }
      if (gbDocMove) { document.removeEventListener("mousemove", gbDocMove); gbDocMove = null; }
      gbEl.classList.remove("visible");
      if (immediate) {
        gbRunning = false; cancelAnimationFrame(gbRaf);
      } else {
        gbDocMove = (e: MouseEvent) => { gbTX = e.clientX; gbTY = e.clientY; };
        document.addEventListener("mousemove", gbDocMove);
        gbLeaveTimer = setTimeout(() => {
          gbLeaveTimer = null;
          if (gbDocMove) { document.removeEventListener("mousemove", gbDocMove); gbDocMove = null; }
          gbRunning = false; cancelAnimationFrame(gbRaf);
        }, 400);
      }
    };

    // Global mousemove: single listener keeps cursor coords fresh for scroll handler.
    const onGlobalMouseMove = (e: MouseEvent) => {
      globalCX = e.clientX; globalCY = e.clientY;
      gbTX = e.clientX; gbTY = e.clientY;
    };
    document.addEventListener("mousemove", onGlobalMouseMove);

    // Global scroll: activate/deactivate hover on cards as they move under cursor.
    const onGlobalScroll = () => {
      workCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const under = globalCX >= rect.left && globalCX <= rect.right &&
                      globalCY >= rect.top  && globalCY <= rect.bottom;
        if (under && !card.classList.contains("is-hovered")) {
          card.classList.add("is-hovered");
          gbShow(globalCX, globalCY);
        } else if (!under && card.classList.contains("is-hovered")) {
          card.classList.remove("is-hovered");
          gbHide(true); // scroll-triggered: immediate stop
        }
      });
    };
    window.addEventListener("scroll", onGlobalScroll, { passive: true });
    // ─────────────────────────────────────────────────────────────────────────

    workCards.forEach((card) => {
      const cardImg = card.querySelector("img");
      card.style.clipPath = "inset(0 50% 0 50%)";
      card.classList.add("card-hover-dim");
      restore.push(card);
      if (cardImg instanceof HTMLElement) {
        cardImg.style.transform = "scale(1.25)";
        restore.push(cardImg);
        // Hold the card hidden until its image is decoded, then fade it in — so
        // the scrub never opens onto an empty box that pops the image in later.
        if (cardImg instanceof HTMLImageElement && !(cardImg.complete && cardImg.naturalWidth)) {
          card.style.opacity = "0";
          card.style.transition = "opacity 0.5s ease";
          cardImg.decode()
            .then(() => { card.style.opacity = "1"; })
            .catch(() => { card.style.opacity = "1"; });
        }
      }

      const darkOverlay = document.createElement("div");
      darkOverlay.className = "card-dark-overlay";
      card.appendChild(darkOverlay);
      injectedOverlays.push(darkOverlay);

      const onMouseEnter = (e: MouseEvent) => {
        card.classList.add("is-hovered");
        gbShow(e.clientX, e.clientY);
      };
      const onMouseLeave = () => {
        card.classList.remove("is-hovered");
        gbHide(false); // physical leave: follow during fade
      };

      card.addEventListener("mouseenter", onMouseEnter);
      card.addEventListener("mouseleave", onMouseLeave);
      cardEventCleanups.push(() => {
        card.removeEventListener("mouseenter", onMouseEnter);
        card.removeEventListener("mouseleave", onMouseLeave);
        card.classList.remove("is-hovered");
      });

      // No pending.push here — clip-path is driven continuously by the scrub
      // loop below instead of a one-time reveal animation.
    });

    // ---- Image reveals ----
    Array.from(canvas.querySelectorAll("img")).forEach((img) => {
      // The hero portrait has its own dedicated mask reveal (handled in the
      // home effect against its overflow-clip container), so skip it here.
      if (img.src.includes("a802e39c0a569dd08888c01370ae28cb47976544")) return;
      // Portfolio-card images are handled by the horizontal expansion above.
      if (workCardImgSet.has(img)) return;
      // Project image slots have their own dedicated reveal effect; skip here
      // so no hover-scale animation is ever added to them.
      if (img.closest("[data-name='project-img-slot']")) return;
      const wrapper =
        (img.closest(".overflow-hidden") as HTMLElement | null) ??
        (img.parentElement as HTMLElement | null);
      const skipZoom = img.className.includes("translate");

      if (wrapper) {
        wrapper.style.clipPath = "inset(100% 0 0 0)";
        restore.push(wrapper);
        // Only add hover-zoom on home/about/work — on project pages the root
        // container would receive the class and zoom every slide image on hover.
        if (view !== "project") {
          const card = wrapper.parentElement;
          if (card instanceof HTMLElement) card.classList.add("reveal-hover");
        }
      }
      if (!skipZoom) {
        img.style.transform = "scale(1.08)";
      }
      restore.push(img);

      pending.push({
        el: img,
        play: () => {
          // Gate the reveal on the bitmap actually being decoded. Otherwise the
          // clip/zoom animation plays on an empty slot and the pixels pop in a
          // second later — the "jerk, then animate" the brief describes. Waiting
          // for decode() makes the reveal and the image appear together.
          const runReveal = () => {
            if (wrapper) wrapper.style.animation = `revealClipUp 1.1s ${EASE} both`;
            if (!skipZoom) {
              img.style.animation = `revealImgZoom 1.1s ${EASE} both`;
              img.addEventListener(
                "animationend",
                () => {
                  // Clear the fill so the CSS hover transform can take over.
                  img.style.animation = "";
                  img.style.transform = "";
                },
                { once: true },
              );
            }
          };
          if (img.complete && img.naturalWidth) {
            runReveal();
          } else {
            img.decode().then(runReveal).catch(runReveal);
          }
        },
      });
    });

    // ---- Text reveals ----
    // Prioritize headings, section labels and intro copy; skip elements that
    // already carry a baked-in Figma load animation or an existing transform.
    Array.from(canvas.querySelectorAll<HTMLElement>("p, h1, h2, h3"))
      .filter((element) => {
        if (element.className.includes("animate-[")) return false;
        if (element.className.includes("translate")) return false;
        if (element.closest('[data-name="Banner"]')) return false;
        const size = parseFloat(getComputedStyle(element).fontSize);
        return size >= 19; // headings, section labels and body intros
      })
      .forEach((element) => {
        element.style.opacity = "0";
        element.style.willChange = "opacity, transform";
        restore.push(element);
        pending.push({
          el: element,
          play: () => {
            element.style.animation = `revealTextUp 0.85s ${EASE} both`;
          },
        });
      });

    let raf = 0;
    let scheduled = false;
    const check = () => {
      scheduled = false;
      const trigger = window.innerHeight * 0.92;
      for (let i = pending.length - 1; i >= 0; i -= 1) {
        const rect = pending[i].el.getBoundingClientRect();
        // Reveal once the element's top enters the lower viewport (or is above).
        if (rect.top < trigger && rect.bottom > 0) {
          pending[i].play();
          pending.splice(i, 1);
        }
      }
      if (pending.length === 0) teardownListeners();
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(check);
    };

    const teardownListeners = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Initial pass reveals whatever is already on screen.
    check();

    // ---- Continuous rAF scrub: clip-path + image zoom for portfolio cards ----
    // Runs every frame (not scroll-event-triggered) so clip-path never freezes
    // mid-scroll. Clip-path bell-curves open/closed as card travels through
    // the viewport; image zooms 1.25→1.0 over the same travel.
    let scrubActive = true;
    let scrubRaf = 0;
    const scrub = () => {
      if (!scrubActive) return;
      const vh = window.innerHeight;
      workCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const raw  = (vh - rect.top) / (vh + rect.height);
        const p    = Math.min(1, Math.max(0, raw));

        // Bell-curve: fully open in the middle 40% of viewport travel.
        const openP  = Math.min(1, p / 0.3);
        const closeP = Math.min(1, (1 - p) / 0.3);
        const half   = card.offsetWidth / 2; // dynamic: works for any card width
        const clip   = (1 - Math.min(openP, closeP)) * half;
        card.style.clipPath = `inset(0 ${clip.toFixed(1)}px 0 ${clip.toFixed(1)}px)`;

        const img = card.querySelector("img");
        if (img instanceof HTMLElement) {
          img.style.transform = `scale(${(1.25 - 0.25 * p).toFixed(4)})`;
        }
      });
      scrubRaf = requestAnimationFrame(scrub);
    };
    if (workCards.length > 0) scrub();

    return () => {
      teardownListeners();
      cardEventCleanups.forEach((fn) => fn());
      injectedOverlays.forEach((el) => el.remove());
      // Remove shared fixed badge and cancel any pending timers/RAF
      scrubActive = false;
      cancelAnimationFrame(scrubRaf);
      document.removeEventListener("mousemove", onGlobalMouseMove);
      window.removeEventListener("scroll", onGlobalScroll);
      gbRunning = false;
      cancelAnimationFrame(gbRaf);
      if (gbLeaveTimer) { clearTimeout(gbLeaveTimer); gbLeaveTimer = null; }
      if (gbDocMove) { document.removeEventListener("mousemove", gbDocMove); gbDocMove = null; }
      if (gbEl.parentNode) gbEl.parentNode.removeChild(gbEl);
      restore.forEach((element) => {
        element.style.animation = "";
        element.style.transform = "";
        element.style.clipPath = "";
        element.style.opacity = "";
        element.style.willChange = "";
        element.style.transitionProperty = "";
        element.style.transitionDuration = "";
        element.style.transitionTimingFunction = "";
        element.classList.remove("reveal-hover");
        element.classList.remove("card-hover-dim");
        element.classList.remove("is-hovered");
      });
    };
  }, [scale, view, showPreloader]);

  // Work-page scroll reveals — same horizontal scrub + VIEW badge as home page.
  useEffect(() => {
    if (view !== "work") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
    const restore: HTMLElement[] = [];
    type Reveal = { el: HTMLElement; play: () => void };
    const pending: Reveal[] = [];
    const cardEventCleanups: Array<() => void> = [];
    const injectedOverlays: HTMLElement[] = [];

    const workCards = Array.from(canvas.querySelectorAll<HTMLElement>("[data-name='work-card-img']"));

    // ── Shared VIEW badge (same as home page) ────────────────────────────────
    const gbEl = document.createElement("div");
    gbEl.className = "cursor-badge-global";
    const gbRing = document.createElement("span"); gbRing.className = "card-cursor-ring";
    const gbPill = document.createElement("div");  gbPill.className = "card-cursor-pill"; gbPill.textContent = "VIEW";
    gbEl.appendChild(gbRing); gbEl.appendChild(gbPill);
    document.body.appendChild(gbEl);

    let gbTX = 0, gbTY = 0, gbCX = 0, gbCY = 0, gbRaf = 0, gbRunning = false;
    let gbLeaveTimer: ReturnType<typeof setTimeout> | null = null;
    let gbDocMove: ((e: MouseEvent) => void) | null = null;
    let globalCX = 0, globalCY = 0;

    const gbLerp = () => {
      gbCX += (gbTX - gbCX) * 0.12; gbCY += (gbTY - gbCY) * 0.12;
      gbEl.style.left = `${gbCX}px`; gbEl.style.top = `${gbCY}px`;
      gbRaf = requestAnimationFrame(gbLerp);
    };
    const gbShow = (cx: number, cy: number) => {
      if (gbLeaveTimer) { clearTimeout(gbLeaveTimer); gbLeaveTimer = null; }
      if (gbDocMove) { document.removeEventListener("mousemove", gbDocMove); gbDocMove = null; }
      gbTX = gbCX = cx; gbTY = gbCY = cy;
      gbEl.style.left = `${gbCX}px`; gbEl.style.top = `${gbCY}px`;
      gbEl.classList.add("visible");
      if (!gbRunning) { gbRunning = true; gbLerp(); }
    };
    const gbHide = (immediate = false) => {
      if (gbLeaveTimer) { clearTimeout(gbLeaveTimer); gbLeaveTimer = null; }
      if (gbDocMove) { document.removeEventListener("mousemove", gbDocMove); gbDocMove = null; }
      gbEl.classList.remove("visible");
      if (immediate) { gbRunning = false; cancelAnimationFrame(gbRaf); }
      else {
        gbDocMove = (e: MouseEvent) => { gbTX = e.clientX; gbTY = e.clientY; };
        document.addEventListener("mousemove", gbDocMove);
        gbLeaveTimer = setTimeout(() => {
          gbLeaveTimer = null;
          if (gbDocMove) { document.removeEventListener("mousemove", gbDocMove); gbDocMove = null; }
          gbRunning = false; cancelAnimationFrame(gbRaf);
        }, 400);
      }
    };
    const onGlobalMouseMove = (e: MouseEvent) => { globalCX = e.clientX; globalCY = e.clientY; gbTX = e.clientX; gbTY = e.clientY; };
    document.addEventListener("mousemove", onGlobalMouseMove);

    const onGlobalScroll = () => {
      workCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const under = globalCX >= rect.left && globalCX <= rect.right && globalCY >= rect.top && globalCY <= rect.bottom;
        if (under && !card.classList.contains("is-hovered")) { card.classList.add("is-hovered"); gbShow(globalCX, globalCY); }
        else if (!under && card.classList.contains("is-hovered")) { card.classList.remove("is-hovered"); gbHide(true); }
      });
    };
    window.addEventListener("scroll", onGlobalScroll, { passive: true });

    // ── Wire each work-card-img ───────────────────────────────────────────────
    workCards.forEach((card) => {
      card.style.clipPath = `inset(0 50% 0 50%)`;
      card.classList.add("card-hover-dim");
      restore.push(card);

      const cardImg = card.querySelector<HTMLElement>("img");
      if (cardImg) {
        cardImg.style.transform = "scale(1.25)"; restore.push(cardImg);
        // Hold hidden until decoded, then fade in — no empty-box pop mid-scrub.
        if (cardImg instanceof HTMLImageElement && !(cardImg.complete && cardImg.naturalWidth)) {
          card.style.opacity = "0";
          card.style.transition = "opacity 0.5s ease";
          cardImg.decode()
            .then(() => { card.style.opacity = "1"; })
            .catch(() => { card.style.opacity = "1"; });
        }
      }

      const overlay = document.createElement("div");
      overlay.className = "card-dark-overlay";
      card.appendChild(overlay);
      injectedOverlays.push(overlay);

      const onEnter = (e: MouseEvent) => { card.classList.add("is-hovered"); gbShow(e.clientX, e.clientY); };
      const onLeave = () => { card.classList.remove("is-hovered"); gbHide(false); };
      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);
      cardEventCleanups.push(() => {
        card.removeEventListener("mouseenter", onEnter);
        card.removeEventListener("mouseleave", onLeave);
        card.classList.remove("is-hovered");
      });
    });

    // ── Text rise-in for large headings + labels ──────────────────────────────
    Array.from(canvas.querySelectorAll<HTMLElement>("p")).filter((el) => {
      if (el.className.includes("animate-[")) return false;
      if (el.closest('[data-name="Banner"]')) return false;
      return parseFloat(getComputedStyle(el).fontSize) >= 19;
    }).forEach((el) => {
      el.style.opacity = "0";
      el.style.willChange = "opacity, transform";
      restore.push(el);
      pending.push({ el, play: () => { el.style.animation = `revealTextUp 0.85s ${EASE} both`; } });
    });

    // ── One-shot text reveal on scroll ───────────────────────────────────────
    let raf = 0, scheduled = false;
    const check = () => {
      scheduled = false;
      const trigger = window.innerHeight * 0.92;
      for (let i = pending.length - 1; i >= 0; i--) {
        const rect = pending[i].el.getBoundingClientRect();
        if (rect.top < trigger && rect.bottom > 0) { pending[i].play(); pending.splice(i, 1); }
      }
      if (pending.length === 0) teardownCheck();
    };
    const onScroll = () => { if (scheduled) return; scheduled = true; raf = requestAnimationFrame(check); };
    const teardownCheck = () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check();

    // ── Continuous rAF scrub: horizontal clip-path + image zoom ──────────────
    let scrubActive = true, scrubRaf = 0;
    const scrub = () => {
      if (!scrubActive) return;
      const vh = window.innerHeight;
      workCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const raw = (vh - rect.top) / (vh + rect.height);
        const p   = Math.min(1, Math.max(0, raw));
        const half = card.offsetWidth / 2;
        const openP  = Math.min(1, p / 0.3);
        const closeP = Math.min(1, (1 - p) / 0.3);
        const clip = (1 - Math.min(openP, closeP)) * half;
        card.style.clipPath = `inset(0 ${clip.toFixed(1)}px 0 ${clip.toFixed(1)}px)`;
        const img = card.querySelector<HTMLElement>("img");
        if (img) img.style.transform = `scale(${(1.25 - 0.25 * p).toFixed(4)})`;
      });
      scrubRaf = requestAnimationFrame(scrub);
    };
    if (workCards.length > 0) scrub();

    return () => {
      teardownCheck();
      cardEventCleanups.forEach((fn) => fn());
      injectedOverlays.forEach((el) => el.remove());
      scrubActive = false; cancelAnimationFrame(scrubRaf);
      document.removeEventListener("mousemove", onGlobalMouseMove);
      window.removeEventListener("scroll", onGlobalScroll);
      gbRunning = false; cancelAnimationFrame(gbRaf);
      if (gbLeaveTimer) { clearTimeout(gbLeaveTimer); gbLeaveTimer = null; }
      if (gbDocMove) { document.removeEventListener("mousemove", gbDocMove); gbDocMove = null; }
      if (gbEl.parentNode) gbEl.parentNode.removeChild(gbEl);
      restore.forEach((el) => {
        el.style.animation = ""; el.style.transform = ""; el.style.clipPath = "";
        el.style.opacity = ""; el.style.willChange = "";
        el.classList.remove("card-hover-dim", "is-hovered");
      });
    };
  }, [scale, view, showPreloader]);

  // Project page scroll reveals — same motion language: image slot clip-path + zoom,
  // text rise-in for headings and labels.
  useEffect(() => {
    if (view !== "project") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
    const restore: HTMLElement[] = [];
    type Reveal = { el: HTMLElement; play: () => void };
    const pending: Reveal[] = [];

    // Image slot reveals — center-out horizontal expand, fires once on scroll, no hover zoom
    Array.from(canvas.querySelectorAll<HTMLElement>("[data-name='project-img-slot']")).forEach((slot) => {
      slot.style.clipPath = "inset(0 50% 0 50%)";
      restore.push(slot);
      const slotImg = slot.querySelector("img");
      pending.push({
        el: slot,
        play: () => {
          // Wait for the slot's image to decode before expanding, so the reveal
          // and the pixels land together instead of opening an empty slot.
          const runReveal = () => {
            slot.style.animation = `revealExpandX 1.1s cubic-bezier(0.16, 1, 0.3, 1) both`;
          };
          if (slotImg instanceof HTMLImageElement && !(slotImg.complete && slotImg.naturalWidth)) {
            slotImg.decode().then(runReveal).catch(runReveal);
          } else {
            runReveal();
          }
        },
      });
    });

    // Next-project card reveal
    const nextCard = canvas.querySelector<HTMLElement>("[data-name='next-project-card']");
    if (nextCard) {
      const img = nextCard.querySelector<HTMLElement>("[data-name='work-card-img']");
      if (img) {
        img.style.clipPath = "inset(100% 0 0 0)";
        restore.push(img);
        pending.push({
          el: img,
          play: () => { img.style.animation = `revealClipUp 1.1s ${EASE} both`; },
        });
      }
    }

    // Text reveals
    Array.from(canvas.querySelectorAll<HTMLElement>("p")).filter((el) => {
      if (el.className.includes("animate-[")) return false;
      const size = parseFloat(getComputedStyle(el).fontSize);
      return size >= 28;
    }).forEach((el) => {
      el.style.opacity = "0";
      el.style.willChange = "opacity, transform";
      restore.push(el);
      pending.push({
        el,
        play: () => { el.style.animation = `revealTextUp 0.85s ${EASE} both`; },
      });
    });

    let raf = 0, scheduled = false;
    const check = () => {
      scheduled = false;
      const trigger = window.innerHeight * 0.92;
      for (let i = pending.length - 1; i >= 0; i--) {
        const rect = pending[i].el.getBoundingClientRect();
        if (rect.top < trigger && rect.bottom > 0) {
          pending[i].play();
          pending.splice(i, 1);
        }
      }
      if (pending.length === 0) teardown();
    };
    const onScroll = () => { if (scheduled) return; scheduled = true; raf = requestAnimationFrame(check); };
    const teardown = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check();

    return () => {
      teardown();
      restore.forEach((el) => {
        el.style.animation = "";
        el.style.transform = "";
        el.style.clipPath = "";
        el.style.opacity = "";
        el.style.willChange = "";
      });
    };
  }, [scale, view, currentProjectId, showPreloader]);

  const currentProject = getProjectById(currentProjectId);
  const nextProject = currentProject ? getNextProject(currentProjectId) : undefined;

  const canvasHeight =
    view === "home"
      ? BASE_H
      : view === "about"
        ? ABOUT_H
        : view === "project"
          ? getProjectCanvasH(currentProject?.images.length ?? 6)
          : view === "nodaliq-site"
            ? 0
            : WORK_H;

  // Navbar canvas height (~88px). Used to position the overlay below the nav.
  const NAV_H = 88;

  // Render NODALiQ site as a full-page takeover (own canvas, no portfolio chrome)
  if (view === "nodaliq-site") {
    return <NodaliqSite />;
  }

  // ── Mobile: dedicated stacked/single-column layout ───────────────────────────
  // Below 768px the fixed 1920px desktop canvas would shrink to ~20% and become
  // unreadable, so we render a purpose-built mobile experience instead. The
  // desktop canvas below is left completely untouched; this only branches the
  // output for small screens and reuses the same view/history/navigation state.
  if (isMobile) {
    return (
      <>
        {showPreloader && <Preloader onDone={() => setShowPreloader(false)} />}
        {!showPreloader && (
          <MobileSite
            view={view}
            currentProject={currentProject}
            nextProject={nextProject}
            onNavigateHome={() => { setView("home"); window.scrollTo({ top: 0, behavior: "instant" }); }}
            onNavigateWork={() => { setView("work"); window.scrollTo({ top: 0, behavior: "instant" }); }}
            onNavigateAbout={() => { setView("about"); window.scrollTo({ top: 0, behavior: "instant" }); }}
            onNavigateProject={navigateToProject}
            onNavigateSite={currentProject?.siteView === "nodaliq-site" ? navigateToNodaliqSite : undefined}
          />
        )}
      </>
    );
  }

  return (
    <>
    {showPreloader && <Preloader onDone={() => setShowPreloader(false)} />}
    {!showPreloader && (
    <div
      className="portfolio-viewport"
      style={{
        width: "100%",
        height: canvasHeight * scale,
        backgroundColor: "#e6e6e6",
        position: "relative",
      }}
    >
      <div
        ref={canvasRef}
        className="portfolio-canvas relative"
        style={{
          width: BASE_W,
          height: canvasHeight,
          zoom: scale,
          overflow: view !== "home" ? "clip" : undefined,
        }}
      >
        {view === "home" ? (
          <>
            <Frame9 />
            <p className="absolute left-[1203.29px] top-[348px] w-[669px] leading-[29.952px] tracking-[-0.6912px] text-[#1e1e1f]" style={{ fontSize: "30px", marginTop: "-51px", marginBottom: "-51px", fontFamily: "'Geist:Medium',sans-serif", fontWeight: 500 }}>
              <span className="inline-bold">
                / 28
              </span>
            </p>
          </>
        ) : view === "about" ? (
          <Frame5 />
        ) : view === "project" && currentProject ? (
          <ProjectPage
            project={currentProject}
            nextProject={nextProject}
            onNavigateHome={() => { setView("home"); window.scrollTo({ top: 0, behavior: 'instant' }); }}
            onNavigateWork={() => { setView("work"); window.scrollTo({ top: 0, behavior: 'instant' }); }}
            onNavigateAbout={() => { setView("about"); window.scrollTo({ top: 0, behavior: 'instant' }); }}
            onNavigateProject={navigateToProject}
            onNavigateSite={currentProject.siteView === "nodaliq-site" ? navigateToNodaliqSite : undefined}
          />
        ) : (
          <Frame7 />
        )}
      </div>

      {/* Page-transition overlay: covers only the content area below the navbar,
          fades out so the navbar is never hidden or jerked. */}
      <div
        key={overlayKey}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: NAV_H * scale,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#e6e6e6",
          animation: "overlayFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
    </div>
    )}

    </>
  );
}
