import { useEffect, useRef, useState } from "react";
import type { ProjectData } from "@/data/projects";
import { projects } from "@/data/projects";
import portraitImg from "@/imports/Frame9/a802e39c0a569dd08888c01370ae28cb47976544.webp";
// Mobile/tablet About portrait (purple-lit). Desktop keeps its own images.
import aboutHeroImg from "@/imports/mobile/about-portrait-purple-1280.webp";
import aboutHeroImgSmall from "@/imports/mobile/about-portrait-purple-720.webp";
import PhysicsTags from "@/components/PhysicsTags";
import ProjectHero from "@/components/ProjectHero";
import axorixHomeImg from "@/assets/axorix-hero.webp";
import { DotPortrait, MobileConnect, MobileConnectCopy, TapConfetti, useScrollScrub } from "@/components/MobileFx";

type View = "home" | "about" | "work" | "project" | "nodaliq-site";

interface MobileSiteProps {
  view: View;
  currentProject?: ProjectData;
  nextProject?: ProjectData;
  onNavigateHome: () => void;
  onNavigateWork: () => void;
  onNavigateAbout: () => void;
  onNavigateProject: (id: string) => void;
  onNavigateSite?: () => void;
}

const CONTACT_EMAIL = "aawahid321@gmail.com";
// Same wording as the desktop footer.
const PHONES = [
  { label: "+92 329 5460848", tel: "+923295460848" },
  { label: "+92 336 5934828", tel: "+923365934828" },
];
const LINKEDIN = "https://www.linkedin.com/in/abdul-wahid-7763b8377/";

// Desktop "My Services" list: [0n] / name / sub-heading / description.
const SERVICES = [
  { name: "Brand Strategy", head: "1.1 / BUILDING A CLEAR BRAND DIRECTION", body: "I define the positioning, personality, audience, and visual direction that give a brand a clear place in the market." },
  { name: "Art Direction", head: "2.1 / SHAPING THE VISUAL WORLD OF A BRAND", body: "I develop the creative direction, mood, and visual language that bring an idea to life and make it feel distinctive." },
  { name: "Brand Visuals", head: "3.1 / CREATING IDENTITIES PEOPLE REMEMBER", body: "From logos and visual systems to typography and color, I build cohesive identities that feel recognizable and built to last." },
  { name: "Website Design", head: "4.1 / TURNING BRAND INTO DIGITAL EXPERIENCE", body: "I design websites that bring the brand together with clear structure, thoughtful interactions, and a strong visual point of view." },
  { name: "UI/UX Design", head: "5.1 / MAKING DIGITAL PRODUCTS FEEL SIMPLE.", body: "I create intuitive interfaces and user experiences that balance function, clarity, and visual character." },
  { name: "Campaign Big Ideas", head: "6.1 / TURNING IDEAS INTO CAMPAIGNS PEOPLE NOTICE.", body: "I develop big creative ideas and campaign directions that give brands something worth saying, seeing, and remembering." },
];

// Desktop home "Selected Works": 6 projects, desktop order, years and images.
const HOME_WORKS: { id: string; year: string; img?: string }[] = [
  { id: "noire-coffee", year: "2026" },
  { id: "fitflow", year: "2025" },
  { id: "stint", year: "2025" },
  { id: "axorix", year: "2025", img: axorixHomeImg },
  { id: "pypo", year: "2025" },
  { id: "brochure", year: "2024" },
];
// Desktop Work page order.
const WORK_ORDER = ["noire-coffee", "fitflow", "axorix", "nodaliq", "stint", "chatblast", "brochure", "brand", "pypo", "mini"];
const byId = (id: string) => projects.find((p) => p.id === id);

// Desktop About: metrics + experience.
const METRICS = [
  { l: "Years Experience", n: "2+", c: "#A58CF4", blink: 2.5 },
  { l: "Projects Completed", n: "50+", c: "#FF0A8A", blink: 3.1 },
  { l: "Different Design Industries", n: "8+", c: "#FFD60A", blink: 2.8 },
  { l: "Agencies Worked With", n: "5+", c: "#FF5A00", blink: 3.4 },
];
const EXPERIENCE = [
  { role: "Graphic & Visual Designer / Social Media Manager", co: "Snap Sol & Alverm", yr: "2026 – Present" },
  { role: "Graphic Designer", co: "The Voyage Studio", yr: "2025 – Present" },
  { role: "Social Media Manager", co: "Suzuki Islamabad Motors", yr: "2025 - 2026" },
  { role: "Brand & Logo Designer", co: "Local Pro", yr: "2025" },
  { role: "Graphic Design Intern", co: "E-Tech Marketing", yr: "2025" },
];

const hireMe = () =>
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });

// ── In-view hook — mirrors the desktop scroll-reveal gating ───────────────────
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

// ── Text reveal — desktop `revealTextUp` motion ───────────────────────────────
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? undefined : 0,
        animation: inView
          ? `revealTextUp 0.85s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`
          : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ── Image reveal — center-out clip (desktop `revealExpandX`) + zoom, sharp edges.
//    Clip reveals on in-view via CSS transition; the image fades/zooms in on load
//    independently, so a slow decode can never leave the image hidden. ──────────
function MobileImage({
  src,
  alt = "",
  ratio = "4 / 3",
  priority = false,
  natural = false,
  scrub = false,
  srcSet,
  sizes,
}: {
  src: string;
  alt?: string;
  ratio?: string;
  priority?: boolean;
  /** Use the image's own aspect ratio once loaded (no cropping). */
  natural?: boolean;
  /** Desktop card effect: clip opens/closes + zoom tied to scroll position. */
  scrub?: boolean;
  srcSet?: string;
  sizes?: string;
}) {
  // Observe an unclipped wrapper: IntersectionObserver applies the target's
  // own clip-path, so observing the clipped box (inset 0 50%) never reported
  // it as visible and every image stayed hidden.
  const [ref, inView] = useInView();
  const [loaded, setLoaded] = useState(false);
  const [nat, setNat] = useState<string | null>(null);
  const { boxRef, imgRef, active: scrubbing } = useScrollScrub(scrub);
  return (
    <div ref={ref} className="w-full">
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden bg-[#d8d8d8]"
      style={{
        aspectRatio: (natural && nat) || ratio,
        clipPath: scrubbing ? undefined : inView ? "inset(0 0 0 0)" : "inset(0 50% 0 50%)",
        transition: scrubbing ? undefined : "clip-path 1.1s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <img
        ref={imgRef}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={(e) => {
          setLoaded(true);
          const im = e.currentTarget;
          if (natural && im.naturalWidth && im.naturalHeight) setNat(`${im.naturalWidth} / ${im.naturalHeight}`);
        }}
        className="absolute inset-0 h-full w-full object-cover"
        style={
          scrubbing
            ? { opacity: loaded ? 1 : 0, transition: "opacity 0.7s ease", willChange: "transform" }
            : {
                opacity: loaded ? 1 : 0,
                transform: loaded ? "scale(1)" : "scale(1.08)",
                transition: "opacity 0.7s ease, transform 1.1s cubic-bezier(0.16,1,0.3,1)",
              }
        }
      />
    </div>
    </div>
  );
}

// ── Vertical grid lines background — same device as the desktop grid columns ───
function GridLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to right, #d4d4d4 0, #d4d4d4 1px, transparent 1px, transparent 56px)",
        backgroundPosition: "24px 0",
      }}
    />
  );
}

// ── Section label (mono, bracketed) ───────────────────────────────────────────
function Label({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span
      className={`font-pt-mono-ss text-[13px] uppercase tracking-[0.04em] ${
        dim ? "text-[rgba(242,242,242,0.4)]" : "text-[#8a8a8a]"
      }`}
    >
      {children}
    </span>
  );
}

// ── Social icon (desktop footer shows LinkedIn only) ─────────────────────────
const IconLinkedIn = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-label="LinkedIn">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

// ── Desktop pill nav (smiley logo · Home / Work / About · Hire me ↗) ──────────
//    Links sit inline from 768px; phones get a MENU button + full-screen menu.
function SmileyLogo() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" className="h-[72%] w-[72%] block">
      <circle cx="22" cy="22" r="20" fill="#A58CF4" />
      <g className="m-pp-eyes" fill="#0D0D0D">
        <circle cx="16" cy="19" r="3" />
        <circle cx="28" cy="19" r="3" />
      </g>
      <path d="M16,27 Q22,31 28,27" stroke="#0D0D0D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

type NavKey = "home" | "work" | "about";

function MobileNav({
  active,
  onHome,
  onWork,
  onAbout,
}: {
  active: NavKey;
  onHome: () => void;
  onWork: () => void;
  onAbout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  const links: { key: NavKey; label: string; fn: () => void }[] = [
    { key: "home", label: "Home", fn: onHome },
    { key: "work", label: "Work", fn: onWork },
    { key: "about", label: "About", fn: onAbout },
  ];
  const zilla = { fontFamily: '"Zilla Slab", Georgia, serif', fontWeight: 500 } as const;
  return (
    <>
      <style>{`
        .m-pill { box-shadow: 0 0 0 2.5px #FAFAFA, 6px 6px 0 #A58CF4; animation: mPillDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes mPillDrop {
          0% { transform: translateX(-50%) translateY(-50px); opacity: 0; }
          60% { transform: translateX(-50%) translateY(8px); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .m-pp-eyes { transform-box: fill-box; transform-origin: center; animation: mBlink 4.5s ease-in-out infinite; }
        @keyframes mBlink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
        .m-pill-link { transition: background-color 0.3s ease, color 0.2s ease; }
        .m-hire:active { transform: translateY(2px) scale(1.02); }
        @media (prefers-reduced-motion: reduce) { .m-pill, .m-pp-eyes { animation: none; } }
      `}</style>
      <header
        className="m-pill fixed top-[12px] left-1/2 z-[60] grid w-[calc(100%-24px)] max-w-[1040px] grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center rounded-full border-[2.5px] border-[#0D0D0D] bg-[#0D0D0D] p-[7px] h-[64px] md:h-[76px]"
        style={{ transform: "translateX(-50%)" }}
      >
        <button
          onClick={() => go(onHome)}
          aria-label="Home"
          className="flex h-[46px] w-[46px] md:h-[58px] md:w-[58px] items-center justify-center rounded-full border-2 border-[#0D0D0D] bg-[#A58CF4]"
        >
          <SmileyLogo />
        </button>
        <nav className="hidden md:flex items-center gap-[6px] justify-self-center">
          {links.map((l) => (
            <button
              key={l.key}
              onClick={() => go(l.fn)}
              className={`m-pill-link rounded-full px-[20px] h-[52px] text-[18px] ${
                active === l.key ? "bg-[#A58CF4] text-[#0D0D0D]" : "text-[#FAFAFA]"
              }`}
              style={zilla}
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-[8px] justify-self-end">
          <button
            onClick={() => setOpen(true)}
            className="md:hidden rounded-full bg-[#A58CF4] px-[16px] h-[46px] text-[14px] font-semibold text-[#0D0D0D]"
            style={{ fontFamily: '"Geist", system-ui, sans-serif' }}
          >
            Menu
          </button>
          <button
            onClick={() => go(hireMe)}
            className="m-hire rounded-full bg-[#FAFAFA] px-[18px] md:px-[26px] h-[46px] md:h-[56px] text-[15px] md:text-[18px] font-semibold text-[#0D0D0D] whitespace-nowrap"
            style={{ fontFamily: '"Geist", system-ui, sans-serif' }}
          >
            Hire me <span aria-hidden>↗</span>
          </button>
        </div>
      </header>

      {/* Full-screen menu (phones) */}
      <div
        className="fixed inset-0 z-[70] bg-[#e6e6e6] flex flex-col px-[20px] md:px-[40px]"
        style={{
          transform: open ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.6s cubic-bezier(0.77,0,0.18,1)",
          pointerEvents: open ? "auto" : "none",
          visibility: open ? "visible" : "hidden",
          transitionProperty: "transform, visibility",
          transitionDelay: open ? "0s, 0s" : "0s, 0.6s",
        }}
      >
        <div className="flex items-center justify-between h-[88px]">
          <button
            onClick={() => go(onHome)}
            aria-label="Home"
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-2 border-[#0D0D0D] bg-[#A58CF4]"
          >
            <SmileyLogo />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full bg-[#0D0D0D] px-[20px] h-[46px] text-[14px] font-semibold text-white"
            style={{ fontFamily: '"Geist", system-ui, sans-serif' }}
          >
            Close
          </button>
        </div>

        <nav className="mt-auto flex flex-col">
          {[...links, { key: "hire" as const, label: "Hire me ↗", fn: hireMe }].map((item) => (
            <button
              key={item.key}
              onClick={() => go(item.fn)}
              className={`text-left text-[34px] leading-[1.45] ${item.key === active ? "text-[#7a5ce6]" : "text-[#1e1e1f]"}`}
              style={zilla}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-[40px] mb-[48px] flex flex-col gap-[16px]">
          <Label>[Socials]</Label>
          <div className="flex gap-[18px] text-[#1e1e1f]">
            <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><IconLinkedIn /></a>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Project card (home + work) — title + year, as on desktop ──────────────────
function ProjectCard({
  project,
  onClick,
  year,
  img,
}: {
  project: ProjectData;
  onClick: () => void;
  year?: string;
  img?: string;
}) {
  return (
    <button onClick={onClick} className="block w-full text-left">
      <MobileImage src={img ?? project.thumbnail} alt={project.title} ratio="16 / 9" scrub />
      <Reveal>
        <div className="mt-[14px] flex items-baseline justify-between">
          <span className="font-pt-mono-ss text-[17px] md:text-[19px] text-[#29292b] uppercase">
            {project.title}
          </span>
          <span className="font-pt-mono-ss text-[17px] md:text-[19px] text-[#29292b]">{year ?? project.year}</span>
        </div>
      </Reveal>
    </button>
  );
}

// ── Let's Connect band + copy, then the dark footer (desktop order) ──────────
function MobileFooter() {
  return (
    <>
      <MobileConnect />
      <MobileConnectCopy />
      <footer className="relative z-10 bg-[#e6e6e6] px-[24px] md:px-[40px] pt-[64px] md:pt-[88px] pb-[104px]">
        <div className="md:grid md:grid-cols-2 md:gap-x-[48px]">
          <Reveal>
            <p className="font-pt-mono-ss text-[14px] md:text-[17px] uppercase tracking-[0.04em] text-[rgba(13,13,13,0.55)]">[Available for new projects]</p>
            <h2 className="mt-[24px] font-geist-semibold-ss text-[#0D0D0D] text-[52px] md:text-[72px] leading-[1.02] tracking-[-2px]">
              <span className="block">Let&apos;s Get</span>
              <span className="block">to Work</span>
            </h2>
            <p className="mt-[22px] font-geist-regular-ss text-[16px] md:text-[17px] leading-[1.65] text-[rgba(13,13,13,0.6)] max-w-[440px]">
              If you're interested in learning more about my services, discussing a potential
              project, or just want to chat about design and creativity, I'm here to listen.
            </p>
          </Reveal>

          <Reveal delay={100} className="md:pt-[8px]">
            <div className="mt-[48px] md:mt-0 flex flex-col gap-[8px]">
              <span className="font-pt-mono-ss text-[18px] md:text-[20px] uppercase text-[#0D0D0D]">Wahid</span>
              <span className="font-pt-mono-ss text-[15px] md:text-[18px] uppercase text-[rgba(13,13,13,0.5)]">
                Multidisciplinary Designer
              </span>
            </div>

            <div className="mt-[40px] flex flex-col gap-[12px]">
              <p className="font-pt-mono-ss text-[15px] md:text-[18px] uppercase text-[rgba(13,13,13,0.5)]">[Contact]</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-[10px] font-geist-medium-ss text-[19px] md:text-[21px] tracking-[-0.5px] text-[#0D0D0D]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
                {CONTACT_EMAIL}
              </a>
              {PHONES.map((ph) => (
                <a key={ph.tel} href={`tel:${ph.tel}`} className="flex items-center gap-[10px] font-geist-medium-ss text-[19px] md:text-[21px] tracking-[-0.5px] text-[#0D0D0D]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {ph.label}
                </a>
              ))}
            </div>

            <div className="mt-[40px] flex flex-col gap-[14px]">
              <p className="font-pt-mono-ss text-[15px] md:text-[18px] uppercase text-[rgba(13,13,13,0.5)]">[Socials]</p>
              <div className="flex gap-[12px]">
                <a
                  href={LINKEDIN}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[rgba(13,13,13,0.25)] text-[rgba(13,13,13,0.85)] active:scale-110 transition-transform"
                >
                  <IconLinkedIn />
                </a>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <p className="mt-[48px] md:mt-[72px] font-pt-mono-ss text-[13px] md:text-[16px] uppercase text-[rgba(13,13,13,0.5)]">
            ©2026. All rights reserved
          </p>
        </Reveal>
      </footer>
    </>
  );
}

// Big section heading (desktop 237px headings, scaled)
function BigHeading({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <h2 className="font-geist-semibold-ss text-[#1e1e1f] leading-[0.95] tracking-[-2px] md:tracking-[-4px]" style={{ fontSize: "clamp(48px, 13vw, 140px)" }}>
        {children}
      </h2>
    </Reveal>
  );
}

// ── Giant display heading with © (reference hero) ─────────────────────────────
function DisplayHeading({ text, size, fluid }: { text: string; size: string; fluid?: string }) {
  return (
    <Reveal>
      <h1
        className="font-geist-semibold-ss text-[#1e1e1f] leading-[0.92] tracking-[-3px] relative inline-block"
        style={{ fontSize: `max(${size}, ${fluid ?? size})` }}
      >
        {text}
        <span className="align-super font-pt-mono-ss text-[16px] tracking-normal ml-[4px]">©</span>
      </h1>
    </Reveal>
  );
}

// ── HOME (desktop order: hero → Selected Works → Introduction → tags → services) ─
function MobileHome({ onProject, onAbout }: { onProject: (id: string) => void; onAbout: () => void }) {
  return (
    <>
      <div className="md:grid md:grid-cols-2 md:gap-x-[40px] md:px-[40px] md:pt-[128px] md:items-start">
        <section className="relative z-10 px-[24px] md:px-0 pt-[104px] md:pt-0">
          <DisplayHeading text="Wahid" size="84px" fluid="min(14vw, 170px)" />

          <div className="mt-[36px] flex gap-[16px]">
            <div className="shrink-0 pt-[3px]">
              <Label>[Intro]</Label>
            </div>
            <Reveal>
              <p className="font-geist-medium-ss text-[18px] md:text-[22px] leading-[1.35] tracking-[-0.3px] text-[#1e1e1f]">
                I build brands, visual identities, and social creatives that help businesses
                communicate, connect, and grow.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="relative z-10 px-[24px] md:px-0 mt-[32px] md:mt-0">
          <Reveal delay={60}>
            <p className="mb-[12px] font-geist-medium-ss text-[30px] tracking-[-0.6px] text-[#1e1e1f]">/ 28</p>
          </Reveal>
          <DotPortrait src={portraitImg} alt="Wahid" ratio="4 / 5" />
          <Reveal delay={80}>
            <p className="mt-[14px] font-geist-medium-ss text-[18px] text-[#1e1e1f]">Scroll Down</p>
          </Reveal>
        </section>
      </div>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[80px]">
        <BigHeading>Selected Works</BigHeading>
        <div className="mt-[32px] flex flex-col gap-[48px] md:grid md:grid-cols-2 md:gap-x-[24px] md:gap-y-[56px]">
          {HOME_WORKS.map((w) => {
            const p = byId(w.id);
            return p ? <ProjectCard key={p.id} project={p} year={w.year} img={w.img} onClick={() => onProject(p.id)} /> : null;
          })}
        </div>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[96px]">
        <BigHeading>Introduction</BigHeading>
        <Reveal>
          <div className="mt-[28px]">
            <Label>[Process]</Label>
          </div>
        </Reveal>
        <div className="mt-[16px] flex flex-col gap-[22px] max-w-[820px]">
          <Reveal>
            <p className="font-geist-medium-ss text-[19px] md:text-[23px] leading-[1.45] tracking-[-0.3px] text-[#1e1e1f]">
              I’m Abdul Wahid, a multidisciplinary designer working across branding, visual
              identity, logo design, social media creatives, and presentation design — with
              hands-on experience in video editing and motion graphics.
            </p>
          </Reveal>
          <Reveal delay={60}>
            <p className="font-geist-medium-ss text-[19px] md:text-[23px] leading-[1.45] tracking-[-0.3px] text-[#1e1e1f]">
              For me, good design starts with understanding the business, the audience, and the
              goal. I turn those insights into a clear creative direction — building strong brand
              identities and compelling visual experiences that communicate clearly, connect with
              people, and help businesses grow.
            </p>
          </Reveal>
        </div>
        <Reveal delay={100}>
          <button
            onClick={onAbout}
            className="mt-[28px] inline-flex items-center gap-[10px] bg-[#1e1e1f] px-[24px] py-[14px] rounded-[6px] font-pt-mono-ss text-[15px] uppercase tracking-[0.04em] text-white"
          >
            Learn More <span aria-hidden>↗</span>
          </button>
        </Reveal>
      </section>

      {/* Physics tags (desktop section): drag with a long-press, tap to poke;
          normal swipes scroll the page. */}
      <section className="relative z-10 px-[24px] md:px-[40px] mt-[64px]" data-cursor="drag">
        <PhysicsTags />
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[80px]">
        <Reveal>
          <div className="flex items-baseline justify-between font-pt-mono-ss text-[14px] md:text-[17px] uppercase text-[#29292b]">
            <span>IDENTITY / INTERFACE / EXPERIENCE</span>
            <span>2026</span>
          </div>
        </Reveal>
        <div className="mt-[24px]">
          <BigHeading>My Services</BigHeading>
        </div>
        <div className="mt-[16px] flex flex-col">
          {SERVICES.map((s, i) => (
            <Reveal key={s.name} delay={i * 40}>
              <div className="border-b border-[#cfcfcf] py-[22px] md:grid md:grid-cols-[80px_1fr_1.4fr] md:gap-x-[24px]">
                <div className="flex items-baseline gap-[14px] md:contents">
                  <span className="font-pt-mono-ss text-[14px] text-[#0f0f0f]">[{String(i + 1).padStart(2, "0")}]</span>
                  <span className="font-geist-medium-ss text-[22px] tracking-[-0.4px] text-[#0f0f0f]">{s.name}</span>
                </div>
                <div className="mt-[10px] md:mt-0">
                  <p className="font-pt-mono-ss text-[13px] md:text-[14px] uppercase leading-[1.5] text-[#29292b]">{s.head}</p>
                  <p className="mt-[6px] font-geist-regular-ss text-[16px] md:text-[17px] leading-[1.55] text-[#3a3a3a]">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="mt-[88px]">
        <MobileFooter />
      </div>
    </>
  );
}

// ── WORK ─────────────────────────────────────────────────────────────────────
function MobileWork({ onProject }: { onProject: (id: string) => void }) {
  return (
    <>
      <section className="relative z-10 px-[24px] md:px-[40px] pt-[112px] md:pt-[140px]">
        <DisplayHeading text="Selected Works" size="52px" fluid="min(11vw, 128px)" />

        <Reveal delay={60}>
          <div className="mt-[28px]">
            <Label>[Process]</Label>
          </div>
        </Reveal>

        <Reveal delay={100} className="max-w-[820px]">
          <p className="mt-[24px] font-geist-medium-ss text-[19px] md:text-[23px] leading-[1.45] tracking-[-0.3px] text-[#1e1e1f]">
            I start by understanding the business, audience, and goals, then turn those insights
            into a clear creative direction. From there, I build bold brands, digital
            experiences, and visual systems, refining every detail to create work that
            communicates clearly, connects with people, and helps businesses grow.
          </p>
        </Reveal>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[48px] flex flex-col gap-[48px] md:grid md:grid-cols-2 md:gap-x-[24px] md:gap-y-[56px]">
        {WORK_ORDER.map((id) => {
          const p = byId(id);
          return p ? <ProjectCard key={p.id} project={p} onClick={() => onProject(p.id)} /> : null;
        })}
      </section>

      <div className="mt-[88px]">
        <MobileFooter />
      </div>
    </>
  );
}

// ── Desktop About metric mascots: coloured circle with blinking eyes, liquid
//    fill on scroll-in, gentle pulse; tap = squash-and-stretch (desktop hover).
function MetricMascot({ label, n, color, blink, delay }: { label: string; n: string; color: string; blink: number; delay: number }) {
  const [ref, inView] = useInView(0.2);
  const [tap, setTap] = useState(0);
  return (
    <div ref={ref}>
      <div className="font-geist-medium-ss text-[15px] md:text-[20px] leading-[1.3] text-[#1e1e1f] min-h-[40px]">{label}</div>
      <button
        type="button"
        aria-label={`${n} ${label}`}
        onClick={() => setTap((t) => t + 1)}
        className="m-metric relative mt-[8px] block w-full aspect-square"
        style={{ containerType: "inline-size", opacity: inView ? undefined : 0, animation: inView ? `mMetricPop 0.9s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both` : undefined }}
      >
        <span key={tap} className={`absolute inset-0 block ${tap ? "m-metric-squash" : ""}`}>
          <span className="m-metric-pulse absolute inset-0 block overflow-hidden rounded-full" style={{ background: color }}>
            <span className={`absolute inset-0 block ${inView ? "m-metric-fill" : ""}`} style={{ background: color, filter: "brightness(1.06)", animationDelay: `${delay + 250}ms` }} />
          </span>
        </span>
        <span className="pointer-events-none absolute left-1/2 top-[14cqw] flex -translate-x-1/2 gap-[4cqw]" aria-hidden="true">
          {[0, 1].map((e) => (
            <span key={e} className="m-metric-eye relative block h-[15.5cqw] w-[15.5cqw] rounded-full bg-white" style={{ animationDuration: `${blink}s` }}>
              <span className="absolute left-1/2 top-1/2 block h-[6.4cqw] w-[6.4cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0d0d0d]" />
            </span>
          ))}
        </span>
        <span className="pointer-events-none absolute inset-x-0 top-[38cqw] block text-center font-geist-medium-ss text-[#0D0D0D] leading-none tracking-[-1px]" style={{ fontSize: "29.7cqw" }}>
          {n}
        </span>
      </button>
    </div>
  );
}

// ── ABOUT ────────────────────────────────────────────────────────────────────
function MobileAbout() {
  return (
    <>
      <section className="relative z-10 px-[24px] md:px-[40px] pt-[112px] md:pt-[140px]">
        <DisplayHeading text="About" size="84px" fluid="min(18vw, 200px)" />
        <Reveal delay={60}>
          <div className="mt-[24px] flex items-baseline justify-between gap-[16px]">
            <Label>Multidisciplinary Designer</Label>
            <Label>[EST 2005]</Label>
          </div>
        </Reveal>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[16px] md:max-w-[640px]">
        <MobileImage
          src={aboutHeroImg}
          srcSet={`${aboutHeroImgSmall} 720w, ${aboutHeroImg} 1280w`}
          sizes="(min-width: 768px) 640px, 100vw"
          alt="Abdul Wahid"
          ratio="1632 / 1882"
          priority
        />
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[48px]">
        <Reveal>
          <Label>[about me]</Label>
        </Reveal>
        <div className="mt-[16px] flex flex-col gap-[22px] max-w-[820px]">
          <Reveal>
            <p className="font-geist-medium-ss text-[19px] md:text-[23px] leading-[1.45] tracking-[-0.3px] text-[#1e1e1f]">
              I’m Abdul Wahid, a multidisciplinary designer with hands-on experience in branding,
              visual identity, logo design, and social media creatives. Skilled at transforming
              concepts into compelling visual experiences that build strong brand identities and
              effectively engage target audiences.
            </p>
          </Reveal>
          <Reveal delay={60}>
            <p className="font-geist-medium-ss text-[19px] md:text-[23px] leading-[1.45] tracking-[-0.3px] text-[#1e1e1f]">
              I like working where creativity meets strategy — finding the idea that gives a
              brand its character and making sure it carries through every touchpoint, from
              logo and typography to social media and motion.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[64px]">
        <Reveal>
          <p className="font-geist-semibold-ss text-[#1e1e1f] leading-[1.05] tracking-[-1.5px]" style={{ fontSize: "clamp(30px, 7vw, 64px)" }}>
            STRATEGY → BRAND → PRODUCT → EXPERIENCE
          </p>
        </Reveal>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[64px]">
        <Reveal>
          <p className="font-geist-medium-ss text-[#0f0f0f] leading-[1.15] tracking-[-1px] max-w-[900px]" style={{ fontSize: "clamp(28px, 6vw, 56px)" }}>
            Results: A Snapshot of My Professional Achievements and Key Performance Metrics.
          </p>
        </Reveal>
        <div className="mt-[36px] grid grid-cols-2 gap-x-[16px] gap-y-[32px] md:gap-x-[32px] md:max-w-[900px]">
          {METRICS.map((m, i) => (
            <MetricMascot key={m.l} label={m.l} n={m.n} color={m.c} blink={m.blink} delay={i * 150} />
          ))}
        </div>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[80px]">
        <BigHeading>Experience</BigHeading>
        <div className="mt-[24px] flex flex-col">
          {EXPERIENCE.map((e, i) => (
            <Reveal key={e.role + e.co} delay={i * 40}>
              <div className="border-b border-[#cfcfcf] py-[18px] flex gap-[14px]">
                <span className="shrink-0 pt-[4px] font-pt-mono-ss text-[13px] text-[#0f0f0f]">[{String(i + 1).padStart(2, "0")}]</span>
                <div className="flex-1">
                  <div className="font-geist-semibold-ss text-[19px] md:text-[22px] leading-[1.3] tracking-[-0.4px] text-[#0f0f0f]">{e.role}</div>
                  <div className="mt-[6px] flex flex-wrap items-baseline justify-between gap-x-[12px]">
                    <span className="font-geist-regular-ss text-[16px] text-[#444444]">{e.co}</span>
                    <span className="font-pt-mono-ss text-[13px] uppercase text-[#29292b]">{e.yr}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="mt-[88px]">
        <MobileFooter />
      </div>
    </>
  );
}

// ── PROJECT (desktop ProjectHero → Overview → meta → images → Next Project) ──
function MobileProject({
  project,
  nextProject,
  onProject,
  onSite,
  onHome,
  onWork,
  onAbout,
}: {
  project: ProjectData;
  nextProject?: ProjectData;
  onProject: (id: string) => void;
  onSite?: () => void;
  onHome: () => void;
  onWork: () => void;
  onAbout: () => void;
}) {
  const meta = [
    { k: "[CLIENT]", v: project.agency },
    { k: "[Service]", v: project.service },
    { k: "[Industry]", v: project.industry },
    { k: "[Year]", v: project.year },
  ];
  const gallery = project.images.filter((s): s is string => Boolean(s));

  return (
    <>
      {/* Same header as desktop: dark grid stage, glow blobs, tag pills,
          rounded hero card with purple offset shadow, floating emoji/sparkles. */}
      <style>{`
        /* Desktop positions sit outside a 900px card; on mobile/tablet pin the
           same stickers + sparkles to the screen edges, above the card corners. */
        .m-ph .ph-emoji-wrap, .m-ph .ph-deco { z-index: 12; }
        .m-ph .ph-emoji:nth-child(odd) { left: max(4px, calc(50% - min(450px, 46vw) - 18px)) !important; }
        .m-ph .ph-emoji:nth-child(even) { right: max(4px, calc(50% - min(450px, 46vw) - 18px)) !important; }
        .m-ph .ph-deco .ph-deco-extra { display: block !important; }
        .m-ph .ph-deco > :nth-child(1) { left: 14px !important; top: 104px !important; }
        .m-ph .ph-deco > :nth-child(2) { right: 16px !important; top: 150px !important; }
        .m-ph .ph-deco > :nth-child(3) { left: 14px !important; bottom: 18px !important; }
        .m-ph .ph-deco > :nth-child(4) { right: 22px !important; top: 104px !important; }
        @media (min-width: 768px) {
          .m-ph .ph-deco > :nth-child(1), .m-ph .ph-deco > :nth-child(4) { top: 120px !important; }
        }
        @media (max-width: 640px) {
          .m-ph .ph-tags { gap: 8px; padding: 0 8px; flex-wrap: wrap; }
          .m-ph .ph-tag { font-size: 12.5px; height: 36px; padding: 6px 13px; }
          .m-ph .ph-tag-emoji { margin-right: 6px; }
        }
      `}</style>
      <div className="m-ph relative z-10 overflow-hidden">
        <ProjectHero
          key={project.id}
          title={project.title}
          type={project.service}
          year={project.year}
          client={project.agency}
          image={project.heroImage}
          alt={`${project.title} — ${project.service} project hero image`}
          onNavigateHome={onHome}
          onNavigateWork={onWork}
          onNavigateAbout={onAbout}
          activeLink="work"
        />
      </div>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[48px]">
        <div>
          <BigHeading>Overview</BigHeading>
          <Reveal>
            <p className="mt-[20px] font-geist-medium-ss text-[19px] md:text-[22px] leading-[1.45] tracking-[-0.3px] text-[#1e1e1f] max-w-[820px]">
              {project.description}
            </p>
          </Reveal>
          <button
            onClick={() => {
              if (project.siteView && onSite) { onSite(); window.scrollTo({ top: 0 }); }
              else if (project.liveLink) window.open(project.liveLink, "_blank");
            }}
            className="mt-[24px] inline-flex items-center gap-[10px] bg-[#1e1e1f] px-[22px] py-[13px] rounded-[5px] font-pt-mono-ss text-[16px] uppercase text-[#f2f2f2]"
          >
            LiVE link
            <span aria-hidden className="inline-block -rotate-45">→</span>
          </button>
        </div>

        <div className="mt-[40px] grid grid-cols-2 md:grid-cols-4 gap-y-[26px] gap-x-[16px]">
          {meta.map((m) => (
            <Reveal key={m.k}>
              <div className="font-pt-mono-ss text-[15px] md:text-[18px] uppercase text-[#1e1e1f]">{m.k}</div>
              <div className="mt-[6px] font-geist-regular-ss text-[19px] md:text-[24px] tracking-[0.3px] text-[#1e1e1f]">
                {m.v}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="relative z-10 px-[24px] md:px-[40px] mt-[48px] flex flex-col gap-[18px] md:gap-[24px]">
          {gallery.map((src, i) => (
            <MobileImage key={src + i} src={src} alt={`${project.title} ${i + 1}`} ratio="16 / 9" natural />
          ))}
        </section>
      )}

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[80px]">
        <BigHeading>Next Project</BigHeading>
        {nextProject && (
          <button onClick={() => onProject(nextProject.id)} className="mt-[24px] block w-full md:w-[60%] md:ml-auto text-left">
            <MobileImage src={nextProject.thumbnail} alt={nextProject.title} ratio="16 / 9" scrub />
            <Reveal>
              <div className="mt-[12px] flex items-baseline justify-between font-pt-mono-ss text-[17px] md:text-[19px] uppercase text-[#29292b]">
                <span>{nextProject.title}</span>
                <span>{nextProject.year}</span>
              </div>
            </Reveal>
          </button>
        )}
      </section>

      <div className="mt-[88px]">
        <MobileFooter />
      </div>
    </>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function MobileSite({
  view,
  currentProject,
  nextProject,
  onNavigateHome,
  onNavigateWork,
  onNavigateAbout,
  onNavigateProject,
  onNavigateSite,
}: MobileSiteProps) {
  const active: NavKey = view === "about" ? "about" : view === "work" || view === "project" ? "work" : "home";
  return (
    <div className="relative w-full min-h-screen bg-[#e6e6e6] overflow-x-hidden">
      <style>{`
        @keyframes mMetricPop { from { scale: 0.7; opacity: 0; } to { scale: 1; opacity: 1; } }
        .m-metric-fill { animation: mMetricFill 1.4s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes mMetricFill { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .m-metric-pulse { animation: mMetricPulse 3s ease-in-out 1s infinite; transform-origin: center; }
        @keyframes mMetricPulse { 0%, 100% { scale: 1; } 50% { scale: 1.03; } }
        .m-metric-eye { animation: mMetricBlink 3s ease-in-out infinite; transform-origin: center; }
        @keyframes mMetricBlink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.08); } }
        .m-metric-squash { animation: mMetricSquash 0.9s ease-in-out 2; }
        @keyframes mMetricSquash { 0% { scale: 1 1; } 35% { scale: 1.12 0.86; } 70% { scale: 0.94 1.07; } 100% { scale: 1 1; } }
        .m-metric { -webkit-tap-highlight-color: transparent; }
        @media (prefers-reduced-motion: reduce) {
          .m-metric, .m-metric-fill, .m-metric-pulse, .m-metric-eye, .m-metric-squash { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
      <GridLines />
      <TapConfetti />
      {/* Page transition (desktop overlay fade) — replays on every page change */}
      <div
        key={`${view}-${currentProject?.id ?? ""}`}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[55] bg-[#e6e6e6]"
        style={{ animation: "overlayFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards" }}
      />
      <MobileNav active={active} onHome={onNavigateHome} onWork={onNavigateWork} onAbout={onNavigateAbout} />

      {view === "home" && <MobileHome onProject={onNavigateProject} onAbout={onNavigateAbout} />}
      {view === "work" && <MobileWork onProject={onNavigateProject} />}
      {view === "about" && <MobileAbout />}
      {view === "project" && currentProject && (
        <MobileProject
          project={currentProject}
          nextProject={nextProject}
          onProject={onNavigateProject}
          onSite={onNavigateSite}
          onHome={onNavigateHome}
          onWork={onNavigateWork}
          onAbout={onNavigateAbout}
        />
      )}
    </div>
  );
}
