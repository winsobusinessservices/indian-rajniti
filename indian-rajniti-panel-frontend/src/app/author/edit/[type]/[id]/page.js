import { Suspense } from "react";
import RequireContributorRole from "@/components/author/RequireContributorRole";
import EditPostClient from "@/components/author/EditPostClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Edit Post" };

export default async function EditPostPage({ params }) {
  const { type, id } = await params;

  return (
    <>
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={["AUTHOR", "EDITOR", "ADMIN", "INVESTOR"]} permissions={[PERMISSIONS.MY_CONTENT]}>
          <Suspense fallback={null}>
            <EditPostClient type={type.toUpperCase()} id={id} />
          </Suspense>
        </RequireContributorRole>
      </main>
    </>
  );
}
