export type SiteContent = {
  name: string;
  tagline: string;
  bio: string;
  location: string;
  email: string;
  photo: string;
  socials: {
    youtube: string;
    instagram: string;
    linkedin: string;
    twitter: string;
    email: string;
    website: string;
  };
  videos: {
    id: string;
    title: string;
    description: string;
  }[];
};

export async function getContent(): Promise<SiteContent> {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/drishabhh/rishabhdiwakerportfolio/main/public/content.json",
      { next: { revalidate: 60 } } // refresh every 60 seconds
    );
    if (!res.ok) throw new Error("Failed");
    return res.json();
  } catch {
    // fallback defaults
    return {
      name: "Rishabh Diwaker",
      tagline: "Video Editor",
      bio: "",
      location: "",
      email: "",
      photo: "",
      socials: { youtube: "", instagram: "", linkedin: "", twitter: "", email: "", website: "" },
      videos: [],
    };
  }
}
