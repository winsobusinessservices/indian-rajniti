import { Suspense } from "react";
import RequireContributorRole from "@/components/author/RequireContributorRole";
import ViewPostClient from "@/components/author/ViewPostClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "View Post" };

export default async function ViewPostPage({ params }) {
  const { type, id } = await params;

  return (
    <>
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={["AUTHOR", "EDITOR", "ADMIN", "INVESTOR"]} permissions={[PERMISSIONS.MY_CONTENT, PERMISSIONS.REVIEW_CONTENT, PERMISSIONS.CONTENT_HISTORY]}>
          <Suspense fallback={null}>
            <ViewPostClient type={type.toUpperCase()} id={id} />
          </Suspense>
        </RequireContributorRole>
      </main>
    </>
  );
}
