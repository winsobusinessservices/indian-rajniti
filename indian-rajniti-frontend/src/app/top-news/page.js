import CategoryPageShell from "@/components/category/CategoryPageShell";
import NewsCard from "@/components/news/NewsCard";
import { getTopStories } from "@/features/news/news.api";

export const metadata = { title: "Top News" };

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
