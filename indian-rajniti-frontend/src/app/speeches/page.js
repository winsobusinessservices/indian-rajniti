import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryDetailView, { CategoryBreadcrumb, RecommendedNewsSection } from "@/components/category/CategoryDetailView";
import { getBreakingNews } from "@/features/news/news.api";
import { getSpeechesInfo } from "@/features/events/events.api";

export const metadata = {
  title: "Speeches",
  description: "Recent addresses and floor speeches from government and opposition leaders.",
};

export default async function SpeechesPage() {
  const info = await getSpeechesInfo();
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
