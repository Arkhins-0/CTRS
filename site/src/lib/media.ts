/** Public URL for an S3 media object key stored in `media.path`. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
  return `${base}/${path}`;
}

/** Deterministic placeholder gradient (used when an entity has no image). */
export function placeholderStyle(seedText: string): React.CSSProperties {
  let hash = 0;
  for (const c of seedText) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue} 35% 22%), hsl(${(hue + 40) % 360} 45% 12%))`,
  };
}
