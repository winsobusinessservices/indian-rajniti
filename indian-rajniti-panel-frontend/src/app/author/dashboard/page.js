import RequireContributorRole from "@/components/author/RequireContributorRole";
import AuthorDashboardClient from "@/components/author/AuthorDashboardClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Author Dashboard" };

export default async function AuthorDashboardPage() {

  return (
    <>
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={["AUTHOR", "EDITOR", "ADMIN", "SUBADMIN", "INVESTOR"]} permissions={[PERMISSIONS.DASHBOARD]}>
          <AuthorDashboardClient />
        </RequireContributorRole>
      </main>
    </>
  );
}
