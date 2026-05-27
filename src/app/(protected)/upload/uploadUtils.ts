import type { ResolutionType } from "@/lib/naming";

export const MIN_DIM = 300;
export const MAX_LOW_WIDTH = 800;
export const MAX_VIDEO_BYTES = 250 * 1024 * 1024; // 250 MB

export function isVideoFile(f: File): boolean {
  return f.type.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(f.name);
}

export function isPdfFile(f: File): boolean {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}

export function checkDimensions(file: File): Promise<{ ok: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        ok: img.naturalWidth >= MIN_DIM && img.naturalHeight >= MIN_DIM,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, width: 0, height: 0 });
    };
    img.src = url;
  });
}

export async function processImage(file: File, resolutionType: ResolutionType): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const isLow = resolutionType === "low";
      const needsResize = isLow && img.naturalWidth > MAX_LOW_WIDTH;
      const scale = needsResize ? MAX_LOW_WIDTH / img.naturalWidth : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const quality = isLow ? 0.88 : 0.95;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], baseName + ".jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
