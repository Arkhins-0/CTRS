import { DriverIdentityCard } from "./driver-identity-card";
import type { DriverIndexCard } from "./data";

/**
 * Drivers-index card — the shared driver card (see driver-identity-card.tsx)
 * with the index's own sizing. Kept as its own export because the index is
 * the one place that groups by class and so passes a category badge.
 */
export function DriverCard({
  driver,
  category,
  className = "",
}: {
  driver: DriverIndexCard;
  category?: { shortName: string; color: string } | null;
  className?: string;
}) {
  return (
    <DriverIdentityCard
      driver={driver}
      teamColor={driver.teamColor}
      teamName={driver.teamName}
      carNumber={driver.carNumber}
      category={category}
      size="md"
      className={className}
    />
  );
}
