import RequireContributorRole from "@/components/author/RequireContributorRole";
import ContentLimitsAdminClient from "@/components/author/ContentLimitsAdminClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Posting Limits" };

export default async function PostingLimitsPage() {
  return (
    <>
      <main className="w-full flex-grow bg-background">
        <RequireContributorRole permissions={[PERMISSIONS.MANAGE_POSTING_LIMITS]} roleLabel="a posting-limit administrator">
          <div className="mx-auto max-w-full px-4 py-10 md:px-16">
            <h1 className="font-display-lg text-3xl text-primary">Daily Posting Limits</h1>
            <p className="mb-8 mt-2 font-body-md text-on-surface-variant">Set separate article, blog, and video creation limits for Authors and Editors.</p>
            <ContentLimitsAdminClient />
          </div>
        </RequireContributorRole>
      </main>
    </>
  );
}

