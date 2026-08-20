import Link from "next/link";
import { notFound } from "next/navigation";
import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NewsCard from "@/components/news/NewsCard";
import NewsAsideLeft from "@/components/news/NewsAsideLeft";
import NewsAsideRight from "@/components/news/NewsAsideRight";
import ImagePlaceholder from "@/components/common/ImagePlaceholder";
import { slugify } from "@/lib/slugify";

import { getBreakingNews, getPostBySlug, getRelatedPosts } from "@/features/news/news.api";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function PostDetailPage({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const [breakingNews, relatedPosts] = await Promise.all([getBreakingNews(), getRelatedPosts(slug, 4)]);

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />

      <main className="w-full bg-background flex-grow">
        <div className="max-w-full mx-auto px-4 md:px-16 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-label-md text-on-surface-variant mb-6">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <i className="fa-solid fa-chevron-right text-[10px]" />
            <Link href={`/category/${slugify(post.category)}`} className="text-primary hover:underline">
              {post.category}
            </Link>
          </nav>

          <div className="flex flex-col lg:flex-row gap-6">
            <NewsAsideLeft />

            {/* Center: Article */}
            <article className="order-1 lg:order-2 flex-grow lg:w-3/5">
              <Link
                href={`/category/${slugify(post.category)}`}
                className="inline-block px-3 py-1 bg-primary text-on-primary text-xs font-label-md uppercase tracking-widest rounded-sm mb-4 hover:bg-primary-container transition-colors"
              >
                {post.category}
              </Link>
              <h1 className="font-display-lg text-3xl md:text-4xl text-on-surface tracking-tight leading-tight mb-4">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-on-surface-variant font-label-md mb-6 pb-6 border-b border-outline-variant/30">
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-user text-primary" /> {post.author}
                </span>
                <span className="flex items-center gap-2">
                  <i className="fa-regular fa-calendar text-primary" /> {post.date}
                </span>
                <span className="flex items-center gap-2">
                  <i className="fa-regular fa-clock text-primary" /> {post.readTime}
                </span>
              </div>

              <ImagePlaceholder
                icon={post.icon}
                image={post.image}
                alt={post.title}
                gradient="primary"
                className="w-full aspect-[16/9] md:h-[420px] md:aspect-auto rounded-xl mb-8"
                iconClassName="text-7xl"
              />

              <div className="space-y-6">
                {post.content.map((paragraph, index) => (
                  <p
                    key={index}
                    className={
                      index === 0
                        ? "font-body-lg text-on-surface leading-relaxed"
                        : "font-body-md text-on-surface-variant leading-relaxed"
                    }
                  >
                    {paragraph}
                  </p>
                ))}

                <blockquote className="border-l-4 border-primary pl-6 py-2 italic font-headline-md text-lg text-on-surface">
                  &ldquo;{post.excerpt}&rdquo;
                </blockquote>
              </div>

              <div className="mt-10 pt-6 border-t border-outline-variant/30">
                <h3 className="font-label-md text-primary text-xs uppercase tracking-widest mb-3">Related Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/category/${slugify(tag)}`}
                      className="px-3 py-1 bg-surface-container-high text-on-surface text-xs font-label-md rounded-full hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </article>

            <NewsAsideRight />
          </div>
        </div>
      </main>

      {/* Recommended News */}
      <section className="w-full bg-surface py-10 border-t border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-4 md:px-16">
          <div className="flex items-center justify-between mb-6 border-b border-outline-variant/30 pb-2">
            <h2 className="font-display-lg text-2xl md:text-3xl text-primary tracking-tight">Recommended News</h2>
            <Link href="/" className="font-label-md text-secondary hover:underline flex items-center gap-1 text-sm">
              VIEW ALL <i className="fa-solid fa-arrow-right text-xs" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedPosts.map((story) => (
              <NewsCard key={story.id} variant="stacked" story={story} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
