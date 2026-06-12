import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export type HighlightItem = {
  title: string;
  views: string;
  caption?: string;
  href: string;
  badge?: string;
};

export type SkillBlock = {
  num: string;
  title: string;
  tags: string[];
};

export type VaultPlaylist = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export type ExperienceRole = {
  id: string;
  company: string;
  dateRange: string;
  role: string;
  tagline: string;
  videoUrl: string;
  embedStart?: number;
};

export type ServiceItem = {
  indexLabel: string;
  title: string;
  description: string;
  icon: "film" | "post" | "ai" | "growth";
};

export type SocialLink = {
  label: string;
  href: string;
};

export type SiteContent = {
  header: {
    name: string;
    tagline: string;
    statusLabel: string;
    youtubeUrl: string;
  };
  hero: {
    linePrefix: string;
    rotatingWords: string[];
    lineSuffix: string;
  };
  summary: {
    title: string;
    professionalProfile: string;
    corePhilosophy: string;
  };
  highlights: {
    items: HighlightItem[];
  };
  skills: {
    title: string;
    subtitle: string;
    blocks: SkillBlock[];
  };
  vault: {
    title: string;
    subtitle: string;
    playlists: VaultPlaylist[];
  };
  experience: {
    title: string;
    roles: ExperienceRole[];
  };
  services: {
    title: string;
    items: ServiceItem[];
  };
  footer: {
    name: string;
    tagline: string;
    statusLabel: string;
    email: string;
    socials: SocialLink[];
  };
  seo: {
    title: string;
    description: string;
    favicon: string;
  };
};

export const defaultContent: SiteContent = {
  header: {
    name: "Rishabh Diwaker",
    tagline: "Video Editor · AI-Augmented Post-Production Specialist",
    statusLabel: "Open to work",
    youtubeUrl: "https://youtube.com/@rishabhsportfolio?si=NTQ5HeB8CZYCBMrD",
  },
  hero: {
    linePrefix: "Engineered to",
    rotatingWords: ["Skyrocket", "Amplify", "Scale", "Boost", "Multiply"],
    lineSuffix: "your views",
  },
  summary: {
    title: "Summary",
    professionalProfile:
      "Creative Video Editor with 5 years of experience producing high-engagement content. Currently driving video strategy for the Sri Mandir app at AppsForBharat, reaching a direct user base of 250K+.",
    corePhilosophy:
      "My work centers on optimizing workflows through AI and automation while maintaining editorial precision to increase audience retention and watch time.",
  },
  highlights: {
    items: [
      {
        title: "TEDx",
        views: "12.8K",
        caption: "views in the first 3 days",
        href: "https://www.youtube.com/watch?v=FHkwqGr1pjg&list=PLdT9F7iP4yrRNHLPGRTZrciZptz_C8aNe",
        badge: "Viral in 3 Days",
      },
      {
        title: "Byte Blogger Base",
        views: "127K+",
        caption: "organic channel views",
        href: "https://www.youtube.com/watch?v=lVwL8VMkDmY&list=PLdT9F7iP4yrRNHLPGRTZrciZptz_C8aNe&index=3",
      },
      {
        title: "Sri Mandir · AppsForBharat",
        views: "250K+",
        caption: "direct users on launch content",
        href: "https://www.youtube.com/watch?v=h-V0NykeWRg&list=PLdT9F7iP4yrSzqcvIypf3DHJQYTHNiniO&index=7",
      },
      {
        title: "AppsForBharat · Events",
        views: "14%",
        caption: "event participation lift",
        href: "https://www.youtube.com/watch?v=ULoPlgS6u0s&list=PLdT9F7iP4yrQEi_9AHG9_jLzv0ObQfFkL&index=23",
      },
      {
        title: "Byte Blogger Base · Retention",
        views: "40%+",
        caption: "avg. watch time lift",
        href: "https://www.youtube.com/watch?v=KviJ-1cMY8g&list=PLdT9F7iP4yrQEi_9AHG9_jLzv0ObQfFkL",
      },
      {
        title: "AppsForBharat · Distribution",
        views: "19%",
        caption: "unique content shares lift",
        href: "https://www.youtube.com/watch?v=cMbVMK77Zco&list=PLdT9F7iP4yrQEi_9AHG9_jLzv0ObQfFkL&index=22",
      },
    ],
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
    tagline: "Video Editor & AI-Augmented Post-Production Specialist.",
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
};

const contentPath = path.join(process.cwd(), "data", "content.json");

export async function readContent(): Promise<SiteContent> {
  try {
    const raw = await readFile(contentPath, "utf-8");
    return mergeContent(JSON.parse(raw) as Partial<SiteContent>);
  } catch {
    return defaultContent;
  }
}

export async function writeContent(content: SiteContent): Promise<void> {
  await mkdir(path.dirname(contentPath), { recursive: true });
  await writeFile(contentPath, JSON.stringify(content, null, 2), "utf-8");
}

export function mergeContent(partial: Partial<SiteContent>): SiteContent {
  return {
    ...defaultContent,
    ...partial,
    header: { ...defaultContent.header, ...partial.header },
    hero: { ...defaultContent.hero, ...partial.hero },
    summary: { ...defaultContent.summary, ...partial.summary },
    highlights: { ...defaultContent.highlights, ...partial.highlights },
    skills: { ...defaultContent.skills, ...partial.skills },
    vault: { ...defaultContent.vault, ...partial.vault },
    experience: { ...defaultContent.experience, ...partial.experience },
    services: { ...defaultContent.services, ...partial.services },
    footer: { ...defaultContent.footer, ...partial.footer },
    seo: { ...defaultContent.seo, ...partial.seo },
  };
}
