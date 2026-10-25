"use client";

import { useNativePageScrollProgress } from "@/hooks/use-native-scroll-progress";
import { scrollVelocity } from "@/lib/scroll-velocity";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type HeroWebGLSceneProps = {
  imageSrc: string;
  /** Grayscale depth map aligned with imageSrc (white = near); see scripts/build-hero-depth.mjs. */
  depthSrc: string;
  objectPosition?: string;
  hidden?: boolean;
  /** Freeze on the last frame (no rendering) while covered. */
  paused?: boolean;
  ready?: boolean;
  revealed?: boolean;
  interactive?: boolean;
  crossfadeMs?: number;
  pointerRampMs?: number;
  onReady?: () => void;
};

/* Where the subject sits in the photo (uv, y up) — the dolly pushes in toward this point. */
const SUBJECT_FOCUS = new THREE.Vector2(0.17, 0.25);

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* One pass: depth parallax + scroll dolly, velocity chromatic split / motion streak,
   then (after sRGB encode) an anamorphic flare and film grain. */
const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uDepth;
  uniform vec2 uPointer;
  uniform vec2 uFocus;
  uniform float uScroll;
  uniform float uVelocity;
  uniform float uTime;
  uniform float uGrain;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;
    float depth = texture2D(uDepth, uv).r;

    // Dolly toward the subject as the page scrolls; near layers grow faster than the sky.
    uv = uFocus + (uv - uFocus) / (1.0 + uScroll * (0.05 + 0.1 * depth));

    // Near layers follow the pointer and lag a touch behind fast scrolling; the sky stays put.
    vec2 shift = uPointer * vec2(0.018, 0.012) * (depth - 0.25);
    shift.y += uVelocity * 0.0009 * (depth - 0.25);
    vec2 st = clamp(uv - shift, 0.001, 0.999);

    // Chromatic split along the scroll axis, stronger toward the frame edges.
    float edge = 0.4 + length(vUv - 0.5) * 1.4;
    float ca = clamp(uVelocity * 0.00045, -0.012, 0.012) * edge;
    vec3 color = vec3(
      texture2D(uMap, st + vec2(0.0, ca)).r,
      texture2D(uMap, st).g,
      texture2D(uMap, st - vec2(0.0, ca)).b
    );

    // Motion streak while moving fast.
    float streak = clamp(abs(uVelocity) * 0.0007, 0.0, 0.02);
    if (streak > 0.0005) {
      vec3 acc = color;
      for (int i = 1; i <= 4; i++) {
        acc += texture2D(uMap, st - vec2(0.0, streak * float(i) * 0.25 * sign(uVelocity))).rgb;
      }
      color = acc / 5.0;
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>

    // Anamorphic flare: a thin horizontal streak with a soft core that drifts with the pointer.
    vec2 flare = vec2(0.62 + uPointer.x * 0.08, 0.78 + uPointer.y * 0.03);
    float line = exp(-abs(vUv.y - flare.y) * 140.0) * exp(-abs(vUv.x - flare.x) * 2.2);
    float core = exp(-length((vUv - flare) * vec2(1.0, 2.2)) * 9.0);
    gl_FragColor.rgb += vec3(1.0, 0.86, 0.72) * (line * 0.22 + core * 0.1);

    // Film grain.
    gl_FragColor.rgb += (hash(vUv * 1000.0 + fract(uTime * 0.37) * 100.0) - 0.5) * uGrain;
  }
`;

/** Runs once the textures load: the photo is sRGB color; the depth map is raw data. */
function configureTextures(loaded: THREE.Texture | THREE.Texture[]) {
  const [map, depth] = Array.isArray(loaded) ? loaded : [loaded];
  for (const texture of [map, depth]) {
    if (!texture) continue;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  if (depth) depth.colorSpace = THREE.NoColorSpace;
}

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
  depthSrc,
  objectPosition = "center",
  interactive = false,
  pointerRampMs = 500,
  onReady,
}: {
  imageSrc: string;
  depthSrc: string;
  objectPosition?: string;
  interactive?: boolean;
  pointerRampMs?: number;
  onReady?: () => void;
}) {
  const [texture, depthTexture] = useTexture([imageSrc, depthSrc], configureTextures);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const progress = useNativePageScrollProgress(true);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerSmooth = useRef({ x: 0, y: 0 });
  const pointerInfluence = useRef(0);
  const velocitySmooth = useRef(0);
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uDepth: { value: depthTexture },
      uPointer: { value: new THREE.Vector2() },
      uFocus: { value: SUBJECT_FOCUS },
      uScroll: { value: 0 },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
      uGrain: { value: 0.07 },
    }),
    [texture, depthTexture],
  );

  useEffect(() => {
    onReady?.();
  }, [texture, depthTexture, onReady]);

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

    const coverWidth = w * 1.14;
    const coverHeight = h * 1.14;
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
    const material = materialRef.current;
    if (!mesh || !material) return;
    const u = material.uniforms;

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

    velocitySmooth.current += (scrollVelocity.get() - velocitySmooth.current) * Math.min(1, delta * 10);

    const p = progress.get();
    u.uPointer.value.set(px * t, py * t);
    u.uScroll.value = p;
    u.uVelocity.value = velocitySmooth.current;
    u.uTime.value += delta;

    const recedeZ = -p * 1.4;
    mesh.position.z = recedeZ;
    mesh.position.x = offsetX + px * 0.12 * t;
    mesh.position.y = py * 0.16 * t;
    mesh.rotation.x = py * 0.07 * t;
    mesh.rotation.y = -px * 0.09 * t;
    /* Camera sits at z=5.2; moving the plane back shrinks it on screen.
       Scale by distance so the image still covers the viewport at page end. */
    const cameraZ = 5.2;
    const distanceScale = (cameraZ - recedeZ) / cameraZ;
    const zoomIn = 1 + p * 0.08;
    const scale = distanceScale * zoomIn;
    mesh.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={meshRef} position={[offsetX, 0, 0]}>
      <planeGeometry args={[width, height, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        toneMapped={false}
      />
    </mesh>
  );
}

function HeroSceneContent({
  imageSrc,
  depthSrc,
  objectPosition,
  interactive,
  pointerRampMs,
  onReady,
}: {
  imageSrc: string;
  depthSrc: string;
  objectPosition?: string;
  interactive?: boolean;
  pointerRampMs?: number;
  onReady?: () => void;
}) {
  return (
    <HeroImagePlane
      imageSrc={imageSrc}
      depthSrc={depthSrc}
      objectPosition={objectPosition}
      interactive={interactive}
      pointerRampMs={pointerRampMs}
      onReady={onReady}
    />
  );
}

export function HeroWebGLScene({
  imageSrc,
  depthSrc,
  objectPosition = "center",
  hidden = false,
  paused = false,
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
        frameloop={paused ? "never" : "always"}
        dpr={[1, 1.5]}
        /* The plane overfills the viewport, so there are no geometry edges for MSAA to smooth. */
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        camera={{ position: [0, 0, 5.2], fov: 42, near: 0.1, far: 100 }}
      >
        <Suspense fallback={null}>
          <HeroSceneContent
            imageSrc={imageSrc}
            depthSrc={depthSrc}
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
