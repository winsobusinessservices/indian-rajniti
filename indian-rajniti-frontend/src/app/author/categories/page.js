import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RequireContributorRole from "@/components/author/RequireContributorRole";
import CategoryAdminClient from "@/components/author/CategoryAdminClient";
import { getBreakingNews } from "@/features/news/news.api";

export const metadata = { title: "Manage Categories" };

export default async function ManageCategoriesPage() {
  const breakingNews = await getBreakingNews();
  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={["ADMIN"]} roleLabel="an Admin">
          <div className="max-w-full mx-auto px-4 md:px-16 py-10">
            <h1 className="font-display-lg text-3xl text-primary mb-2">Manage Categories</h1>
            <p className="font-body-md text-on-surface-variant mb-8">
              Add categories for article and blog forms, open their public pages, or remove them from future use.
            </p>
            <CategoryAdminClient />
          </div>
        </RequireContributorRole>
      </main>
      <Footer />
    </>
  );
}
