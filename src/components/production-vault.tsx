"use client";

import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { Play } from "lucide-react";

const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const layoutSpring = { type: "spring" as const, stiffness: 170, damping: 28, mass: 0.9 };

import type { VaultPlaylist } from "@/lib/content";

type ArchiveCardProps = {
  playlist: VaultPlaylist;
  isDark: boolean;
};

function ArchiveCard({ playlist, isDark }: ArchiveCardProps) {
  const shellClass = isDark
    ? "border border-white/10 bg-[#1A1A1A]/76 backdrop-blur-2xl ring-1 ring-white/[0.06]"
    : "border border-zinc-200/90 bg-white/78 backdrop-blur-2xl ring-1 ring-zinc-300/45";
  return (
    <motion.article
      layout
      transition={{ layout: layoutSpring }}
      whileHover={{ scale: 1.03 }}
      className={`group/archive relative min-h-[240px] overflow-hidden rounded-2xl ${shellClass}`}
    >
      <Link
        href={playlist.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
        aria-label={`Open playlist: ${playlist.title}`}
      >
        <div className="relative h-full min-h-[240px] overflow-hidden">
          <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-br from-zinc-900/95 via-zinc-900/88 to-black/95" : "bg-gradient-to-br from-zinc-100 via-white to-zinc-200"}`} />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent" />

          <div className="absolute inset-x-0 bottom-0 z-20 p-5 pb-18 md:p-6 md:pb-20">
            <p className={`text-sm font-extrabold uppercase tracking-[0.18em] md:text-[0.95rem] ${isDark ? "text-white" : "text-zinc-900"}`}>
              {playlist.title}
            </p>
            <p className={`mt-2 text-sm font-semibold leading-relaxed md:text-[1rem] ${isDark ? "text-white/95" : "text-zinc-800"}`}>
              {playlist.description}
            </p>
          </div>

          <div
            className={`pointer-events-none absolute inset-x-3 bottom-3 z-30 rounded-full border px-4 py-2.5 transition-[background-color,border-color,color,box-shadow] duration-200 ease-out group-hover/archive:border-[#ff0f0f] group-hover/archive:bg-[#ff0f0f] group-hover/archive:shadow-[0_8px_28px_rgba(220,38,38,0.42)] md:inset-x-4 md:bottom-4 ${
              isDark
                ? "border-white/25 bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "border-zinc-400/80 bg-zinc-100 text-zinc-900 shadow-sm group-hover/archive:text-white"
            }`}
          >
            <span className="flex items-center justify-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] md:text-[11px]">
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
              WATCH PLAYLIST
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export type ProductionVaultProps = {
  isDark: boolean;
  mutedClass: string;
  subheadingClass: string;
  title: string;
  subtitle: string;
  playlists: VaultPlaylist[];
};

export function ProductionVault({ isDark, mutedClass, subheadingClass, title, subtitle, playlists }: ProductionVaultProps) {
  const outlineTitleClass =
    "text-transparent [-webkit-text-stroke:1.5px_#ffffff] [paint-order:stroke_fill] md:[-webkit-text-stroke-width:2px]";

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
        <h2
          id="production-vault-heading"
          className={`max-w-[100%] text-[clamp(2.5rem,8vw,4.75rem)] font-black uppercase leading-[0.92] tracking-tight ${outlineTitleClass} drop-shadow-[0_3px_28px_rgba(0,0,0,0.75)] drop-shadow-[0_0_1px_rgba(0,0,0,0.95)]`}
        >
          {title}
        </h2>
        <p className={`max-w-2xl text-sm font-medium leading-relaxed text-zinc-300 md:text-base ${subheadingClass}`}>
          {subtitle}
        </p>
      </div>

      <LayoutGroup id="archive-grid-layout">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4">
          {playlists.map((p) => (
            <ArchiveCard key={p.id} playlist={p} isDark={isDark} />
          ))}
        </div>
      </LayoutGroup>
    </motion.section>
  );
}
