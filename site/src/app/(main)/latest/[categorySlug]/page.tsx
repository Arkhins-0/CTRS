import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleHub } from "@/components/news/article-hub";
import { getCategoryBySlug } from "@/components/news/queries";

type Props = {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: `The latest ${category.name} news from CTR.`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ categorySlug }, sp] = await Promise.all([params, searchParams]);

  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  return (
    <ArticleHub
      title={category.name}
      categoryId={category.id}
      activeSlug={category.slug}
      page={page}
      basePath={`/latest/${category.slug}`}
    />
  );
}
