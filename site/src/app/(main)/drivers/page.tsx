import type { Metadata } from "next";
import { CategoryBadge } from "@/components/racing/category-ui";
import { getDriversByCategory } from "@/components/racing/data";
import { DriverCard } from "@/components/racing/driver-card";
import { getCurrentSeasonYear } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Drivers",
  description:
    "Every driver of the CTR–JK Tyre FMSCI Indian National Car Racing Championship, category by category.",
};

export default async function DriversPage() {
  const year = await getCurrentSeasonYear();
  const groups = await getDriversByCategory(year);

  return (
    <main className="bg-surface-3">
      <div className="f1-inner flex flex-col gap-12 py-12 lg:gap-16 lg:py-16">
        <div className="flex flex-col gap-4 lg:gap-6">
          <h1 className="display-2xl lg:display-3xl font-black uppercase text-text-5">
            CTR Drivers {year}
          </h1>
          <p className="body-s md:body-m lg:body-l max-w-[680px] text-text-4">
            Every driver on the {year} grid of the CTR–JK Tyre FMSCI Indian National Car
            Racing Championship, listed by race category.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="rounded-md bg-surface-1 p-6 body-s text-text-3">
            The {year} entry lists have not been announced yet.
          </p>
        ) : (
          groups.map(({ category, drivers }) => (
            <section key={category.slug} id={category.slug} className="scroll-mt-32">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="display-l lg:display-xl font-medium uppercase text-text-5">
                  {category.name}
                </h2>
                <CategoryBadge category={category} />
                <span className="body-xs font-semibold text-text-3">
                  {drivers.length} {drivers.length === 1 ? "driver" : "drivers"}
                </span>
              </div>
              {category.carSpec ? (
                <p className="body-s mt-2 max-w-[680px] text-text-3">{category.carSpec}</p>
              ) : null}
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-4">
                {drivers.map((driver) => (
                  <DriverCard key={driver.slug} driver={driver} category={category} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
