import { useEffect, useRef } from "react";

const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-label="LinkedIn">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export default function SharedFooterContent() {
  const rootRef = useRef<HTMLDivElement>(null);

  /* ── Footer reveal: fade-up with stagger when the footer enters view ── */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = Number(el.dataset.reveal || 0);
            el.style.transitionDelay = `${delay}ms`;
            el.classList.add("is-visible");
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ── Magnetic pull on the email link ──────────────────────────────────── */
  const emailRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = emailRef.current;
    if (!el) return;
    const strength = 14; // px of pull toward cursor
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x / r.width * strength}px, ${y / r.height * strength}px)`;
    };
    const onLeave = () => { el.style.transform = "translate(0, 0)"; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <style>{`
        /* footer reveal: translateY(40px) -> 0, opacity 0 -> 1 */
        [data-reveal] {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        [data-reveal].is-visible { opacity: 1; transform: translateY(0); }

        /* heading mask reveal: each line slides up from overflow hidden */
        .mask-line { display: block; overflow: hidden; }
        .mask-line > span {
          display: block;
          transform: translateY(110%);
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-reveal].is-visible .mask-line > span { transform: translateY(0); }
        [data-reveal].is-visible .mask-line:nth-child(2) > span { transition-delay: 120ms; }

        /* email underline draws left -> right on hover */
        .email-link {
          position: relative;
          display: inline-block;
          transition: transform 0.2s ease-out;
          will-change: transform;
        }
        .email-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -3px;
          height: 1.5px;
          width: 100%;
          background: #f2f2f2;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .email-link:hover::after { transform: scaleX(1); }

        /* LinkedIn circle: scale 1.1 on hover */
        .social-circle { transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease; }
        .social-circle:hover { transform: scale(1.1); }

        @media (prefers-reduced-motion: reduce) {
          [data-reveal], [data-reveal].is-visible { opacity: 1; transform: none; transition: none; }
          .mask-line > span { transform: none; transition: none; }
        }
      `}</style>

      <div ref={rootRef} className="h-[500px] relative shrink-0 w-[1824px]">

        {/* ── Grid lines (same as main page, aligned to 1920px container) ── */}
        <div className="absolute pointer-events-none" aria-hidden="true" style={{ top: '-100px', height: '600px', left: 0, right: 0 }}>
          {[0, 231, 462, 693, 924, 1155, 1386, 1617].map((left) => (
            <div
              key={left}
              className="absolute top-0 h-full w-[207px] border-l border-r border-solid border-[#cfcfcf]"
              style={{ left: `${left}px` }}
            />
          ))}
        </div>

        {/* ── Left: Availability + statement + CTA ─────────────────── */}
        <div className="absolute left-0 top-0 w-[560px] flex flex-col" data-reveal="0">
          <div className="flex items-center gap-[10px]">
            <p className="font-['Zilla_Slab'] leading-[23.04px] not-italic text-[rgba(13,13,13,0.55)] text-[22px] uppercase tracking-[0.04em] whitespace-nowrap">
              [Available for new projects]
            </p>
          </div>

          <p className="font-['Geist:SemiBold'] leading-[1.02] text-[#0D0D0D] text-[72px] tracking-[-3px] mt-[28px]">
            <span className="mask-line"><span>Let&apos;s Get</span></span>
            <span className="mask-line"><span>to Work</span></span>
          </p>

          <p className="font-['Geist:Regular'] leading-[1.65] text-[rgba(13,13,13,0.6)] text-[17px] tracking-[-0.2px] mt-[24px] max-w-[440px]">
            {`If you're interested in learning more about my services, discussing a potential project, or just want to chat about design and creativity, I'm here to listen.`}
          </p>
        </div>

        {/* ── Middle: Wahid + designation + [CONTACT] ──────────────── */}
        <div className="absolute left-[693px] top-0 flex flex-col" data-reveal="100">
          <p className="font-['Zilla_Slab'] leading-[23.04px] not-italic text-[#0D0D0D] text-[22px] uppercase whitespace-nowrap">
            Wahid
          </p>
          <p className="font-['Zilla_Slab'] leading-[23.04px] not-italic text-[rgba(13,13,13,0.5)] text-[22px] uppercase mt-[8px] whitespace-nowrap">
            Multidisciplinary Designer
          </p>

          <div className="flex flex-col gap-[16px] mt-[48px]">
            <p className="font-['Zilla_Slab'] leading-[23.04px] not-italic text-[rgba(13,13,13,0.5)] text-[22px] uppercase whitespace-nowrap">
              [Contact]
            </p>
            <div className="flex flex-col gap-[8px] items-start">
              <a
                ref={emailRef}
                href="mailto:aawahid321@gmail.com"
                className="email-link font-['Geist:Medium'] leading-[27.648px] text-[#0D0D0D] text-[23.04px] tracking-[-0.6912px] whitespace-nowrap flex items-center gap-[10px]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
                aawahid321@gmail.com
              </a>
              <a
                href="tel:+923295460848"
                className="email-link font-['Geist:Medium'] leading-[27.648px] text-[#0D0D0D] text-[23.04px] tracking-[-0.6912px] whitespace-nowrap flex items-center gap-[10px]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                +92 329 5460848
              </a>
              <a
                href="tel:+923365934828"
                className="email-link font-['Geist:Medium'] leading-[27.648px] text-[#0D0D0D] text-[23.04px] tracking-[-0.6912px] whitespace-nowrap flex items-center gap-[10px]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                +92 336 5934828
              </a>
            </div>
          </div>
        </div>

        {/* ── Right: [SOCIALS] ─────────────────────────────────────── */}
        <div className="absolute left-[1386px] top-0 flex flex-col gap-[16px]" data-reveal="200">
          <p className="font-['Zilla_Slab'] leading-[23.04px] not-italic text-[rgba(13,13,13,0.5)] text-[22px] uppercase whitespace-nowrap">
            [Socials]
          </p>
          <div className="flex gap-[12px]">
            <a
              href="https://www.linkedin.com/in/abdul-wahid-7763b8377/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-circle w-[52px] h-[52px] rounded-full border border-[rgba(13,13,13,0.25)] flex items-center justify-center text-[rgba(13,13,13,0.85)] hover:border-[rgba(13,13,13,0.6)] hover:bg-[rgba(13,13,13,0.07)]"
              aria-label="LinkedIn"
            >
              <LinkedInIcon />
            </a>
          </div>
        </div>

        {/* ── Copyright ────────────────────────────────────────────── */}
        <div className="absolute left-[1155px] bottom-0" data-reveal="300">
          <p className="font-['Zilla_Slab'] leading-[23.04px] not-italic text-[rgba(13,13,13,0.5)] text-[22px] uppercase whitespace-nowrap">
            ©2026. All right reserved
          </p>
        </div>
      </div>
    </>
  );
}
