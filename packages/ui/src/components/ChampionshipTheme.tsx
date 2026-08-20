import type { CSSProperties, ReactNode } from "react";

/**
 * Scopes the `champ` colour tokens (bg-champ, text-champ, border-champ, …) to a
 * championship's brand colours. Wrap any subtree — shared components inside
 * automatically re-skin. Without a wrapper, champ tokens fall back to the
 * site-wide accent.
 */
export function ChampionshipTheme({
  primaryColor,
  secondaryColor,
  className = "",
  children,
}: {
  primaryColor: string | null | undefined;
  secondaryColor?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const style: CSSProperties = {};
  if (primaryColor) (style as Record<string, string>)["--champ-primary"] = primaryColor;
  if (secondaryColor) (style as Record<string, string>)["--champ-secondary"] = secondaryColor;
  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
