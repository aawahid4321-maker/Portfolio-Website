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
}

export default function ProjectHero({
  title, type, year, client, image, alt,
  onNavigateHome, onNavigateWork, onNavigateAbout,
}: ProjectHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const blobsRef = useRef<HTMLDivElement>(null);
  const decoRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuOpen = useRef(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (reduceMotion || isTouch) return; // static layout, no tilt/parallax

    let raf = 0;
    let mx = 0, my = 0;       // mouse target (-0.5..0.5)
    let cx = 0, cy = 0;       // lerped cursor
    let ticking = false;

    const onMouse = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      if (!ticking) { ticking = true; raf = requestAnimationFrame(tick); }
    };
    const tick = () => {
      cx += (mx - cx) * 0.1; // lerp 0.1
      cy += (my - cy) * 0.1;
      // card tilts up to 4deg toward the mouse (perspective 1000px)
      if (cardRef.current) {
        cardRef.current.style.transform =
          `perspective(1000px) rotateY(${cx * 8}deg) rotateX(${-cy * 8}deg)`;
      }
      // decorations parallax 10–20px
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

    // scroll: title parallax 0.25x, blobs shift — transform only, passive
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y === lastY) return;
      lastY = y;
      if (titleRef.current) {
        titleRef.current.style.transform = `translateY(${y * 0.25}px)`;
      }
      if (blobsRef.current) {
        blobsRef.current.style.transform = `translateY(${y * 0.12}px)`;
      }
      // nav backdrop after 40px
      if (navRef.current) {
        navRef.current.classList.toggle("is-scrolled", y > 40);
      }
    };

    hero.addEventListener("mousemove", onMouse);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      hero.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // title words for mask reveal
  const words = title.split(" ");
  const tags = [
    { label: type, cls: "tag-purple" },
    { label: year, cls: "tag-yellow" },
    { label: client, cls: "tag-pink" },
  ];

  return (
    <>
      <style>{`
        .ph-hero {
          --ph-purple-light: #A58CF4;
          --ph-pink: #ff0a8a;
          --ph-yellow: #ffd60a;
          --ph-soft-white: #FAFAFA;
          --ph-jet-black: #0D0D0D;
          position: relative;
          width: 100%;
          height: 1050px;
          min-height: 640px;
          background: var(--ph-jet-black);
          overflow: visible; /* card overlaps bottom edge by ~80px */
        }
        .ph-hero-bg {
          position: absolute;
          inset: 0;
          height: 1050px;
          overflow: hidden;
          background: var(--ph-jet-black);
        }
        /* gradient mesh: 3 pre-softened radial blobs */
        .ph-hero-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 700px 480px at 18% 18%, rgba(165,140,244,0.55), transparent 70%),
            radial-gradient(ellipse 340px 280px at 82% 78%, rgba(255,10,138,0.30), transparent 70%),
            radial-gradient(ellipse 220px 170px at 86% 14%, rgba(255,214,10,0.18), transparent 70%);
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
        .ph-blobs { position: absolute; inset: 0; pointer-events: none; }
        .ph-blob { position: absolute; border-radius: 50%; }
        .ph-blob-1 {
          width: 560px; height: 560px; left: -120px; top: -140px;
          background: radial-gradient(circle, rgba(165,140,244,0.5), transparent 70%);
          animation: ph-drift 18s ease-in-out infinite alternate;
        }
        .ph-blob-2 {
          width: 380px; height: 380px; right: -80px; bottom: 60px;
          background: radial-gradient(circle, rgba(255,10,138,0.28), transparent 70%);
          animation: ph-drift 14s ease-in-out infinite alternate-reverse;
        }
        .ph-blob-3 {
          width: 240px; height: 240px; right: 12%; top: 8%;
          background: radial-gradient(circle, rgba(255,214,10,0.16), transparent 70%);
          animation: ph-drift 20s ease-in-out infinite alternate;
        }
        @keyframes ph-drift {
          from { transform: translate(0, 0); }
          to { transform: translate(40px, -40px); }
        }

        /* nav */
        .ph-nav {
          position: absolute;
          top: 0; left: 0; right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 48px;
          z-index: 30; /* always above the title */
          transition: background 0.3s ease;
        }
        .ph-nav.is-scrolled { background: rgba(13,13,13,0.7); }
        .ph-logo {
          font-family: "Zilla Slab", Rockwell, Georgia, serif;
          font-weight: 700;
          font-size: 19px;
          color: var(--ph-soft-white);
          text-transform: uppercase;
          cursor: pointer;
          letter-spacing: 0.04em;
        }
        .ph-links {
          display: flex;
          align-items: center;
          gap: 12px;
          width: max-content; /* fix: never clip */
          overflow: visible;
          white-space: nowrap;
        }
        .ph-links a {
          font-family: "Zilla Slab", Rockwell, Georgia, serif;
          font-weight: 700;
          font-size: 15px;
          text-transform: uppercase;
          color: var(--ph-soft-white);
          cursor: pointer;
          letter-spacing: 0.03em;
        }
        .ph-links a:hover { color: var(--ph-purple-light); }
        .ph-sep { color: rgba(250,250,250,0.5); font-size: 15px; }
        .ph-hire {
          font-family: "Zilla Slab", Rockwell, Georgia, serif;
          font-weight: 700;
          font-size: 15px;
          text-transform: uppercase;
          color: var(--ph-jet-black);
          background: var(--ph-purple-light);
          border: 2px solid var(--ph-jet-black);
          border-radius: 999px;
          padding: 12px 22px;
          cursor: pointer;
          box-shadow: 3px 3px 0 var(--ph-soft-white);
          transition: background 0.2s ease, transform 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ph-hire:hover { background: var(--ph-soft-white); }
        .ph-hire .ph-arrow { transition: transform 0.2s ease; display: inline-block; }
        .ph-hire:hover .ph-arrow { transform: translate(3px, -3px); }
        .ph-menu-btn { display: none; }

        /* title */
        .ph-title {
          position: relative;
          z-index: 10;
          text-align: center;
          margin: 190px auto 0; /* clear of the nav row */
          padding: 0 24px;
          font-family: "Geist", system-ui, sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          font-size: clamp(48px, 8vw, 120px); /* capped so it never hits the nav */
          line-height: 0.95;
          color: var(--ph-soft-white);
          max-width: 1400px;
        }
        .ph-title .mask {
          display: inline-block;
          overflow: hidden;
          vertical-align: top;
          padding-bottom: 0.08em; /* descender room */
        }
        .ph-title .mask > span {
          display: inline-block;
          transform: translateY(110%);
          animation: ph-reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes ph-reveal { to { transform: translateY(0); } }

        /* tag pills */
        .ph-tags {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 28px;
          flex-wrap: wrap;
          padding: 0 24px;
        }
        .ph-tag {
          font-family: "Zilla Slab", Rockwell, Georgia, serif;
          font-weight: 700;
          font-size: 15px;
          padding: 10px 22px;
          border-radius: 999px;
          transform: scale(0.6);
          opacity: 0;
          animation: ph-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          white-space: nowrap;
        }
        @keyframes ph-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .tag-purple { background: var(--ph-purple-light); color: var(--ph-jet-black); }
        .tag-yellow { background: var(--ph-yellow); color: var(--ph-jet-black); }
        .tag-pink { background: var(--ph-pink); color: var(--ph-soft-white); }

        /* sticker card */
        .ph-card-wrap {
          position: relative;
          z-index: 10;
          width: min(1100px, 88vw);
          margin: 48px auto 0;
          animation: ph-card-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.35s backwards;
        }
        @keyframes ph-card-in {
          from { transform: translateY(60px) rotate(-3deg); opacity: 0; }
          to { transform: translateY(0) rotate(0); opacity: 1; }
        }
        .ph-card {
          position: relative;
          border-radius: 28px;
          border: 3px solid var(--ph-jet-black);
          outline: 2px solid var(--ph-soft-white);
          outline-offset: -2px;
          box-shadow: 10px 10px 0 var(--ph-purple-light);
          overflow: hidden;
          aspect-ratio: 16 / 9;
          background: var(--ph-jet-black);
          animation: ph-float 5s ease-in-out 1.4s infinite;
          transform-style: preserve-3d;
          will-change: transform;
        }
        @keyframes ph-float {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -8px; }
        }
        .ph-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* floating decorations (behind card) */
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
          .ph-links { display: none; }
          .ph-menu-btn {
            display: block;
            background: none;
            border: 2px solid var(--ph-soft-white);
            border-radius: 999px;
            color: var(--ph-soft-white);
            font-family: "Zilla Slab", serif;
            font-weight: 700;
            font-size: 14px;
            padding: 10px 18px;
            cursor: pointer;
          }
          .ph-title { font-size: 44px; margin-top: 120px; }
          .ph-card-wrap { width: 92vw; }
          .ph-card { aspect-ratio: 4 / 3; box-shadow: 6px 6px 0 var(--ph-purple-light); }
          .ph-deco .ph-deco-extra { display: none; } /* 2 decorations on mobile */
        }

        /* reduced motion: final static layout */
        @media (prefers-reduced-motion: reduce) {
          .ph-title .mask > span { animation: none; transform: none; }
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

        {/* nav */}
        <nav ref={navRef} className="ph-nav" aria-label="Project page navigation">
          <div className="ph-logo" onClick={onNavigateHome}>ABDUL</div>
          <div className="ph-links">
            <a onClick={onNavigateHome}>Home</a>
            <span className="ph-sep">/</span>
            <a onClick={onNavigateWork}>Work</a>
            <span className="ph-sep">/</span>
            <a onClick={onNavigateAbout}>About</a>
          </div>
          <button className="ph-menu-btn" onClick={() => {
            menuOpen.current = !menuOpen.current;
            const links = heroRef.current?.querySelector(".ph-links") as HTMLElement;
            if (links) links.style.display = menuOpen.current ? "flex" : "";
          }}>Menu</button>
          <button className="ph-hire" onClick={onNavigateHome}>
            Hire <span className="ph-arrow">↗</span>
          </button>
        </nav>

        {/* title: mask reveal, stagger 80ms per word */}
        <h1 ref={titleRef} className="ph-title">
          {words.map((w, i) => (
            <span key={i} className="mask">
              <span style={{ animationDelay: `${i * 80}ms` }}>{w}</span>
              {i < words.length - 1 ? "\u00A0" : ""}
            </span>
          ))}
        </h1>

        {/* tag pills: pop, stagger 90ms */}
        <div className="ph-tags">
          {tags.map((t, i) => (
            <span key={t.label} className={`ph-tag ${t.cls}`} style={{ animationDelay: `${400 + i * 90}ms` }}>
              {t.label}
            </span>
          ))}
        </div>

        {/* sticker card */}
        <div className="ph-card-wrap">
          <div ref={cardRef} className="ph-card">
            <img src={image} alt={alt} loading="eager" decoding="async" />
          </div>
        </div>

        {/* floating decorations */}
        <div ref={decoRef} className="ph-deco" aria-hidden="true">
          {/* yellow sparkle, top-left of card */}
          <svg className="ph-sparkle" width="44" height="44" viewBox="0 0 44 44" style={{ left: "12%", top: "42%" }}>
            <path d="M22 0 L26 18 L44 22 L26 26 L22 44 L18 26 L0 22 L18 18 Z" fill="#ffd60a" />
          </svg>
          {/* pink sparkle, right of card */}
          <svg className="ph-sparkle ph-deco-extra" width="36" height="36" viewBox="0 0 44 44" style={{ right: "10%", top: "55%", animationDelay: "1.2s" }}>
            <path d="M22 0 L26 18 L44 22 L26 26 L22 44 L18 26 L0 22 L18 18 Z" fill="#ff0a8a" />
          </svg>
          {/* cute-face circle, bottom-left */}
          <svg className="ph-face" width="48" height="48" viewBox="0 0 48 48" style={{ left: "16%", bottom: "18%" }}>
            <circle cx="24" cy="24" r="22" fill="#A58CF4" />
            <circle cx="17" cy="20" r="2.5" fill="#0D0D0D" />
            <circle cx="31" cy="20" r="2.5" fill="#0D0D0D" />
          </svg>
          {/* plus sign, top-right */}
          <svg className="ph-deco-extra" width="32" height="32" viewBox="0 0 32 32" style={{ right: "18%", top: "38%" }}>
            <rect x="13" y="4" width="6" height="24" rx="3" fill="#FAFAFA" />
            <rect x="4" y="13" width="24" height="6" rx="3" fill="#FAFAFA" />
          </svg>
        </div>
      </div>
    </>
  );
}
