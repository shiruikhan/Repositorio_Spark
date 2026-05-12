export type ResolutionType = "high" | "low" | "manual";

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
