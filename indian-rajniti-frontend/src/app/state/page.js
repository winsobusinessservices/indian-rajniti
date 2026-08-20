import CategoryPageShell from "@/components/category/CategoryPageShell";
import CMCard from "@/components/politician/CMCard";
import { getChiefMinisters } from "@/features/politicians/politician.api";
import { slugify } from "@/lib/slugify";

export const metadata = { title: "States" };

export default async function StatesPage() {
  const chiefMinisters = await getChiefMinisters();

  return (
    <CategoryPageShell title="States" count={chiefMinisters.length}>
      {chiefMinisters.map((cm) => (
        <CMCard
          key={cm.id}
          name={cm.state}
          subtitle={`Chief Minister: ${cm.name}`}
          photo={cm.photo}
          href={`/category/${slugify(cm.state)}`}
        />
      ))}
    </CategoryPageShell>
  );
}
