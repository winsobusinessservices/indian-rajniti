import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RequireContributorRole from "@/components/author/RequireContributorRole";
import MyPostsClient from "@/components/author/MyPostsClient";
import { getBreakingNews } from "@/features/news/news.api";

export const metadata = { title: "My Content" };

export default async function AuthorContentPage() {
  const breakingNews = await getBreakingNews();

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole>
          <MyPostsClient />
        </RequireContributorRole>
      </main>
      <Footer />
    </>
  );
}
