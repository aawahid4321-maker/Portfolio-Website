/* Fixed "Contact" pill — bottom-right, always visible, dark with white text. */
export default function FixedContactPill() {
  return (
    <>
      <style>{`
        .fixed-contact-pill {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #111111;
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.2); /* visible on dark sections */
          font-family: inherit;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 14px 22px;
          border-radius: 9999px;
          text-decoration: none;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
          transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        }
        .fixed-contact-pill:hover {
          transform: translateY(-2px) scale(1.03);
          background: #000000;
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.34);
        }
        .fixed-contact-pill:active { transform: translateY(0) scale(0.99); }
        .fixed-contact-pill .arrow {
          display: inline-block;
          transition: transform 0.25s ease;
        }
        .fixed-contact-pill:hover .arrow { transform: translate(2px, -2px); }
        @media (max-width: 767px) {
          .fixed-contact-pill { right: 16px; bottom: 16px; padding: 12px 18px; font-size: 13px; }
        }
      `}</style>
      <a
        href="https://wa.me/923295460848"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed-contact-pill"
        aria-label="Contact on WhatsApp"
      >
        Contact
        <span className="arrow" aria-hidden>↗</span>
      </a>
    </>
  );
}
