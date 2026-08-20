import CategoryPageShell from "@/components/category/CategoryPageShell";
import NewsCard from "@/components/news/NewsCard";
import { getBlogs } from "@/features/news/news.api";

export const metadata = { title: "Blogs" };

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
