import HomeClient from "@/app/home-client";
import { LAST_MODIFIED, PUBLISHED } from "@/app/sitemap";
import { readContent } from "@/lib/content";
import { isEnabled, type SiteContent } from "@/lib/content-types";
import { SITE_DESCRIPTION, SITE_IMAGE, SITE_LOCATION, SITE_TITLE, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const day = (date: Date) => date.toISOString().slice(0, 10);

/** Public profiles (YouTube, LinkedIn…) from the footer, without tracking params, for `sameAs`. */
function profileUrls(content: SiteContent): string[] {
  const urls = content.footer.socials.flatMap((social) => {
    if (!isEnabled(social.enabled) || social.href.includes("wa.me")) return [];
    try {
      const url = new URL(social.href);
      if (!url.protocol.startsWith("http")) return [];
      url.search = "";
      url.hostname = url.hostname.replace(/^www\./, "");
      return [url.toString()];
    } catch {
      return [];
    }
  });
  return [...new Set(urls)];
}

/**
 * Structured data Google reads for local results: who Rishabh is, that he works from Bengaluru,
 * and the services listed on the page. Built from live content so it never states anything
 * the page doesn't show.
 */
function structuredData(content: SiteContent) {
  const person = `${SITE_URL}/#person`;
  const website = `${SITE_URL}/#website`;
  const image = `${SITE_URL}${SITE_IMAGE.url}`;
  const city = { "@type": "City", name: SITE_LOCATION.city, alternateName: SITE_LOCATION.cityAlt };
  const address = {
    "@type": "PostalAddress",
    addressLocality: SITE_LOCATION.city,
    addressRegion: SITE_LOCATION.region,
    addressCountry: SITE_LOCATION.country,
  };
  const skills = content.skills.blocks.filter((block) => isEnabled(block.enabled)).map((block) => block.title);
  const services = content.services.items.filter((item) => isEnabled(item.enabled)).map((item) => item.title);

  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": website, url: SITE_URL, name: content.header.name, inLanguage: "en-IN" },
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: SITE_TITLE,
        description: SITE_DESCRIPTION,
        isPartOf: { "@id": website },
        mainEntity: { "@id": person },
        datePublished: day(PUBLISHED),
        dateModified: day(LAST_MODIFIED),
        inLanguage: "en-IN",
      },
      {
        "@type": "Person",
        "@id": person,
        name: content.header.name,
        alternateName: "Rishabh Diwakar",
        jobTitle: "Video Editor",
        url: SITE_URL,
        image,
        address,
        homeLocation: city,
        knowsAbout: skills,
        sameAs: profileUrls(content),
      },
      {
        "@type": "ProfessionalService",
        "@id": `${SITE_URL}/#service`,
        name: `${content.header.name} — Video Editing`,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        image,
        address,
        areaServed: [city, { "@type": "Country", name: SITE_LOCATION.countryName }],
        founder: { "@id": person },
        makesOffer: services.map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
      },
    ],
  };
}

export default async function Home() {
  const content = await readContent();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(content)).replace(/</g, "\\u003c") }}
      />
      {/* The visible headline is artwork, so the page's H1 is for search engines and screen readers. */}
      <h1 className="sr-only">{`${content.header.name} — Video Editor in ${SITE_LOCATION.cityAlt}`}</h1>
      <HomeClient content={content} />
    </>
  );
}
