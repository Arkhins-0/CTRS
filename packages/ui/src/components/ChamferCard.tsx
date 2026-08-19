import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  /** which corner(s) get the F1 cut */
  corner?: "tr" | "br" | "both" | "tr-lg";
};

/** White/dark card with the F1 signature cut corner. */
export function ChamferCard({ corner = "tr", className = "", ...rest }: Props) {
  const chamfer =
    corner === "br" ? "chamfer-br" : corner === "both" ? "chamfer-both" : corner === "tr-lg" ? "chamfer-tr-lg" : "chamfer-tr";
  return <div className={`${chamfer} ${className}`} {...rest} />;
}
