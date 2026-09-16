import CategoryPageShell from "@/components/category/CategoryPageShell";
import NewsCard from "@/components/news/NewsCard";
import { getTopStories } from "@/features/news/news.api";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ title: "Top Indian Political News", description: "Read today's leading Indian political news, election updates, parliamentary developments, and policy stories.", path: "/top-news" });

export default async function TopStoriesPage() {
  const topStories = await getTopStories();

  return (
    <CategoryPageShell
      title="Top News"
      count={topStories.length}
      gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {!topStories && <p>No top stories</p>}
      {topStories.map((story) => (
        <NewsCard key={story.id} variant="stacked" story={story} />
      ))}
    </CategoryPageShell>
  );
}
