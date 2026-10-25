/** Canonical address of the live site — every absolute URL in metadata, the sitemap and JSON-LD starts here. */
export const SITE_URL = "https://www.rishabhdiwaker.com";

/** Where Rishabh is based, as search engines should read it (local results for "video editor in Bangalore"). */
export const SITE_LOCATION = {
  city: "Bengaluru",
  cityAlt: "Bangalore",
  region: "Karnataka",
  country: "IN",
  countryName: "India",
} as const;

/** Page title and description shared by the metadata, Open Graph card and JSON-LD. */
export const SITE_TITLE = "Rishabh Diwaker | Video Editor in Bangalore & AI Creator";
export const SITE_DESCRIPTION =
  "Bangalore-based video editor & AI creator with 5+ years of high-retention edits: Reels, YouTube, brand campaigns and motion graphics. Available for hire.";

/** Photo used for link previews and as the person's image in structured data. */
export const SITE_IMAGE = { url: "/hero/home-bg.jpg", width: 1024, height: 576 } as const;
