/**
 * Politicians & parties API — backed by the backend's GET /politicians and
 * GET /parties (see indian-rajniti-backend/src/controllers/politicians/
 * politicians.controller.js). Real, WebSearch-verified biographical data
 * (education, career timeline, current status) and real photos, not the
 * dummy data this file used to return. Every exported function keeps its
 * original name/shape so no consuming component needed to change.
 */
import { mediaUrl } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function getPoliticiansData() {
  const res = await fetch(`${API_BASE_URL}/politicians`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Failed to load politicians (${res.status})`);
  return res.json();
}

async function getPartiesData() {
  const res = await fetch(`${API_BASE_URL}/parties`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Failed to load parties (${res.status})`);
  return res.json();
}

function toPoliticianShape(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    photo: mediaUrl(row.photo_url),
    born: row.born_year,
    died: row.died_year,
    birthPlace: row.birth_place,
    party: row.party,
    state: row.state,
    currentPosition: row.current_position,
    stillInOffice: !!row.still_in_office,
    education: row.education || [],
    careerTimeline: row.career_timeline || [],
    summary: row.summary,
    bio: row.bio || [],
  };
}

export async function getKeyFigures() {
  const { keyFigures } = await getPoliticiansData();
  return keyFigures.map((row) => ({ ...toPoliticianShape(row), position: row.current_position }));
}

// Looks up a figure by exact name (case-insensitive) among key figures, so
// pages built from data that predates photo wiring (Parliament, Speeches)
// can still surface a real photo when the name matches a seeded key figure.
export function findFigureByName(keyFigures, name) {
  return keyFigures.find((figure) => figure.name.toLowerCase() === name.toLowerCase());
}

export async function getFormerPMs() {
  const { formerPMs } = await getPoliticiansData();
  return formerPMs.map((row) => ({
    ...toPoliticianShape(row),
    tenure: (row.current_position || "").replace(/^Former Prime Minister of India \(|\)$/g, ""),
  }));
}

export async function getChiefMinisters() {
  const { chiefMinisters } = await getPoliticiansData();
  return chiefMinisters.map((row) => ({
    ...toPoliticianShape(row),
    oppositionParty: row.opposition_party,
    since: row.since_year,
  }));
}

// Voices of the Nation / Opinion Leaders remain anonymized "man on the
// street" style quotes, not real named politicians — kept as static
// editorial widgets rather than fake attributed data.
const VOICES_OF_NATION = [
  {
    id: 1,
    quote:
      "The true measure of our progress is not just in economic numbers, but in the empowerment of our most vulnerable citizens.",
    attribution: "Senior Leader, National Address",
  },
  {
    id: 2,
    quote:
      "We must prioritize sustainable development to ensure a thriving future for the next generation, regardless of political affiliations.",
    attribution: "Opposition Spokesperson, Press Meet",
  },
];

const OPINION_LEADERS = [
  { id: 1, quote: "Why the current fiscal policy is a gamble for the middle class." },
  { id: 2, quote: "The silent revolution in rural connectivity and its political cost." },
];

export async function getVoicesOfNation() {
  return VOICES_OF_NATION;
}
export async function getOpinionLeaders() {
  return OPINION_LEADERS;
}

export async function getParties() {
  const { parties } = await getPartiesData();
  return parties.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    abbreviation: row.abbreviation,
    photo: mediaUrl(row.photo_url),
    founded: row.founded_year ? String(row.founded_year) : null,
    foundedPlace: row.founded_place,
    founders: row.founders || [],
    ideology: row.ideology,
    yearsInPower: row.years_in_power,
    history: row.history,
    achievements: row.achievements,
    currentStatus: row.current_status,
  }));
}
