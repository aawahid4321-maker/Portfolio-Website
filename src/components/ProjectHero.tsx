import { useEffect, useRef } from "react";

/* ── ProjectHero: reusable hero for every project page ────────────────────
   Expected project fields: title, type (service), year, client (agency),
   image (heroImage URL), alt (descriptive alt text).
   Colors via CSS variables. No dark purple (#433075) anywhere. */

interface ProjectHeroProps {
  title: string;
  type: string;
  year: string;
  client: string;
  image: string;
  alt: string;
  onNavigateHome: () => void;
  onNavigateWork: () => void;
  onNavigateAbout: () => void;
  activeLink?: "home" | "work" | "about"; // which nav link gets the highlight
}

export default function ProjectHero({
  title, type, year, client, image, alt,
  onNavigateHome, onNavigateWork, onNavigateAbout,
  activeLink,
}: ProjectHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const blobsRef = useRef<HTMLDivElement>(null);
  const decoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    /* ── card tilt + decor parallax (skip on reduced-motion/touch) ── */
    let raf = 0;
    let mx = 0, my = 0;
    let cx = 0, cy = 0;
    let ticking = false;
    const onMouse = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      if (!ticking) { ticking = true; raf = requestAnimationFrame(tick); }
    };
    const tick = () => {
      cx += (mx - cx) * 0.1;
      cy += (my - cy) * 0.1;
      // card tilts max 3deg toward the mouse (perspective 1200px on parent)
      // applied to .ph-card-wrap only — .ph-card corners stay perfect
      if (cardRef.current) {
        cardRef.current.style.transform =
          `rotateY(${cx * 6}deg) rotateX(${-cy * 6}deg)`;
      }
      if (decoRef.current) {
        const kids = decoRef.current.children;
        for (let i = 0; i < kids.length; i++) {
          const depth = 10 + (i % 3) * 5;
          (kids[i] as HTMLElement).style.transform =
            `translate(${cx * depth * 2}px, ${cy * depth * 2}px)`;
        }
      }
      if (Math.abs(mx - cx) > 0.001 || Math.abs(my - cy) > 0.001) {
        raf = requestAnimationFrame(tick);
      } else {
        ticking = false;
      }
    };
    if (!reduceMotion && !isTouch) {
      hero.addEventListener("mousemove", onMouse);
    }

    /* ── card: start floating after entrance ── */
    if (cardRef.current && !reduceMotion && !isTouch) {
      const cardWrap = cardRef.current;
      window.setTimeout(() => cardWrap.classList.add("is-floating"), 1400);
    }

    /* ── card: cursor parallax (2D only, max 8px + 1.5deg), emoji at depths ── */
    const heroEl = document.querySelector(".ph-hero") as HTMLElement | null;
    const cardWrapEl = cardRef.current;
    let px = 0, py = 0, tx = 0, ty = 0, rafPar = 0;
    const onHeroMouse = (e: MouseEvent) => {
      if (!heroEl || !cardWrapEl || reduceMotion || isTouch) return;
      const r = heroEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 16; // ±8px
      ty = ((e.clientY - r.top) / r.height - 0.5) * 16;
    };
    const parTick = () => {
      px += (tx - px) * 0.1; py += (ty - py) * 0.1; // lerp 0.1
      if (cardWrapEl && !cardWrapEl.classList.contains("is-floating")) {
        // only apply when not floating (avoid transform conflict)
        cardWrapEl.style.translate = `${px}px ${py}px`;
        cardWrapEl.style.rotate = `${px * 0.09}deg`; // up to ~1.5deg
      }
      // emoji shift at different depths (12-24px)
      document.querySelectorAll(".ph-emoji").forEach((el, i) => {
        const depth = 12 + (i % 3) * 6;
        (el as HTMLElement).style.translate = `${px * depth / 16}px ${py * depth / 16}px`;
      });
      rafPar = requestAnimationFrame(parTick);
    };
    if (heroEl && !reduceMotion && !isTouch) {
      heroEl.addEventListener("mousemove", onHeroMouse);
      rafPar = requestAnimationFrame(parTick);
    }

    /* ── card: click confetti (6 pieces, 700ms) ── */
    const onCardClick = (e: MouseEvent) => {
      if (!cardWrapEl || reduceMotion) return;
      // squish: 0.97 → 1.03 → 1
      cardWrapEl.animate(
        [{ transform: "scale(0.97)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }],
        { duration: 300, easing: "ease-out" }
      );
      const colors = ["#A58CF4", "#FF0A8A", "#FFD60A", "#FF5A00"];
      const shapes = ["✦", "●", "✦", "●", "✦", "●"];
      for (let i = 0; i < 6; i++) {
        const s = document.createElement("span");
        s.textContent = shapes[i];
        s.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;color:${colors[i % 4]};font-size:20px;pointer-events:none;z-index:9999;`;
        document.body.appendChild(s);
        const ang = (i / 6) * Math.PI * 2;
        s.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: `translate(${Math.cos(ang) * 80}px,${Math.sin(ang) * 80 - 30}px) scale(0.5)`, opacity: 0 },
          ],
          { duration: 700, easing: "cubic-bezier(0.22,1,0.36,1)" }
        ).onfinish = () => s.remove();
      }
    };
    cardWrapEl?.addEventListener("click", onCardClick as EventListener);

    /* ── card: scroll parallax (scale 1→0.96, move up 30px) ── */
    let scrollRaf = 0;
    const onCardScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (!cardWrapEl || reduceMotion) return;
        const y = window.scrollY;
        const p = Math.min(y / 600, 1); // 0→1 over 600px
        cardWrapEl.style.scale = `${1 - p * 0.04}`;
      });
    };
    window.addEventListener("scroll", onCardScroll, { passive: true });

    /* ── pause idle animations when hero off-screen ── */
    const heroObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        document.querySelectorAll(".ph-emoji, .ph-card-wrap.is-floating").forEach((el) => {
          (el as HTMLElement).style.animationPlayState = en.isIntersecting ? "running" : "paused";
        });
      });
    }, { threshold: 0.1 });
    if (heroEl) heroObs.observe(heroEl);

    /* ── hero scroll parallax (rAF, no layout reads) ── */
    const onScroll = () => {
      if (blobsRef.current) {
        blobsRef.current.style.transform = `translateY(${window.scrollY * 0.12}px)`;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      hero.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onCardScroll);
      heroEl?.removeEventListener("mousemove", onHeroMouse);
      cardWrapEl?.removeEventListener("click", onCardClick as EventListener);
      cancelAnimationFrame(rafPar);
      cancelAnimationFrame(scrollRaf);
      heroObs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // (hero title restored per user request)
  // emoji per tag: type, year, client
  const tagEmojis = ["🎨", "📅", "💜"];
  const tags = [
    { label: type, cls: "tag-purple", emoji: tagEmojis[0] },
    { label: year, cls: "tag-yellow", emoji: tagEmojis[1] },
    { label: client, cls: "tag-pink", emoji: tagEmojis[2] },
  ];

  // 4 floating emoji stickers (2 per side): pick by project type
  const lowerType = (type || "").toLowerCase();
  const lowerTitle = (title || "").toLowerCase();
  let emojiChars = ["🎨", "✨", "🚀", "💡"]; // default
  if (lowerTitle.includes("coffee") || lowerTitle.includes("noir")) {
    emojiChars = ["☕", "✨", "🔥", "💜"];
  } else if (lowerType.includes("print") || lowerTitle.includes("brochure")) {
    emojiChars = ["🖨️", "✏️", "🎨", "✨"];
  } else if (lowerType.includes("brand") || lowerType.includes("logo") || lowerType.includes("identity")) {
    emojiChars = ["🎨", "🎯", "💡", "🚀"];
  }
  const emojiBgs = ["#A58CF4", "#FF0A8A", "#FFD60A", "#FF5A00"];
  const emojiStickers = emojiChars.map((char, i) => {
    const isLeft = i % 2 === 0;
    const offset = 16 + ((i * 11) % 44); // 16-60px outside card edge
    return {
      char,
      bg: emojiBgs[i],
      size: `${56 + (i % 3) * 8}px`, // 56-72px
      // position outside card: card half-width = min(450px, 42vw)
      left: isLeft ? `calc(50% - min(450px, 42vw) - ${offset}px - 64px)` : undefined,
      right: !isLeft ? `calc(50% - min(450px, 42vw) - ${offset}px - 64px)` : undefined,
      top: `${20 + ((i * 17) % 60)}%`, // spread vertically, never under nav
      rot: -14 + ((i * 7) % 28), // -14 to 14deg
      popDelay: `${0.6 + i * 0.08}s`, // stagger 80ms
      delay: `${(i * 0.4) % 3}s`,
      dur: `${3 + (i % 4)}s`, // 3-6s
    };
  });

  return (
    <>
      <style>{`
        html { scroll-padding-top: calc(20px + 92px + 16px); } /* anchors clear the floating nav */
        .ph-hero {
          --ph-purple-light: #A58CF4;
          --ph-pink: #ff0a8a;
          --ph-yellow: #ffd60a;
          --ph-soft-white: #FAFAFA;
          --ph-jet-black: #0D0D0D;
          --hero-gap: 24px;
          /* clean vertical stack — content always starts BELOW the nav */
          position: relative;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: var(--hero-gap);
          /* top clears nav (20 + 92 + 40 = 152px); bottom 72px so card+shadow fit */
          padding-top: calc(var(--nav-top, 20px) + var(--nav-h, 92px) + 40px);
          padding-bottom: 72px;
          padding-inline: 24px;
          /* purple mountain landscape background */
          background: var(--ph-jet-black) url("/Portfolio-Website/assets/purple-mountain-bg.webp") center / cover no-repeat;
          overflow: visible; /* never clip the card's hard shadow */
        }
        .ph-hero-bg {
          position: absolute;
          inset: 0;
          overflow: hidden; /* clips blobs only, never the card */
          background: transparent;
          border-radius: inherit;
        }
        /* gradient mesh: smaller, softer blobs behind the card area */
        .ph-hero-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 420px 300px at 22% 30%, rgba(165,140,244,0.45), transparent 70%),
            radial-gradient(ellipse 280px 220px at 78% 72%, rgba(255,10,138,0.25), transparent 70%),
            radial-gradient(ellipse 180px 140px at 80% 20%, rgba(255,214,10,0.15), transparent 70%);
          pointer-events: none;
        }
        /* grain at ~4% */
        .ph-hero-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
        }
        .ph-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 120px 120px;
          pointer-events: none;
        }
        .ph-blobs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .ph-blob { position: absolute; border-radius: 50%; }
        .ph-blob-1 {
          width: 420px; height: 420px; left: -80px; top: -60px;
          background: radial-gradient(circle, rgba(165,140,244,0.45), transparent 70%);
          animation: ph-drift 18s ease-in-out infinite alternate;
        }
        .ph-blob-2 {
          width: 300px; height: 300px; right: -40px; bottom: -20px;
          background: radial-gradient(circle, rgba(255,10,138,0.25), transparent 70%);
          animation: ph-drift 14s ease-in-out infinite alternate-reverse;
        }
        .ph-blob-3 {
          width: 200px; height: 200px; right: 8%; top: 6%;
          background: radial-gradient(circle, rgba(255,214,10,0.15), transparent 70%);
          animation: ph-drift 20s ease-in-out infinite alternate;
        }
        @keyframes ph-drift {
          from { transform: translate(0, 0); }
          to { transform: translate(30px, -30px); }
        }

        /* tag pills */
        .ph-tags {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          gap: 12px;
          margin: 0; /* flex gap handles spacing */
          flex-wrap: wrap;
          padding: 0 24px;
        }
        .ph-tag {
          font-family: "Zilla Slab", Rockwell, Georgia, serif;
          font-weight: 700;
          font-size: 17px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 12px 22px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 2px solid var(--ph-jet-black);
          transform: scale(0.6);
          opacity: 0;
          animation: ph-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          white-space: nowrap;
          box-sizing: border-box;
        }
        @keyframes ph-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .tag-purple { background: var(--ph-purple-light); color: var(--ph-jet-black); }
        .tag-yellow { background: var(--ph-yellow); color: var(--ph-jet-black); }
        .tag-pink { background: var(--ph-pink); color: var(--ph-soft-white); }

        /* big title: always below nav (nav z-index 1000) */
        .ph-title {
          position: relative;
          z-index: 2;
          font-family: "Geist", system-ui, sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          font-size: clamp(40px, 7vw, 104px);
          line-height: 0.95;
          text-align: center;
          color: var(--ph-soft-white);
          margin: 0;
          letter-spacing: -0.02em;
          animation: ph-title-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s backwards;
        }
        @keyframes ph-title-in {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .ph-tag-emoji {
          font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
          margin-right: 8px;
          font-size: 1.1em;
        }

        /* ── 4 floating emoji stickers around the card ── */
        .ph-emoji-wrap {
          position: absolute;
          inset: 0;
          z-index: 5; /* below card (z-10), above bg */
          pointer-events: none;
        }
        .ph-emoji {
          position: absolute;
          border-radius: 50%;
          border: 2.5px solid #0D0D0D;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
          cursor: pointer;
          pointer-events: auto;
          transform: rotate(var(--rot, 0deg));
          /* entrance pop, staggered */
          animation:
            ph-emoji-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards,
            ph-emoji-float var(--dur, 4s) ease-in-out infinite;
          animation-delay: var(--pop-delay, 0s), var(--delay, 0s);
        }
        @keyframes ph-emoji-pop {
          0% { transform: scale(0) rotate(var(--rot, 0deg)); opacity: 0; }
          60% { transform: scale(1.15) rotate(var(--rot, 0deg)); opacity: 1; }
          100% { transform: scale(1) rotate(var(--rot, 0deg)); opacity: 1; }
        }
        @keyframes ph-emoji-float {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -10px; }
        }
        .ph-emoji:hover {
          animation: ph-emoji-wiggle 0.4s ease;
          scale: 1.15;
        }
        @keyframes ph-emoji-wiggle {
          0%, 100% { transform: rotate(var(--rot, 0deg)); }
          25% { transform: rotate(calc(var(--rot, 0deg) - 10deg)); }
          75% { transform: rotate(calc(var(--rot, 0deg) + 10deg)); }
        }
        .ph-emoji:active {
          animation: ph-emoji-jump 0.5s ease;
        }
        @keyframes ph-emoji-jump {
          0% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(180deg); }
          100% { transform: translateY(0) rotate(360deg); }
        }

        /* ── card: wrap > shadow (separate layer) + card > img ──
           Square-corner fix: box-shadow on the same element renders square
           corners under transforms. The purple shadow is now its own div
           with the same border-radius, so every corner stays perfectly round. */
        .ph-card-wrap {
          position: relative;
          z-index: 10;
          width: min(900px, 84vw);
          aspect-ratio: 16 / 9;
          margin-bottom: 0;
          /* room for the 10px offset shadow */
          padding-right: 14px;
          padding-bottom: 14px;
          overflow: visible;
          backface-visibility: hidden;
          will-change: transform;
        }
        /* purple hard shadow: separate layer, same radius */
        .ph-card-shadow {
          position: absolute;
          inset: 0 14px 14px 0; /* inset accounts for wrap padding */
          border-radius: 28px;
          background: #A58CF4;
          z-index: 0;
          transform: translate(0, 0); /* entrance: slides out to 10px,10px */
        }
        .ph-card {
          position: absolute;
          inset: 0 14px 14px 0;
          z-index: 1;
          border-radius: 28px;
          overflow: hidden;
          isolation: isolate;
          background: #0D0D0D;
          border: 3px solid #FAFAFA; /* white ring via border (follows radius) */
          clip-path: inset(0 round 28px); /* forces perfect corners */
        }
        .ph-card img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
        }
        /* entrance: card rises 70px, rotate -3deg→0, scale 0.94→1 */
        .ph-card-wrap.ph-enter {
          animation: ph-card-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        @keyframes ph-card-in {
          from { transform: translateY(70px) rotate(-3deg) scale(0.94); opacity: 0; }
          to { transform: translateY(0) rotate(0) scale(1); opacity: 1; }
        }
        /* shadow pops out after the card (spring) */
        .ph-card-wrap.ph-enter .ph-card-shadow {
          animation: ph-shadow-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s backwards;
        }
        @keyframes ph-shadow-in {
          from { transform: translate(0, 0); }
          to { transform: translate(10px, 10px); }
        }
        .ph-card-wrap.ph-enter .ph-card-shadow { transform: translate(10px, 10px); }
        /* idle float on wrap only */
        .ph-card-wrap.is-floating {
          animation: ph-float 5s ease-in-out infinite;
        }
        @keyframes ph-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.6deg); }
        }
        /* hover: card scales, shadow grows */
        .ph-card-wrap:hover { transform: scale(1.02); }
        .ph-card-wrap:hover .ph-card-shadow { transform: translate(16px, 16px); }
        .ph-card-wrap, .ph-card-wrap .ph-card-shadow {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* floating decorations (close to card, never far corners) */
        .ph-deco { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
        .ph-deco > * { position: absolute; }
        .ph-sparkle { animation: ph-twinkle 3s ease-in-out infinite; }
        @keyframes ph-twinkle {
          0%, 100% { opacity: 0.6; transform: rotate(0deg) scale(1); }
          50% { opacity: 1; transform: rotate(20deg) scale(1.15); }
        }
        .ph-face { animation: ph-blink 4.5s ease-in-out infinite; }
        @keyframes ph-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }

        /* responsive */
        @media (max-width: 768px) {
          .ph-hero {
            padding-top: calc(12px + 68px + 28px); /* floating nav clearance + breathing room */
            padding-bottom: 56px;
            padding-inline: 16px;
          }
          .ph-title { font-size: clamp(34px, 11vw, 56px); }
          .ph-tags { flex-wrap: wrap; } /* tags wrap in 2 rows on mobile */
          .ph-card-wrap { width: 92vw; aspect-ratio: 4 / 3; }
          .ph-card { border-radius: 22px; clip-path: inset(0 round 22px); }
          .ph-card-shadow { border-radius: 22px; }
          /* mobile: 4 emoji only, 44-52px, at card corners */
          .ph-emoji-wrap .ph-emoji:nth-child(n+5) { display: none; }
          .ph-emoji { width: 48px !important; height: 48px !important; font-size: 26px !important; }
          .ph-card {
            aspect-ratio: 4 / 3;
            box-shadow:
              0 0 0 2px var(--ph-soft-white),
              6px 6px 0 var(--ph-purple-light);
          }
          .ph-deco .ph-deco-extra { display: none; } /* 2 decorations on mobile */
        }

        /* reduced motion: final static layout */
        @media (prefers-reduced-motion: reduce) {
          .ph-tag { animation: none; transform: none; opacity: 1; }
          .ph-card-wrap { animation: none; }
          .ph-card { animation: none; }
          .ph-blob { animation: none; }
          .ph-sparkle, .ph-face { animation: none; }
        }
      `}</style>

      <div ref={heroRef} className="ph-hero">
        <div className="ph-hero-bg" aria-hidden="true" />
        <div className="ph-grid" aria-hidden="true" />
        <div ref={blobsRef} className="ph-blobs" aria-hidden="true">
          <div className="ph-blob ph-blob-1" />
          <div className="ph-blob ph-blob-2" />
          <div className="ph-blob ph-blob-3" />
        </div>

        {/* tag pills: pop, stagger 90ms */}
        <div className="ph-tags">
          {tags.map((t, i) => (
            <span key={t.label} className={`ph-tag ${t.cls}`} style={{ animationDelay: `${400 + i * 90}ms` }}>
              <span className="ph-tag-emoji" aria-hidden="true">{t.emoji}</span>
              {t.label}
            </span>
          ))}
        </div>

        {/* title removed per user request — pills + card only */}

        {/* sticker card: wrap > shadow + card > img (shadow is separate layer for perfect corners) */}
        <div ref={cardRef} className="ph-card-wrap ph-enter">
          <div className="ph-card-shadow" aria-hidden="true" />
          <div className="ph-card">
            <img src={image} alt={alt} loading="eager" decoding="async" />
          </div>
        </div>

        {/* 8 floating emoji stickers around the card */}
        <div className="ph-emoji-wrap" aria-hidden="true">
          {emojiStickers.map((e, i) => (
            <div
              key={i}
              className="ph-emoji"
              style={{
                background: e.bg,
                width: e.size,
                height: e.size,
                fontSize: `calc(${e.size} * 0.55)`,
                left: e.left,
                right: e.right,
                top: e.top,
                ["--rot" as string]: `${e.rot}deg`,
                ["--pop-delay" as string]: e.popDelay,
                ["--delay" as string]: e.delay,
                ["--dur" as string]: e.dur,
              }}
            >
              {e.char}
            </div>
          ))}
        </div>

        {/* floating decorations: 20-60px outside card edge, small, aria-hidden */}
        <div ref={decoRef} className="ph-deco" aria-hidden="true">
          {/* yellow sparkle, top-left of card */}
          <svg className="ph-sparkle" width="32" height="32" viewBox="0 0 44 44" style={{ left: "calc(50% - 480px)", top: "120px" }}>
            <path d="M22 0 L26 18 L44 22 L26 26 L22 44 L18 26 L0 22 L18 18 Z" fill="#ffd60a" />
          </svg>
          {/* pink sparkle, right of card */}
          <svg className="ph-sparkle ph-deco-extra" width="28" height="28" viewBox="0 0 44 44" style={{ right: "calc(50% - 480px)", top: "200px", animationDelay: "1.2s" }}>
            <path d="M22 0 L26 18 L44 22 L26 26 L22 44 L18 26 L0 22 L18 18 Z" fill="#ff0a8a" />
          </svg>
          {/* cute-face circle, bottom-left of card */}
          <svg className="ph-face" width="40" height="40" viewBox="0 0 48 48" style={{ left: "calc(50% - 470px)", bottom: "80px" }}>
            <circle cx="24" cy="24" r="22" fill="#A58CF4" />
            <circle cx="17" cy="20" r="2.5" fill="#0D0D0D" />
            <circle cx="31" cy="20" r="2.5" fill="#0D0D0D" />
          </svg>
          {/* plus sign, top-right of card */}
          <svg className="ph-deco-extra" width="28" height="28" viewBox="0 0 32 32" style={{ right: "calc(50% - 470px)", top: "140px" }}>
            <rect x="13" y="4" width="6" height="24" rx="3" fill="#FAFAFA" />
            <rect x="4" y="13" width="24" height="6" rx="3" fill="#FAFAFA" />
          </svg>
        </div>
      </div>
    </>
  );
}
