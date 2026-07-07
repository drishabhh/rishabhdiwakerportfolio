import type { MetadataRoute } from "next";

const SITE_URL = "https://www.rishabhdiwaker.com";

/**
 * Sitemap with publish + last-modified dates.
 *
 * These dates live ONLY in the sitemap and JSON-LD (see layout.tsx) — they
 * are metadata Google reads to understand freshness and rank you better.
 * They are never rendered anywhere on the visible page, exactly as you
 * asked: "add publish date and modified date but don't show at front."
 *
 * When you make a meaningful update to the site, bump LAST_MODIFIED to the
 * current date so Google knows the content is fresh. PUBLISHED stays fixed
 * at the original launch date.
 */
const PUBLISHED = new Date("2026-04-01");
const LAST_MODIFIED = new Date("2026-07-07");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}

export { PUBLISHED, LAST_MODIFIED };
