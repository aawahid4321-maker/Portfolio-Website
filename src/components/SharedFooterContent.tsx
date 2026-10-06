const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-label="LinkedIn">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export default function SharedFooterContent() {
  return (
    <div className="h-[500px] relative shrink-0 w-[1824px]">

      {/* ── Left: Availability + statement + CTA ─────────────────── */}
      <div className="absolute left-0 top-0 w-[560px] flex flex-col">
        <div className="flex items-center gap-[10px]">
          <p className="font-['PT_Mono:Regular'] leading-[23.04px] not-italic text-[rgba(242,242,242,0.55)] text-[22px] uppercase tracking-[0.04em] whitespace-nowrap">
            [Available for new projects]
          </p>
        </div>

        <p className="font-['Geist:SemiBold'] leading-[1.02] text-[#f2f2f2] text-[72px] tracking-[-3px] mt-[28px] whitespace-pre-line">
          {`Let's Get\nto Work`}
        </p>

        <p className="font-['Geist:Regular'] leading-[1.65] text-[rgba(242,242,242,0.5)] text-[17px] tracking-[-0.2px] mt-[24px] max-w-[440px]">
          {`If you're interested in learning more about my services, discussing a potential project, or just want to chat about design and creativity, I'm here to listen.`}
        </p>
      </div>

      {/* ── Middle: Abdul + designation + [CONTACT] ──────────────── */}
      <div className="absolute left-[700px] top-0 flex flex-col">
        {/* Abdul + designation */}
        <p className="font-['PT_Mono:Regular'] leading-[23.04px] not-italic text-[#f2f2f2] text-[22px] uppercase whitespace-nowrap">
          Wahid
        </p>
        <p className="font-['PT_Mono:Regular'] leading-[23.04px] not-italic text-[rgba(242,242,242,0.4)] text-[22px] uppercase mt-[8px] whitespace-nowrap">
          Multidisciplinary Designer
        </p>

        {/* [CONTACT] */}
        <div className="flex flex-col gap-[16px] mt-[48px]">
          <p className="font-['PT_Mono:Regular'] leading-[23.04px] not-italic text-[rgba(242,242,242,0.4)] text-[22px] uppercase whitespace-nowrap">
            [Contact]
          </p>
          <div className="flex flex-col gap-[8px]">
            <a
              href="mailto:aawahid321@gmail.com"
              className="font-['Geist:Medium'] leading-[27.648px] text-[#f2f2f2] text-[23.04px] tracking-[-0.6912px] whitespace-nowrap hover:opacity-70 transition-opacity"
            >
              aawahid321@gmail.com
            </a>
            <a
              href="tel:+923170510224"
              className="font-['Geist:Medium'] leading-[27.648px] text-[#f2f2f2] text-[23.04px] tracking-[-0.6912px] whitespace-nowrap hover:opacity-70 transition-opacity"
            >
              +92 317 051 0224
            </a>
          </div>
        </div>
      </div>

      {/* ── Right: [SOCIALS] ─────────────────────────────────────── */}
      <div className="absolute left-[1300px] top-0 flex flex-col gap-[16px]">
        <p className="font-['PT_Mono:Regular'] leading-[23.04px] not-italic text-[rgba(242,242,242,0.4)] text-[22px] uppercase whitespace-nowrap">
          [Socials]
        </p>
        <div className="flex gap-[12px]">
          <a
            href="https://www.linkedin.com/in/abdul-wahid-7763b8377/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-[52px] h-[52px] rounded-full border border-[rgba(242,242,242,0.22)] flex items-center justify-center text-[rgba(242,242,242,0.85)] hover:border-[rgba(242,242,242,0.55)] hover:bg-[rgba(242,242,242,0.07)] transition-all duration-300"
          >
            <LinkedInIcon />
          </a>
        </div>
      </div>

      {/* ── Copyright ────────────────────────────────────────────── */}
      <div className="absolute left-[1174.89px] bottom-0">
        <p className="font-['PT_Mono:Regular'] leading-[23.04px] not-italic text-[rgba(242,242,242,0.4)] text-[22px] uppercase whitespace-nowrap">
          ©2026. All right reserved
        </p>
      </div>
    </div>
  );
}
