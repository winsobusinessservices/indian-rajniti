import RequireContributorRole from "@/components/author/RequireContributorRole";
import WebsiteSettingsClient from "@/components/author/WebsiteSettingsClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Website Settings" };

export default async function WebsiteSettingsPage() {
  return (
    <>
      <main className="w-full flex-grow bg-background">
        <RequireContributorRole permissions={[PERMISSIONS.MANAGE_SITE_MANAGEMENT]} roleLabel="a site manager">
          <div className="mx-auto max-w-5xl px-4 py-10 md:px-10">
            <h1 className="font-display-lg text-3xl text-primary">Website Settings</h1>
            <p className="mb-8 mt-2 text-on-surface-variant">Update the Indian Rajneeti name, logo, browser icon, theme colours, and public brand details.</p>
            <WebsiteSettingsClient />
          </div>
        </RequireContributorRole>
      </main>
    </>
  );
}
