import CategoryPageShell from "@/components/category/CategoryPageShell";
import CMCard from "@/components/politician/CMCard";
import { getChiefMinisters } from "@/features/politicians/politician.api";
import { getAllStatesAndUTs } from "@/features/geography/geography.api";

export const metadata = { title: "States" };

export default async function StatesPage() {
  const [places, chiefMinisters] = await Promise.all([
    getAllStatesAndUTs(),
    getChiefMinisters(),
  ]);

  const chiefMinisterByState = new Map(
    chiefMinisters.map((cm) => [cm.state.toLowerCase(), cm]),
  );

  return (
    <CategoryPageShell title="States & Union Territories" count={places.length}>
      {places.map((place) => {
        const cm = chiefMinisterByState.get(place.name.toLowerCase());
        const details = [
          cm || place.currentCmName ? `Chief Minister: ${cm?.name || place.currentCmName}` : place.kind === "UNION_TERRITORY" ? "Union Territory" : null,
          place.capital ? `Capital: ${place.capital}` : null,
        ].filter(Boolean).join(" · ");

        return (
        <CMCard
          key={place.id || place.slug}
          name={place.name}
          subtitle={details || "View political profile"}
          photo={place.image || cm?.photo}
          photoFallback={cm?.photoFallback}
          href={`/category/${place.slug}`}
        />
        );
      })}
    </CategoryPageShell>
  );
}
