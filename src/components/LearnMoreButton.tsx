/* ── LearnMoreButton: charcoal LEARN MORE button with 3 blob friends + balloon ──
   Replaces the old LEARN MORE pill. Scoped with the lm- prefix so styles
   never leak. CSS-only animations, no JS. */

interface LearnMoreButtonProps {
  onClick?: () => void;
}

export default function LearnMoreButton({ onClick }: LearnMoreButtonProps) {
  return (
    <>
      <style>{`
        .lm-wrap { position: relative; display: inline-block; }
        .lm-stage {
          position: absolute;
          left: 0; right: 0; bottom: 100%;
          height: 84px;
          margin-bottom: -16px;
          z-index: 0;
          pointer-events: none;
        }
        .lm-blob {
          position: absolute;
          bottom: 0;
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .lm-blob::before, .lm-blob::after {
          content: "";
          position: absolute;
          top: 9px;
          width: 5px; height: 7px;
          background: #111;
          border-radius: 50%;
        }
        .lm-blob::before { left: 9px; }
        .lm-blob::after { right: 9px; }
        .lm-blob--orange {
          left: 10%;
          width: 36px; height: 34px;
          background: #ff5a00;
          border-radius: 16px 16px 10px 10px;
        }
        .lm-blob--blue {
          left: 44%;
          width: 30px; height: 30px;
          background: #0000ff;
          border-radius: 6px;
          rotate: 45deg;
        }
        .lm-blob--pink {
          right: 10%;
          width: 38px; height: 20px;
          background: #ff0080;
          border-radius: 20px 20px 0 0;
        }
        .lm-wrap:hover .lm-blob--orange { transform: translateY(-18px); }
        .lm-wrap:hover .lm-blob--blue { transform: translateY(-24px); transition-delay: 0.06s; }
        .lm-wrap:hover .lm-blob--pink { transform: translateY(-18px); transition-delay: 0.12s; }
        .lm-balloon {
          position: absolute;
          bottom: 4px; left: 63%;
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.35s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lm-wrap:hover .lm-balloon {
          opacity: 1;
          transform: translateY(-30px);
          transition-delay: 0.1s;
        }
        .lm-balloon-body {
          width: 30px; height: 36px;
          background: #ffa000;
          border-radius: 50%;
        }
        .lm-balloon-string { width: 2px; height: 30px; background: #111; }
        .lm-wrap:hover .lm-balloon-body { animation: lm-sway 2.2s ease-in-out infinite; }
        @keyframes lm-sway {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .lm-btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #1f1f1f;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 16px 20px;
          cursor: pointer;
          white-space: nowrap;
          font-family: "Zilla Slab", Georgia, "Palatino Linotype", serif;
          font-size: 17px;
          font-weight: 500;
          letter-spacing: 0.06em;
          box-shadow: 0 14px 28px -12px rgba(0, 0, 0, 0.35);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
        }
        .lm-arrow {
          display: inline-block;
          font-family: system-ui, sans-serif;
          transition: transform 0.25s ease;
        }
        .lm-wrap:hover .lm-arrow { transform: translate(2px, -2px); }
        .lm-btn:active,
        .lm-wrap:hover .lm-btn:active { transform: scale(0.96); }
        .lm-btn:focus-visible { outline: 3px solid #2563eb; outline-offset: 4px; }
        @media (prefers-reduced-motion: reduce) {
          .lm-blob, .lm-balloon, .lm-btn, .lm-arrow { transition: none; animation: none; }
          .lm-wrap:hover .lm-blob { transform: none; }
          .lm-wrap:hover .lm-balloon { opacity: 1; transform: none; }
          .lm-wrap:hover .lm-arrow { transform: none; }
        }
      `}</style>
      <span className="lm-wrap">
        <span className="lm-stage" aria-hidden="true">
          <span className="lm-blob lm-blob--orange" />
          <span className="lm-blob lm-blob--blue" />
          <span className="lm-blob lm-blob--pink" />
          <span className="lm-balloon">
            <span className="lm-balloon-body" />
            <span className="lm-balloon-string" />
          </span>
        </span>
        <button className="lm-btn" type="button" onClick={onClick}>
          LEARN MORE <span className="lm-arrow" aria-hidden="true">↗</span>
        </button>
      </span>
    </>
  );
}
