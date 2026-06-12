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
    whatsappUrl: string;
  };
  hero: {
    linePrefix: string;
    rotatingWords: string[];
    lineSuffix: string;
    cta: {
      label: string;
      href: string;
    };
  };
  summary: {
    title: string;
    professionalProfile: string;
    corePhilosophy: string;
  };
  highlights: {
    items: HighlightItem[];
  };
  trash?: {
    highlights: HighlightItem[];
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
  resume: {
    url: string;
    downloadName: string;
  };
};
