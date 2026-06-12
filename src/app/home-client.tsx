"use client";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { TextLoop } from "@/components/text-loop";
import { HeroCta } from "@/components/hero-cta";
import { HighlightedEditsGallery, type HighlightEditItem } from "@/components/highlighted-edits-gallery";
import { ExperienceFlipCards } from "@/components/experience-flip-cards";
import { ProductionVault } from "@/components/production-vault";
import { ServicesGlassBento } from "@/components/services-glass-bento";
import { SiteFooter } from "@/components/site-footer";
import { SkillsTagCloud } from "@/components/skills-tag-cloud";
import type { SiteContent } from "@/lib/content";
import { SECTION_TITLE_ON_HERO } from "@/lib/section-title";
import { smoothScrollToElement } from "@/lib/smooth-scroll";
import { youtubeThumbnailFromUrl } from "@/lib/youtube";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Archive, Briefcase, FileText, House, LayoutGrid, Link2, Moon, Sparkles, Sun, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CV_ICON_SRC = "/download-cv-icon.png";

export type HomeClientProps = {
  content: SiteContent;
};

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

const sectionScrollOffset = 112;

const navPillTransition = {
  type: "tween" as const,
  duration: 0.72,
  ease: cinematicEase,
};

const navColorTransition = {
  duration: 0.48,
  ease: cinematicEase,
};

const heroDissolveShow = {
  opacity: 1,
  filter: "blur(0px) brightness(1) saturate(1)",
  scale: 1,
  y: 0,
};

const heroDissolveHide = {
  opacity: 0,
  filter: "blur(20px) brightness(1.18) saturate(0.75)",
  scale: 1.05,
  y: -18,
};

function heroDissolveTransition(reduced: boolean, mobile: boolean) {
  return reduced
    ? { duration: 0.28, ease: "easeOut" as const }
    : { duration: mobile ? 0.95 : 0.82, ease: cinematicEase };
}

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

/** Hero tagline: width tracks logo breakpoints. */
const heroTaglineWidthClass =
  "w-full max-w-[min(90vw,500px)] sm:max-w-[min(85vw,540px)] md:max-w-[min(56vw,620px)] lg:max-w-[min(48vw,680px)]";

export default function HomeClient({ content }: HomeClientProps) {
  const [isMounted, setIsMounted] = useState(false);
  const navReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<(typeof navItems)[number]["id"]>("home");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [bgBlurActive, setBgBlurActive] = useState(false);
  const [heroOverlayVisible, setHeroOverlayVisible] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const scrollLockRef = useRef(false);
  const cancelScrollRef = useRef<(() => void) | null>(null);

  const highlightedEdits: HighlightEditItem[] = useMemo(
    () =>
      content.highlights.items.map((item) => ({
        ...item,
        thumbnail: youtubeThumbnailFromUrl(item.href),
      })),
    [content.highlights.items],
  );

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
            hidden: { opacity: 0, filter: "blur(10px)" },
            visible: {
              opacity: 1,
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

  const isDark = theme === "dark";
  /** Section titles on the full-bleed hero (always light type). */
  const headingClass = "text-white title-glow-opposite-light-text";
  const sectionHeadingClass = SECTION_TITLE_ON_HERO;
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
  const dockShellClass = isDark
    ? "border border-white/20 bg-zinc-950/30 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl backdrop-saturate-150"
    : "border border-white/55 bg-white/28 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl backdrop-saturate-150";
  const dockPillClass = isDark
    ? "bg-white/14 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] ring-1 ring-white/12 backdrop-blur-md"
    : "bg-white/52 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)] ring-1 ring-white/70 backdrop-blur-md";
  /** Inactive dock labels: stronger on home hero where the bar sits over a busy background. */
  const inactiveNavColor =
    activeTab === "home"
      ? isDark
        ? "rgba(228,228,231,0.92)"
        : "rgba(63,63,70,0.94)"
      : isDark
        ? "rgba(161,161,170,0.95)"
        : "rgba(82,82,91,0.95)";
  const inactiveNavClass =
    activeTab === "home"
      ? isDark
        ? "text-zinc-200/90 transition-colors duration-200 hover:text-white"
        : "text-zinc-700/90 transition-colors duration-200 hover:text-zinc-900"
      : isDark
        ? "text-zinc-400 transition-colors duration-200 hover:text-zinc-200"
        : "text-zinc-600 transition-colors duration-200 hover:text-zinc-900";
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
    const syncMobile = () => setIsMobileView(window.innerWidth < 768);
    syncMobile();
    window.addEventListener("resize", syncMobile);
    return () => window.removeEventListener("resize", syncMobile);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const updateActiveSection = () => {
      if (scrollLockRef.current) return;

      const { scrollY, innerHeight } = window;
      const docHeight = document.documentElement.scrollHeight;

      const footer = document.getElementById("colophon");
      if (footer) {
        const footerTop = footer.getBoundingClientRect().top;
        if (footerTop <= innerHeight * 0.55 || scrollY + innerHeight >= docHeight - 100) {
          setActiveTab((prev) => (prev === "contact" ? prev : "contact"));
          return;
        }
      }

      const isMobile = window.innerWidth < 768;
      const summaryRevealThreshold = isMobile ? 0.38 : 0.68;
      const heroScrollLimit = isMobile ? 0.96 : 0.88;
      const referenceY = scrollY + innerHeight * 0.28;
      const summaryBio = document.getElementById("summary-bio");
      const summaryInView = summaryBio
        ? summaryBio.getBoundingClientRect().top < innerHeight * summaryRevealThreshold
        : scrollY > innerHeight * (isMobile ? 0.35 : 0.22);

      setHeroOverlayVisible(!summaryInView && scrollY < innerHeight * heroScrollLimit);

      let next: (typeof navItems)[number]["id"] = "home";

      if (scrollY > innerHeight * 0.22 || summaryInView) {
        next = "summary";
        for (const item of navItems.slice(1)) {
          const el = document.getElementById(item.targetId);
          if (!el) continue;
          const sectionTop = el.getBoundingClientRect().top + scrollY;
          if (sectionTop <= referenceY + 48) {
            next = item.id;
          }
        }
      }

      setActiveTab((prev) => (prev === next ? prev : next));
    };

    updateActiveSection();
    let scrollTick = false;
    const onScroll = () => {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        scrollTick = false;
        updateActiveSection();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [isMounted]);

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

  useEffect(() => {
    return () => {
      cancelScrollRef.current?.();
    };
  }, []);

  const handleNavClick = useCallback((id: (typeof navItems)[number]["id"]) => {
    const matchingItem = navItems.find((item) => item.id === id);
    if (!matchingItem) return;
    const section = document.getElementById(matchingItem.targetId);
    if (!section) return;

    cancelScrollRef.current?.();
    scrollLockRef.current = true;
    setActiveTab(id);
    setHeroOverlayVisible(id === "home");

    if (navReducedMotion) {
      const targetY = section.getBoundingClientRect().top + window.scrollY - sectionScrollOffset;
      window.scrollTo({ top: targetY, behavior: "auto" });
      scrollLockRef.current = false;
      return;
    }

    cancelScrollRef.current = smoothScrollToElement(section, {
      offset: sectionScrollOffset,
      onComplete: () => {
        scrollLockRef.current = false;
        cancelScrollRef.current = null;
        setHeroOverlayVisible(id === "home");
      },
    });
  }, [navReducedMotion]);

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
              {content.header.name}
            </p>
            <p
              className={`max-w-md text-[11px] font-medium uppercase leading-snug tracking-[0.18em] md:text-xs md:tracking-[0.2em] ${
                isDark ? "text-zinc-500" : "text-zinc-600"
              }`}
            >
              {content.header.tagline}
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
              {content.header.statusLabel}
            </span>
            <a
              href={content.header.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Chat on WhatsApp"
              className={`inline-flex items-center justify-center rounded-full p-1.5 transition-colors duration-200 ${
                isDark
                  ? "text-zinc-300 hover:bg-emerald-500/15 hover:text-emerald-300"
                  : "text-zinc-600 hover:bg-emerald-500/10 hover:text-emerald-700"
              }`}
            >
              <WhatsAppIcon size={20} />
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
        href={content.resume?.url || "/rishabh-diwaker-cv.pdf"}
        download={content.resume?.downloadName || "Rishabh-Diwaker-CV.pdf"}
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
      />

      <motion.div
        aria-hidden={!heroOverlayVisible}
        initial={false}
        animate={heroOverlayVisible ? heroDissolveShow : heroDissolveHide}
        transition={heroDissolveTransition(Boolean(navReducedMotion), isMobileView)}
        style={{ transformOrigin: "top right" }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[15] flex justify-end px-5 pt-40 pr-[max(1rem,5vw)] will-change-[opacity,filter,transform] md:px-8 md:pt-[clamp(7.25rem,18vh,13rem)] md:pr-[max(1.25rem,7vw)] lg:pr-[max(1.5rem,9vw)]"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={false}
          animate={
            heroOverlayVisible
              ? { opacity: 0, scale: 1 }
              : { opacity: [0, 0.55, 0], scale: [1, 1.08, 1.12] }
          }
          transition={
            navReducedMotion
              ? { duration: 0.2 }
              : { duration: isMobileView ? 0.95 : 0.82, ease: cinematicEase, times: [0, 0.42, 1] }
          }
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 82% 28%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 38%, transparent 72%)",
          }}
        />
        <div className="relative flex translate-y-[20px] flex-col items-end">
          <motion.div
            initial={false}
            animate={
              navReducedMotion
                ? { opacity: heroOverlayVisible ? 1 : 0 }
                : heroOverlayVisible
                  ? heroDissolveShow
                  : { ...heroDissolveHide, y: -14 }
            }
            transition={{
              ...heroDissolveTransition(Boolean(navReducedMotion), isMobileView),
              delay: !navReducedMotion && !heroOverlayVisible ? 0.07 : 0,
            }}
            style={{ transformOrigin: "top right" }}
          >
            <Image
              src={HOME_HERO_LOGO}
              alt=""
              width={800}
              height={320}
              unoptimized
              className={`h-auto object-contain object-right ${heroTaglineWidthClass}`}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 56vw, 680px"
              priority
            />
          </motion.div>

          <div className={`mt-4 flex w-full flex-col items-end md:mt-5 ${heroTaglineWidthClass}`}>
            <motion.div
              aria-label="Skyrocket. Engineered to grow your views."
              initial={false}
              animate={
                navReducedMotion
                  ? { opacity: heroOverlayVisible ? 1 : 0 }
                  : heroOverlayVisible
                    ? heroDissolveShow
                    : { ...heroDissolveHide, y: -22, filter: "blur(22px) brightness(1.22) saturate(0.65)" }
              }
              transition={{
                ...heroDissolveTransition(Boolean(navReducedMotion), isMobileView),
                delay: !navReducedMotion && heroOverlayVisible ? 0.06 : 0,
              }}
              style={{ transformOrigin: "top right" }}
              className="text-[clamp(1.2rem,3.6vw,1.85rem)] font-semibold leading-none tracking-[-0.03em] text-white title-glow-opposite-light-text md:text-[clamp(1.35rem,3.1vw,2rem)] lg:text-[clamp(1.45rem,2.6vw,2.2rem)]"
            >
              <motion.span
                className="inline-flex min-h-[1.35em] w-full flex-nowrap items-center justify-end gap-x-1.5 whitespace-nowrap text-right md:min-h-[1.3em]"
                variants={heroTaglineVariants}
                initial="hidden"
                animate="visible"
              >
                <span className="shrink-0 leading-none">{content.hero.linePrefix}</span>
                <TextLoop
                  interval={420}
                  stableSlot
                  className="w-[11ch] text-center font-bold leading-none tracking-[-0.04em] text-[clamp(1.28rem,3.85vw,1.95rem)] md:text-[clamp(1.4rem,3.2vw,2.1rem)] lg:text-[clamp(1.5rem,2.75vw,2.25rem)]"
                >
                  {content.hero.rotatingWords.map((word) => (
                    <span key={word}>{word}</span>
                  ))}
                </TextLoop>
                <span className="shrink-0 leading-none">{content.hero.lineSuffix}</span>
              </motion.span>
            </motion.div>

            <HeroCta
              label={content.hero.cta?.label ?? "Watch showreel"}
              href={content.hero.cta?.href ?? ""}
              visible={heroOverlayVisible}
            />
          </div>
        </div>
      </motion.div>

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
            <h2 className={sectionHeadingClass}>{content.summary.title}</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className={`rounded-2xl border p-6 ${cardSurfaceClass}`}>
              <p className={cardSubheadingClass}>Professional Profile</p>
              <p className={`mt-3 text-sm leading-relaxed md:text-base ${cardMutedClass}`}>
                {content.summary.professionalProfile}
              </p>
            </div>
            <div className={`rounded-2xl border p-6 ${cardSurfaceClass}`}>
              <p className={cardSubheadingClass}>Core Philosophy</p>
              <p className={`mt-3 text-sm leading-relaxed md:text-base ${cardMutedClass}`}>
                {content.summary.corePhilosophy}
              </p>
            </div>
          </div>
        </motion.section>

        <HighlightedEditsGallery
          items={highlightedEdits}
          isDark={isDark}
          sectionTitleClass={sectionHeadingClass}
        />

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
            title={content.skills.title}
            subtitle={content.skills.subtitle}
            blocks={content.skills.blocks}
          />
        </motion.section>

        <ProductionVault
          isDark={isDark}
          mutedClass={cardMutedClass}
          subheadingClass={subheadingClass}
          sectionTitleClass={sectionHeadingClass}
          title={content.vault.title}
          subtitle={content.vault.subtitle}
          playlists={content.vault.playlists}
        />

        <motion.section
          id="experience"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          transition={{ duration: sectionEnterMs, ease: cinematicEase }}
          className="scroll-mt-28 space-y-6"
        >
          <h2 className={sectionHeadingClass}>{content.experience.title}</h2>
          <ExperienceFlipCards isDark={isDark} roles={content.experience.roles} />
        </motion.section>

        <ServicesGlassBento
          isDark={isDark}
          headingClass={cardTitleClass}
          sectionTitleClass={sectionHeadingClass}
          mutedClass={cardMutedClass}
          cardSurfaceClass={cardSurfaceClass}
          title={content.services.title}
          services={content.services.items}
        />

      </div>

      {/* Fade fixed hero portrait into footer black so the figure doesn’t hard-cut at the seam */}
      <div
        aria-hidden
        className="pointer-events-none relative z-[11] h-28 w-full bg-gradient-to-b from-transparent via-[#0a0a0a]/75 to-[#0A0A0A] md:h-40 md:via-[#0a0a0a]/82"
      />

      <SiteFooter
        name={content.footer.name}
        tagline={content.header.tagline}
        statusLabel={content.footer.statusLabel}
        email={content.footer.email}
        socials={content.footer.socials}
        sectionTitleClass={sectionHeadingClass}
      />

      <nav className="fixed bottom-8 left-1/2 z-[70] max-w-[calc(100vw-1.5rem)] -translate-x-1/2">
        <div
          className={`relative flex max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto rounded-full px-3 py-2.5 sm:gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${dockShellClass}`}
        >
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 rounded-full ${
              isDark
                ? "bg-gradient-to-b from-white/[0.07] to-transparent"
                : "bg-gradient-to-b from-white/45 to-white/10"
            }`}
          />
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
                    isActive ? "" : inactiveNavClass
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {isActive ? (
                      <>
                        <motion.div
                          key="nav-active-glow"
                          aria-hidden
                          layout={false}
                          initial={navReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={navReducedMotion ? { opacity: 0 } : { opacity: 0 }}
                          transition={
                            navReducedMotion
                              ? { duration: 0.2, ease: "easeOut" }
                              : { duration: 0.42, ease: cinematicEase }
                          }
                          className={`pointer-events-none absolute inset-[-7px] z-0 rounded-full bg-transparent ${dockActiveGlowClass}`}
                        />
                        <motion.div
                          key="nav-pill-surface"
                          layoutId={navReducedMotion ? undefined : "nav-pill"}
                          initial={navReducedMotion ? { opacity: 0 } : false}
                          animate={{ opacity: 1 }}
                          exit={navReducedMotion ? { opacity: 0 } : undefined}
                          transition={
                            navReducedMotion ? { duration: 0.2, ease: "easeOut" } : navPillTransition
                          }
                          className={`absolute inset-0 z-[1] rounded-full ${dockPillClass}`}
                        />
                      </>
                    ) : null}
                  </AnimatePresence>
                  <motion.span
                    className={`relative z-10 flex items-center justify-center gap-1.5 ${
                      !isActive && activeTab === "home" ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.28)]" : ""
                    }`}
                    animate={{
                      color: isActive
                        ? isDark
                          ? "rgba(255,255,255,1)"
                          : "rgba(24,24,27,1)"
                        : inactiveNavColor,
                    }}
                    transition={navReducedMotion ? { duration: 0.2, ease: "easeOut" } : navColorTransition}
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
