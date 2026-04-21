"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Clapperboard, Play } from "lucide-react";
import { useEffect, useLayoutEffect, useState, type SyntheticEvent } from "react";

const focusSpring = { type: "spring" as const, stiffness: 280, damping: 32, mass: 0.85 };
const fadeSpring = { type: "spring" as const, stiffness: 320, damping: 38, mass: 0.75 };

type ExperienceRole = {
  id: string;
  company: string;
  dateRange: string;
  role: string;
  tagline: string;
  videoId: string;
  embedStart?: number;
  marketingLinks?: Array<{ label: string; href: string }>;
};

const roles: ExperienceRole[] = [
  {
    id: "appsforbharat",
    company: "AppsForBharat",
    dateRange: "Jan 2025 – Present",
    role: "Video Editor (Content Strategy & Creative Production)",
    tagline: "Vertical content reaching 250K+ users",
    videoId: "vJcsQHq-C24",
  },
  {
    id: "great-creatives",
    company: "Great Creatives",
    dateRange: "Mar 2024 – Jan 2025",
    role: "Head of Media Production",
    tagline: "10+ major media campaigns · team of 8+",
    videoId: "1-WDvYhGg1s",
  },
  {
    id: "byte-blogger",
    company: "Byte Blogger Base",
    dateRange: "Earlier role",
    role: "Video Editor & Graphic Designer",
    tagline: "127K+ views · 40% avg. watch time lift",
    videoId: "HRUHvhYpaNc",
  },
];

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
  finePointer: boolean;
  onOpen: () => void;
  onClose: () => void;
};

function ExperienceCard({ entry, isDark, isOpen, isDimmed, finePointer, onOpen, onClose }: ExperienceCardProps) {
  const reduceMotion = useReducedMotion();
  const [embedActive, setEmbedActive] = useState(false);
  const hasMarketingLinks = Boolean(entry.marketingLinks?.length);

  const stopPropagation = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  const isNoInteractTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('[data-no-card-activate="true"]'));
  };

  useEffect(() => {
    if (isOpen) {
      setEmbedActive(true);
    } else {
      setEmbedActive(false);
    }
  }, [isOpen]);

  const handlePointerEnter = (target: EventTarget | null) => {
    if (reduceMotion) return;
    if (isNoInteractTarget(target)) return;
    if (finePointer) onOpen();
  };

  const handlePointerLeave = () => {
    if (finePointer) onClose();
  };

  const handleCardClick = (target: EventTarget | null) => {
    if (reduceMotion) return;
    if (isNoInteractTarget(target)) return;
    if (!finePointer) {
      if (isOpen) onClose();
      else onOpen();
    }
  };

  const embedSrc = embedActive ? buildEmbedUrl(entry.videoId, entry.embedStart) : undefined;

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
          href={`https://www.youtube.com/watch?v=${entry.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-orange-600 underline-offset-4 hover:underline"
        >
          Watch sample reel
        </a>
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
      <div
        className="relative h-[min(100%,380px)] min-h-[320px] w-full md:min-h-[360px]"
        onPointerEnter={(e) => handlePointerEnter(e.target)}
        onPointerLeave={handlePointerLeave}
        onPointerMove={(e) => {
          if (reduceMotion || !finePointer) return;
          if (!isNoInteractTarget(e.target)) onOpen();
        }}
        onClick={(e) => handleCardClick(e.target)}
        onKeyDown={(e) => {
          if (reduceMotion) return;
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          if (isNoInteractTarget(e.target)) return;
          if (!finePointer) {
            if (isOpen) onClose();
            else onOpen();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${entry.company}, ${entry.role}. ${isOpen ? "Showing reel" : "Hover or tap to watch"}`}
      >
        <div
          className={`relative h-full w-full cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 ${
            isDark ? "focus-visible:ring-offset-zinc-950" : "focus-visible:ring-offset-zinc-100"
          }`}
        >
          {/* Front */}
          <div
            className={`absolute inset-0 z-[1] flex flex-col rounded-2xl border p-6 transition-opacity duration-300 ease-out md:p-7 ${
              isOpen ? "pointer-events-none opacity-0" : "opacity-100"
            } ${
              isDark
                ? "border-white/10 bg-[#1A1A1A] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_-28px_rgba(0,0,0,0.45)]"
                : "border-zinc-200/80 bg-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_18px_50px_-28px_rgba(0,0,0,0.35)]"
            }`}
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-2xl ${isDark ? "opacity-[0.08]" : "opacity-[0.14]"}`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`,
                mixBlendMode: isDark ? "overlay" : "multiply",
              }}
            />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <p
                  className={`min-w-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    isDark ? "text-white/80 title-glow-opposite-light-text" : "text-zinc-500"
                  }`}
                >
                  {entry.dateRange}
                </p>
                <div
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur-sm md:text-[11px] ${
                    isDark
                      ? "border-white/15 bg-white/10 text-white/90"
                      : "border-zinc-200/90 bg-white/90 text-zinc-600"
                  }`}
                >
                  <Clapperboard
                    className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-orange-400" : "text-orange-500"}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="whitespace-nowrap">Watch reel</span>
                </div>
              </div>
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
              {!hasMarketingLinks ? (
                <p
                  className={`mt-auto max-w-[20rem] pt-8 text-xs leading-relaxed md:text-sm ${
                    isDark ? "text-zinc-300" : "text-zinc-500"
                  }`}
                >
                  {entry.tagline}
                </p>
              ) : null}
            </div>
          </div>

          {/* Video */}
          <div
            className={`absolute inset-0 z-[2] overflow-hidden rounded-2xl border-2 border-orange-400/45 bg-black shadow-[0_0_0_1px_rgba(255,140,70,0.25),0_0_40px_-8px_rgba(255,120,55,0.35)] transition-opacity duration-300 ease-out ${
              isOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {!finePointer && isOpen ? (
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
            ) : null}
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
        </div>
      </div>
    </motion.div>
  );
}

export type ExperienceFlipCardsProps = {
  isDark: boolean;
};

export function ExperienceFlipCards({ isDark }: ExperienceFlipCardsProps) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [finePointer, setFinePointer] = useState(false);

  useLayoutEffect(() => {
    setFinePointer(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

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
            finePointer={finePointer}
            onOpen={() => setOpenCardId(entry.id)}
            onClose={() => setOpenCardId((id) => (id === entry.id ? null : id))}
          />
        );
      })}
    </div>
  );
}
