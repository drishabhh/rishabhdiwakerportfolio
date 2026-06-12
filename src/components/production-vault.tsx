"use client";

import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { Play } from "lucide-react";

const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const layoutSpring = { type: "spring" as const, stiffness: 170, damping: 28, mass: 0.9 };

import type { VaultPlaylist } from "@/lib/content";
import { SECTION_TITLE_ON_HERO } from "@/lib/section-title";

type ArchiveCardProps = {
  playlist: VaultPlaylist;
  isDark: boolean;
};

function ArchiveCard({ playlist, isDark }: ArchiveCardProps) {
  const shellClass = isDark
    ? "border border-white/10 bg-[#1A1A1A]/76 backdrop-blur-2xl ring-1 ring-white/[0.06]"
    : "border border-zinc-300/70 bg-gradient-to-br from-white via-zinc-50 to-zinc-100/90 backdrop-blur-2xl ring-1 ring-zinc-200/80 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.35)]";
  const titleClass = isDark
    ? "text-white"
    : "text-zinc-950";
  const bodyClass = isDark
    ? "text-zinc-300"
    : "text-zinc-600";
  const buttonClass = isDark
    ? "border-white/20 bg-white/[0.08] text-white group-hover/archive:border-[#ff0f0f] group-hover/archive:bg-[#ff0f0f] group-hover/archive:shadow-[0_8px_28px_rgba(220,38,38,0.42)]"
    : "border-zinc-300 bg-white text-zinc-900 shadow-sm group-hover/archive:border-[#ff0f0f] group-hover/archive:bg-[#ff0f0f] group-hover/archive:text-white group-hover/archive:shadow-[0_8px_28px_rgba(220,38,38,0.35)]";

  return (
    <motion.article
      layout
      transition={{ layout: layoutSpring }}
      whileHover={{ y: -4 }}
      className={`group/archive relative h-full overflow-hidden rounded-2xl ${shellClass}`}
    >
      <Link
        href={playlist.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full min-h-[220px] flex-col p-5 md:min-h-[240px] md:p-6"
        aria-label={`Open playlist: ${playlist.title}`}
      >
        <div className="flex flex-1 flex-col items-start text-left">
          <p
            className={`text-[11px] font-extrabold uppercase tracking-[0.2em] md:text-xs ${titleClass}`}
          >
            {playlist.title}
          </p>
          <p className={`mt-3 max-w-[34ch] text-sm leading-relaxed md:text-[0.9375rem] ${bodyClass}`}>
            {playlist.description}
          </p>
        </div>

        <span
          className={`mt-6 inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2.5 transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out group-hover/archive:-translate-y-0.5 ${buttonClass}`}
        >
          <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] md:text-[11px]">
            Watch playlist
          </span>
        </span>
      </Link>
    </motion.article>
  );
}

export type ProductionVaultProps = {
  isDark: boolean;
  mutedClass: string;
  subheadingClass: string;
  sectionTitleClass?: string;
  title: string;
  subtitle: string;
  playlists: VaultPlaylist[];
};

export function ProductionVault({
  isDark,
  mutedClass,
  subheadingClass,
  sectionTitleClass = SECTION_TITLE_ON_HERO,
  title,
  subtitle,
  playlists,
}: ProductionVaultProps) {
  return (
    <motion.section
      id="production-vault"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 1.1, ease: cinematicEase },
        },
      }}
      className="scroll-mt-28 space-y-8 pt-4 md:space-y-10 md:pt-6"
      aria-labelledby="production-vault-heading"
    >
      <div className="space-y-3">
        <h2 id="production-vault-heading" className={sectionTitleClass}>
          {title}
        </h2>
        <p className={`max-w-2xl text-sm font-medium leading-relaxed text-zinc-300 md:text-base ${subheadingClass}`}>
          {subtitle}
        </p>
      </div>

      <LayoutGroup id="archive-grid-layout">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {playlists.map((p) => (
            <ArchiveCard key={p.id} playlist={p} isDark={isDark} />
          ))}
        </div>
      </LayoutGroup>
    </motion.section>
  );
}
