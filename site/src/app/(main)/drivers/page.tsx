import type { Metadata } from "next";
import { CategoryBadge, CategoryPills } from "@/components/racing/category-ui";
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
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="border-l-4 border-accent pl-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {year} Drivers
          </h1>
          <CategoryPills
            categories={groups.map((g) => g.category)}
            activeSlug={null}
            hrefFor={(slug) => `#${slug}`}
            ariaLabel="Jump to category"
          />
        </div>

        {groups.length === 0 ? (
          <p className="mt-10 text-fg-muted">
            The {year} entry lists have not been announced yet.
          </p>
        ) : (
          <div className="mt-10 space-y-14">
            {groups.map(({ category, drivers }) => (
              <section key={category.slug} id={category.slug} className="scroll-mt-24">
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    className="border-l-4 pl-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl"
                    style={{ borderColor: category.color }}
                  >
                    {category.name}
                  </h2>
                  <CategoryBadge category={category} />
                  <span className="text-xs font-bold uppercase tracking-wider text-fg-faint">
                    {drivers.length} drivers
                  </span>
                </div>
                {category.carSpec ? (
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted">
                    {category.carSpec}
                  </p>
                ) : null}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {drivers.map((driver) => (
                    <DriverCard key={driver.slug} driver={driver} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
