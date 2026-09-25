import RequireContributorRole from "@/components/author/RequireContributorRole";
import WalletClient from "@/components/author/WalletClient";

export const metadata = { title: "Wallet" };

export default async function WalletPage() {

  return (
    <>
      <main className="w-full flex-grow bg-background">
        <RequireContributorRole roles={["AUTHOR", "EDITOR"]} roleLabel="an author or editor">
          <WalletClient />
        </RequireContributorRole>
      </main>
    </>
  );
}
