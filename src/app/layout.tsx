import type { Metadata } from "next";
import {
  Bungee_Outline,
  DotGothic16,
  Inter,
  Space_Mono,
  Syne,
  UnifrakturMaguntia,
} from "next/font/google";
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

export const metadata: Metadata = {
  title: "Rishabh Diwaker | Portfolio",
  description: "Portfolio of Rishabh Diwaker, digital content creator and SEO strategist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${syne.variable} ${spaceMono.variable} ${bungeeOutline.variable} ${unifrakturMaguntia.variable} ${dotGothic16.variable} min-h-screen bg-transparent antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
