import CategoryPageShell from "@/components/category/CategoryPageShell";
import NewsCard from "@/components/news/NewsCard";
import { getBlogs } from "@/features/news/news.api";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ title: "Indian Politics Blogs and Analysis", description: "Read commentary, explainers, opinions, and in-depth analysis of Indian politics, elections, Parliament, and public policy.", path: "/blogs" });

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <CategoryPageShell
      title="Blogs"
      count={blogs.length}
      gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {blogs.map((blog) => (
        <NewsCard key={blog.id} variant="stacked" story={blog} />
      ))}
    </CategoryPageShell>
  );
}
