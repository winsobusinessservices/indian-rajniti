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

// State formation facts (used by the state category pages) — not
// politician/party data, kept as-is.
const STATE_PROFILES = {
  "Uttar Pradesh": {
    formed: "1950",
    history:
      "Uttar Pradesh was formed in 1950 from the former United Provinces and is India's most populous state, sending the largest single bloc of members to the Lok Sabha of any state.",
    achievements:
      "The state's economy is anchored by agriculture and religious tourism around sites such as Ayodhya and Varanasi, and it has historically produced more Indian Prime Ministers than any other state.",
  },
  "Tamil Nadu": {
    formed: "1969 (as Madras State, renamed Tamil Nadu)",
    history:
      "Tamil Nadu traces its modern form to Madras State at independence, renamed in 1969, and has been shaped by the Dravidian movement's social-justice politics for over half a century.",
    achievements:
      "The state is a major manufacturing and automotive hub centred on Chennai, and consistently ranks among the leaders in human development indicators among large states.",
  },
  Kerala: {
    formed: "1956",
    history:
      "Kerala was formed in 1956 through the States Reorganisation Act, uniting Malayalam-speaking regions previously divided across Travancore, Cochin, and Malabar.",
    achievements:
      "The state has the highest literacy rate in India and strong public health outcomes, often cited as the 'Kerala model' of social development.",
  },
  Bihar: {
    formed: "1950 (Jharkhand carved out in 2000)",
    history:
      "One of India's original states at independence, Bihar was significantly reshaped in 2000 when its southern, mineral-rich region was carved out to form Jharkhand.",
    achievements:
      "Despite economic challenges, the state has a rich political history and remains a bellwether for caste-based coalition politics in national elections.",
  },
  Punjab: {
    formed: "1966",
    history:
      "Punjab was reorganized in 1966 along linguistic lines, with Haryana and parts of Himachal Pradesh separated from the original post-independence state.",
    achievements:
      "The state was the heartland of India's Green Revolution in the 1960s and 70s and remains one of the country's largest producers of wheat and rice.",
  },
  Maharashtra: {
    formed: "1960",
    history:
      "Maharashtra was formed in 1960 when the bilingual Bombay State was split along linguistic lines into Maharashtra and Gujarat.",
    achievements:
      "Home to Mumbai, India's financial capital, Maharashtra has the largest state economy by GDP and is a major hub for finance, entertainment, and manufacturing.",
  },
  Karnataka: {
    formed: "1956 (as Mysore State, renamed Karnataka in 1973)",
    history:
      "Formed in 1956 as Mysore State and renamed Karnataka in 1973, the state unified Kannada-speaking regions previously split across multiple princely states and provinces.",
    achievements:
      "Bengaluru's emergence as India's leading information-technology hub has made Karnataka a major contributor to the country's software and startup economy.",
  },
  Telangana: {
    formed: "2014",
    history:
      "Telangana is India's newest major state, carved out of Andhra Pradesh in 2014 after a decades-long statehood movement centred on regional economic and cultural grievances.",
    achievements:
      "Hyderabad, its capital, has grown into a major IT and pharmaceutical hub, helping the young state build a fast-growing services economy.",
  },
  "Madhya Pradesh": {
    formed: "1956",
    history:
      "Madhya Pradesh was reorganized into its current form in 1956 under the States Reorganisation Act, consolidating central Indian princely states and provinces.",
    achievements:
      "The state has a large tribal population and significant mineral resources, and has developed religious-tourism circuits around sites including Khajuraho and Ujjain.",
  },
  Rajasthan: {
    formed: "1956 (final reorganization; initially unified in 1949)",
    history:
      "Rajasthan was formed through the gradual integration of numerous princely states beginning in 1949, reaching its present boundaries in 1956.",
    achievements:
      "India's largest state by area, Rajasthan has become a leader in solar and wind power generation while remaining a major international tourism destination.",
  },
  Gujarat: {
    formed: "1960",
    history:
      "Gujarat was formed in 1960 on the same day as Maharashtra, when the bilingual Bombay State was split along linguistic lines.",
    achievements:
      "The state has built one of India's strongest industrial and port-led economies, anchored by petrochemicals, textiles, and the Kandla and Mundra ports.",
  },
  Assam: {
    formed: "1950s (multiple states later carved from its territory)",
    history:
      "Assam was one of India's original states at independence, though its territory has since been substantially reduced as Nagaland, Meghalaya, Mizoram, and Arunachal Pradesh were carved out over subsequent decades.",
    achievements:
      "The state produces a majority of India's tea and holds significant oil reserves, and serves as the primary gateway connecting the rest of India to the Northeast.",
  },
};

export async function getStateProfile(stateName) {
  return STATE_PROFILES[stateName] ?? null;
}
