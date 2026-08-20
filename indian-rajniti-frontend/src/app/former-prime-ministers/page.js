import CategoryPageShell from "@/components/category/CategoryPageShell";
import CMCard from "@/components/politician/CMCard";
import { getFormerPMs } from "@/features/politicians/politician.api";
import { slugify } from "@/lib/slugify";

export const metadata = { title: "Former Prime Ministers" };

export default async function FormerPrimeMinistersPage() {
  const formerPMs = await getFormerPMs();

  return (
    <CategoryPageShell title="Former Prime Ministers" count={formerPMs.length}>
      {formerPMs.map((pm) => (
        <CMCard key={pm.id} name={pm.name} subtitle={pm.tenure} photo={pm.photo} href={`/category/${slugify(pm.name)}`} />
      ))}
    </CategoryPageShell>
  );
}
