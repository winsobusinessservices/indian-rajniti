import { createJsonResource } from "@/lib/jsonResource";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const readGeographyResource = createJsonResource(`${API_BASE_URL}/states`, {
  ttl: 300_000,
  fetchOptions: { next: { revalidate: 300 } },
});

async function getGeographyData() {
  const { states } = await readGeographyResource();
  return states;
}

function toPlace(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    capital: row.capital,
    kind: row.kind,
    formed: row.formed,
    history: row.history,
    achievements: row.achievements,
  };
}

export async function getStates() {
  return (await getGeographyData()).filter((row) => row.kind === "STATE").map(toPlace);
}

export async function getUnionTerritories() {
  return (await getGeographyData()).filter((row) => row.kind === "UNION_TERRITORY").map(toPlace);
}

export async function getAllStatesAndUTs() {
  return (await getGeographyData()).map(toPlace);
}

export async function getStateProfile(stateName) {
  const state = (await getGeographyData()).find((row) => row.name.toLowerCase() === stateName.toLowerCase());
  return state ? toPlace(state) : null;
}
