import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  CONTENT_BLOB_PATH,
  hasBlobStorage,
  readBlobText,
  writeBlobText,
} from "./content-storage";
import {
  GITHUB_CONTENT_PATH,
  hasGitHubStorage,
  readGitHubText,
  writeGitHubText,
} from "./github-content";
import { originalHighlightItems } from "./original-highlights";

export type {
  ExperienceRole,
  HighlightItem,
  ServiceItem,
  SiteContent,
  SkillBlock,
  SocialLink,
  VaultPlaylist,
} from "./content-types";
import type { SiteContent } from "./content-types";

export const defaultContent: SiteContent = {
  header: {
    name: "Rishabh Diwaker",
    tagline: "Video Editor · AI-Augmented Post-Production Specialist",
    statusLabel: "Open to work",
    whatsappUrl: "https://wa.me/918077884422",
  },
  hero: {
    linePrefix: "Engineered to",
    rotatingWords: ["Skyrocket", "Amplify", "Scale", "Boost", "Multiply"],
    lineSuffix: "your views",
    cta: {
      label: "Watch showreel",
      href: "https://youtu.be/AtdjWGqebMY?si=OZT9l5M-jU5eDZoG",
    },
  },
  summary: {
    title: "Summary",
    professionalProfile:
      "Creative Video Editor with 5 years of experience producing high-engagement content. Currently driving video strategy for the Sri Mandir app at AppsForBharat, reaching a direct user base of 250K+.",
    corePhilosophy:
      "My work centers on optimizing workflows through AI and automation while maintaining editorial precision to increase audience retention and watch time.",
  },
  highlights: {
    items: originalHighlightItems.map((item) => ({ ...item })),
  },
  trash: {
    highlights: [],
  },
  skills: {
    title: "Skills",
    subtitle: "Three sticky disciplines. Notes lift on hover; tags pick up a little ink.",
    blocks: [
      {
        num: "01",
        title: "Video Editing, Motion & Sound",
        tags: ["Adobe Premiere Pro", "After Effects", "Audition", "Color Grading", "Storyboarding", "Sound Design"],
      },
      {
        num: "02",
        title: "AI Tools",
        tags: ["Runway ML", "Kling AI", "Sora", "VEO", "ElevenLabs", "Luma Dream Machine"],
      },
      {
        num: "03",
        title: "Design Tools",
        tags: ["Figma", "Photoshop", "Illustrator", "Canva"],
      },
    ],
  },
  vault: {
    title: "THE ARCHIVE",
    subtitle: "Full production history and curated work samples.",
    playlists: [
      {
        id: "ai-animation",
        title: "AI / Animation",
        description: "Showcasing AI workflows (Runway, Kling, Sora) and 3D motion design.",
        href: "https://youtube.com/playlist?list=PLdT9F7iP4yrSbQvttGxOIpyEWS5cFjUl0&si=S1fwvrQXah7aIBHw",
      },
      {
        id: "talking-head",
        title: "Talking Head",
        description: "High-engagement edits for podcasts and professional speakers, optimized for audience retention.",
        href: "https://youtube.com/playlist?list=PLdT9F7iP4yrTpaeh7r3xC61o7qrthS9sJ&si=ZwFc8Pol4MqTrzGd",
      },
      {
        id: "promotion",
        title: "Promotion",
        description: "Results-driven brand campaigns, including work that boosted event participation by 14%.",
        href: "https://youtube.com/playlist?list=PLdT9F7iP4yrQEi_9AHG9_jLzv0ObQfFkL&si=hFkWx5ulqY26_f7z",
      },
      {
        id: "short-films",
        title: "Short Films / Teasers",
        description: "Cinematic storytelling, featuring teaser trailers that drove 12.8K views in 3 days for TEDx.",
        href: "https://youtube.com/playlist?list=PLdT9F7iP4yrRQX6GlQ-Bt-cHrMbbYo7wS&si=nZHs_pPuUoRtZc7X",
      },
    ],
  },
  experience: {
    title: "Experience",
    roles: [
      {
        id: "appsforbharat",
        company: "AppsForBharat",
        dateRange: "Jan 2025 – Present",
        role: "Video Editor (Content Strategy & Creative Production)",
        tagline: "Vertical content reaching 250K+ users",
        videoUrl: "https://www.youtube.com/watch?v=vJcsQHq-C24",
      },
      {
        id: "great-creatives",
        company: "Great Creatives",
        dateRange: "Mar 2024 – Jan 2025",
        role: "Head of Media Production",
        tagline: "10+ major media campaigns · team of 8+",
        videoUrl: "https://www.youtube.com/watch?v=1-WDvYhGg1s",
      },
      {
        id: "byte-blogger",
        company: "Byte Blogger Base",
        dateRange: "Earlier role",
        role: "Video Editor & Graphic Designer",
        tagline: "127K+ views · 40% avg. watch time lift",
        videoUrl: "https://www.youtube.com/watch?v=HRUHvhYpaNc",
      },
    ],
  },
  services: {
    title: "SERVICES",
    items: [
      {
        indexLabel: "01",
        title: "Short-Form Dominance",
        description:
          "Viral storytelling for TikTok, Reels, and Shorts that increased reach for TEDx to 12.8K views in 3 days.",
        icon: "film",
      },
      {
        indexLabel: "02",
        title: "Technical Post-Production",
        description: "Expert motion graphics and color grading that improved audience retention by 25%.",
        icon: "post",
      },
      {
        indexLabel: "03",
        title: "AI-Powered Workflows",
        description: "Leveraging Runway, Kling, and Sora to cut production time by 20% while increasing engagement.",
        icon: "ai",
      },
      {
        indexLabel: "04",
        title: "Growth Strategy",
        description:
          "Designing content systems that reached 250K+ users and boosted successful payment conversions by 14.29%.",
        icon: "growth",
      },
    ],
  },
  footer: {
    name: "RISHABH DIWAKER",
    tagline: "Video Editor · AI-Augmented Post-Production Specialist",
    statusLabel: "Available for projects",
    email: "rishabhdiwaker0012@gmail.com",
    socials: [
      {
        label: "YouTube",
        href: "https://youtube.com/@rishabhsportfolio?si=NTQ5HeB8CZYCBMrD",
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/rishabhdiwaker0012",
      },
    ],
  },
  seo: {
    title: "Rishabh Diwaker | Portfolio",
    description: "Portfolio of Rishabh Diwaker, digital content creator and SEO strategist.",
    favicon: "",
  },
  resume: {
    url: "/rishabh-diwaker-cv.pdf",
    downloadName: "Rishabh-Diwaker-CV.pdf",
  },
};

const contentPath = path.join(process.cwd(), "data", "content.json");
const localContentPath = path.join(process.cwd(), "data", "content.local.json");

/** Local dev saves go to content.local.json (gitignored), not the committed seed file. */
function useLocalContentFile(): boolean {
  return process.env.NODE_ENV === "development" && process.env.VERCEL !== "1";
}

async function readContentFromDisk(): Promise<SiteContent | null> {
  if (useLocalContentFile()) {
    try {
      const raw = await readFile(localContentPath, "utf-8");
      return mergeContent(JSON.parse(raw) as Partial<SiteContent>);
    } catch {
      /* fall through to committed seed */
    }
  }

  try {
    const raw = await readFile(contentPath, "utf-8");
    return mergeContent(JSON.parse(raw) as Partial<SiteContent>);
  } catch {
    return null;
  }
}

async function writeContentToDisk(json: string): Promise<void> {
  const target = useLocalContentFile() ? localContentPath : contentPath;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, json, "utf-8");
}

export async function readContent(): Promise<SiteContent> {
  if (hasBlobStorage()) {
    const blobRaw = await readBlobText(CONTENT_BLOB_PATH);
    if (blobRaw) {
      try {
        return mergeContent(JSON.parse(blobRaw) as Partial<SiteContent>);
      } catch {
        /* fall through */
      }
    }
  }

  if (hasGitHubStorage()) {
    const githubRaw = await readGitHubText(GITHUB_CONTENT_PATH);
    if (githubRaw) {
      try {
        return mergeContent(JSON.parse(githubRaw) as Partial<SiteContent>);
      } catch {
        /* fall through */
      }
    }
  }

  try {
    const fromDisk = await readContentFromDisk();
    if (fromDisk) return fromDisk;
  } catch {
    /* fall through */
  }

  return defaultContent;
}

export async function writeContent(content: SiteContent): Promise<void> {
  const json = JSON.stringify(content, null, 2);

  if (hasBlobStorage()) {
    try {
      await writeBlobText(CONTENT_BLOB_PATH, json, "application/json");
      return;
    } catch {
      /* try next backend */
    }
  }

  if (hasGitHubStorage()) {
    await writeGitHubText(GITHUB_CONTENT_PATH, json, "Update site content from admin dashboard");
    return;
  }

  try {
    await writeContentToDisk(json);
  } catch {
    throw new Error("STORAGE_UNAVAILABLE");
  }
}

export function mergeContent(partial: Partial<SiteContent>): SiteContent {
  return {
    ...defaultContent,
    ...partial,
    header: {
      ...defaultContent.header,
      ...partial.header,
      whatsappUrl:
        partial.header?.whatsappUrl ??
        (partial.header as { youtubeUrl?: string } | undefined)?.youtubeUrl ??
        defaultContent.header.whatsappUrl,
    },
    hero: {
      ...defaultContent.hero,
      ...partial.hero,
      cta: {
        ...defaultContent.hero.cta,
        ...partial.hero?.cta,
      },
    },
    summary: { ...defaultContent.summary, ...partial.summary },
    highlights: {
      items: partial.highlights?.items ?? defaultContent.highlights.items,
    },
    trash: {
      highlights: partial.trash?.highlights ?? defaultContent.trash?.highlights ?? [],
    },
    skills: { ...defaultContent.skills, ...partial.skills },
    vault: { ...defaultContent.vault, ...partial.vault },
    experience: { ...defaultContent.experience, ...partial.experience },
    services: { ...defaultContent.services, ...partial.services },
    footer: {
      ...defaultContent.footer,
      ...partial.footer,
      tagline:
        partial.header?.tagline ??
        partial.footer?.tagline ??
        defaultContent.header.tagline,
    },
    seo: { ...defaultContent.seo, ...partial.seo },
    resume: { ...defaultContent.resume, ...partial.resume },
  };
}

export { originalHighlightItems } from "./original-highlights";
