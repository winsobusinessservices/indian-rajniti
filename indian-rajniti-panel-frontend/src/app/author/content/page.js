import RequireContributorRole from "@/components/author/RequireContributorRole";
import MyPostsClient from "@/components/author/MyPostsClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "My Content" };

export default async function AuthorContentPage() {

  return (
    <>
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={["AUTHOR", "EDITOR", "ADMIN", "INVESTOR"]} permissions={[PERMISSIONS.MY_CONTENT]}>
          <MyPostsClient />
        </RequireContributorRole>
      </main>
    </>
  );
}
