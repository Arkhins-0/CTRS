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
    <main className="bg-surface-3">
      <div className="f1-inner flex flex-col gap-12 py-12 lg:gap-16 lg:py-16">
        <div className="flex flex-col gap-4 lg:gap-6">
          <h1 className="display-2xl lg:display-3xl font-black uppercase text-text-5">
            CTR Teams {year}
          </h1>
          <p className="body-s md:body-m lg:body-l max-w-[680px] text-text-4">
            The teams contesting the {year} CTR–JK Tyre FMSCI Indian National Car Racing
            Championship, their line-ups and the categories they enter.
          </p>
        </div>

        {teams.length === 0 ? (
          <p className="rounded-md bg-surface-1 p-6 body-s text-text-3">
            The {year} team line-up has not been announced yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            {teams.map((team) => (
              <TeamCard key={team.slug} team={team} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
