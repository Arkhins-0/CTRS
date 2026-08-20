import type { Metadata } from "next";
import { getTeamsIndex } from "@/components/racing/data";
import { TeamCard } from "@/components/racing/team-card";
import { getCurrentSeasonYear } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Teams",
  description:
    "Every team entered in the CTR–JK Tyre FMSCI Indian National Car Racing Championship.",
};

export default async function TeamsPage() {
  const year = await getCurrentSeasonYear();
  const teams = await getTeamsIndex(year);

  return (
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="border-l-4 border-accent pl-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          {year} Teams
        </h1>

        {teams.length === 0 ? (
          <p className="mt-10 text-fg-muted">
            The {year} team line-up has not been announced yet.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <TeamCard key={team.slug} team={team} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
