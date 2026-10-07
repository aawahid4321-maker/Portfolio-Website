import { type ProjectData, getProjectCanvasH, IMG_SLOT_H, IMG_GAP, IMAGES_TOP, TAIL_H } from "@/data/projects";
import SharedFooterContent from "@/components/SharedFooterContent";
import ProjectHero from "@/components/ProjectHero";

/* Hero is now ~800px tall (flex: 152 top pad + tags + card + 72 bottom pad, no title).
   Shift content so Overview starts right after the hero's bottom padding. */
const HERO_SHIFT = 4;

interface ProjectPageProps {
  project: ProjectData;
  nextProject: ProjectData | undefined;
  onNavigateHome: () => void;
  onNavigateWork: () => void;
  onNavigateAbout: () => void;
  onNavigateProject: (id: string) => void;
  onNavigateSite?: () => void;
}


export default function ProjectPage({
  project,
  nextProject,
  onNavigateHome,
  onNavigateWork,
  onNavigateAbout,
  onNavigateProject,
  onNavigateSite,
}: ProjectPageProps) {
  const imageCount = project.images.length;
  const slotH = (i: number) => project.imageHeights?.[i] ?? IMG_SLOT_H;
  const imagesH = project.images.reduce((sum, _, i) => sum + slotH(i), 0) + Math.max(0, imageCount - 1) * IMG_GAP;
  const IMAGES_TOP_ADJ = IMAGES_TOP + HERO_SHIFT; // shift images below the new taller hero
  const IB = IMAGES_TOP_ADJ + imagesH; // images bottom — all sections below anchor here
  const canvasH = IB + TAIL_H;

  // Offsets from IB — derived from the original 6-image layout
  const NEXT_TOP      = IB + 332;
  const LC_BG_TOP     = IB + 1308;
  const LC_TITLE_TOP  = IB + 1642;
  const LC_DESC_TOP   = IB + 1560;
  const CONTACT_TOP   = IB + 1778;
  const ARROW_TOP     = IB + 1781;
  const FOOTER_TOP    = IB + 2071;

  return (
    <div
      className="bg-[#e6e6e6] relative project-page"
      style={{ width: 1920, height: canvasH }}
    >
      <style>{`
        /* Overview: dark text on light (scoped to project page) */
        .project-page .pp-overview-heading { color: #0D0D0D !important; }
        .project-page .pp-overview-desc { color: #1e1e1f !important; }
        .project-page .pp-overview-label { color: #0f0f0f !important; }
        .project-page .pp-overview-value { color: #0f0f0f !important; }
      `}</style>
      {/* ── Grid columns ────────────────────────────────────── */}
      {[48, 279, 510, 741, 972, 1203, 1434, 1665].map((left) => (
        <div
          key={left}
          className="absolute border-[#cfcfcf] border-l border-r border-solid top-0 w-[207px]"
          style={{ left, height: canvasH }}
        />
      ))}

      {/* ── Hero: playful purple gradient stage (reusable template) ── */}
      <div className="absolute left-0 top-0 w-[1920px]">
        <ProjectHero
          title={project.title}
          type={project.service}
          year={project.year}
          client={project.agency}
          image={project.heroImage}
          alt={`${project.title} — ${project.service} project hero image`}
          onNavigateHome={onNavigateHome}
          onNavigateWork={onNavigateWork}
          onNavigateAbout={onNavigateAbout}
          activeLink="work"
        />
      </div>

      {/* ── Overview section ─────────────────────────────────── */}
      <p
        className="pp-overview-heading [word-break:break-word] absolute font-['Geist:SemiBold'] leading-[normal] text-[60px] tracking-[-3.0771px] w-[551.48px]"
        style={{ left: 48, top: 796.18 + HERO_SHIFT }}
      >
        Overview
      </p>

      {/* Description */}
      <p
        className="pp-overview-desc [word-break:break-word] absolute font-['Geist:Medium'] leading-[29.952px] text-[23.04px] tracking-[-0.6912px] w-[790.748px]"
        style={{ left: 48.29, top: 899.78 + HERO_SHIFT }}
      >
        {project.description}
      </p>

      {/* LIVE LINK button */}
      <div
        className="absolute bg-[#1e1e1f] content-stretch flex gap-[8px] h-[47px] items-center justify-center overflow-clip p-[12px] rounded-[5px] w-[157px] cursor-pointer"
        style={{ left: 48, top: 1057 + HERO_SHIFT }}
        onClick={() => {
          if (project.siteView && onNavigateSite) { onNavigateSite(); window.scrollTo({ top: 0 }); }
          else if (project.liveLink) window.open(project.liveLink, "_blank");
        }}
        data-name="live-link-btn"
      >
        <div className="content-stretch flex flex-col items-start relative shrink-0">
          <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[19.2px] not-italic relative shrink-0 text-[#f2f2f2] text-[19.2px] uppercase whitespace-nowrap">
            LiVE link
          </p>
        </div>
        <div className="content-stretch flex flex-col h-[23px] items-start overflow-clip relative shrink-0 w-[18px]">
          <div className="content-stretch flex flex-col h-[23px] items-start relative shrink-0 w-full">
            <div className="absolute flex items-center justify-center left-[-5.45px] size-[28.991px] top-[-2.85px]">
              <div className="-rotate-45 flex-none">
                <p className="[word-break:break-word] font-['Geist:Medium'] leading-[23.04px] relative shrink-0 text-[#f2f2f2] text-[23.04px] whitespace-nowrap">
                  →
                </p>
              </div>
            </div>
          </div>
          <div className="absolute flex items-center justify-center left-[-23.89px] size-[30.406px] top-[19.34px]">
            <div className="-rotate-45 flex-none">
              <p className="[word-break:break-word] font-['Geist:Medium'] leading-[23.04px] relative shrink-0 text-[#f2f2f2] text-[23.04px] whitespace-nowrap">
                →
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metadata columns ─────────────────────────────────── */}
      {/* [Agency] */}
      <p
        className="pp-overview-label absolute font-['Zilla_Slab'] leading-[41.009px] not-italic text-[31.546px] uppercase w-[182.664px]"
        style={{ left: 978.79, top: 826.26 + HERO_SHIFT }}
      >
        [CLIENT]
      </p>
      <p
        className="pp-overview-value absolute font-['Geist:Regular'] leading-[66.269px] text-[36.984px] tracking-[0.5px] whitespace-nowrap"
        style={{ left: 978.79, top: 889.11 + HERO_SHIFT }}
      >
        {project.agency}
      </p>

      {/* [Service] */}
      <p
        className="pp-overview-label absolute font-['Zilla_Slab'] leading-[41.009px] not-italic text-[31.546px] uppercase w-[212.91px]"
        style={{ left: 978.79, top: 1045.88 + HERO_SHIFT }}
      >
        [Service]
      </p>
      <p
        className="pp-overview-value absolute font-['Geist:Regular'] leading-[66.269px] text-[36.984px] tracking-[0.5px] w-[266.828px]"
        style={{ left: 978.79, top: 1108.72 + HERO_SHIFT }}
      >
        {project.service}
      </p>

      {/* [Industry] */}
      <p
        className="pp-overview-label absolute font-['Zilla_Slab'] leading-[41.009px] not-italic text-[31.546px] uppercase w-[210.311px]"
        style={{ left: 1434.29, top: 826.26 + HERO_SHIFT }}
      >
        [Industry]
      </p>
      <p
        className="pp-overview-value absolute font-['Geist:Regular'] leading-[66.269px] text-[36.984px] tracking-[0.5px] whitespace-nowrap"
        style={{ left: 1434.29, top: 889.11 + HERO_SHIFT }}
      >
        {project.industry}
      </p>

      {/* [Year] */}
      <p
        className="pp-overview-label absolute font-['Zilla_Slab'] leading-[41.009px] not-italic text-[31.546px] uppercase w-[210.311px]"
        style={{ left: 1434.29, top: 1045.87 + HERO_SHIFT }}
      >
        [Year]
      </p>
      <p
        className="pp-overview-value absolute font-['Geist:Regular'] leading-[66.269px] text-[36.984px] tracking-[0.5px] whitespace-nowrap"
        style={{ left: 1434.29, top: 1108.72 + HERO_SHIFT }}
      >
        {project.year}
      </p>

      {/* ── Project image slots ───────────────────────────────── */}
      {/* object-contain ensures every image is fully visible, never cropped.
          Slots have an exact 16:9 height so images with the standard ratio
          fill edge-to-edge with no letterbox bars. */}
      <div
        className="absolute content-stretch flex flex-col items-start w-[1823.5px]"
        style={{ left: 48, top: IMAGES_TOP_ADJ, gap: IMG_GAP }}
      >
        {project.images.map((src, i) => (
          <div
            key={i}
            className="bg-white overflow-hidden relative shrink-0 w-full flex items-center justify-center"
            style={{ height: slotH(i) }}
            data-name="project-img-slot"
          >
            {i === 0 && project.heroLogo && !src ? (
              <>
                <img
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 max-w-none object-contain pointer-events-none size-full"
                  src={project.heroImage}
                />
                <div
                  className="absolute"
                  style={{
                    width: 180.473,
                    height: 257.037,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <img
                    alt="Logo"
                    className="absolute block inset-0 max-w-none size-full"
                    src={project.heroLogo} loading="eager" decoding="async"
                  />
                </div>
              </>
            ) : src ? (
              <img
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="w-full h-full object-contain pointer-events-none"
                src={src}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* ── Next Project ─────────────────────────────────────── */}
      <p
        className="[word-break:break-word] absolute font-['Geist:Medium'] leading-[71.674px] text-[#0f0f0f] text-[71.674px] tracking-[-2.8669px] w-[1133.111px]"
        style={{ left: 51.49, top: NEXT_TOP }}
      >
        Next Project
      </p>

      {nextProject && (
        <div
          className="absolute content-stretch flex flex-col gap-[8px] items-start cursor-pointer"
          style={{ left: 968.51, top: NEXT_TOP, width: 900, height: 706.031 }}
          data-name="next-project-card"
          onClick={() => onNavigateProject(nextProject.id)}
        >
          <div
            className="relative shrink-0 overflow-clip"
            style={{ width: 900, height: 675 }}
            data-name="work-card-img"
          >
            <img
              alt=""
              className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
              src={nextProject.thumbnail} loading="lazy" decoding="async"
            />
          </div>
          <div className="content-stretch flex items-start justify-between relative shrink-0 w-[900px]">
            <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[23.04px] not-italic relative shrink-0 text-[#29292b] text-[19.2px] uppercase whitespace-nowrap">
              {nextProject.title}
            </p>
            <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[23.04px] not-italic relative shrink-0 text-[#29292b] text-[19.2px] uppercase whitespace-nowrap">
              {nextProject.year}
            </p>
          </div>
        </div>
      )}

      {/* ── Let's Connect section ────────────────────────────── */}
      <div
        className="absolute overflow-hidden pointer-events-none"
        style={{ left: -4.02, top: LC_BG_TOP, width: 1928.035, height: 763.125 }}
      >
        <img
          alt=""
          className="absolute h-[171.51%] left-[-11.74%] max-w-none top-[-49.8%] w-[123.48%]"
          src={`${import.meta.env.BASE_URL}assets/870fa.webp`} loading="lazy" decoding="async"
        />
      </div>

      <p
        className="[word-break:break-word] absolute font-['Geist:Medium'] leading-[94.952px] text-[94.952px] text-white tracking-[-3.7981px] whitespace-nowrap"
        style={{ left: 102.77, top: LC_TITLE_TOP }}
      >
        {`Let's Connect`}
      </p>

      <p
        className="[word-break:break-word] absolute font-['Geist:Medium'] leading-[49.62px] text-[32px] text-white tracking-[-1.1451px] w-[796.5px]"
        style={{ left: 970.79, top: LC_DESC_TOP }}
      >
        {`If you're looking for a partner to help you explore new ideas, refine your brand, or simply need someone to bounce ideas off of, I'm here to listen and collaborate.`}
      </p>

      <a
        href="https://wa.me/923295460848"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute flex items-center gap-[12px] cursor-pointer group/contact"
        style={{ left: 970.79, top: CONTACT_TOP }}
      >
        <p className="[word-break:break-word] font-['Zilla_Slab'] leading-[41.009px] not-italic text-[31.546px] text-white uppercase whitespace-nowrap transition-opacity duration-300 group-hover/contact:opacity-60">Contact</p>
        <div className="relative flex items-center justify-center w-[42px] h-[42px] overflow-hidden">
          <span className="absolute block -rotate-45 font-['Geist:Medium'] text-[34px] text-[#f2f2f2] leading-none transition-transform duration-[450ms] group-hover/contact:translate-x-[120%] group-hover/contact:-translate-y-[120%]">→</span>
          <span className="absolute block -rotate-45 font-['Geist:Medium'] text-[34px] text-[#f2f2f2] leading-none -translate-x-[120%] translate-y-[120%] transition-transform duration-[450ms] group-hover/contact:translate-x-0 group-hover/contact:translate-y-0">→</span>
        </div>
      </a>

      {/* ── Dark footer ──────────────────────────────────────── */}
      <div
        className="absolute bg-[#0f0f0f] flex flex-col items-start pb-[16px] pt-[128px]"
        style={{ left: -4.02, top: FOOTER_TOP, width: 1920, height: 530 }}
      >
        <div className="flex flex-col items-start px-[48px] w-[1920px]">
          <SharedFooterContent />
        </div>
      </div>
    </div>
  );
}
