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

/** One of the four floating reels on the home screen. Plays on the site, never redirects. */
export type HeroReelItem = {
  title: string;
  /** YouTube, Instagram, Vimeo, Google Drive or a direct .mp4 link. */
  href: string;
  /** Uploaded video file (takes priority over the link). */
  fileUrl?: string;
  /** Thumbnail; needed for Instagram/Drive links, optional otherwise. */
  posterUrl?: string;
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
    /** AI prompt-bar CTA on the home screen (replaces the plain showreel button). */
    aiCta?: {
      label: string;
      href: string;
      prompts: string[];
      tools: string[];
      proof: string[];
      /** Orange button text in the prompt bar. */
      hireLabel?: string;
      /** Optional link for the button; empty scrolls to the Contact section. */
      hireHref?: string;
      /** Hint under the floating reels on desktop. */
      reelsHint?: string;
    };
    /** Floating reels on the home screen; empty uses the first 4 highlights. */
    reels?: HeroReelItem[];
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
