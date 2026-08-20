import CategoryPageShell from "@/components/category/CategoryPageShell";
import PoliticianCard from "@/components/politician/PoliticianCard";
import { getKeyFigures } from "@/features/politicians/politician.api";
import { slugify } from "@/lib/slugify";

export const metadata = { title: "Key Political Figures" };

export default async function KeyPoliticalFiguresPage() {
  const keyFigures = await getKeyFigures();

  return (
    <CategoryPageShell title="Key Political Figures" count={keyFigures.length}>
      {keyFigures.map((figure) => (
        <PoliticianCard
          key={figure.id}
          name={figure.name}
          subtitle={figure.position}
          photo={figure.photo}
          href={`/category/${slugify(figure.name)}`}
        />
      ))}
    </CategoryPageShell>
  );
}
