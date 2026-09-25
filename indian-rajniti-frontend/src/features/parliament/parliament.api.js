/**
 * Fake Parliament API (Lok Sabha / Rajya Sabha) — demo data standing in for
 * a future backend endpoint. Shaped so the two houses can be rendered
 * through the same detail view as /category/[slug] (see
 * components/category/CategoryDetailView.jsx), plus a lightweight summary
 * for the home page and sidebar widgets.
 */
import { allTeasers, getElectionResults, getPageProfiles } from "@/features/news/news.api";
import { getKeyFigures, findFigureByName } from "@/features/politicians/politician.api";
import { createJsonResource } from "@/lib/jsonResource";
import { DEFAULT_PAGE_PROFILES } from "@/features/events/pageProfiles";
import { mediaUrl } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const readParliamentResource = createJsonResource(`${API_BASE_URL}/parliament`, {
  ttl: 0,
  fetchOptions: { cache: "no-store" },
});

const LOK_SABHA_STATE_SEATS = [
  ["Andhra Pradesh", 25], ["Arunachal Pradesh", 2], ["Assam", 14], ["Bihar", 40],
  ["Chhattisgarh", 11], ["Goa", 2], ["Gujarat", 26], ["Haryana", 10],
  ["Himachal Pradesh", 4], ["Jharkhand", 14], ["Karnataka", 28], ["Kerala", 20],
  ["Madhya Pradesh", 29], ["Maharashtra", 48], ["Manipur", 2], ["Meghalaya", 2],
  ["Mizoram", 1], ["Nagaland", 1], ["Odisha", 21], ["Punjab", 13],
  ["Rajasthan", 25], ["Sikkim", 1], ["Tamil Nadu", 39], ["Telangana", 17],
  ["Tripura", 2], ["Uttar Pradesh", 80], ["Uttarakhand", 5], ["West Bengal", 42],
].map(([name, seats]) => ({ name, seats }));

const LOK_SABHA_UT_SEATS = [
  ["Andaman and Nicobar Islands", 1], ["Chandigarh", 1],
  ["Dadra and Nagar Haveli and Daman and Diu", 2], ["NCT of Delhi", 7],
  ["Jammu and Kashmir", 5], ["Ladakh", 1], ["Lakshadweep", 1], ["Puducherry", 1],
].map(([name, seats]) => ({ name, seats }));

const RAJYA_SABHA_STATE_SEATS = [
  ["Andhra Pradesh", 11], ["Arunachal Pradesh", 1], ["Assam", 7], ["Bihar", 16],
  ["Chhattisgarh", 5], ["Goa", 1], ["Gujarat", 11], ["Haryana", 5],
  ["Himachal Pradesh", 3], ["Jharkhand", 6], ["Karnataka", 12], ["Kerala", 9],
  ["Madhya Pradesh", 11], ["Maharashtra", 19], ["Manipur", 1], ["Meghalaya", 1],
  ["Mizoram", 1], ["Nagaland", 1], ["Odisha", 10], ["Punjab", 7],
  ["Rajasthan", 10], ["Sikkim", 1], ["Tamil Nadu", 18], ["Telangana", 7],
  ["Tripura", 1], ["Uttar Pradesh", 31], ["Uttarakhand", 3], ["West Bengal", 16],
].map(([name, seats]) => ({ name, seats }));

const RAJYA_SABHA_UT_SEATS = [
  ["NCT of Delhi", 3], ["Jammu and Kashmir", 4], ["Puducherry", 1],
].map(([name, seats]) => ({ name, seats }));

const PARLIAMENTARY_PRIVILEGES = [
  {
    title: "Freedom of speech in Parliament",
    description:
      "Article 105 protects freedom of speech in Parliament, subject to the Constitution and the rules and standing orders of the House.",
  },
  {
    title: "Immunity for speeches and votes",
    description:
      "A member cannot be made liable in court for anything said or any vote given in the House or one of its committees.",
  },
  {
    title: "Protection for authorised publications",
    description:
      "Court proceedings do not lie for publishing reports, papers, votes or proceedings under the authority of either House.",
  },
  {
    title: "Protection of parliamentary proceedings",
    description:
      "Each House can protect its proceedings and deal with a breach of privilege or contempt through its established parliamentary procedure.",
  },
  {
    title: "Limited protection from civil arrest",
    description:
      "Members have procedural protection from arrest in civil cases during a session and for the prescribed period around it. This is not immunity from ordinary criminal law.",
  },
];

const LOK_SABHA = {
  key: "loksabha",
  href: "/loksabha",
  label: "Lok Sabha",
  fullName: "House of the People",
  totalSeats: 543,
  stateSeatAllocation: LOK_SABHA_STATE_SEATS,
  unionTerritorySeatAllocation: LOK_SABHA_UT_SEATS,
  nominatedSeats: 0,
  privileges: PARLIAMENTARY_PRIVILEGES,
  formed: "1952 (first Lok Sabha constituted)",
  currentTerm: "18th Lok Sabha, in session since June 2024",
  presidingOfficer: { name: "Om Birla", role: "Speaker, Lok Sabha", party: "BJP" },
  deputyPresidingOfficer: { name: "Vacant", role: "Deputy Speaker" },
  leaderOfHouse: { name: "Narendra Modi", role: "Prime Minister & Leader of the House", party: "BJP" },
  leaderOfOpposition: { name: "Rahul Gandhi", role: "Leader of Opposition, Lok Sabha", party: "INC" },
  composition: [
    { party: "BJP", seats: 240, colorClass: "bg-primary" },
    { party: "INC", seats: 99, colorClass: "bg-secondary" },
    { party: "SP", seats: 37, colorClass: "bg-surface-tint" },
    { party: "TMC", seats: 29, colorClass: "bg-error" },
    { party: "DMK", seats: 22, colorClass: "bg-green-600" },
    { party: "JD(U)", seats: 12, colorClass: "bg-amber-500" },
    { party: "Shiv Sena", seats: 7, colorClass: "bg-orange-500" },
    { party: "Others / Independents", seats: 97, colorClass: "bg-outline-variant" },
  ],
  history:
    "The Lok Sabha is the directly elected lower house of India's Parliament, with members representing single-member territorial constituencies apportioned across all states and union territories. Its first sitting was held in 1952, and it has since been the primary arena for the formation and survival of the Union government.",
  achievements:
    "The government is formed by whichever party or coalition commands a majority in the House, making the Lok Sabha the decisive chamber for confidence votes, the Union Budget's Money Bills, and most major legislation.",
  relatedSlugs: [
    "tax-reforms-debate-parliament",
    "explainer-how-a-bill-becomes-law",
    "explainer-no-confidence-motion",
    "deep-dive-delimitation-debate",
  ],
};

const RAJYA_SABHA = {
  key: "rajyasabha",
  href: "/rajyasabha",
  label: "Rajya Sabha",
  fullName: "Council of States",
  totalSeats: 245,
  stateSeatAllocation: RAJYA_SABHA_STATE_SEATS,
  unionTerritorySeatAllocation: RAJYA_SABHA_UT_SEATS,
  nominatedSeats: 12,
  privileges: PARLIAMENTARY_PRIVILEGES,
  formed: "1952 (first constituted)",
  currentTerm: "Permanent house — one-third of members retire every two years",
  presidingOfficer: { name: "Jagdeep Dhankhar", role: "Chairman, Rajya Sabha (ex-officio Vice President)", party: "Non-partisan" },
  deputyPresidingOfficer: { name: "Harivansh Narayan Singh", role: "Deputy Chairman", party: "JD(U)" },
  leaderOfHouse: { name: "J. P. Nadda", role: "Leader of the House, Rajya Sabha", party: "BJP", photo: "https://images.indianexpress.com/2021/04/nadda1-1.jpg?w=1024" },
  leaderOfOpposition: { name: "Mallikarjun Kharge", role: "Leader of Opposition, Rajya Sabha", party: "INC", photo: "https://res.cloudinary.com/dkplc2mbj/image/upload/v1668748045/small_Mallikarjun_Kharge_dc71c21baf_b792f99382_copy_e11f8f47be.jpg" },
  composition: [
    { party: "BJP", seats: 96, colorClass: "bg-primary" },
    { party: "INC", seats: 27, colorClass: "bg-secondary" },
    { party: "TMC", seats: 13, colorClass: "bg-error" },
    { party: "DMK", seats: 10, colorClass: "bg-green-600" },
    { party: "AAP", seats: 10, colorClass: "bg-amber-500" },
    { party: "BJD", seats: 7, colorClass: "bg-orange-500" },
    { party: "Nominated", seats: 6, colorClass: "bg-outline" },
    { party: "Others / Independents", seats: 76, colorClass: "bg-outline-variant" },
  ],
  history:
    "The Rajya Sabha is Parliament's permanent upper house, meant to represent the states and give continuity to the legislative process since it is never fully dissolved. Members are elected by state legislative assemblies, with a small number nominated for their expertise in fields like literature, science, and the arts.",
  achievements:
    "As a revising chamber, the Rajya Sabha has been central to referring contentious bills to Select Committees for deeper scrutiny, and its ex-officio Chairman — the Vice President of India — presides in a constitutionally non-partisan capacity.",
  relatedSlugs: [
    "tax-reforms-debate-parliament",
    "deep-dive-anti-defection-law",
    "opinion-federalism-under-strain",
    "opinion-judicial-appointments-debate",
  ],
};

const GENERAL_ELECTION = {
  label: "Elections",
  chiefElectionCommissioner: "Rajiv Kumar",
  lastGeneralElection: "18th Lok Sabha General Election, 2024",
  phases: 7,
  turnout: "66.1%",
  nextDue: "2029, unless the Lok Sabha is dissolved earlier",
  rulingCoalition: { name: "National Democratic Alliance (NDA)", seats: 293 },
  oppositionCoalition: { name: "INDIA Bloc", seats: 234 },
  history:
    "The Election Commission of India, an independent constitutional body, conducts general elections to the Lok Sabha and state assemblies, along with elections to the offices of President and Vice President. The 2024 general election was held in seven phases between April and June.",
  achievements:
    "With over 960 million eligible voters, India's general election is the largest democratic exercise in the world. The Model Code of Conduct, enforced by the Commission from the announcement of polls, governs campaign conduct for all contesting parties through to the result.",
  relatedSlugs: ["election-commission-revises-poll-dates", "opposition-parties-new-coalition-block"],
};

const HOUSES = { loksabha: LOK_SABHA, rajyasabha: RAJYA_SABHA };
export const DEFAULT_PARLIAMENT = HOUSES;

export function mergeParliament(parliament) {
  return {
    loksabha: { ...LOK_SABHA, ...(parliament?.loksabha || {}) },
    rajyasabha: { ...RAJYA_SABHA, ...(parliament?.rajyasabha || {}) },
  };
}

async function getHouses() {
  try {
    const { parliament } = await readParliamentResource();
    return parliament && typeof parliament === "object" ? mergeParliament(parliament) : HOUSES;
  } catch {
    return HOUSES;
  }
}

function majorityBloc(composition) {
  return [...composition].sort((a, b) => b.seats - a.seats)[0];
}

export async function getParliamentSummary() {
  const houses = await getHouses();
  return [houses.loksabha, houses.rajyasabha].map((house) => {
    const leading = majorityBloc(house.composition);
    return {
      key: house.key,
      href: house.href,
      label: house.label,
      totalSeats: house.totalSeats,
      presidingOfficer: house.presidingOfficer,
      leadingParty: leading.party,
      leadingSeats: leading.seats,
    };
  });
}

export async function getHouseInfo(house) {
  const houses = await getHouses();
  const data = houses[house];
  if (!data) return null;

  const allPosts = await allTeasers();
  const relatedNews = allPosts.filter((story) => data.relatedSlugs.includes(story.slug));
  const relatedSlugSet = new Set(relatedNews.map((story) => story.slug));
  const recommendedNews = allPosts
    .filter((story) => story.slug && !relatedSlugSet.has(story.slug))
    .slice(0, 4);

  const keyFigures = await getKeyFigures();
  const leaderOfHouseMatch = findFigureByName(keyFigures, data.leaderOfHouse.name);
  const leaderOfOppositionMatch = findFigureByName(keyFigures, data.leaderOfOpposition.name);
  const savedLeaderPhoto = mediaUrl(data.leaderOfHouse.photo);
  const savedOppositionPhoto = mediaUrl(data.leaderOfOpposition.photo);

  return {
    label: data.label,
    type: "house",
    description: `The ${data.label} (${data.fullName}) is one of the two houses of the Indian Parliament, currently comprising ${data.totalSeats} seats. Track its leadership, party composition, and the latest legislative developments.`,
    current: {
      name: data.leaderOfHouse.name,
      role: data.leaderOfHouse.role,
      icon: "fa-solid fa-user-tie",
      photo: savedLeaderPhoto || leaderOfHouseMatch?.photo,
      photoFallback: savedLeaderPhoto ? (leaderOfHouseMatch?.photo || leaderOfHouseMatch?.photoFallback) : leaderOfHouseMatch?.photoFallback,
    },
    opposition: {
      name: data.leaderOfOpposition.name,
      role: data.leaderOfOpposition.role,
      icon: "fa-solid fa-user-tie",
      photo: savedOppositionPhoto || leaderOfOppositionMatch?.photo,
      photoFallback: savedOppositionPhoto ? (leaderOfOppositionMatch?.photo || leaderOfOppositionMatch?.photoFallback) : leaderOfOppositionMatch?.photoFallback,
    },
    currentLabel: "Leader of the House",
    oppositionLabel: "Leader of Opposition",
    bio: [data.history, data.achievements],
    facts: [
      { icon: "fa-solid fa-chair", label: `${data.totalSeats} total seats` },
      { icon: "fa-solid fa-landmark", label: data.currentTerm },
      { icon: "fa-solid fa-gavel", label: `${data.presidingOfficer.role}: ${data.presidingOfficer.name}` },
      { icon: "fa-solid fa-user-tie", label: `${data.deputyPresidingOfficer.role}: ${data.deputyPresidingOfficer.name}` },
    ],
    composition: data.composition,
    stateSeatAllocation: data.stateSeatAllocation || [],
    unionTerritorySeatAllocation: data.unionTerritorySeatAllocation || [],
    nominatedSeats: Number(data.nominatedSeats) || 0,
    privileges: Array.isArray(data.privileges) ? data.privileges : [],
    relatedNews,
    recommendedNews,
  };
}

export async function getElectionInfo() {
  const [, profiles] = await Promise.all([getElectionResults(), getPageProfiles()]);
  const saved = profiles?.elections || {};
  const page = { ...DEFAULT_PAGE_PROFILES.elections, ...saved, current: { ...DEFAULT_PAGE_PROFILES.elections.current, ...saved.current }, opposition: { ...DEFAULT_PAGE_PROFILES.elections.opposition, ...saved.opposition } };
  const allPosts = await allTeasers();
  const relatedNews = allPosts.filter((story) => GENERAL_ELECTION.relatedSlugs.includes(story.slug) || String(story.category || story.tag || "").toLowerCase().includes("election"));
  const relatedSlugSet = new Set(relatedNews.map((story) => story.slug));
  const recommendedNews = allPosts
    .filter((story) => story.slug && !relatedSlugSet.has(story.slug))
    .slice(0, 4);

  return {
    label: GENERAL_ELECTION.label,
    type: "election",
    description: page.description,
    current: { ...page.current, icon: "fa-solid fa-people-group", photo: mediaUrl(page.current.photo) },
    opposition: { ...page.opposition, icon: "fa-solid fa-people-group", photo: mediaUrl(page.opposition.photo) },
    currentLabel: page.currentLabel,
    oppositionLabel: page.oppositionLabel,
    bio: page.bio,
    facts: page.facts.map((label) => ({ icon: "fa-solid fa-box-ballot", label })),
    composition: LOK_SABHA.composition,
    relatedNews,
    recommendedNews,
  };
}
