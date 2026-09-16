import CategoryPageShell from "@/components/category/CategoryPageShell";
import CMCard from "@/components/politician/CMCard";
import { getFormerPMs } from "@/features/politicians/politician.api";
import { slugify } from "@/lib/slugify";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ title: "Former Prime Ministers of India", description: "Explore the tenures, political careers, and legacies of India's former prime ministers.", path: "/former-prime-ministers" });

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
