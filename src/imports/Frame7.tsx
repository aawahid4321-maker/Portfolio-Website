import SiteFooter, { FOOTER_H } from "@/components/SiteFooter";
import LetsConnect from "@/components/LetsConnect";
import imgCampusApp from "@/assets/brochure-hero.webp";
import imgWorkBg from "@/assets/work-bg.webp";
const assetPathPrefix = `${import.meta.env.BASE_URL}assets`;
const imgGradia = `${assetPathPrefix}/brand-hero.webp`;
const imgNodaliq = `${assetPathPrefix}/nodaliq-hero.webp`;
const imgPypo = `${assetPathPrefix}/pypo-hero.webp`;
const imgMini = `${assetPathPrefix}/mini-hero.webp`;
const imgNoireCoffee = `${assetPathPrefix}/noire-hero.webp`;
const imgContainer = `${assetPathPrefix}/35bcf.webp`;
const imgFireflyGlass2 = `${assetPathPrefix}/67005.webp`;
const imgFreepikPhoto1 = `${assetPathPrefix}/883ae.webp`;
const imgFreepikMask1 = `${assetPathPrefix}/b353d.svg`;
const imgFireflyMask2 = `${assetPathPrefix}/48a62.svg`;
const imgFireflyGlass4 = `${assetPathPrefix}/aca21.webp`;
const imgGroup42 = `${assetPathPrefix}/0986f.svg`;
const imgGroup43 = `${assetPathPrefix}/0ec31.svg`;
const imgContainer1 = `${assetPathPrefix}/fitflow-hero.webp`;
const imgContainer2 = `${assetPathPrefix}/f95a7.webp`;
const imgContainer3 = `${assetPathPrefix}/91219.webp`;
const imgContainer4 = `${assetPathPrefix}/stint-hero.webp`;
const imgContainer5 = `${assetPathPrefix}/49ca5.webp`;

/* Work page project cards, top-to-bottom display order.
   To add a project, append one entry here — the zig-zag CSS
   (odd cards left, even cards right) positions it automatically. */
const WORK_CARDS = [
  { name: "NOIRÉ COFFEE", year: "2026", img: imgNoireCoffee },
  { name: "FITFLOW", year: "2025", img: imgContainer1 },
  { name: "AXORIX", year: "2025", img: imgContainer2 },
  { name: "Nodaliq", year: "2026", img: imgNodaliq },
  { name: "STINT", year: "2025", img: imgContainer4 },
  { name: "CHATBLAST", year: "2025", img: imgContainer5 },
  { name: "BROCHURE", year: "2026", img: imgCampusApp },
  { name: "BRAND", year: "2026", img: imgGradia },
  { name: "Pypo", year: "2025", img: imgPypo },
  { name: "Mini", year: "2026", img: imgMini },
];

// Dynamic work-page canvas height so the footer is never clipped when cards
// are added. Card = 1024x576 image (16:9) + 8px gap + 23.04px label row;
// 72px gaps between cards; then Let's Connect (763) + footer (FOOTER_H).
export const WORK_CARD_H = 576 + 8 + 23.04;
export const WORK_CARD_GAP = 72;
export function getWorkCanvasH(cardCount: number = WORK_CARDS.length) {
  return (
    908.31 + // outer paddingTop
    160 + // cards block pt
    (cardCount * WORK_CARD_H + Math.max(0, cardCount - 1) * WORK_CARD_GAP) +
    253 + // cards block pb
    763 + // Let's Connect (footer follows directly, same as every other page)
    FOOTER_H // footer (same height as on every other page)
  );
}

export default function Frame7() {
  return (
    <div className="bg-[#e6e6e6] relative" style={{ width: 1920, paddingTop: 908.31 }} data-node-id="48:133">
      {/* Grid columns — stretch the full (dynamic) page height */}
      <div className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 bottom-0 left-[48.29px] w-[207px]" />
      <div className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 bottom-0 left-[279.29px] w-[207px]" />
      <div className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 bottom-0 left-[510.29px] w-[207px]" />
      <div className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 bottom-0 left-[741.29px] w-[207px]" />
      <div className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 bottom-0 left-[972.29px] w-[207px]" />
      <div className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 bottom-0 left-[1203.29px] w-[207px]" />
      <div className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 bottom-0 left-[1434.29px] w-[207px]" />
      <div className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 bottom-0 left-[1665.29px] w-[207px]" />

      {/* Navbar */}
      <div className="absolute content-stretch flex items-center justify-between left-[0.29px] px-[16px] py-[32px] top-0 w-[1920px]" data-name="Banner">
        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Link">
          <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[23.04px] not-italic relative shrink-0 text-[#0f0f0f] text-[19.2px] uppercase whitespace-nowrap">
            Abdul
          </p>
        </div>
        <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
          <div className="content-stretch flex h-[41px] items-start overflow-clip py-[8px] relative shrink-0 w-[46px]" data-name="Link">
            <div className="content-stretch flex flex-col h-full items-start overflow-clip relative shrink-0 w-[46px]">
              <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
                <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[24.96px] not-italic relative shrink-0 text-[#0f0f0f] text-[19.2px] uppercase whitespace-nowrap">
                  Home
                </p>
              </div>
              <p className="[word-break:break-word] absolute font-['Zilla_Slab'] leading-[24.96px] left-0 not-italic text-[#0f0f0f] text-[19.2px] top-[26.19px] uppercase whitespace-nowrap">
                Home
              </p>
            </div>
          </div>
          <div className="content-stretch flex flex-col items-start relative shrink-0">
            <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[27.648px] not-italic relative shrink-0 text-[#1e1e1f] text-[23.04px] tracking-[-0.6912px] whitespace-nowrap">
              /
            </p>
          </div>
          <div className="content-stretch flex h-[41px] items-center justify-center overflow-clip py-[8px] relative shrink-0 w-[58px]" data-name="Link">
            <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[24.96px] not-italic relative shrink-0 text-[19.2px] text-black uppercase w-[47px]">
              WORK
            </p>
          </div>
          <div className="content-stretch flex flex-col items-start relative shrink-0">
            <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[27.648px] not-italic relative shrink-0 text-[#1e1e1f] text-[23.04px] tracking-[-0.6912px] whitespace-nowrap">
              /
            </p>
          </div>
          <div className="content-stretch flex h-[41px] items-start overflow-clip py-[8px] relative shrink-0 w-[58px]" data-name="Link">
            <div className="content-stretch flex flex-col h-full items-start overflow-clip relative shrink-0 w-[58px]">
              <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
                <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[24.96px] not-italic relative shrink-0 text-[#0f0f0f] text-[19.2px] uppercase whitespace-nowrap">
                  About
                </p>
              </div>
              <p className="[word-break:break-word] absolute font-['Zilla_Slab'] leading-[24.96px] left-0 not-italic text-[#0f0f0f] text-[19.2px] top-[26.19px] uppercase whitespace-nowrap">
                About
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#1e1e1f] content-stretch flex gap-[8px] h-[47px] items-center justify-center overflow-clip p-[12px] relative rounded-[5px] shrink-0 w-[115px]" data-name="Link">
          <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[19.2px] not-italic relative shrink-0 text-[#f2f2f2] text-[19.2px] uppercase whitespace-nowrap">
            HIRE
          </p>
          <div className="content-stretch flex flex-col h-[23px] items-start overflow-clip relative shrink-0 w-[18px]">
            <div className="content-stretch flex flex-col h-[23px] items-start relative shrink-0 w-full">
              <div className="absolute flex items-center justify-center left-[-5.45px] size-[28.991px] top-[-2.85px]">
                <div className="-rotate-45 flex-none">
                  <p className="[word-break:break-word] font-['Geist:Medium'] leading-[23.04px] relative shrink-0 text-[#f2f2f2] text-[23.04px] whitespace-nowrap">→</p>
                </div>
              </div>
            </div>
            <div className="absolute flex items-center justify-center left-[-23.89px] size-[30.406px] top-[19.34px]">
              <div className="-rotate-45 flex-none">
                <p className="[word-break:break-word] font-['Geist:Medium'] leading-[23.04px] relative shrink-0 text-[#f2f2f2] text-[23.04px] whitespace-nowrap">→</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* [Process] label + description */}
      <p className="[word-break:break-word] absolute font-['Zilla_Slab'] leading-[23.04px] not-italic text-[#29292b] text-[19.2px] uppercase left-[510.29px] top-[714.35px] w-[104px]">
        [Process]
      </p>
      <p className="[word-break:break-word] absolute font-['Geist:Medium'] leading-[29.952px] text-[#1e1e1f] text-[23.04px] tracking-[-0.6912px] left-[744px] top-[714px] w-[763px]">
        I start by understanding the business, audience, and goals, then turn those insights into a clear creative direction. From there, I build bold brands, digital experiences, and visual systems, refining every detail to create work that communicates clearly, connects with people, and helps businesses grow.
      </p>

      {/* Heading */}
      <p className="[word-break:break-word] absolute font-['Geist:SemiBold'] leading-[normal] text-[#1e1e1f] text-[237px] tracking-[-9.6861px] whitespace-nowrap left-[48px] top-[312.07px]">
        Selected Works
      </p>

      {/* Project cards — zig-zag layout, in normal flow so the section
          grows automatically with every added card.
          Every card is 1024x576 (16:9, object-fit: cover). Odd cards align
          left, even cards align right, with equal small vertical gaps, so the
          cards stagger down the page. New entries in WORK_CARDS automatically
          take the next zig-zag position and push Let's Connect + footer down.
          On mobile (<=767px) all cards stack in one centered column at the
          same size. */}
      <div className="relative w-[1920px] px-[48px] pt-[160px] pb-[253px]">
        <style>{`
          .work-zigzag { display: flex; flex-direction: column; gap: 72px; }
          .work-zigzag .work-card { width: 1024px; max-width: 100%; }
          .work-zigzag .work-card:nth-child(odd) { align-self: flex-start; }
          .work-zigzag .work-card:nth-child(even) { align-self: flex-end; }
          .work-zigzag .work-card-img { aspect-ratio: 16 / 9; overflow: hidden; }
          .work-zigzag .work-card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
          @media (max-width: 767px) {
            .work-zigzag .work-card:nth-child(odd),
            .work-zigzag .work-card:nth-child(even) { align-self: center; }
          }
        `}</style>
        <div className="work-zigzag">
          {WORK_CARDS.map((card) => (
            <div className="work-card flex flex-col gap-[8px]" data-name="work-card" data-cursor="view" key={card.name}>
              <div className="work-card-img relative shrink-0 w-full" data-name="work-card-img">
                <img alt="" className="object-cover pointer-events-none" src={card.img} loading="eager" decoding="async" />
              </div>
              <div className="flex items-start justify-between w-full shrink-0">
                <p className="font-['Zilla_Slab'] leading-[23.04px] not-italic text-[#29292b] text-[19.2px] uppercase whitespace-nowrap">{card.name}</p>
                <p className="font-['Zilla_Slab'] leading-[23.04px] not-italic text-[#29292b] text-[19.2px] uppercase whitespace-nowrap">{card.year}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Let's Connect section — interactive component, follows the cards in flow */}
      <div className="relative left-[-4.02px] w-[1920px] h-[763px] overflow-hidden">
        <LetsConnect />
      </div>

      {/* Footer — identical to homepage, follows in flow */}
      <SiteFooter />
    </div>
  );
}
