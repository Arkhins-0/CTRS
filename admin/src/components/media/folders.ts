/**
 * Media-library folder paths.
 *
 * A folder path is slash-separated, lower-kebab, with no leading or trailing
 * slash: "" (the root), "drivers", "drivers/2026". Pure string helpers —
 * safe to import from both server and client code.
 */

/** Longest path we accept, matching media.folder / media_folders.path. */
export const MAX_FOLDER_PATH = 300;
const MAX_DEPTH = 6;

/** One path segment → lower-kebab, alphanumeric and dashes only. */
export function slugifySegment(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Normalises any user- or URL-supplied folder value to a canonical path.
 * Returns "" (the root) for anything empty or unusable — callers never have
 * to defend against `..`, absolute paths or stray slashes.
 */
export function normalizeFolder(input: string | null | undefined): string {
  if (!input) return "";
  const segments = input
    .split("/")
    .map(slugifySegment)
    .filter(Boolean)
    .slice(0, MAX_DEPTH);
  const path = segments.join("/");
  return path.length > MAX_FOLDER_PATH ? "" : path;
}

/** "drivers/2026" → "drivers"; a top-level folder → "" (the root). */
export function parentFolder(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/** "drivers/2026" → "2026"; the root → "Library". */
export function folderName(path: string): string {
  if (!path) return "Library";
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

/** Root-first trail for the breadcrumb: [{name,path}, …] including the root. */
export function folderTrail(path: string): { name: string; path: string }[] {
  const trail = [{ name: "Library", path: "" }];
  if (!path) return trail;
  const segments = path.split("/");
  for (let i = 0; i < segments.length; i += 1) {
    const sub = segments.slice(0, i + 1).join("/");
    trail.push({ name: segments[i] as string, path: sub });
  }
  return trail;
}

/** True when `child` sits anywhere beneath `parent` (not equal to it). */
export function isDescendantFolder(child: string, parent: string): boolean {
  if (!parent) return child !== "";
  return child.startsWith(`${parent}/`);
}
