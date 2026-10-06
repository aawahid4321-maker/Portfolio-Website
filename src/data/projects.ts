export interface ProjectData {
  id: string;
  title: string;
  agency: string;
  industry: string;
  service: string;
  year: string;
  description: string;
  heroImage: string;
  heroLogo?: string;
  // "zoom" (default) = large artistic zoom-in; "cover" = natural object-cover fit
  heroFit?: "zoom" | "cover";
  // When set, the LIVE LINK button navigates to this internal view instead of opening an external URL
  siteView?: string;
  images: (string | null)[];
  // Per-slot height override; falls back to IMG_SLOT_H when null/absent
  imageHeights?: (number | null)[];
  liveLink?: string;
  nextProjectId: string;
  thumbnail: string;
}

const desc =
  "I start by understanding the business, audience, and goals, then turn those insights into a clear creative direction. From there, I build bold brands, digital experiences, and visual systems, refining every detail to create work that communicates clearly, connects with people, and helps businesses grow.";

export const projects: ProjectData[] = [
  {
    id: "noire-coffee",
    title: "NOIRÉ COFFEE",
    agency: "Noiré Coffee",
    industry: "Coffee Brand",
    service: "Brand Identity",
    year: "2026",
    description:
      "Complete brand identity for Noiré Coffee — a bold, modern coffee brand with a dark, premium character. From the logo and typography to packaging, stationery, business cards, and a custom brand pattern, I built a full visual system designed to feel rich, confident, and unmistakable.",
    heroImage: "/assets/noire-hero.webp",
    heroLogo: undefined,
    heroFit: "cover",
    thumbnail: "/assets/noire-hero.webp",
    images: [
      "/assets/noire-01.webp",
      "/assets/noire-02.webp",
      "/assets/noire-03.webp",
      "/assets/noire-04.webp",
      "/assets/noire-05.webp",
      "/assets/noire-06.webp",
      "/assets/noire-07.webp",
      "/assets/noire-08.webp",
      "/assets/noire-09.webp",
      "/assets/noire-10.webp",
      "/assets/noire-11.webp",
      "/assets/noire-12.webp",
      "/assets/noire-13.webp",
      "/assets/noire-cards.webp",
    ],
    liveLink: undefined,
    nextProjectId: "fitflow",
  },
  {
    id: "fitflow",
    title: "FITFLOW",
    agency: "FitFlow",
    industry: "Fitness Brand",
    service: "Brand Identity",
    year: "2025",
    description:
      "Complete brand guideline for FitFlow — a bold fitness brand with a striking orange-on-black identity. From logo construction, typography, and color systems to mockups and real-world applications, I built a comprehensive guideline that keeps the brand powerful, consistent, and unmistakable everywhere it appears.",
    heroImage: "/assets/fitflow-hero.webp",
    heroLogo: undefined,
    heroFit: "cover",
    thumbnail: "/assets/fitflow-hero.webp",
    images: [
      "/assets/fitflow-01.webp",
      "/assets/fitflow-06.webp",
      "/assets/fitflow-11.webp",
      "/assets/fitflow-12.webp",
      "/assets/fitflow-14.webp",
      "/assets/fitflow-18.webp",
      "/assets/fitflow-20.webp",
      "/assets/fitflow-22.webp",
    ],
    liveLink: undefined,
    nextProjectId: "axorix",
  },
  {
    id: "axorix",
    title: "AXORIX",
    agency: "Axorix",
    industry: "DeFi Platform",
    service: "Brand Identity",
    year: "2025",
    description:
      "Complete brand identity for Axorix — an AI-powered DeFi protocol. From the logo and Power Grotesk typography to a striking black-and-yellow visual system, app UI, and marketing collateral, I built a bold identity made for the future of decentralized finance.",
    heroImage: "/assets/axorix-hero.webp",
    heroFit: "cover",
    heroLogo: undefined,
    thumbnail: "/assets/f95a7.webp",
    images: [
      "/assets/axorix-01.webp",
      "/assets/axorix-02.webp",
      "/assets/axorix-03.webp",
      "/assets/axorix-04.webp",
      "/assets/axorix-05.webp",
      "/assets/axorix-06.webp",
      "/assets/axorix-07.webp",
      "/assets/axorix-08.webp",
    ],
    imageHeights: [null, null, null, null, null, null, null, 1927],
    liveLink: undefined,
    nextProjectId: "dodi-homes",
  },
  {
    id: "dodi-homes",
    title: "DODI HOMES",
    agency: "Dodi Homes",
    industry: "Real Estate",
    service: "Brand Design",
    year: "2024",
    description: desc,
    heroImage: "/assets/91219.webp",
    heroLogo: undefined,
    thumbnail: "/assets/91219.webp",
    images: [null, null, null, null, null, null],
    liveLink: undefined,
    nextProjectId: "stint",
  },
  {
    id: "stint",
    title: "STINT",
    agency: "Stint",
    industry: "Gig Platform",
    service: "Brand Identity",
    year: "2025",
    description:
      "Brand identity and marketing collateral for Stint — a gig-work platform connecting people with short tasks. From the ST:NT wordmark to billboards, app UI, and notification design, I created a bold, youthful visual language built to stand out on the streets and on screen.",
    heroImage: "/assets/stint-hero.webp",
    heroLogo: undefined,
    heroFit: "cover",
    thumbnail: "/assets/stint-hero.webp",
    images: [
      "/assets/stint-01.webp",
      "/assets/stint-02.webp",
      "/assets/stint-03.webp",
      "/assets/stint-04.webp",
      "/assets/stint-05.webp",
      "/assets/stint-06.webp",
      "/assets/stint-07.webp",
      "/assets/stint-08.webp",
      "/assets/stint-09.webp",
    ],
    liveLink: undefined,
    nextProjectId: "chatblast",
  },
  {
    id: "chatblast",
    title: "CHATBLAST",
    agency: "ChatBlast",
    industry: "Technology",
    service: "Brand Design",
    year: "2025",
    description: desc,
    heroImage: "/assets/49ca5.webp",
    heroLogo: undefined,
    thumbnail: "/assets/49ca5.webp",
    images: [null, null, null, null, null, null],
    liveLink: undefined,
    nextProjectId: "brand",
  },
  {
    id: "brand",
    title: "BRAND",
    agency: "Brand",
    industry: "Brand Template",
    service: "Brand Identity",
    year: "2026",
    description:
      "A modular, premium brand guidelines kit for modern businesses — 60+ pages covering brand foundations, logo system, color, typography, and applications. Built to be customized, not copied. A complete brand book template designed for clarity and impact.",
    heroImage: "/assets/brand-hero.webp",
    heroLogo: undefined,
    heroFit: "cover",
    thumbnail: "/assets/brand-hero.webp",
    images: [
      "/assets/brand-01.webp",
      "/assets/brand-02.webp",
      "/assets/brand-03.webp",
      "/assets/brand-04.webp",
      "/assets/brand-05.webp",
      "/assets/brand-06.webp",
      "/assets/brand-07.webp",
      "/assets/brand-08.webp",
      "/assets/brand-09.webp",
      "/assets/brand-10.webp",
    ],
    liveLink: undefined,
    nextProjectId: "campus-app",
  },
  {
    id: "campus-app",
    title: "THE CAMPUS APP",
    agency: "Campus App",
    industry: "Education",
    service: "Brand Design",
    year: "2024",
    description: desc,
    heroImage: "/assets/campus-app.webp",
    heroLogo: undefined,
    thumbnail: "/assets/campus-app.webp",
    images: [
      "/assets/campus-01.webp",
      "/assets/campus-02.webp",
      "/assets/campus-03.webp",
      "/assets/campus-04.webp",
    ],
    liveLink: undefined,
    nextProjectId: "noire-coffee",
  },
];

// ── Base-path fix ──────────────────────────────────────────────────────────
// Image paths above are absolute ("/assets/..."), which 404s when the site is
// served from a sub-path (e.g. GitHub Pages /Portfolio-Website/). Prefix every
// project asset with Vite's BASE_URL so detail pages + thumbnails resolve.
const withBase = (p: string | null | undefined): string | null | undefined =>
  p ? `${import.meta.env.BASE_URL}${p.replace(/^\//, "")}` : p;

projects.forEach((p) => {
  p.heroImage = withBase(p.heroImage) as string;
  p.thumbnail = withBase(p.thumbnail) as string;
  p.images = p.images.map((i) => withBase(i) as string | null);
  if (p.heroLogo) p.heroLogo = withBase(p.heroLogo) as string;
});

export function getProjectById(id: string): ProjectData | undefined {
  return projects.find((p) => p.id === id);
}

export function getNextProject(currentId: string): ProjectData | undefined {
  const current = getProjectById(currentId);
  if (!current) return undefined;
  return getProjectById(current.nextProjectId);
}

// ── Project canvas height helpers ────────────────────────────────────────────
// Each image slot is 16:9 at the 1823.5px slot width.
const IMG_SLOT_H = Math.round((1823.5 * 9) / 16); // 1025
const IMG_GAP = 44;
const IMAGES_TOP = 1396;
const TAIL_H = 2601; // constant: Next Project + Let's Connect + Footer

export function getProjectCanvasH(imageCount: number): number {
  const imagesH = imageCount * IMG_SLOT_H + Math.max(0, imageCount - 1) * IMG_GAP;
  return IMAGES_TOP + imagesH + TAIL_H;
}

// Convenience constants re-exported for ProjectPage's internal layout math
export { IMG_SLOT_H, IMG_GAP, IMAGES_TOP, TAIL_H };
