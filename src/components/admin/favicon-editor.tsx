"use client";

import {
  canvasToPngFile,
  DEFAULT_FAVICON_ADJUSTMENTS,
  FAVICON_SIZE,
  loadImageFromFile,
  loadImageFromUrl,
  renderFaviconToCanvas,
  type FaviconAdjustments,
} from "@/lib/favicon-render";
import { RotateCcw, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FaviconEditorProps = {
  pageTitle: string;
  currentFavicon?: string;
  onSave: (file: File) => Promise<void>;
  uploading: boolean;
  error?: string;
};

const PREVIEW_SIZE = 160;

function checkerboardStyle(size = 12): React.CSSProperties {
  return {
    backgroundImage:
      "linear-gradient(45deg, #3f3f46 25%, transparent 25%), linear-gradient(-45deg, #3f3f46 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3f3f46 75%), linear-gradient(-45deg, transparent 75%, #3f3f46 75%)",
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: `0 0, 0 ${size / 2}px, ${size / 2}px -${size / 2}px, -${size / 2}px 0`,
    backgroundColor: "#27272a",
  };
}

function TabPreview({ iconSrc, title }: { iconSrc: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-t-xl border border-b-0 border-zinc-700 bg-zinc-800">
      <div className="flex items-end gap-1 overflow-x-auto px-2 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-0 max-w-[min(100%,220px)] shrink-0 items-center gap-2 rounded-t-lg border border-b-0 border-zinc-600 bg-zinc-700 px-3 py-2 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 object-contain" width={16} height={16} />
          <span className="truncate text-xs text-zinc-100">{title || "Your site"}</span>
          <span className="ml-1 shrink-0 text-[10px] text-zinc-400">×</span>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-t-lg border border-b-0 border-transparent px-3 py-2 opacity-50 sm:flex">
          <span className="h-4 w-4 rounded-sm bg-zinc-600" />
          <span className="text-xs text-zinc-500">New tab</span>
        </div>
      </div>
      <div className="h-8 border-t border-zinc-700 bg-zinc-900" />
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium uppercase tracking-wider text-zinc-400">{label}</span>
        <span className="tabular-nums text-zinc-500">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-orange-500 sm:h-1.5"
      />
    </label>
  );
}

export function FaviconEditor({ pageTitle, currentFavicon, onSave, uploading, error }: FaviconEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [adjustments, setAdjustments] = useState<FaviconAdjustments>(DEFAULT_FAVICON_ADJUSTMENTS);
  const [loadError, setLoadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const patchAdjustments = useCallback((patch: Partial<FaviconAdjustments>) => {
    setAdjustments((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadSource = useCallback(async (loader: () => Promise<HTMLImageElement>, label: string) => {
    setLoadError("");
    try {
      const img = await loader();
      setImage(img);
      setSourceLabel(label);
      setAdjustments(DEFAULT_FAVICON_ADJUSTMENTS);
    } catch {
      setLoadError("Could not load that image. Try PNG, JPG, or WebP.");
    }
  }, []);

  useEffect(() => {
    if (currentFavicon && !image) {
      void loadSource(() => loadImageFromUrl(`${currentFavicon}?t=${Date.now()}`), "Current tab icon");
    }
  }, [currentFavicon, image, loadSource]);

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const canvas = renderFaviconToCanvas(image, image.naturalWidth, image.naturalHeight, adjustments);
    setPreviewUrl(canvas.toDataURL("image/png"));
  }, [image, adjustments]);

  const handleFile = async (file: File) => {
    await loadSource(() => loadImageFromFile(file), file.name);
  };

  const handleSave = async () => {
    if (!image) return;
    const canvas = renderFaviconToCanvas(image, image.naturalWidth, image.naturalHeight, adjustments);
    const file = await canvasToPngFile(canvas);
    await onSave(file);
  };

  const editorBackground = useMemo(
    () => (adjustments.transparent ? checkerboardStyle() : { backgroundColor: adjustments.background }),
    [adjustments.transparent, adjustments.background],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: adjustments.offsetX,
      oy: adjustments.offsetY,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const scaleFactor = FAVICON_SIZE / PREVIEW_SIZE;
    const dx = (e.clientX - dragRef.current.x) * scaleFactor;
    const dy = (e.clientY - dragRef.current.y) * scaleFactor;
    patchAdjustments({
      offsetX: dragRef.current.ox + dx,
      offsetY: dragRef.current.oy + dy,
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <section className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:space-y-6 sm:p-6">
      <div>
        <h2 className="text-base font-semibold sm:text-lg">Website tab icon</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Upload an image, preview it in a browser tab, then zoom and drag to frame it before saving.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tab preview</p>
          {previewUrl ? (
            <TabPreview iconSrc={previewUrl} title={pageTitle} />
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-500">
              Choose an image to see the tab preview.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl || undefined} alt="" className="h-4 w-4 object-contain" width={16} height={16} />
              16×16
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl || undefined} alt="" className="h-8 w-8 object-contain" width={32} height={32} />
              32×32
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Adjust framing</p>

          <div
            className="relative mx-auto aspect-square w-full max-w-[min(100%,280px)] cursor-grab touch-none overflow-hidden rounded-xl border border-zinc-600 active:cursor-grabbing sm:max-w-[240px]"
            style={editorBackground}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Framing preview"
                className="pointer-events-none h-full w-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">No image</div>
            )}
            <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-dashed border-orange-400/70" />
          </div>
          <p className="text-center text-xs text-zinc-500">Drag inside the frame to reposition</p>

          <Slider
            label="Zoom"
            value={adjustments.scale}
            min={0.5}
            max={2.5}
            step={0.01}
            onChange={(scale) => patchAdjustments({ scale })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider
            label="Horizontal"
            value={adjustments.offsetX}
            min={-24}
            max={24}
            step={0.5}
            onChange={(offsetX) => patchAdjustments({ offsetX })}
          />
          <Slider
            label="Vertical"
            value={adjustments.offsetY}
            min={-24}
            max={24}
            step={0.5}
            onChange={(offsetY) => patchAdjustments({ offsetY })}
          />

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={adjustments.transparent}
              onChange={(e) => patchAdjustments({ transparent: e.target.checked })}
              className="rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500/50"
            />
            Transparent background
          </label>

          {!adjustments.transparent && (
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Background color</span>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="color"
                  value={adjustments.background}
                  onChange={(e) => patchAdjustments({ background: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border border-zinc-700 bg-zinc-950"
                />
                <span className="font-mono text-sm text-zinc-400">{adjustments.background}</span>
              </div>
            </label>
          )}

          <button
            type="button"
            onClick={() => setAdjustments(DEFAULT_FAVICON_ADJUSTMENTS)}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
          >
            <RotateCcw size={14} />
            Reset adjustments
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-800 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/x-icon,.ico"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm font-medium hover:bg-zinc-800 sm:w-auto sm:py-2.5"
        >
          <Upload size={16} />
          {image ? "Choose different image" : "Choose image"}
        </button>
        {currentFavicon && (
          <button
            type="button"
            onClick={() => void loadSource(() => loadImageFromUrl(`${currentFavicon}?t=${Date.now()}`), "Current tab icon")}
            className="w-full rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 sm:w-auto sm:py-2.5"
          >
            Reload current icon
          </button>
        )}
        <button
          type="button"
          disabled={!image || uploading}
          onClick={() => void handleSave()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold hover:bg-orange-500 disabled:opacity-50 sm:w-auto sm:py-2.5"
        >
          {uploading ? "Saving…" : "Save tab icon"}
        </button>
        {sourceLabel ? (
          <span className="text-center text-xs text-zinc-500 sm:text-left">Source: {sourceLabel}</span>
        ) : null}
      </div>

      {loadError ? <p className="text-sm text-red-400">{loadError}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
