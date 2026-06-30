export type ResolutionType = "high" | "low" | "manual" | "promo" | "video";

export function buildFilePath(
  productCode: string,
  type: ResolutionType,
  timestamp: number,
  position: number,
  originalName: string
): string {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "jpg";
  const slug = productCode.trim().replace(/\s+/g, "_");
  const filename = `${slug}_${type}_${timestamp}_${position}.${ext}`;
  return `${slug}/${filename}`;
}

/**
 * Caminho determinístico da miniatura de uma imagem (D2 — opção A).
 * Ex.: "1234/1234_high_1715000000_0.jpg" → "1234/thumbs/1234_high_1715000000_0_thumb.jpg"
 */
export function buildThumbPath(filePath: string): string {
  const slashIdx = filePath.indexOf("/");
  const dir = slashIdx === -1 ? "" : filePath.slice(0, slashIdx);
  const filename = slashIdx === -1 ? filePath : filePath.slice(slashIdx + 1);
  const base = filename.replace(/\.[^.]+$/, "");
  return `${dir ? `${dir}/` : ""}thumbs/${base}_thumb.jpg`;
}
