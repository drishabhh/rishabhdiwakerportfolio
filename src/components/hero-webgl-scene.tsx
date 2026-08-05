"use client";

import { useNativePageScrollProgress } from "@/hooks/use-native-scroll-progress";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { motion, useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type HeroWebGLSceneProps = {
  imageSrc: string;
  objectPosition?: string;
  blurred: boolean;
  hidden?: boolean;
  reveal?: boolean;
  onReady?: () => void;
};

function parseHorizontalObjectPosition(objectPosition: string, imageWidth: number): number {
  const [xRaw] = objectPosition.trim().split(/\s+/);
  if (!xRaw) return 1;
  if (xRaw === "right") return 1;
  if (xRaw === "left") return 0;
  if (xRaw === "center") return 0.5;
  if (xRaw.endsWith("%")) {
    const pct = Number.parseFloat(xRaw);
    return Number.isFinite(pct) ? Math.min(1, Math.max(0, pct / 100)) : 0.5;
  }
  if (xRaw.endsWith("px")) {
    const px = Number.parseFloat(xRaw);
    if (!Number.isFinite(px) || imageWidth <= 0) return 0.5;
    return Math.min(1, Math.max(0, 0.5 - px / imageWidth));
  }
  return 0.5;
}

function HeroImagePlane({
  imageSrc,
  objectPosition = "center",
  onReady,
}: {
  imageSrc: string;
  objectPosition?: string;
  onReady?: () => void;
}) {
  const texture = useTexture(imageSrc);
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useNativePageScrollProgress(true);
  const pointer = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    onReady?.();
  }, [texture, onReady]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const { width, height, offsetX } = useMemo(() => {
    const image = texture.image as HTMLImageElement | undefined;
    const imageWidth = image?.width ?? 1920;
    const imageHeight = image?.height ?? 1080;
    const imageAspect = imageWidth / imageHeight;
    const viewportAspect = viewport.width / viewport.height;
    let w = viewport.width;
    let h = viewport.height;

    if (viewportAspect > imageAspect) {
      w = viewport.width;
      h = viewport.width / imageAspect;
    } else {
      h = viewport.height;
      w = viewport.height * imageAspect;
    }

    const coverWidth = w * 1.08;
    const coverHeight = h * 1.08;
    const [xRaw] = objectPosition.trim().split(/\s+/);
    const pixelShift =
      xRaw?.endsWith("px") && typeof window !== "undefined"
        ? (Math.abs(Number.parseFloat(xRaw)) / window.innerWidth) * viewport.width
        : 0;
    const anchorX = xRaw?.endsWith("px") ? 1 : parseHorizontalObjectPosition(objectPosition, imageWidth);
    const overflowX = Math.max(0, coverWidth - viewport.width);
    const alignedX = viewport.width * 0.5 - coverWidth * 0.5 + overflowX * anchorX - pixelShift;

    return {
      width: coverWidth,
      height: coverHeight,
      offsetX: alignedX,
    };
  }, [objectPosition, texture, viewport.height, viewport.width]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const p = progress.get();
    mesh.position.z = -p * 1.4;
    mesh.position.x = offsetX + pointer.current.x * 0.06;
    mesh.position.y = pointer.current.y * 0.08;
    mesh.rotation.x = pointer.current.y * 0.035;
    mesh.rotation.y = -pointer.current.x * 0.045;
    const scale = 1 + p * 0.1;
    mesh.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={meshRef} position={[offsetX, 0, 0]}>
      <planeGeometry args={[width, height, 32, 32]} />
      <meshBasicMaterial map={texture} toneMapped={false} color="#fffdf8" />
    </mesh>
  );
}

function createSoftParticleTexture() {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function CinematicParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const progress = useNativePageScrollProgress(true);
  const particleTexture = useMemo(() => createSoftParticleTexture(), []);

  const positions = useMemo(() => {
    const arr = new Float32Array(36 * 3);
    for (let i = 0; i < 36; i++) {
      arr[i * 3] = (Math.random() - 0.35) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 9;
      arr[i * 3 + 2] = Math.random() * 4 + 0.4;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const points = pointsRef.current;
    if (!points) return;
    const p = progress.get();
    points.rotation.y = state.clock.elapsedTime * 0.018;
    points.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.04;
    points.position.z = -p * 0.8;
    const material = points.material as THREE.PointsMaterial;
    material.opacity = 0.32 * (1 - p * 0.65);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={particleTexture ?? undefined}
        alphaMap={particleTexture ?? undefined}
        size={0.12}
        color="#ff8a45"
        transparent
        opacity={0.32}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function HeroSceneContent({
  imageSrc,
  objectPosition,
  onReady,
}: {
  imageSrc: string;
  objectPosition?: string;
  onReady?: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#0a0a0a"]} />
      <ambientLight intensity={0.52} />
      <directionalLight position={[4, 6, 8]} intensity={0.62} color="#fff8f2" />
      <HeroImagePlane imageSrc={imageSrc} objectPosition={objectPosition} onReady={onReady} />
      <CinematicParticles />
    </>
  );
}

const HERO_BG_ENTRANCE_MS = 0.3;
const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function HeroWebGLScene({
  imageSrc,
  objectPosition = "center",
  blurred,
  hidden = false,
  reveal = false,
  onReady,
}: HeroWebGLSceneProps) {
  const reduced = Boolean(useReducedMotion());

  return (
    <motion.div
      aria-hidden
      initial={false}
      animate={{ opacity: hidden ? 0 : reveal ? 1 : 0 }}
      transition={{ duration: reduced ? 0.12 : HERO_BG_ENTRANCE_MS, ease: cinematicEase }}
      className={`pointer-events-none fixed inset-0 z-0 hidden min-h-[100dvh] w-screen overflow-hidden md:block transition-[filter] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        blurred ? "duration-400" : "duration-150"
      }`}
      style={{
        filter: blurred
          ? "blur(18px) brightness(1.16) contrast(1.05) saturate(1.06)"
          : "brightness(1.16) contrast(1.05) saturate(1.06)",
      }}
    >
      <Canvas
        className="h-full w-full"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 5.2], fov: 42, near: 0.1, far: 100 }}
      >
        <Suspense fallback={null}>
          <HeroSceneContent
            imageSrc={imageSrc}
            objectPosition={objectPosition}
            onReady={onReady}
          />
        </Suspense>
      </Canvas>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 58% 52% at 72% 38%, rgba(255,255,255,0.32) 0%, rgba(255,248,240,0.1) 45%, transparent 72%)",
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_72%_38%,transparent_0%,rgba(0,0,0,0.1)_55%,rgba(0,0,0,0.32)_100%)]"
      />
    </motion.div>
  );
}
