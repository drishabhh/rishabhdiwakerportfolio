import HomeClient from "@/app/home-client";
import { readContent } from "@/lib/content";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const content = await readContent();
  return {
    title: content.seo.title,
    description: content.seo.description,
    ...(content.seo.favicon
      ? {
          icons: {
            icon: [{ url: content.seo.favicon }],
            shortcut: [content.seo.favicon],
            apple: [{ url: content.seo.favicon }],
          },
        }
      : {}),
  };
}

export default async function Home() {
  const content = await readContent();
  return <HomeClient content={content} />;
}
