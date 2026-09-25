import RequireContributorRole from "@/components/author/RequireContributorRole";
import ContentHistoryClient from "@/components/author/ContentHistoryClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Content History" };

export default async function ContentHistoryPage() {

  return (
    <>
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={["AUTHOR", "EDITOR", "ADMIN", "INVESTOR"]} permissions={[PERMISSIONS.CONTENT_HISTORY]}>
          <ContentHistoryClient />
        </RequireContributorRole>
      </main>
    </>
  );
}
