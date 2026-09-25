import RequireContributorRole from "@/components/author/RequireContributorRole";
import WalletAdminClient from "@/components/author/WalletAdminClient";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Wallet & Points" };

export default async function WalletAdminPage() {
  return (
    <>
      <main className="w-full flex-grow bg-background">
        <RequireContributorRole
          permissions={[PERMISSIONS.MANAGE_WALLETS, PERMISSIONS.MANAGE_POINT_RATES]}
          roleLabel="a wallet administrator"
        >
          <WalletAdminClient />
        </RequireContributorRole>
      </main>
    </>
  );
}
