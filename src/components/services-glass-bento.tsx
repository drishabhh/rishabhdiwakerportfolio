"use client";

import type { ServiceItem } from "@/lib/content";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useCallback, useRef, type CSSProperties, type MouseEvent, type SVGProps } from "react";

import { SECTION_TITLE_ON_HERO } from "@/lib/section-title";

const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

function IconFilmStrip(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
      <circle cx="7" cy="6" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="17" cy="6" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="7" cy="18" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="17" cy="18" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPostStack(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...props}>
      <rect x="4" y="4" width="14" height="10" rx="1" />
      <rect x="6" y="8" width="14" height="10" rx="1" opacity="0.85" />
      <rect x="8" y="12" width="14" height="10" rx="1" />
      <path d="M10 16h6M10 19h4" />
    </svg>
  );
}

function IconAiSpark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...props}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

function IconGrowthLine(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...props}>
      <path d="M4 18h16M4 18V6" />
      <path d="M6 14l4-4 3 2 5-6" />
      <circle cx="6" cy="14" r="1.25" fill="currentColor" />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" />
      <circle cx="13" cy="12" r="1.25" fill="currentColor" />
      <circle cx="18" cy="6" r="1.25" fill="currentColor" />
    </svg>
  );
}

type ServiceIconId = "film" | "post" | "ai" | "growth";

function ServiceLineIcon({ id, className }: { id: ServiceIconId; className?: string }) {
  const cn = className ?? "h-6 w-6";
  switch (id) {
    case "film":
      return <IconFilmStrip className={cn} aria-hidden />;
    case "post":
      return <IconPostStack className={cn} aria-hidden />;
    case "ai":
      return <IconAiSpark className={cn} aria-hidden />;
    case "growth":
      return <IconGrowthLine className={cn} aria-hidden />;
    default:
      return null;
  }
}

type ServiceEntry = ServiceItem;

type ServiceCardFrontProps = {
  svc: ServiceEntry;
  headingClass: string;
  mutedClass: string;
  indexClass: string;
  iconBoxClass: string;
};

function ServiceCardFront({
  svc,
  headingClass,
  mutedClass,
  indexClass,
  iconBoxClass,
}: ServiceCardFrontProps) {
  return (
    <>
      <span
        className={`pointer-events-none absolute right-4 top-3 select-none font-extralight tabular-nums tracking-tight md:right-5 md:top-4 ${indexClass} text-[3.25rem] leading-none sm:text-6xl md:text-7xl`}
        aria-hidden
      >
        {svc.indexLabel}
      </span>

      <div className={`relative mb-4 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
        <ServiceLineIcon id={svc.icon} className="h-6 w-6" />
      </div>

      <h3 className={`max-w-[min(100%,22rem)] text-lg font-bold leading-snug tracking-tight md:text-xl ${headingClass}`}>
        {svc.title}
      </h3>
      <p
        className={`mt-3 max-w-[min(100%,34rem)] flex-1 overflow-hidden text-sm leading-relaxed md:text-[0.9375rem] ${mutedClass}`}
        style={{ maskImage: "linear-gradient(to bottom, black 82%, transparent 100%)" }}
      >
        {svc.description}
      </p>
    </>
  );
}

type ServiceCardProps = {
  svc: ServiceEntry;
  cardVariants: Variants;
  headingClass: string;
  mutedClass: string;
  indexClass: string;
  iconBoxClass: string;
  glassContentClass: string;
  isDark: boolean;
  baseFlex: number;
  hoverEnabled: boolean;
};

function ServiceCard({
  svc,
  cardVariants,
  headingClass,
  mutedClass,
  indexClass,
  iconBoxClass,
  glassContentClass,
  isDark,
  baseFlex,
  hoverEnabled,
}: ServiceCardProps) {
  const rafRef = useRef<number | null>(null);

  const paintFlashlight = useCallback((e: MouseEvent<HTMLElement>) => {
    if (rafRef.current !== null) return;
    const el = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--fx", `${((clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--fy", `${((clientY - r.top) / r.height) * 100}%`);
    });
  }, []);

  const clearFlashlight = useCallback((e: MouseEvent<HTMLElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    e.currentTarget.style.removeProperty("--fx");
    e.currentTarget.style.removeProperty("--fy");
  }, []);

  return (
    <motion.article
      variants={cardVariants}
      style={
        {
          ["--fx" as string]: "50%",
          ["--fy" as string]: "50%",
          flexGrow: baseFlex,
        } as CSSProperties
      }
      className={`relative flex min-h-[240px] min-w-0 basis-0 flex-col overflow-hidden rounded-2xl border shadow-sm lg:min-h-[260px] ${
        hoverEnabled ? "transition-[flex-grow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:flex-grow-[2]" : ""
      } ${isDark ? "border-white/10 bg-transparent" : "border-zinc-200 bg-transparent"}`}
      onMouseLeave={clearFlashlight}
      onMouseMove={paintFlashlight}
    >
      <div
        className={`relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-7 ${glassContentClass}`}
      >
        <ServiceCardFront
          svc={svc}
          headingClass={headingClass}
          mutedClass={mutedClass}
          indexClass={indexClass}
          iconBoxClass={iconBoxClass}
        />
      </div>

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-[2] rounded-2xl transition-opacity duration-300 ${
          isDark ? "mix-blend-soft-light" : "mix-blend-multiply"
        }`}
        style={{
          background: isDark
            ? "radial-gradient(52% 60% at var(--fx, 50%) var(--fy, 50%), rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 40%, transparent 68%)"
            : "radial-gradient(52% 60% at var(--fx, 50%) var(--fy, 50%), rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.2) 42%, transparent 68%)",
          opacity: isDark ? 0.62 : 0.5,
        }}
      />
    </motion.article>
  );
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: cinematicEase },
  },
};

export type ServicesGlassBentoProps = {
  isDark: boolean;
  headingClass: string;
  sectionTitleClass?: string;
  mutedClass: string;
  cardSurfaceClass: string;
  title: string;
  services: ServiceItem[];
};

export function ServicesGlassBento({
  isDark,
  headingClass,
  sectionTitleClass = SECTION_TITLE_ON_HERO,
  mutedClass,
  cardSurfaceClass,
  title,
  services,
}: ServicesGlassBentoProps) {
  const reduced = Boolean(useReducedMotion());
  const indexClass = isDark ? "text-zinc-600" : "text-zinc-300";
  const iconBoxClass = isDark
    ? "bg-zinc-800 text-zinc-100 ring-1 ring-white/10"
    : "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300/80";
  const glassContentClass = isDark
    ? "border border-white/10 bg-[#1A1A1A]/76 backdrop-blur-xl ring-1 ring-white/[0.06]"
    : "border border-zinc-200/90 bg-white/78 backdrop-blur-xl ring-1 ring-zinc-300/45";

  const serviceRows: Array<Array<{ svc: ServiceEntry; baseFlex: number }>> = [
    [
      { svc: services[0]!, baseFlex: 1 },
      { svc: services[1]!, baseFlex: 1.86 },
    ],
    [
      { svc: services[2]!, baseFlex: 1 },
      { svc: services[3]!, baseFlex: 1.86 },
    ],
  ];

  return (
    <motion.section
      id="services"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.06, delayChildren: 0.02 },
        },
      }}
      className="relative z-10 scroll-mt-28 space-y-6"
      aria-labelledby="services-heading"
    >
      <h2 id="services-heading" className={sectionTitleClass}>
        {title}
      </h2>

      <div className="space-y-4 md:space-y-4">
        {serviceRows.map((row, rowIndex) => (
          <div key={`services-row-${rowIndex}`} className="flex flex-col gap-4 md:flex-row">
            {row.map(({ svc, baseFlex }) => (
              <ServiceCard
                key={svc.indexLabel}
                svc={svc}
                baseFlex={baseFlex}
                cardVariants={cardVariants}
                headingClass={headingClass}
                mutedClass={mutedClass}
                indexClass={indexClass}
                iconBoxClass={iconBoxClass}
                glassContentClass={glassContentClass}
                isDark={isDark}
                hoverEnabled={!reduced}
              />
            ))}
          </div>
        ))}
      </div>
    </motion.section>
  );
}
