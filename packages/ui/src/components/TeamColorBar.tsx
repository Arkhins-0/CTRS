/** Vertical team-colour bar used next to driver/team names in tables & cards. */
export function TeamColorBar({
  color,
  className = "",
}: {
  color: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block w-1 self-stretch rounded-sm ${className}`}
      style={{ backgroundColor: color ?? "#67676d", minHeight: "1.1em" }}
    />
  );
}
