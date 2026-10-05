interface ArrowButtonProps {
  label?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function ArrowButton({
  label = "Contact",
  href = "#",
  onClick,
  className = "",
}: ArrowButtonProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`arrow-btn group ${className}`}
    >
      <span className="arrow-btn__label">{label}</span>
      <span className="arrow-btn__box">
        <span className="arrow-btn__arrow arrow-btn__arrow--one">↗</span>
        <span className="arrow-btn__arrow arrow-btn__arrow--two">↗</span>
      </span>
    </a>
  );
}
