import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RequireContributorRole from "@/components/author/RequireContributorRole";
import PolicyAdminClient from "@/components/author/PolicyAdminClient";
import { getBreakingNews } from "@/features/news/news.api";

export const metadata = { title: "Manage Policies" };

export default async function ManagePoliciesPage() {
  const breakingNews = await getBreakingNews();
  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />
      <main className="w-full flex-grow bg-background">
        <RequireContributorRole roles={["ADMIN"]} roleLabel="an administrator">
          <div className="mx-auto max-w-[1500px] px-4 py-10 md:px-16">
            <h1 className="font-display-lg text-3xl text-primary">Manage Policies</h1>
            <p className="mb-8 mt-2 font-body-md text-on-surface-variant">Create policy analysis, save drafts, and publish completed policies to the public website.</p>
            <PolicyAdminClient />
          </div>
        </RequireContributorRole>
      </main>
      <Footer />
    </>
  );
}
