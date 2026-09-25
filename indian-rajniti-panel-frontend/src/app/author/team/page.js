import RequireContributorRole from "@/components/author/RequireContributorRole";
import TeamManagementClient from "@/components/author/TeamManagementClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Team Members" };

export default async function CreateTeamMemberPage() {

  return (
    <>
      <main className="w-full bg-background flex-grow">
        <RequireContributorRole roles={["AUTHOR", "EDITOR", "ADMIN", "SUBADMIN", "INVESTOR"]} permissions={[PERMISSIONS.TEAM_MEMBERS]}>
          <div className="max-w-full mx-auto px-4 md:px-16 py-10">
            <h1 className="font-display-lg text-3xl text-primary mb-2">Team Members</h1>
            <p className="font-body-md text-on-surface-variant mb-8">
              Every Author, Editor, Admin, and Investor account, with their role and access — edit a member&apos;s
              details or role, or add a new Author, Editor, or Investor account below.
            </p>
            <TeamManagementClient />
          </div>
        </RequireContributorRole>
      </main>
    </>
  );
}
