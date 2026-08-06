"use client";

import { useNativePageScrollProgress } from "@/hooks/use-native-scroll-progress";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type HeroWebGLSceneProps = {
  imageSrc: string;
  objectPosition?: string;
  hidden?: boolean;
  ready?: boolean;
  revealed?: boolean;
  interactive?: boolean;
  crossfadeMs?: number;
  pointerRampMs?: number;
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
  interactive = false,
  pointerRampMs = 500,
  onReady,
}: {
  imageSrc: string;
  objectPosition?: string;
  interactive?: boolean;
  pointerRampMs?: number;
  onReady?: () => void;
}) {
  const texture = useTexture(imageSrc);
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useNativePageScrollProgress(true);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerSmooth = useRef({ x: 0, y: 0 });
  const pointerInfluence = useRef(0);
  const { viewport } = useThree();

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    onReady?.();
  }, [texture, onReady]);

  useEffect(() => {
    const resetPointer = () => {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
    };

    const onMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (clientX < 0 || clientY < 0 || clientX > w || clientY > h) {
        resetPointer();
        return;
      }
      pointerTarget.current.x = (clientX / w) * 2 - 1;
      pointerTarget.current.y = -(clientY / h) * 2 + 1;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", resetPointer);
    window.addEventListener("blur", resetPointer);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", resetPointer);
      window.removeEventListener("blur", resetPointer);
    };
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

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const targetInfluence = interactive ? 1 : 0;
    const ramp = pointerRampMs <= 0 ? 1 : Math.min(1, delta / (pointerRampMs / 1000));
    const step = Math.min(1, ramp * 4.5);
    pointerInfluence.current += (targetInfluence - pointerInfluence.current) * step;
    const t = pointerInfluence.current;

    const follow = Math.min(1, delta * 14);
    pointerSmooth.current.x += (pointerTarget.current.x - pointerSmooth.current.x) * follow;
    pointerSmooth.current.y += (pointerTarget.current.y - pointerSmooth.current.y) * follow;
    const px = pointerSmooth.current.x;
    const py = pointerSmooth.current.y;

    const p = progress.get();
    mesh.position.z = -p * 1.4;
    mesh.position.x = offsetX + px * 0.12 * t;
    mesh.position.y = py * 0.16 * t;
    mesh.rotation.x = py * 0.07 * t;
    mesh.rotation.y = -px * 0.09 * t;
    const scale = 1 + p * 0.1;
    mesh.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={meshRef} position={[offsetX, 0, 0]}>
      <planeGeometry args={[width, height, 32, 32]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function HeroSceneContent({
  imageSrc,
  objectPosition,
  interactive,
  pointerRampMs,
  onReady,
}: {
  imageSrc: string;
  objectPosition?: string;
  interactive?: boolean;
  pointerRampMs?: number;
  onReady?: () => void;
}) {
  return (
    <HeroImagePlane
      imageSrc={imageSrc}
      objectPosition={objectPosition}
      interactive={interactive}
      pointerRampMs={pointerRampMs}
      onReady={onReady}
    />
  );
}

export function HeroWebGLScene({
  imageSrc,
  objectPosition = "center",
  hidden = false,
  ready = false,
  revealed = false,
  interactive = false,
  crossfadeMs = 900,
  pointerRampMs = 550,
  onReady,
}: HeroWebGLSceneProps) {
  const layerOpacity = hidden ? 0 : revealed ? 1 : 0;
  const fadeMs = crossfadeMs;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden min-h-[100dvh] w-screen overflow-hidden md:block"
      style={{
        opacity: layerOpacity,
        visibility: ready ? "visible" : "hidden",
        transition: `opacity ${fadeMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        willChange: "opacity",
      }}
    >
      <Canvas
        className="h-full w-full"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        camera={{ position: [0, 0, 5.2], fov: 42, near: 0.1, far: 100 }}
      >
        <Suspense fallback={null}>
          <HeroSceneContent
            imageSrc={imageSrc}
            objectPosition={objectPosition}
            interactive={interactive}
            pointerRampMs={pointerRampMs}
            onReady={onReady}
          />
        </Suspense>
      </Canvas>

      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_72%_38%,transparent_0%,rgba(0,0,0,0.1)_55%,rgba(0,0,0,0.32)_100%)]"
      />
    </div>
  );
}
