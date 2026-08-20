import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RequireContributorRole from "@/components/author/RequireContributorRole";
import ReviewQueueClient from "@/components/author/ReviewQueueClient";
import { getBreakingNews } from "@/features/news/news.api";

const MODERATOR_ROLES = ["EDITOR", "ADMIN"];

export const metadata = { title: "Review Queue" };

export default async function ReviewQueuePage() {
  const breakingNews = await getBreakingNews();

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={MODERATOR_ROLES} roleLabel="an Editor or Admin">
          <ReviewQueueClient />
        </RequireContributorRole>
      </main>
      <Footer />
    </>
  );
}
