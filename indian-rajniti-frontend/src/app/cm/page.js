import CategoryPageShell from "@/components/category/CategoryPageShell";
import CMCard from "@/components/politician/CMCard";
import { getChiefMinisters } from "@/features/politicians/politician.api";
import { slugify } from "@/lib/slugify";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ title: "Chief Ministers of India", description: "View current chief ministers and state leadership across India, with party affiliations and political profiles.", path: "/cm" });

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
          photoFallback={cm.photoFallback}
          href={`/category/${slugify(cm.name)}`}
        />
      ))}
    </CategoryPageShell>
  );
}
