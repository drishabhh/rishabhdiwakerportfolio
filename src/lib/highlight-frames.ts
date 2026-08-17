import { youtubeVideoIdFromUrl } from "@/lib/youtube";
import { vimeoFromUrl, vimeoThumbnailFromUrl } from "@/lib/vimeo";

export function youtubeFrameUrls(href: string): string[] {
  const id = youtubeVideoIdFromUrl(href);
  if (!id) return [];
  return [1, 2, 3].map((n) => `https://i.ytimg.com/vi/${id}/${n}.jpg`);
}

export function vimeoFrameUrls(href: string): string[] {
  const ref = vimeoFromUrl(href);
  if (!ref) return [];
  const base = vimeoThumbnailFromUrl(href);
  return base ? [base] : [];
}

export function captureVideoFrames(src: string, count = 3): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.src = src;

    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };

    video.onerror = () => fail(new Error("Could not load video to capture frames"));

    video.onloadedmetadata = async () => {
      try {
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
        const stops =
          count <= 1
            ? [Math.min(0.1, duration * 0.1)]
            : Array.from({ length: count }, (_, i) => {
                const t = duration * (0.18 + (i / Math.max(1, count - 1)) * 0.64);
                return Math.min(duration - 0.05, Math.max(0.05, t));
              });

        const frames: string[] = [];
        for (const time of stops) {
          frames.push(await captureAt(video, time));
        }
        cleanup();
        resolve(frames);
      } catch (error) {
        fail(error instanceof Error ? error : new Error("Frame capture failed"));
      }
    };
  });
}

function captureAt(video: HTMLVideoElement, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      try {
        const maxW = 480;
        const ratio = video.videoHeight / Math.max(1, video.videoWidth);
        const width = Math.min(maxW, video.videoWidth || maxW);
        const height = Math.max(1, Math.round(width * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Could not capture frame"));
      }
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}
