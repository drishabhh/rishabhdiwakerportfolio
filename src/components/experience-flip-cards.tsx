"use client";

import type { ExperienceRole as ContentExperienceRole } from "@/lib/content";
import { youtubeVideoIdFromUrl } from "@/lib/youtube";
import { motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";

const focusSpring = { type: "spring" as const, stiffness: 280, damping: 32, mass: 0.85 };
const fadeSpring = { type: "spring" as const, stiffness: 320, damping: 38, mass: 0.75 };

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

type ExperienceRole = ContentExperienceRole & {
  marketingLinks?: Array<{ label: string; href: string }>;
};

function roleVideoId(entry: ExperienceRole): string {
  return youtubeVideoIdFromUrl(entry.videoUrl) || "";
}

function buildEmbedUrl(id: string, start?: number) {
  const q = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    controls: "1",
    autoplay: "0",
  });
  if (start != null && start > 0) q.set("start", String(Math.floor(start)));
  return `https://www.youtube.com/embed/${id}?${q.toString()}`;
}

type ExperienceCardProps = {
  entry: ExperienceRole;
  isDark: boolean;
  isOpen: boolean;
  isDimmed: boolean;
  onOpen: () => void;
  onClose: () => void;
};

function ExperienceCard({ entry, isDark, isOpen, isDimmed, onOpen, onClose }: ExperienceCardProps) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const hasMarketingLinks = Boolean(entry.marketingLinks?.length);
  const embedSrc = isOpen ? buildEmbedUrl(roleVideoId(entry), entry.embedStart) : undefined;
  const useFocusMotion = !reduceMotion && !isMobile;

  const stopPropagation = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  const marketingLinksBlock = hasMarketingLinks ? (
    <div className="mt-5 space-y-2.5" data-no-card-activate="true">
      <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
        MARKETING SPOTLIGHT
      </p>
      <div className="flex flex-wrap gap-2">
        {entry.marketingLinks?.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            data-no-card-activate="true"
            className="group relative inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-900 transition-all duration-200 hover:scale-[1.04] hover:border-orange-400 hover:shadow-[0_0_16px_rgba(249,115,22,0.45)] md:text-[10.5px]"
            title="Click to watch specific marketing video."
            onClick={stopPropagation}
            onPointerDown={stopPropagation}
          >
            <Play className="h-3 w-3 fill-current" aria-hidden />
            <span>{link.label}</span>
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Click to watch specific marketing video.
            </span>
          </a>
        ))}
      </div>
    </div>
  ) : null;

  if (reduceMotion) {
    return (
      <article
        className={`flex min-h-[320px] flex-col rounded-2xl border p-6 shadow-sm md:min-h-[340px] ${
          isDark ? "border-white/10 bg-[#1A1A1A] text-white" : "border-zinc-200/90 bg-zinc-50 text-zinc-900"
        }`}
      >
        <p
          className={`text-xs font-medium uppercase tracking-wide ${
            isDark ? "text-white/80 title-glow-opposite-light-text" : "text-zinc-500"
          }`}
        >
          {entry.dateRange}
        </p>
        <p
          className={`mt-2 font-serif text-xl font-bold tracking-tight md:text-2xl md:font-extrabold ${
            isDark ? "text-white title-glow-opposite-light-text" : "text-black title-glow-opposite-dark-text"
          }`}
        >
          {entry.company}
        </p>
        <p className={`mt-1 text-sm ${isDark ? "text-white/85 title-glow-opposite-light-text" : "text-zinc-700"}`}>
          {entry.role}
        </p>
        {marketingLinksBlock}
        {!hasMarketingLinks ? (
          <p className={`mt-auto pt-8 text-sm leading-relaxed ${isDark ? "text-zinc-300" : "text-zinc-500"}`}>
            {entry.tagline}
          </p>
        ) : null}
        <a
          href={entry.videoUrl || `https://www.youtube.com/watch?v=${roleVideoId(entry)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-orange-600 underline-offset-4 hover:underline"
        >
          Click here to watch
        </a>
      </article>
    );
  }

  const cardShellClass = isDark
    ? "border-white/10 bg-[#1A1A1A] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_-28px_rgba(0,0,0,0.45)]"
    : "border-zinc-200/80 bg-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_18px_50px_-28px_rgba(0,0,0,0.35)]";

  const cardBody = isOpen ? (
    <div
      className={`relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border-2 border-orange-400/45 bg-black shadow-[0_0_0_1px_rgba(255,140,70,0.25),0_0_40px_-8px_rgba(255,120,55,0.35)] md:min-h-[360px]`}
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-[60] rounded-full border border-white/30 bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-md"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        Close
      </button>
      {embedSrc ? (
        <iframe
          key={embedSrc}
          title="Work sample preview"
          className="absolute inset-0 h-full w-full scale-[1.02] border-0 object-cover"
          src={embedSrc}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
      )}
    </div>
  ) : (
    <div className={`relative flex h-full min-h-[320px] flex-col rounded-2xl border p-6 md:min-h-[360px] md:p-7 ${cardShellClass}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl ${isDark ? "opacity-[0.08]" : "opacity-[0.14]"}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`,
          mixBlendMode: isDark ? "overlay" : "multiply",
        }}
      />
      <div className="relative grid h-full min-h-0 grid-rows-[1fr_auto_auto] gap-0">
        <div className="min-h-0">
          <p
            className={`pt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${
              isDark ? "text-white/80 title-glow-opposite-light-text" : "text-zinc-500"
            }`}
          >
            {entry.dateRange}
          </p>
          <h3
            className={`mt-4 max-w-full font-serif text-2xl font-bold leading-tight tracking-tight md:mt-5 md:text-[1.75rem] md:font-extrabold ${
              isDark ? "text-white title-glow-opposite-light-text" : "text-black title-glow-opposite-dark-text"
            }`}
          >
            {entry.company}
          </h3>
          <p
            className={`mt-2 text-sm font-medium md:text-base ${
              isDark ? "text-white/85 title-glow-opposite-light-text" : "text-zinc-700"
            }`}
          >
            {entry.role}
          </p>
          {marketingLinksBlock}
        </div>
        <div className="flex items-center justify-center py-5 md:py-6">
          <button
            type="button"
            data-no-card-activate="true"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            onPointerDown={stopPropagation}
            className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm transition-all duration-200 hover:scale-[1.03] md:text-[11px] ${
              isDark
                ? "border-orange-400/50 bg-orange-500/15 text-orange-200 hover:border-orange-400 hover:bg-orange-500/25 hover:shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                : "border-orange-400/70 bg-white text-zinc-900 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
            }`}
          >
            <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden />
            Click here to watch
          </button>
        </div>
        <p
          className={`min-h-[3.25rem] max-w-[20rem] text-xs leading-relaxed md:min-h-[3.5rem] md:text-sm ${
            isDark ? "text-zinc-300" : "text-zinc-500"
          } ${hasMarketingLinks ? "opacity-0" : ""}`}
        >
          {entry.tagline}
        </p>
      </div>
    </div>
  );

  if (!useFocusMotion) {
    return (
      <article className="relative min-h-[320px] w-full md:min-h-[360px]">
        <div className="relative h-full w-full">{cardBody}</div>
      </article>
    );
  }

  return (
    <motion.div
      className={`relative min-h-[320px] w-full md:min-h-[360px] ${isOpen ? "z-20" : "z-0"}`}
      initial={false}
      animate={{
        opacity: isDimmed ? 0.22 : 1,
        scale: isOpen ? 1.06 : isDimmed ? 0.94 : 1,
      }}
      transition={isOpen ? focusSpring : fadeSpring}
      style={{ transformOrigin: "center center" }}
    >
      <div className="relative h-full w-full">{cardBody}</div>
    </motion.div>
  );
}

export type ExperienceFlipCardsProps = {
  isDark: boolean;
  roles: ContentExperienceRole[];
};

export function ExperienceFlipCards({ isDark, roles }: ExperienceFlipCardsProps) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  return (
    <div className="grid gap-6 overflow-visible md:grid-cols-3 md:gap-5">
      {roles.map((entry) => {
        const isOpen = openCardId === entry.id;
        const isDimmed = openCardId !== null && openCardId !== entry.id;

        return (
          <ExperienceCard
            key={entry.id}
            entry={entry}
            isDark={isDark}
            isOpen={isOpen}
            isDimmed={isDimmed}
            onOpen={() => setOpenCardId(entry.id)}
            onClose={() => setOpenCardId((id) => (id === entry.id ? null : id))}
          />
        );
      })}
    </div>
  );
}
