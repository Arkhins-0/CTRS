import type { Metadata } from "next";
import { DriverCard } from "@/components/racing/driver-card";
import { getDriversIndex } from "@/components/racing/data";
import { getCurrentSeasonYear } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Drivers",
  description: "Every driver on the current Formula Racing grid.",
};

export default async function DriversPage() {
  const year = await getCurrentSeasonYear();
  const drivers = await getDriversIndex(year);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="border-l-4 border-f1-red pl-3 text-3xl font-black uppercase tracking-tight text-carbon sm:text-4xl">
        {year} Drivers
      </h1>

      {drivers.length === 0 ? (
        <p className="mt-10 text-f1-grey">The {year} driver line-up has not been announced yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {drivers.map((driver) => (
            <DriverCard key={driver.slug} driver={driver} />
          ))}
        </div>
      )}
    </main>
  );
}
