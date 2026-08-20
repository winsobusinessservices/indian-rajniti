import { notFound } from "next/navigation";
import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryDetailView, { CategoryBreadcrumb, RecommendedNewsSection } from "@/components/category/CategoryDetailView";
import { getBreakingNews } from "@/features/news/news.api";
import { getCategoryInfo } from "@/features/category/category.api";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const info = await getCategoryInfo(slug);
  if (!info) return { title: "Category not found" };
  return { title: info.label, description: info.description };
}

export default async function CategoryDetailPage({ params }) {
  const { slug } = await params;
  const info = await getCategoryInfo(slug);

  if (!info) {
    notFound();
  }

  const breakingNews = await getBreakingNews();

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />

      <main className="w-full bg-background flex-grow">
        <div className="max-w-full mx-auto px-4 md:px-16 py-6">
          <CategoryBreadcrumb label={info.label} />
          <CategoryDetailView info={info} />
        </div>
      </main>

      <RecommendedNewsSection recommendedNews={info.recommendedNews} />

      <Footer />
    </>
  );
}
