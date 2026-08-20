import CategoryPageShell from "@/components/category/CategoryPageShell";
import CMCard from "@/components/politician/CMCard";
import { getChiefMinisters } from "@/features/politicians/politician.api";
import { slugify } from "@/lib/slugify";

export const metadata = { title: "State Leadership — Chief Ministers" };

export default async function ChiefMinistersPage() {
  const chiefMinisters = await getChiefMinisters();

  return (
    <CategoryPageShell title="State Leadership" count={chiefMinisters.length}>
      {chiefMinisters.map((cm) => (
        <CMCard
          key={cm.id}
          name={cm.name}
          subtitle={`Chief Minister, ${cm.state}`}
          photo={cm.photo}
          href={`/category/${slugify(cm.name)}`}
        />
      ))}
    </CategoryPageShell>
  );
}
