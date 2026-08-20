import CategoryPageShell from "@/components/category/CategoryPageShell";
import PartyCard from "@/components/politician/PartyCard";
import { getParties } from "@/features/politicians/politician.api";
import {slugify} from "@/lib/slugify";

export const metadata = { title: "Political Parties" };

export default async function PartiesPage() {
  const parties = await getParties();

  return (
    <CategoryPageShell title="Political Parties" count={parties.length}>
      {parties.map((party) => (
        <PartyCard key={party.id} name={party.name} abbreviation={party.abbreviation} founded={party.founded} photo={party.photo} href={`/category/${slugify(party.name)}`} />
      ))}
    </CategoryPageShell>
  );
}
