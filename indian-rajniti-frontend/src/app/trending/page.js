import CategoryPageShell from "@/components/category/CategoryPageShell";
import NewsCard from "@/components/news/NewsCard";
import { getTrending } from "@/features/news/news.api";

export const metadata = { title: "Trending News" };

export default async function TrendingPage() {
  const trending = await getTrending();

  return (
    <CategoryPageShell
      title="Trending News"
      count={trending.length}
      gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {trending.map((story) => (
        <NewsCard key={story.id} variant="stacked" story={story} />
      ))}
    </CategoryPageShell>
  );
}
