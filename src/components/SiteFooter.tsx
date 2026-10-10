import SharedFooterContent from "@/components/SharedFooterContent";

/**
 * Single footer block used on every desktop page (home, about, work, project).
 *
 * FOOTER_H is the full height of the footer band (100px top padding + 500px
 * content + bottom space). Every page sizes its canvas so it ends exactly at
 * the bottom of this band, which keeps the copyright line, the grid lines and
 * the empty space under it identical everywhere.
 */
export const FOOTER_H = 660;

interface SiteFooterProps {
  /** Absolute top offset (canvas px). Omit to render the footer in normal flow. */
  top?: number;
}

export default function SiteFooter({ top }: SiteFooterProps) {
  const positioned = top !== undefined;
  return (
    <div
      className={
        positioned
          ? "-translate-x-1/2 absolute left-1/2 bg-[#e6e6e6] content-stretch flex flex-col items-start pb-[32px] pt-[100px] w-[1920px]"
          : "relative bg-[#e6e6e6] content-stretch flex flex-col items-start pb-[32px] pt-[100px] w-[1920px]"
      }
      style={positioned ? { top, height: FOOTER_H } : { height: FOOTER_H }}
      data-name="Footer"
    >
      <div className="content-stretch flex flex-col items-start px-[48px] relative shrink-0 w-[1920px]" data-name="Container">
        <SharedFooterContent />
      </div>
    </div>
  );
}
