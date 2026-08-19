import type { Metadata } from "next";
import { ArticleHub } from "@/components/news/article-hub";

export const metadata: Metadata = {
  title: "Latest News",
  description: "All the latest Formula Racing news, features and analysis from CTR Sports.",
};

export default async function LatestPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  return (
    <ArticleHub
      title="Latest News"
      categoryId={null}
      activeSlug={null}
      page={page}
      basePath="/latest"
    />
  );
}
