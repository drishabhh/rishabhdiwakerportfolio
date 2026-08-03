"use client";

import { useGyroParallax } from "@/hooks/use-gyro-parallax";
import { motion, useMotionValueEvent, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const HOME_BG = "/hero/home-bg.jpg";

export function TestLabClient() {
  const gyro = useGyroParallax({ enabled: true, mobileOnly: false });
  const shiftX = useTransform(gyro.x, (v) => v * 44);
  const shiftY = useTransform(gyro.y, (v) => v * 32);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useMotionValueEvent(gyro.x, "change", (x) => {
    setTilt((prev) => ({ ...prev, x }));
  });

  useMotionValueEvent(gyro.y, "change", (y) => {
    setTilt((prev) => ({ ...prev, y }));
  });

  const statusLabel =
    gyro.status === "active"
      ? "Listening"
      : gyro.status === "needs-gesture"
        ? "Tap Enable motion"
        : gyro.status === "requesting"
          ? "Requesting…"
          : gyro.status === "denied"
            ? "Permission denied"
            : gyro.status === "unsupported"
              ? "Not supported"
              : "Inactive";

  return (
    <main className="relative min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div className="absolute inset-[-8%]" style={{ x: shiftX, y: shiftY }}>
          <Image
            src={HOME_BG}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover object-[center_20%] md:object-right"
            sizes="100vw"
          />
        </motion.div>
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_72%_38%,transparent_0%,rgba(0,0,0,0.15)_55%,rgba(0,0,0,0.45)_100%)]"
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col px-6 pb-10 pt-[max(5rem,env(safe-area-inset-top))]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur transition-colors hover:bg-black/60"
          >
            ← Home
          </Link>
          <span className="rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">
            Lab
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300/90">Experimental</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white title-glow-opposite-light-text">
              Gyro hero test
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Tilt your phone to shift the hero portrait. This page is isolated from the main portfolio.
            </p>
          </div>

          {(gyro.status === "needs-gesture" || gyro.status === "denied") && (
            <button
              type="button"
              onClick={() => void gyro.requestAccess()}
              className="w-full rounded-2xl border border-orange-400/50 bg-orange-500/20 px-4 py-3 text-sm font-semibold text-orange-100 backdrop-blur transition-colors hover:bg-orange-500/30 active:scale-[0.99]"
            >
              {gyro.status === "denied" ? "Retry motion access" : "Enable motion"}
            </button>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Live tilt</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  gyro.status === "active"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <span className="text-white/50">X</span>
                <p className="font-mono text-lg text-white">{tilt.x.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <span className="text-white/50">Y</span>
                <p className="font-mono text-lg text-white">{tilt.y.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/45">
              <p>γ {gyro.raw.gamma.toFixed(1)}°</p>
              <p>β {gyro.raw.beta.toFixed(1)}°</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/45 p-4 text-sm leading-relaxed text-white/70 backdrop-blur-md">
            <p className="font-semibold text-white/90">iPhone</p>
            <p className="mt-2">Tap <strong className="text-white">Enable motion</strong>, allow access, then tilt slowly.</p>
            <p className="mt-2">Settings → Safari → Motion &amp; Orientation Access must be on.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
