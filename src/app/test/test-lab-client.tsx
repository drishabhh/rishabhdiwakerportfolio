"use client";

import { useGyroParallax } from "@/hooks/use-gyro-parallax";
import { useMotionValueEvent } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const HOME_BG = "/hero/home-bg.jpg";
const MOBILE_OBJECT_POSITION = "-96px center";

export function TestLabClient() {
  const gyro = useGyroParallax(true);
  const mobileBaseX = useMemo(() => MOBILE_OBJECT_POSITION.split(/\s+/)[0] ?? "-96px", []);
  const [objectPosition, setObjectPosition] = useState(MOBILE_OBJECT_POSITION);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useMotionValueEvent(gyro.x, "change", (x) => {
    setTilt((prev) => ({ ...prev, x }));
    if (mobileBaseX.endsWith("px")) {
      const px = Number.parseFloat(mobileBaseX);
      if (Number.isFinite(px)) {
        setObjectPosition(`calc(${px}px + ${x * 10}px) center`);
      }
    }
  });

  useMotionValueEvent(gyro.y, "change", (y) => {
    setTilt((prev) => ({ ...prev, y }));
  });

  return (
    <main className="relative min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <Image
          src={HOME_BG}
          alt=""
          fill
          priority
          unoptimized
          className="object-cover md:object-right"
          style={{ objectPosition }}
          sizes="100vw"
        />
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

          <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Live tilt</p>
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
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/45 p-4 text-sm leading-relaxed text-white/70 backdrop-blur-md">
            <p className="font-semibold text-white/90">iPhone</p>
            <p className="mt-2">Tap anywhere once to allow motion access, then tilt the device slowly.</p>
            <p className="mt-2">Use HTTPS — this works on the deployed preview, not always on local IP links.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
