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
    id: "voyage-studio",
    title: "THE VOYAGE STUDIO",
    agency: "The Voyage Studio",
    industry: "Design Studio",
    service: "Brand Design",
    year: "2026",
    description: desc,
    heroImage: "/assets/ff5cb.webp",
    heroLogo: "/assets/54511.svg",
    thumbnail: "/assets/voyage-hero.webp",
    images: [
      "/assets/voyage-01.webp",
      "/assets/voyage-02.webp",
      "/assets/voyage-03.webp",
      "/assets/voyage-04.webp",
      "/assets/voyage-05.webp",
      "/assets/voyage-06.webp",
    ],
    liveLink: "https://thevoyage.studio/",
    nextProjectId: "nodaliq",
  },
  {
    id: "nodaliq",
    title: "NODALiQ",
    agency: "NODALiQ",
    industry: "Technology",
    service: "Brand Design",
    year: "2025",
    description: desc,
    heroImage: "/assets/nodaliq-hero.webp",
    heroLogo: undefined,
    heroFit: "cover",
    siteView: "nodaliq-site",
    thumbnail: "/assets/nodaliq-00.webp",
    images: [
      "/assets/nodaliq-00.webp",
      "/assets/nodaliq-03.webp",
      "/assets/nodaliq-04.webp",
      "/assets/nodaliq-05.webp",
      "/assets/nodaliq-06.webp",
      "/assets/nodaliq-07.webp",
      "/assets/nodaliq-08.webp",
      "/assets/nodaliq-10.webp",
      "/assets/nodaliq-11.webp",
      "/assets/nodaliq-12.webp",
      "/assets/nodaliq-13.webp",
      "/assets/nodaliq-14.webp",
      "/assets/nodaliq-15.webp",
    ],
    liveLink: undefined,
    nextProjectId: "axorix",
  },
  {
    id: "axorix",
    title: "AXORIX",
    agency: "Axorix",
    industry: "Technology",
    service: "Brand Design",
    year: "2025",
    description: desc,
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
    nextProjectId: "sint",
  },
  {
    id: "sint",
    title: "STINT",
    agency: "Stint",
    industry: "Retail",
    service: "Brand Design",
    year: "2023",
    description: desc,
    heroImage: "/assets/c4552.webp",
    heroLogo: undefined,
    thumbnail: "/assets/stint-01.webp",
    images: [
      "/assets/stint-01-new.webp",
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
    nextProjectId: "gradia",
  },
  {
    id: "gradia",
    title: "GRADIA",
    agency: "Gradia",
    industry: "Technology",
    service: "Brand Design",
    year: "2025",
    description: desc,
    heroImage: "/assets/gradia.webp",
    heroLogo: undefined,
    thumbnail: "/assets/gradia.webp",
    images: [
      "/assets/gradia-02.webp",
      "/assets/gradia-03.webp",
      "/assets/gradia-04.webp",
      "/assets/gradia-05.webp",
      null,
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
    nextProjectId: "voyage-studio",
  },
];

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
