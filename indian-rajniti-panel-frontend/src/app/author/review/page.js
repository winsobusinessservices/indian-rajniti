import RequireContributorRole from "@/components/author/RequireContributorRole";
import ReviewQueueClient from "@/components/author/ReviewQueueClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Review Queue" };

export default async function ReviewQueuePage() {

  return (
    <>
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={["AUTHOR", "EDITOR", "ADMIN", "INVESTOR"]} permissions={[PERMISSIONS.REVIEW_CONTENT]}>
          <ReviewQueueClient />
        </RequireContributorRole>
      </main>
    </>
  );
}
