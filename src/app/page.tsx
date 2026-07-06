import HomeClient from "@/app/home-client";
import { readContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await readContent();
  return <HomeClient content={content} />;
}
