import { useEffect, useRef, useState } from "react";
import type { ProjectData } from "@/data/projects";
import { projects } from "@/data/projects";
import portraitImg from "@/imports/Frame9/a802e39c0a569dd08888c01370ae28cb47976544.webp";
import aboutHeroImg from "@/imports/Frame5/b00c7dcd55b1d1b4b718473567e5997ef5794af3.webp";

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
const CONTACT_PHONE = "0329 5460848";
const CONTACT_PHONE_2 = "0336 5934828";
const LINKEDIN = "https://www.linkedin.com/in/abdul-wahid-7763b8377/";
const INSTAGRAM = "https://www.instagram.com/";
const DRIBBBLE = "https://dribbble.com/";

const SERVICES = [
  "Brand Strategy",
  "Art Direction",
  "Brand Visuals",
  "Website Design",
  "UI/UX Design",
  "Campaign Big Ideas",
];

const CLIENTS = [
  "Campus App",
  "Veloce",
  "Dodi Homes",
  "Airbnb",
  "NODALiQ",
  "Axorix",
  "Microsoft",
  "Stint",
];

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
}: {
  src: string;
  alt?: string;
  ratio?: string;
  priority?: boolean;
  /** Use the image's own aspect ratio once loaded (no cropping). */
  natural?: boolean;
}) {
  // Observe an unclipped wrapper: IntersectionObserver applies the target's
  // own clip-path, so observing the clipped box (inset 0 50%) never reported
  // it as visible and every image stayed hidden.
  const [ref, inView] = useInView();
  const [loaded, setLoaded] = useState(false);
  const [nat, setNat] = useState<string | null>(null);
  return (
    <div ref={ref} className="w-full">
    <div
      className="relative w-full overflow-hidden bg-[#d8d8d8]"
      style={{
        aspectRatio: (natural && nat) || ratio,
        clipPath: inView ? "inset(0 0 0 0)" : "inset(0 50% 0 50%)",
        transition: "clip-path 1.1s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={(e) => {
          setLoaded(true);
          const im = e.currentTarget;
          if (natural && im.naturalWidth && im.naturalHeight) setNat(`${im.naturalWidth} / ${im.naturalHeight}`);
        }}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "scale(1)" : "scale(1.08)",
          transition: "opacity 0.7s ease, transform 1.1s cubic-bezier(0.16,1,0.3,1)",
        }}
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

// ── Social icons ──────────────────────────────────────────────────────────────
const IconInstagram = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-label="Instagram">
    <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.17.4.36 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.17-1 .36-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.07-.9.04-1.4.2-1.7.32-.4.16-.7.35-1 .65-.3.3-.5.6-.65 1-.12.3-.28.8-.32 1.7C3.3 8.5 3.3 8.9 3.3 12s0 3.5.07 4.7c.04.9.2 1.4.32 1.7.16.4.35.7.65 1 .3.3.6.5 1 .65.3.12.8.28 1.7.32 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c.9-.04 1.4-.2 1.7-.32.4-.16.7-.35 1-.65.3-.3.5-.6.65-1 .12-.3.28-.8.32-1.7.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.04-.9-.2-1.4-.32-1.7-.16-.4-.35-.7-.65-1-.3-.3-.6-.5-1-.65-.3-.12-.8-.28-1.7-.32C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 110 9.8 4.9 4.9 0 010-9.8zm0 1.8a3.1 3.1 0 100 6.2 3.1 3.1 0 000-6.2zm5.1-.3a1.15 1.15 0 11-2.3 0 1.15 1.15 0 012.3 0z" />
  </svg>
);
const IconDribbble = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-label="Dribbble">
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm6.6 4.6a8.3 8.3 0 011.9 5.2c-.28-.06-3.1-.63-5.9-.28-.06-.14-.12-.29-.19-.44-.18-.42-.37-.83-.58-1.23 3.1-1.27 4.52-3.1 4.77-3.25zM12 3.7c2.1 0 4 .8 5.5 2.1-.2.28-1.5 2-4.5 3.1a44 44 0 00-3.2-4.9c.7-.2 1.5-.3 2.2-.3zM7.9 4.6a52 52 0 013.2 4.8c-4 1.06-7.5 1.04-7.9 1.04a8.3 8.3 0 014.7-5.84zM3.4 12v-.27c.36.01 4.5.06 8.8-1.23.25.48.48.97.7 1.47l-.34.1c-4.4 1.42-6.74 5.3-6.94 5.63A8.3 8.3 0 013.4 12zm8.6 8.3a8.3 8.3 0 01-5.13-1.77c.16-.32 1.9-3.67 6.72-5.35l.05-.02a34.7 34.7 0 011.8 6.4 8.2 8.2 0 01-3.44.74zm5.1-1.65a35.9 35.9 0 00-1.63-6c2.65-.42 4.97.27 5.26.36a8.3 8.3 0 01-3.63 5.64z" />
  </svg>
);
const IconLinkedIn = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-label="LinkedIn">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

// ── Top navigation + full-screen menu (matches reference MENU / CLOSE) ─────────
function MobileNav({
  onHome,
  onWork,
  onAbout,
}: {
  onHome: () => void;
  onWork: () => void;
  onAbout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-[20px] md:px-[40px] h-[68px] md:h-[80px]">
        <button
          onClick={() => go(onHome)}
          className="font-pt-mono-ss text-[16px] uppercase tracking-[0.02em] text-[#1e1e1f]"
        >
          Abdul
        </button>
        <button
          onClick={() => setOpen(true)}
          className="bg-[#1e1e1f] text-white font-pt-mono-ss text-[15px] uppercase tracking-[0.04em] px-[22px] py-[11px] rounded-[6px]"
        >
          Menu
        </button>
      </header>

      {/* Full-screen menu overlay */}
      <div
        className="fixed inset-0 z-[70] bg-[#e6e6e6] flex flex-col px-[20px] md:px-[40px]"
        style={{
          transform: open ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.6s cubic-bezier(0.77,0,0.18,1)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="flex items-center justify-between h-[68px] md:h-[80px]">
          <span className="font-pt-mono-ss text-[16px] uppercase tracking-[0.02em] text-[#1e1e1f]">
            Abdul
          </span>
          <button
            onClick={() => setOpen(false)}
            className="bg-[#1e1e1f] text-white font-pt-mono-ss text-[15px] uppercase tracking-[0.04em] px-[22px] py-[11px] rounded-[6px]"
          >
            Close
          </button>
        </div>

        <nav className="mt-auto flex flex-col">
          {[
            { label: "Home", fn: onHome },
            { label: "Work", fn: onWork },
            { label: "About", fn: onAbout },
            { label: "Contact", fn: () => window.open(`mailto:${CONTACT_EMAIL}`, "_blank") },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => go(item.fn)}
              className="text-left font-pt-mono-ss text-[#1e1e1f] text-[26px] md:text-[44px] leading-[1.55] uppercase"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-[40px] mb-[48px] flex flex-col gap-[16px]">
          <Label>[Follow Me]</Label>
          <div className="flex gap-[18px] text-[#1e1e1f]">
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"><IconInstagram /></a>
            <a href={DRIBBBLE} target="_blank" rel="noopener noreferrer"><IconDribbble /></a>
            <a href={LINKEDIN} target="_blank" rel="noopener noreferrer"><IconLinkedIn /></a>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Project card (home + work) ────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: ProjectData; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full text-left">
      <MobileImage src={project.thumbnail} alt={project.title} ratio="16 / 9" />
      <Reveal>
        <div className="mt-[14px] flex items-baseline justify-between">
          <span className="font-geist-semibold-ss text-[24px] md:text-[28px] tracking-[-0.8px] text-[#1e1e1f] uppercase">
            {project.title}
          </span>
          <span className="font-pt-mono-ss text-[14px] text-[#8a8a8a]">{project.year}</span>
        </div>
        <div className="mt-[4px] font-pt-mono-ss text-[13px] uppercase tracking-[0.04em] text-[#8a8a8a]">
          {project.service} · {project.industry}
        </div>
      </Reveal>
    </button>
  );
}

// ── Dark footer ───────────────────────────────────────────────────────────────
function MobileFooter() {
  return (
    <footer className="relative z-10 bg-[#1e1e1f] px-[24px] md:px-[40px] pt-[64px] md:pt-[88px] pb-[40px]">
      <div className="md:grid md:grid-cols-2 md:gap-x-[48px]">
      <Reveal>
        <Label dim>[Available for new projects]</Label>
        <h2 className="mt-[24px] font-geist-semibold-ss text-[#f2f2f2] text-[52px] md:text-[72px] leading-[1.02] tracking-[-2px] whitespace-pre-line">
          {"Let's Get\nto Work"}
        </h2>
        <p className="mt-[22px] font-geist-regular-ss text-[16px] md:text-[18px] leading-[1.6] text-[rgba(242,242,242,0.5)] max-w-[520px]">
          If you're interested in learning more about my services, discussing a potential
          project, or just want to chat about design and creativity, I'm here to listen.
        </p>
      </Reveal>

      <div className="md:pt-[40px]">
      <div className="mt-[48px] md:mt-0 flex flex-col gap-[6px]">
        <span className="font-pt-mono-ss text-[19px] uppercase text-[#f2f2f2]">Wahid</span>
        <span className="font-pt-mono-ss text-[14px] uppercase text-[rgba(242,242,242,0.4)]">
          Multidisciplinary Designer
        </span>
      </div>

      <div className="mt-[40px] flex flex-col gap-[12px]">
        <Label dim>[Contact]</Label>
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-geist-medium-ss text-[21px] text-[#f2f2f2]">
          {CONTACT_EMAIL}
        </a>
        <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="font-geist-medium-ss text-[21px] text-[#f2f2f2]">
          {CONTACT_PHONE}
        </a>
        <a href={`tel:${CONTACT_PHONE_2.replace(/\s/g, "")}`} className="font-geist-medium-ss text-[21px] text-[#f2f2f2]">
          {CONTACT_PHONE_2}
        </a>
      </div>

      <div className="mt-[40px] flex flex-col gap-[14px]">
        <Label dim>[Follow Me]</Label>
        <div className="flex gap-[18px] text-[rgba(242,242,242,0.85)]">
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"><IconInstagram /></a>
          <a href={DRIBBBLE} target="_blank" rel="noopener noreferrer"><IconDribbble /></a>
          <a href={LINKEDIN} target="_blank" rel="noopener noreferrer"><IconLinkedIn /></a>
        </div>
      </div>
      </div>
      </div>

      <p className="mt-[48px] md:mt-[72px] font-pt-mono-ss text-[12px] uppercase tracking-[0.04em] text-[rgba(242,242,242,0.4)]">
        ©2026. All rights reserved
      </p>
    </footer>
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

// ── HOME ─────────────────────────────────────────────────────────────────────
function MobileHome({ onProject }: { onProject: (id: string) => void }) {
  return (
    <>
      <div className="md:grid md:grid-cols-2 md:gap-x-[40px] md:px-[40px] md:pt-[128px] md:items-start">
      <section className="relative z-10 px-[24px] md:px-0 pt-[104px] md:pt-0">
        <DisplayHeading text="Abdul" size="84px" fluid="min(14vw, 170px)" />

        <div className="mt-[36px] flex gap-[16px]">
          <div className="shrink-0 pt-[3px]">
            <Label>[Intro]</Label>
          </div>
          <Reveal>
            <p className="font-geist-medium-ss text-[18px] md:text-[22px] leading-[1.35] tracking-[-0.3px] text-[#1e1e1f]">
              I build brands, digital experiences, and visual systems that help businesses
              communicate, connect, and grow.
            </p>
          </Reveal>
        </div>

        <Reveal delay={60}>
          <p className="mt-[40px] font-geist-medium-ss text-[30px] tracking-[-0.6px] text-[#1e1e1f]">
            / {String(projects.length).padStart(2, "0")}
          </p>
        </Reveal>
      </section>

      <section className="relative z-10 px-[24px] md:px-0 mt-[24px] md:mt-0">
        <MobileImage src={portraitImg} alt="Abdul" ratio="4 / 5" priority />
        <Reveal delay={80}>
          <p className="mt-[14px] font-pt-mono-ss text-[13px] uppercase tracking-[0.04em] text-[#8a8a8a]">
            Scroll Down
          </p>
        </Reveal>
      </section>
      </div>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[72px]">
        <Reveal>
          <Label>[Introduction]</Label>
          <p className="mt-[16px] font-geist-regular-ss text-[19px] md:text-[24px] leading-[1.55] tracking-[-0.2px] text-[#1e1e1f] max-w-[820px]">
            I'm Abdul Wahid, a multidisciplinary designer working across branding, visual
            identity, logo design, social media creatives, and presentation design — with
            hands-on experience in video editing and motion graphics.
          </p>
        </Reveal>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[72px]">
        <Reveal>
          <Label>[My Services]</Label>
        </Reveal>
        <div className="mt-[8px] flex flex-col md:grid md:grid-cols-2 md:gap-x-[40px]">
          {SERVICES.map((s, i) => (
            <Reveal key={s} delay={i * 40}>
              <div className="flex items-center justify-between border-b border-[#cfcfcf] py-[18px]">
                <span className="font-geist-medium-ss text-[22px] tracking-[-0.4px] text-[#1e1e1f]">
                  {s}
                </span>
                <span className="font-pt-mono-ss text-[13px] text-[#8a8a8a]">0{i + 1}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[80px]">
        <Reveal>
          <div className="flex items-baseline justify-between">
            <Label>[Selected Works]</Label>
            <span className="font-pt-mono-ss text-[13px] text-[#8a8a8a]">/ {projects.length}</span>
          </div>
        </Reveal>
        <div className="mt-[24px] flex flex-col gap-[48px] md:grid md:grid-cols-2 md:gap-x-[24px] md:gap-y-[56px]">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => onProject(p.id)} />
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
          <p className="mt-[24px] font-geist-regular-ss text-[19px] leading-[1.55] tracking-[-0.2px] text-[#1e1e1f]">
            This selection showcases my work across branding, digital experiences, and visual
            systems. Each project reflects a considered approach to a specific challenge.
          </p>
          <p className="mt-[20px] font-geist-regular-ss text-[19px] leading-[1.55] tracking-[-0.2px] text-[#1e1e1f]">
            From brand identities to complete digital products, these projects reflect my
            commitment to clarity, craft, and work that helps businesses grow.
          </p>
        </Reveal>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[48px] flex flex-col gap-[48px] md:grid md:grid-cols-2 md:gap-x-[24px] md:gap-y-[56px]">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onClick={() => onProject(p.id)} />
        ))}
      </section>

      <div className="mt-[88px]">
        <MobileFooter />
      </div>
    </>
  );
}

// ── ABOUT ────────────────────────────────────────────────────────────────────
function MobileAbout() {
  return (
    <>
      <section className="relative z-10 px-[24px] md:px-[40px] pt-[112px] md:pt-[140px]">
        <DisplayHeading text="About" size="84px" fluid="min(18vw, 200px)" />
        <Reveal delay={60}>
          <div className="mt-[24px] flex justify-end">
            <Label>[EST 2005]</Label>
          </div>
        </Reveal>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[16px] md:max-w-[640px]">
        <MobileImage src={aboutHeroImg} alt="Abdul" ratio="4 / 5" priority />
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[48px]">
        <Reveal>
          <Label>[About Me]</Label>
        </Reveal>
        <div className="mt-[16px] flex flex-col gap-[22px] max-w-[820px]">
          <Reveal>
            <p className="font-geist-regular-ss text-[19px] leading-[1.55] tracking-[-0.2px] text-[#1e1e1f]">
              I'm a multidisciplinary designer with hands-on experience in branding, visual
              identity, logo design, and social media creatives. Skilled at transforming
              concepts into compelling visual experiences that build strong brand identities
              and effectively engage target audiences.
            </p>
          </Reveal>
          <Reveal delay={60}>
            <p className="font-geist-regular-ss text-[19px] leading-[1.55] tracking-[-0.2px] text-[#1e1e1f]">
              I like working where creativity meets strategy — finding the idea that gives a
              brand its character and making sure it carries through every touchpoint, from
              logo and typography to social media and motion.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[56px] grid grid-cols-2 gap-[20px] md:max-w-[820px]">
        {[
          { n: "13+", l: "Design Tools & Skills" },
          { n: "5", l: "Creative Roles" },
        ].map((stat) => (
          <Reveal key={stat.l}>
            <div className="border-t border-[#cfcfcf] pt-[14px]">
              <div className="font-geist-semibold-ss text-[42px] tracking-[-1.6px] text-[#1e1e1f]">
                {stat.n}
              </div>
              <div className="mt-[4px] font-pt-mono-ss text-[13px] uppercase tracking-[0.04em] text-[#8a8a8a]">
                {stat.l}
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="relative z-10 px-[24px] md:px-[40px] mt-[64px]">
        <Reveal>
          <Label>[Clients]</Label>
        </Reveal>
        <div className="mt-[8px] flex flex-col md:grid md:grid-cols-2 md:gap-x-[40px]">
          {CLIENTS.map((c, i) => (
            <Reveal key={c} delay={i * 30}>
              <div className="flex items-center justify-between border-b border-[#cfcfcf] py-[16px]">
                <span className="font-geist-medium-ss text-[21px] tracking-[-0.4px] text-[#1e1e1f]">
                  {c}
                </span>
                <span className="font-pt-mono-ss text-[13px] text-[#8a8a8a]">
                  [{String(i + 1).padStart(2, "0")}]
                </span>
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

// ── PROJECT ──────────────────────────────────────────────────────────────────
function MobileProject({
  project,
  nextProject,
  onProject,
  onSite,
}: {
  project: ProjectData;
  nextProject?: ProjectData;
  onProject: (id: string) => void;
  onSite?: () => void;
}) {
  const meta = [
    { k: "Client", v: project.agency },
    { k: "Industry", v: project.industry },
    { k: "Service", v: project.service },
    { k: "Year", v: project.year },
  ];
  const gallery = project.images.filter((s): s is string => Boolean(s));
  const hasLink = Boolean(project.liveLink) || Boolean(project.siteView);

  return (
    <>
      {/* Hero */}
      <section className="relative z-10 h-[64vh] min-h-[440px] max-h-[760px] w-full overflow-hidden bg-black">
        <img
          src={project.heroImage}
          alt={project.title}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.6 }}
        />
        {project.heroLogo && (
          <img
            src={project.heroLogo}
            alt=""
            className="absolute left-1/2 top-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2"
          />
        )}
        <div className="absolute bottom-[28px] md:bottom-[40px] left-[24px] right-[24px] md:left-[40px] md:right-[40px]">
          <h1 className="font-geist-semibold-ss text-white text-[44px] md:text-[80px] leading-[0.98] tracking-[-1.6px] uppercase break-words">
            {project.title}
          </h1>
        </div>
      </section>

      {/* Meta */}
      <section className="relative z-10 px-[24px] md:px-[40px] mt-[36px] md:mt-[48px] grid grid-cols-2 md:grid-cols-4 gap-y-[22px] gap-x-[16px]">
        {meta.map((m) => (
          <Reveal key={m.k}>
            <div className="font-pt-mono-ss text-[12px] uppercase tracking-[0.04em] text-[#8a8a8a]">
              {m.k}
            </div>
            <div className="mt-[5px] font-geist-medium-ss text-[18px] tracking-[-0.3px] text-[#1e1e1f]">
              {m.v}
            </div>
          </Reveal>
        ))}
      </section>

      {/* Description */}
      <section className="relative z-10 px-[24px] md:px-[40px] mt-[40px]">
        <Reveal>
          <p className="font-geist-regular-ss text-[19px] md:text-[22px] leading-[1.55] tracking-[-0.2px] text-[#1e1e1f] max-w-[820px]">
            {project.description}
          </p>
        </Reveal>
        {hasLink && (
          <button
            onClick={() => {
              if (project.siteView && onSite) onSite();
              else if (project.liveLink) window.open(project.liveLink, "_blank");
            }}
            className="mt-[24px] inline-flex items-center gap-[10px] bg-[#1e1e1f] px-[24px] py-[14px] rounded-[6px] font-pt-mono-ss text-[14px] uppercase tracking-[0.04em] text-white"
          >
            Live Link
            <span aria-hidden>↗</span>
          </button>
        )}
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="relative z-10 px-[24px] md:px-[40px] mt-[48px] flex flex-col gap-[18px] md:gap-[24px]">
          {gallery.map((src, i) => (
            <MobileImage key={src + i} src={src} alt={`${project.title} ${i + 1}`} ratio="16 / 9" natural />
          ))}
        </section>
      )}

      {/* Next project */}
      {nextProject && (
        <section className="relative z-10 px-[24px] md:px-[40px] mt-[80px]">
          <Reveal>
            <Label>[Next Project]</Label>
          </Reveal>
          <button onClick={() => onProject(nextProject.id)} className="mt-[16px] block w-full md:w-[60%] text-left">
            <MobileImage src={nextProject.thumbnail} alt={nextProject.title} ratio="16 / 9" />
            <Reveal>
              <div className="mt-[14px] flex items-baseline justify-between">
                <span className="font-geist-semibold-ss text-[28px] tracking-[-0.8px] text-[#1e1e1f] uppercase">
                  {nextProject.title}
                </span>
                <span className="font-pt-mono-ss text-[14px] text-[#8a8a8a]">{nextProject.year}</span>
              </div>
            </Reveal>
          </button>
        </section>
      )}

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
  return (
    <div className="relative w-full min-h-screen bg-[#e6e6e6] overflow-x-hidden">
      <GridLines />
      <MobileNav onHome={onNavigateHome} onWork={onNavigateWork} onAbout={onNavigateAbout} />

      {view === "home" && <MobileHome onProject={onNavigateProject} />}
      {view === "work" && <MobileWork onProject={onNavigateProject} />}
      {view === "about" && <MobileAbout />}
      {view === "project" && currentProject && (
        <MobileProject
          project={currentProject}
          nextProject={nextProject}
          onProject={onNavigateProject}
          onSite={onNavigateSite}
        />
      )}
    </div>
  );
}
