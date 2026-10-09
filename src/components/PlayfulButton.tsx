/* ── PlayfulButton: sleepy character leaning on a brand-purple pill button ──
   Used in place of the LEARN MORE button. All styles are scoped with the
   pb- prefix so they never leak into the rest of the site. */

interface PlayfulButtonProps {
  label?: string;
  onClick?: () => void;
}

export default function PlayfulButton({ label = "Discuss your trip", onClick }: PlayfulButtonProps) {
  return (
    <>
      <style>{`
        .pb-wrap {
          position: relative;
          display: inline-block;
          padding-top: 66px; /* headroom for the character */
        }
        .pb-dude {
          position: absolute;
          top: 0;
          left: 42%; /* slightly left of center */
          transform: translateX(-50%);
          width: 120px;
          height: auto;
          display: block;
          z-index: 0;
          pointer-events: none;
          transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .pb-wrap:hover .pb-dude { transform: translateX(-50%) translateY(-6px); }
        .pb-btn {
          position: relative;
          z-index: 1;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: #fff;
          background: #7e4fed;
          border: none;
          border-radius: 999px;
          padding: 16px 36px;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 18px 35px -12px rgba(126, 79, 237, 0.45);
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease;
        }
        .pb-wrap:hover .pb-btn {
          transform: scale(1.03);
          box-shadow: 0 22px 42px -12px rgba(126, 79, 237, 0.55);
        }
        .pb-btn:active,
        .pb-wrap:hover .pb-btn:active {
          transform: scale(0.97);
          box-shadow: 0 10px 22px -10px rgba(126, 79, 237, 0.4);
        }
        .pb-btn:focus-visible { outline: 3px solid #FFD60A; outline-offset: 4px; }
        @media (prefers-reduced-motion: reduce) {
          .pb-dude, .pb-btn { transition: none; }
          .pb-wrap:hover .pb-dude { transform: translateX(-50%); }
          .pb-wrap:hover .pb-btn { transform: none; }
        }
      `}</style>
      <span className="pb-wrap">
        <svg className="pb-dude" viewBox="0 0 140 100" aria-hidden="true" focusable="false">
          <rect x="34" y="60" width="72" height="22" rx="11"
                fill="#fff" stroke="#111" strokeWidth="2" />
          <ellipse cx="104" cy="57" rx="11" ry="9"
                   fill="#fff" stroke="#111" strokeWidth="2" />
          <path d="M100 53 L100 59 M105 52 L105 60"
                stroke="#111" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M70 13 C87 13 100 27 99 44 C98 61 85 72 69 71
                   C53 70 41 59 42 42 C43 25 54 13 70 13 Z"
                fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
          <path d="M70 13 C69 8 71 4 76 5" fill="none"
                stroke="#111" strokeWidth="2" strokeLinecap="round" />
          <path d="M63 14 C62 10 64 7 67 8" fill="none"
                stroke="#111" strokeWidth="2" strokeLinecap="round" />
          <path d="M53 40 Q58 44.5 63 40" fill="none"
                stroke="#111" strokeWidth="2" strokeLinecap="round" />
          <path d="M77 40 Q82 44.5 87 40" fill="none"
                stroke="#111" strokeWidth="2" strokeLinecap="round" />
          <path d="M64 53 Q70 58.5 76 53" fill="none"
                stroke="#111" strokeWidth="2" strokeLinecap="round" />
          <path d="M47 48 L53 48" stroke="#FF0A8A" strokeWidth="2.5"
                strokeLinecap="round" opacity="0.55" />
          <path d="M87 48 L93 48" stroke="#FF0A8A" strokeWidth="2.5"
                strokeLinecap="round" opacity="0.55" />
        </svg>
        <button className="pb-btn" type="button" onClick={onClick}>{label}</button>
      </span>
    </>
  );
}
