"use client";

import { TextLoop } from "@/components/text-loop";
import { HighlightedEditsGallery, type HighlightEditItem } from "@/components/highlighted-edits-gallery";
import { ExperienceFlipCards } from "@/components/experience-flip-cards";
import { ProductionVault } from "@/components/production-vault";
import { ServicesGlassBento } from "@/components/services-glass-bento";
import { SiteFooter } from "@/components/site-footer";
import { SkillsTagCloud } from "@/components/skills-tag-cloud";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Archive, Briefcase, FileText, House, LayoutGrid, Link2, Moon, Sparkles, Sun, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const highlightedEdits: HighlightEditItem[] = [
  {
    title: "TEDx",
    views: "12.8K",
    caption: "views in the first 3 days",
    thumbnail: "https://i.ytimg.com/vi/FHkwqGr1pjg/hqdefault.jpg",
    badge: "Viral in 3 Days",
    href: "https://www.youtube.com/watch?v=FHkwqGr1pjg&list=PLdT9F7iP4yrRNHLPGRTZrciZptz_C8aNe",
  },
  {
    title: "Byte Blogger Base",
    views: "127K+",
    caption: "organic channel views",
    thumbnail: "https://i.ytimg.com/vi/lVwL8VMkDmY/hqdefault.jpg",
    href: "https://www.youtube.com/watch?v=lVwL8VMkDmY&list=PLdT9F7iP4yrRNHLPGRTZrciZptz_C8aNe&index=3",
  },
  {
    title: "Sri Mandir · AppsForBharat",
    views: "250K+",
    caption: "direct users on launch content",
    thumbnail: "https://i.ytimg.com/vi/h-V0NykeWRg/hqdefault.jpg",
    href: "https://www.youtube.com/watch?v=h-V0NykeWRg&list=PLdT9F7iP4yrSzqcvIypf3DHJQYTHNiniO&index=7",
  },
  {
    title: "AppsForBharat · Events",
    views: "14%",
    caption: "event participation lift",
    thumbnail: "https://i.ytimg.com/vi/ULoPlgS6u0s/hqdefault.jpg",
    href: "https://www.youtube.com/watch?v=ULoPlgS6u0s&list=PLdT9F7iP4yrQEi_9AHG9_jLzv0ObQfFkL&index=23",
  },
  {
    title: "Byte Blogger Base · Retention",
    views: "40%+",
    caption: "avg. watch time lift",
    thumbnail: "https://i.ytimg.com/vi/KviJ-1cMY8g/hqdefault.jpg",
    href: "https://www.youtube.com/watch?v=KviJ-1cMY8g&list=PLdT9F7iP4yrQEi_9AHG9_jLzv0ObQfFkL",
  },
  {
    title: "AppsForBharat · Distribution",
    views: "19%",
    caption: "unique content shares lift",
    thumbnail: "https://i.ytimg.com/vi/cMbVMK77Zco/hqdefault.jpg",
    href: "https://www.youtube.com/watch?v=cMbVMK77Zco&list=PLdT9F7iP4yrQEi_9AHG9_jLzv0ObQfFkL&index=22",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.12, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};
const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const sectionEnterMs = 1.12;

const navPillSpring = { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 };

const navItems = [
  { id: "home", label: "Home", icon: House, targetId: "home" },
  { id: "summary", label: "Summary", icon: FileText, targetId: "summary-bio" },
  { id: "highlights", label: "Highlights", icon: Sparkles, targetId: "highlighted-edits" },
  { id: "skills", label: "Skills", icon: Zap, targetId: "skills" },
  { id: "vault", label: "Vault", icon: Archive, targetId: "production-vault" },
  { id: "experience", label: "Experience", icon: Briefcase, targetId: "experience" },
  { id: "services", label: "Services", icon: LayoutGrid, targetId: "services" },
  { id: "contact", label: "Contact", icon: Link2, targetId: "colophon" },
] as const;

const HOME_BG = "/hero/home-bg.png";
const HOME_BG_MOBILE = "/hero/bg-mob.png";
const HOME_HERO_LOGO = "/hero-logo.png";
const CV_DOWNLOAD_HREF = "/rishabh-diwaker-cv.pdf";
const CV_ICON_SRC = "/download-cv-icon.png";

/** Hero tagline: width tracks logo breakpoints. */
const heroTaglineWidthClass =
  "w-full max-w-[min(90vw,500px)] sm:max-w-[min(85vw,540px)] md:max-w-[min(56vw,620px)] lg:max-w-[min(48vw,680px)]";

/** Random 1–999 + “k” for the hero metric (e.g. `42k`, `127k`). */
function randomKViewsLabel(): string {
  const n = Math.floor(Math.random() * 999) + 1;
  return `${n}k`;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const navReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<(typeof navItems)[number]["id"]>("home");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [bgBlurActive, setBgBlurActive] = useState(false);
  /** Hero line: animated ###k+ segment; value randomizes on the client. */
  const [heroKViews, setHeroKViews] = useState("127k");

  const sectionIds = useMemo(() => navItems.map((item) => item.targetId), []);

  const heroTaglineVariants = useMemo(
    () =>
      navReducedMotion
        ? {
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { duration: 0.45, delay: 0.55, ease: cinematicEase },
            },
          }
        : {
            hidden: { opacity: 0, y: 26, filter: "blur(10px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.95, delay: 0.55, ease: cinematicEase },
            },
          },
    [navReducedMotion],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const savedTheme = window.localStorage.getItem("portfolio-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      } else {
        const hour = new Date().getHours();
        setTheme(hour >= 6 && hour < 18 ? "light" : "dark");
      }
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (navReducedMotion) {
      setHeroKViews("127k");
      return;
    }

    let cancelled = false;
    let timeoutId: number;

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setHeroKViews(randomKViewsLabel());
        schedule();
      }, 80 + Math.floor(Math.random() * 260));
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [navReducedMotion]);

  const isDark = theme === "dark";
  /** Section titles on the full-bleed hero (always light type). */
  const headingClass = "text-white title-glow-opposite-light-text";
  const sectionHeadingClass = `text-3xl font-bold tracking-[-0.02em] md:text-4xl md:font-extrabold md:tracking-[-0.03em] ${headingClass}`;
  /** Shared white tone + glow for hero copy (combine with each block’s own size/weight). */
  const subheadingClass = "text-white/95 title-glow-opposite-light-text [text-shadow:0_1px_3px_rgba(0,0,0,0.82)]";
  /** Theme toggle only swaps card shells; interiors follow for contrast. */
  const cardSurfaceClass = isDark ? "border-white/10 bg-[#1A1A1A]" : "border-zinc-200 bg-white";
  const cardSubheadingClass = isDark
    ? `text-xs font-semibold uppercase tracking-[0.14em] md:text-[0.8125rem] ${subheadingClass}`
    : "text-xs font-semibold uppercase tracking-[0.14em] text-zinc-800 md:text-[0.8125rem]";
  const cardMutedClass = isDark ? "text-zinc-300" : "text-zinc-600";
  /** Service card titles on glass (dark vs light glass). */
  const cardTitleClass = isDark ? headingClass : "text-zinc-950 title-glow-opposite-dark-text";
  /** Header row (theme-aware). */
  const headerSurfaceClass = isDark
    ? "border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md"
    : "border-b border-zinc-200/90 bg-white/85 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]";
  const headerNameClass = isDark ? headingClass : "text-zinc-950 title-glow-opposite-dark-text";
  const headerLinkClass = isDark
    ? "text-zinc-300 transition-colors duration-200 hover:text-white"
    : "text-zinc-600 transition-colors duration-200 hover:text-zinc-950";
  const dockShellClass = isDark
    ? "border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl"
    : "border-zinc-200/90 bg-white/90 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl";
  const dockPillClass = isDark
    ? "bg-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
    : "bg-zinc-900/[0.08] shadow-[inset_0_1px_1px_rgba(0,0,0,0.06)] ring-1 ring-zinc-900/10";
  /** Active tab: warm halo so the current section reads at a glance. */
  const dockActiveGlowClass = isDark
    ? "shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_0_26px_12px_rgba(253,224,71,0.22),0_0_52px_20px_rgba(249,115,22,0.12)]"
    : "shadow-[0_0_0_1px_rgba(251,146,60,0.35),0_0_22px_10px_rgba(251,191,36,0.32),0_0_44px_18px_rgba(234,88,12,0.14)]";
  const handleThemeToggle = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem("portfolio-theme", nextTheme);
      return nextTheme;
    });
  };

  useEffect(() => {
    if (!isMounted) return;

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          const matchingItem = navItems.find((item) => item.targetId === visible.target.id);
          if (matchingItem) {
            setActiveTab((prev) => (prev === matchingItem.id ? prev : matchingItem.id));
          }
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -45% 0px",
        threshold: [0.2, 0.35, 0.5, 0.7],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [sectionIds, isMounted]);

  /** Hero blur: on as soon as the user scrolls (tiny threshold + hysteresis so it doesn’t flicker at top). */
  useEffect(() => {
    if (!isMounted) return;

    const on = 6;
    const off = 2;

    const paint = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setBgBlurActive((prev) => {
        if (y > on) return true;
        if (y < off) return false;
        return prev;
      });
    };

    paint();
    window.addEventListener("scroll", paint, { passive: true });
    return () => window.removeEventListener("scroll", paint);
  }, [isMounted]);

  const handleNavClick = (id: (typeof navItems)[number]["id"]) => {
    const matchingItem = navItems.find((item) => item.id === id);
    if (!matchingItem) return;
    const section = document.getElementById(matchingItem.targetId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTab(id);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <motion.main
      initial={false}
      style={{ minHeight: "100vh" }}
      className="relative isolate min-h-screen bg-transparent"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-screen overflow-hidden transition-[filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[filter]"
        style={{ filter: bgBlurActive ? "blur(18px)" : "blur(0px)" }}
      >
        <Image
          src={HOME_BG_MOBILE}
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center md:hidden"
          sizes="100vw"
        />
        <Image
          src={HOME_BG}
          alt=""
          fill
          priority
          unoptimized
          className="hidden object-cover object-center md:block"
          sizes="100vw"
        />
      </div>

      <motion.header
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: sectionEnterMs, ease: cinematicEase }}
        className={`fixed left-0 right-0 top-0 z-50 ${headerSurfaceClass}`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 md:flex-row md:items-start md:justify-between md:px-10">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={`text-lg font-bold tracking-tight md:text-xl md:font-extrabold ${headerNameClass}`}>
              Rishabh Diwaker
            </p>
            <p
              className={`max-w-md text-[11px] font-medium uppercase leading-snug tracking-[0.18em] md:text-xs md:tracking-[0.2em] ${
                isDark ? "text-zinc-500" : "text-zinc-600"
              }`}
            >
              Video Editor · AI-Augmented Post-Production Specialist
            </p>
          </div>
          <div className={`flex flex-wrap items-center gap-4 self-start text-sm md:self-auto ${cardMutedClass}`}>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                isDark
                  ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-300"
                  : "border-emerald-600/35 bg-emerald-500/10 text-emerald-800"
              }`}
            >
              Open to work
            </span>
            <a
              href="https://youtube.com/@rishabhsportfolio?si=NTQ5HeB8CZYCBMrD"
              target="_blank"
              rel="noreferrer"
              className={headerLinkClass}
            >
              YouTube
            </a>
            <button
              type="button"
              onClick={handleThemeToggle}
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              className={`relative flex h-8 w-14 items-center rounded-full border p-1 transition-colors duration-300 ${
                isDark ? "border-zinc-700 bg-zinc-900/80" : "border-zinc-300 bg-white/90"
              }`}
            >
              <motion.span
                animate={{ x: isDark ? 0 : 24 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  isDark ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 text-zinc-100"
                }`}
              >
                {isDark ? <Moon size={12} /> : <Sun size={12} />}
              </motion.span>
            </button>
          </div>
        </div>
      </motion.header>

      <a
        href={CV_DOWNLOAD_HREF}
        download="Rishabh-Diwaker-CV.pdf"
        aria-label="Download CV"
        title="Download CV"
        className="fixed right-4 top-[max(5.25rem,env(safe-area-inset-top))] z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-white p-2 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] ring-1 ring-black/10 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.4)] md:right-8 md:top-[max(5.5rem,env(safe-area-inset-top))] md:h-12 md:w-12 md:p-2.5"
      >
        <Image
          src={CV_ICON_SRC}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="h-7 w-7 object-contain object-center md:h-8 md:w-8"
        />
      </a>

      <section
        id="home"
        className="relative z-10 min-h-screen w-full scroll-mt-28 bg-transparent"
        aria-label="Home"
      >
        <div className="pointer-events-none absolute inset-0 flex min-h-screen items-start justify-end px-5 pt-[clamp(6.25rem,16vh,11.5rem)] pr-[max(1rem,5vw)] md:px-8 md:pt-[clamp(7.25rem,18vh,13rem)] md:pr-[max(1.25rem,7vw)] lg:pr-[max(1.5rem,9vw)]">
          <div className="flex flex-col items-end">
            <Image
              src={HOME_HERO_LOGO}
              alt=""
              width={800}
              height={320}
              unoptimized
              className={`h-auto translate-y-[20px] object-contain object-right ${heroTaglineWidthClass}`}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 56vw, 680px"
              priority
            />
            <motion.p
              aria-label="Skyrocket. Engineered to grow your views."
              className={`mt-4 flex translate-y-[20px] flex-col items-end gap-4 text-[clamp(1.2rem,3.6vw,1.85rem)] font-semibold leading-snug tracking-[-0.03em] text-white title-glow-opposite-light-text md:mt-5 md:gap-5 md:text-[clamp(1.35rem,3.1vw,2rem)] lg:text-[clamp(1.45rem,2.6vw,2.2rem)] ${heroTaglineWidthClass}`}
              variants={heroTaglineVariants}
              initial="hidden"
              animate="visible"
            >
              <span className="flex w-full flex-wrap items-baseline justify-end gap-x-1.5 text-right">
                <span className="shrink-0">Engineered to</span>
                <TextLoop
                  interval={420}
                  className="inline-block min-w-[9ch] font-bold tracking-[-0.04em] text-[clamp(1.28rem,3.85vw,1.95rem)] md:text-[clamp(1.4rem,3.2vw,2.1rem)] lg:text-[clamp(1.5rem,2.75vw,2.25rem)]"
                >
                  <span>Skyrocket</span>
                  <span>Amplify</span>
                  <span>Scale</span>
                  <span>Boost</span>
                  <span>Multiply</span>
                </TextLoop>
                <span className="shrink-0">your views</span>
              </span>
              <span
                className="sonic-shiver-plus inline-block min-w-[4.25ch] -translate-y-[18px] whitespace-nowrap font-mono text-[clamp(1.45rem,5.4vw,2.35rem)] tabular-nums tracking-tight md:text-[calc(1em-12px)]"
                aria-hidden
              >
                {heroKViews}+
              </span>
            </motion.p>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-20 bg-transparent px-6 pb-40 pt-8 md:px-10">
        <motion.section
          id="summary"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          transition={{ duration: sectionEnterMs, ease: cinematicEase }}
          className="scroll-mt-28 space-y-8"
        >
          <div id="summary-bio" className="scroll-mt-28 flex items-end justify-between">
            <h2 className={sectionHeadingClass}>Summary</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className={`rounded-2xl border p-6 ${cardSurfaceClass}`}>
              <p className={cardSubheadingClass}>Professional Profile</p>
              <p className={`mt-3 text-sm leading-relaxed md:text-base ${cardMutedClass}`}>
                Creative Video Editor with{" "}
                <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>5 years of experience</span>{" "}
                producing{" "}
                <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>high-engagement content</span>.
                Currently driving video strategy for the{" "}
                <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>Sri Mandir app</span> at
                AppsForBharat, reaching a direct user base of{" "}
                <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>250K+</span>.
              </p>
            </div>
            <div className={`rounded-2xl border p-6 ${cardSurfaceClass}`}>
              <p className={cardSubheadingClass}>Core Philosophy</p>
              <p className={`mt-3 text-sm leading-relaxed md:text-base ${cardMutedClass}`}>
                My work centers on{" "}
                <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>optimizing workflows</span>{" "}
                through <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>AI and automation</span>{" "}
                while maintaining editorial precision to increase{" "}
                <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>audience retention</span> and{" "}
                <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>watch time</span>.
              </p>
            </div>
          </div>
        </motion.section>

        <HighlightedEditsGallery items={highlightedEdits} isDark={isDark} />

        <motion.section
          id="skills"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          transition={{ duration: sectionEnterMs, ease: cinematicEase }}
          className="scroll-mt-28 space-y-6"
        >
          <SkillsTagCloud
            isDark={isDark}
            headingClass={headingClass}
            subheadingClass={subheadingClass}
            sectionTitleClass={sectionHeadingClass}
          />
        </motion.section>

        <ProductionVault isDark={isDark} mutedClass={cardMutedClass} subheadingClass={subheadingClass} />

        <motion.section
          id="experience"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          transition={{ duration: sectionEnterMs, ease: cinematicEase }}
          className="scroll-mt-28 space-y-6"
        >
          <h2 className={sectionHeadingClass}>Experience</h2>
          <ExperienceFlipCards isDark={isDark} />
        </motion.section>

        <ServicesGlassBento
          isDark={isDark}
          headingClass={cardTitleClass}
          mutedClass={cardMutedClass}
          cardSurfaceClass={cardSurfaceClass}
        />

      </div>

      {/* Fade fixed hero portrait into footer black so the figure doesn’t hard-cut at the seam */}
      <div
        aria-hidden
        className="pointer-events-none relative z-[11] h-28 w-full bg-gradient-to-b from-transparent via-[#0a0a0a]/75 to-[#0A0A0A] md:h-40 md:via-[#0a0a0a]/82"
      />

      <SiteFooter />

      <nav className="fixed bottom-8 left-1/2 z-[70] max-w-[calc(100vw-1.5rem)] -translate-x-1/2">
        <div
          className={`flex max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto rounded-full border px-3 py-2.5 sm:gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${dockShellClass}`}
        >
          <LayoutGroup id="floating-dock">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative isolate shrink-0 overflow-visible rounded-full px-3 py-2 text-xs font-medium md:px-4 ${
                    isActive
                      ? ""
                      : isDark
                        ? "text-zinc-500 transition-colors duration-200 hover:text-zinc-300"
                        : "text-zinc-500 transition-colors duration-200 hover:text-zinc-800"
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {isActive ? (
                      <>
                        <motion.div
                          key="nav-active-glow"
                          aria-hidden
                          layout={false}
                          initial={navReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.88 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={navReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                          transition={
                            navReducedMotion
                              ? { duration: 0.2, ease: "easeOut" }
                              : { type: "spring", stiffness: 420, damping: 28, mass: 0.75 }
                          }
                          className={`pointer-events-none absolute inset-[-7px] z-0 rounded-full bg-transparent ${dockActiveGlowClass}`}
                        />
                        <motion.div
                          key="nav-pill-surface"
                          layoutId={navReducedMotion ? undefined : "nav-pill"}
                          initial={navReducedMotion ? { opacity: 0 } : false}
                          animate={{ opacity: 1 }}
                          exit={navReducedMotion ? { opacity: 0 } : undefined}
                          transition={navReducedMotion ? { duration: 0.2, ease: "easeOut" } : navPillSpring}
                          className={`absolute inset-0 z-[1] rounded-full ${dockPillClass}`}
                        />
                      </>
                    ) : null}
                  </AnimatePresence>
                  <motion.span
                    className={`relative z-10 flex items-center justify-center gap-1.5 ${isActive && isDark ? "mix-blend-overlay" : ""}`}
                    animate={{
                      color: isActive
                        ? isDark
                          ? "rgba(255,255,255,1)"
                          : "rgba(24,24,27,1)"
                        : "rgba(113,113,122,1)",
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Icon size={14} strokeWidth={2} className="shrink-0" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </motion.span>
                </button>
              );
            })}
          </LayoutGroup>
        </div>
      </nav>
    </motion.main>
  );
}
