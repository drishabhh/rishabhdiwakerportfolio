export type FaviconAdjustments = {
  scale: number;
  offsetX: number;
  offsetY: number;
  background: string;
  transparent: boolean;
};

export const DEFAULT_FAVICON_ADJUSTMENTS: FaviconAdjustments = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  background: "#ffffff",
  transparent: true,
};

export const FAVICON_SIZE = 32;

export function renderFaviconToCanvas(
  image: CanvasImageSource,
  width: number,
  height: number,
  adjustments: FaviconAdjustments,
  outputSize = FAVICON_SIZE,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (!adjustments.transparent) {
    ctx.fillStyle = adjustments.background;
    ctx.fillRect(0, 0, outputSize, outputSize);
  }

  const imgW = "naturalWidth" in image ? image.naturalWidth : width;
  const imgH = "naturalHeight" in image ? image.naturalHeight : height;
  const baseScale = Math.max(outputSize / imgW, outputSize / imgH);
  const drawScale = baseScale * adjustments.scale;
  const drawW = imgW * drawScale;
  const drawH = imgH * drawScale;
  const x = (outputSize - drawW) / 2 + adjustments.offsetX;
  const y = (outputSize - drawH) / 2 + adjustments.offsetY;

  ctx.drawImage(image, x, y, drawW, drawH);
  return canvas;
}

export async function canvasToPngFile(canvas: HTMLCanvasElement, filename = "favicon.png"): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export image"));
          return;
        }
        resolve(new File([blob], filename, { type: "image/png" }));
      },
      "image/png",
    );
  });
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImageFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}
