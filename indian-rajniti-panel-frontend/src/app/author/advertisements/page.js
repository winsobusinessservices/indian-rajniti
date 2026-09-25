import RequireContributorRole from "@/components/author/RequireContributorRole";
import AdvertisementsAdminClient from "@/components/author/AdvertisementsAdminClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Advertisements" };

export default async function AdvertisementsPage() {
  return (
    <>
      <main className="w-full flex-grow bg-background">
        <RequireContributorRole permissions={[PERMISSIONS.MANAGE_SITE_MANAGEMENT]} roleLabel="a site manager">
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-10">
            <h1 className="font-display-lg text-3xl text-primary">Advertisements</h1>
            <p className="mb-8 mt-2 text-on-surface-variant">Upload posters and choose exactly where and when each advertisement appears on the active website.</p>
            <AdvertisementsAdminClient />
          </div>
        </RequireContributorRole>
      </main>
    </>
  );
}
