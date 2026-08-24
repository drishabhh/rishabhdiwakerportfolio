export function isEnabled(enabled?: boolean): boolean {
  return enabled !== false;
}

export type HighlightItem = {
  title: string;
  views: string;
  caption?: string;
  href: string;
  badge?: string;
  /** Self-hosted MP4/WebM when YouTube blocks embed or playback */
  fileUrl?: string;
  /** Optional custom poster; falls back to YouTube thumb or first frame */
  posterUrl?: string;
  /** 1-based gallery position; unique, shifts when another item takes the same slot */
  order?: number;
  /** When false, hidden on the public site. Missing means on. */
  enabled?: boolean;
};

export type SkillBlock = {
  num: string;
  title: string;
  tags: string[];
  enabled?: boolean;
};

export type VaultPlaylist = {
  id: string;
  title: string;
  description: string;
  href: string;
  enabled?: boolean;
};

export type ExperienceRole = {
  id: string;
  company: string;
  dateRange: string;
  role: string;
  tagline: string;
  videoUrl: string;
  embedStart?: number;
  /** When false, the card is hidden on the public site. Missing means on. */
  enabled?: boolean;
};

export function isExperienceRoleEnabled(role: ExperienceRole): boolean {
  return isEnabled(role.enabled);
}

export type ServiceItem = {
  indexLabel: string;
  title: string;
  description: string;
  icon: "film" | "post" | "ai" | "growth";
  enabled?: boolean;
};

export type SocialLink = {
  label: string;
  href: string;
  enabled?: boolean;
};

export type SiteContent = {
  header: {
    name: string;
    tagline: string;
    statusLabel: string;
    whatsappUrl: string;
    enabled?: boolean;
  };
  hero: {
    linePrefix: string;
    rotatingWords: string[];
    lineSuffix: string;
    cta: {
      label: string;
      href: string;
    };
    enabled?: boolean;
  };
  summary: {
    title: string;
    professionalProfile: string;
    corePhilosophy: string;
    enabled?: boolean;
  };
  highlights: {
    items: HighlightItem[];
    enabled?: boolean;
  };
  trash?: {
    highlights: HighlightItem[];
  };
  skills: {
    title: string;
    subtitle: string;
    blocks: SkillBlock[];
    enabled?: boolean;
  };
  vault: {
    title: string;
    subtitle: string;
    playlists: VaultPlaylist[];
    enabled?: boolean;
  };
  experience: {
    title: string;
    roles: ExperienceRole[];
    enabled?: boolean;
  };
  services: {
    title: string;
    items: ServiceItem[];
    enabled?: boolean;
  };
  footer: {
    name: string;
    tagline: string;
    statusLabel: string;
    email: string;
    socials: SocialLink[];
    enabled?: boolean;
  };
  seo: {
    title: string;
    description: string;
    favicon: string;
  };
  resume: {
    url: string;
    downloadName: string;
    enabled?: boolean;
  };
};
