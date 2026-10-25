import type { Metadata } from "next";
import {
  Bungee_Outline,
  DotGothic16,
  Inter,
  Space_Mono,
  Syne,
  UnifrakturMaguntia,
} from "next/font/google";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { SITE_DESCRIPTION, SITE_IMAGE, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

const bungeeOutline = Bungee_Outline({
  subsets: ["latin"],
  variable: "--font-bungee-outline",
  weight: "400",
});

const unifrakturMaguntia = UnifrakturMaguntia({
  subsets: ["latin"],
  variable: "--font-unifraktur-maguntia",
  weight: "400",
});

const dotGothic16 = DotGothic16({
  subsets: ["latin"],
  variable: "--font-dotgothic16",
  weight: "400",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE_URL),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: "Rishabh Diwaker",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      locale: "en_IN",
      images: [{ ...SITE_IMAGE, alt: "Rishabh Diwaker, video editor in Bangalore" }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [SITE_IMAGE.url],
    },
    keywords: [
      // Name variations
      "Rishabh Diwaker",
      "Rishabh Diwakar",
      "Rishabh Diwaker portfolio",
      "Rishabh Diwakar portfolio",
      "Rishabh Diwaker video editor",
      "Rishabh Diwakar video editor",
      "Rishabh Diwaker Bangalore",
      "Rishabh Diwaker AppsForBharat",
      "Rishabh Diwaker Sri Mandir",

      // Core role
      "video editor Bangalore",
      "video editor India",
      "freelance video editor Bangalore",
      "professional video editor India",
      "senior video editor Bangalore",
      "video editor for hire India",
      "video editor for hire Bangalore",

      // AI specialization
      "AI video editor India",
      "AI-augmented video editor",
      "AI content creator India",
      "AI video production India",
      "AI creator Bangalore",
      "Runway ML video editor",
      "Kling AI video editor",
      "ElevenLabs video production",

      // Short form
      "short form video editor India",
      "reels editor Bangalore",
      "Instagram reels editor India",
      "YouTube shorts editor India",
      "TikTok video editor India",
      "viral video editor India",
      "social media video editor Bangalore",

      // Motion and post production
      "motion designer Bangalore",
      "motion graphics designer India",
      "Adobe Premiere Pro editor India",
      "After Effects animator India",
      "color grading Bangalore",
      "post production specialist India",
      "video post production Bangalore",

      // Brand and content strategy
      "brand video editor India",
      "content strategy video editor",
      "YouTube video editor India",
      "YouTube channel editor Bangalore",
      "video editor for brands India",
      "corporate video editor Bangalore",
      "startup video editor India",
      "edtech video editor India",
      "fintech video editor India",
      "wellness brand video editor",

      // Talking head and podcast
      "talking head video editor India",
      "podcast video editor Bangalore",
      "interview video editor India",

      // Services
      "video editing services Bangalore",
      "video editing services India",
      "AI-powered video workflows",
      "video content strategy India",
      "video growth strategy India",
      "high retention video editing",
      "audience retention video editor",

      // Tools
      "Premiere Pro freelancer India",
      "After Effects freelancer Bangalore",
      "Figma video designer",
      "VEO video creator India",

      // General discovery
      "best video editor Bangalore",
      "top video editor India",
      "video editor portfolio India",
      "video editor resume India",
      "hire video editor Bangalore",
      "hire video editor India",
    ],
    icons: {
      icon: [
        { url: "/favicon.png", type: "image/png", sizes: "512x512" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      shortcut: "/favicon.png",
      apple: { url: "/favicon.png", sizes: "512x512" },
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preload" as="image" href="/hero/home-bg.jpg" fetchPriority="high" />
      </head>
      <body
        className={`${inter.variable} ${syne.variable} ${spaceMono.variable} ${bungeeOutline.variable} ${unifrakturMaguntia.variable} ${dotGothic16.variable} min-h-screen bg-transparent antialiased`}
      >
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
