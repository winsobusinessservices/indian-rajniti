import RequireContributorRole from "@/components/author/RequireContributorRole";
import InvestorApplicationsAdminClient from "@/components/author/InvestorApplicationsAdminClient";

export const metadata = { title: "Investor Applications" };

export default async function InvestorApplicationsPage() {
  return (
    <>
      <main className="w-full flex-grow bg-background">
        <RequireContributorRole roles={["ADMIN"]} roleLabel="an administrator">
          <div className="mx-auto w-full px-4 py-10 md:px-10">
            <h1 className="font-display-lg text-3xl text-primary">Investor Applications</h1>
            <p className="mb-8 mt-2 text-on-surface-variant">Review investor details, supporting documents and account requests.</p>
            <InvestorApplicationsAdminClient />
          </div>
        </RequireContributorRole>
      </main>
    </>
  );
}
