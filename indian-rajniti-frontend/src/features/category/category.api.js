import { slugify } from "@/lib/slugify";
import { allTeasers, getAllCategoryLabels } from "@/features/news/news.api";
import {
  getChiefMinisters,
  getParties,
  getFormerPMs,
  getKeyFigures,
  getStateProfile,
} from "@/features/politicians/politician.api";
import { getAllStatesAndUTs } from "@/features/geography/geography.api";

// Fallback figures used whenever a page needs to show "the PM" or "the
// Leader of Opposition" without a more specific match (party counterpart,
// key-figure's rival, etc). Built from the real keyFigures data (by role,
// not a hardcoded name) so they carry a real photo and stay correct if
// either office changes hands — rather than two static name/role strings
// with no photo field, which is what previously left these cards blank.
function findNationalFigure(keyFigures, roleKeyword, fallbackName) {
  const match = keyFigures.find((figure) => figure.position?.toLowerCase().includes(roleKeyword));
  if (match) {
    return { name: match.name, role: `${match.position} — ${match.party}`, icon: "fa-solid fa-user-tie", photo: match.photo };
  }
  return { name: fallbackName, role: roleKeyword, icon: "fa-solid fa-user-tie" };
}

async function buildRegistry() {
  const [labels, chiefMinisters, parties, formerPMs, keyFigures, statesAndUTs] = await Promise.all([
    getAllCategoryLabels(),
    getChiefMinisters(),
    getParties(),
    getFormerPMs(),
    getKeyFigures(),
    getAllStatesAndUTs(),
  ]);

  const NATIONAL_RULING = findNationalFigure(keyFigures, "prime minister", "Prime Minister");
  const NATIONAL_OPPOSITION = findNationalFigure(keyFigures, "leader of the opposition", "Leader of the Opposition");

  const registry = new Map();
  const add = (label, type, data) => {
    if (!label) return;
    const slug = slugify(label);
    if (!registry.has(slug)) registry.set(slug, { label, type, data });
  };

  // Individuals and specific entities are registered first (with their
  // specific type) so generic topic labels never shadow a more specific match.
  chiefMinisters.forEach((cm) => {
    add(cm.state, "state");
    add(cm.name, "politician", { subtype: "cm", ...cm });
  });
  // Every state and union territory gets a page even without a CM profile —
  // getCategoryInfo() just falls back to its generic description for those.
  statesAndUTs.forEach((place) => {
    add(place.name, "state");
    add(`Election in ${place.name}`, "topic");
  });
  formerPMs.forEach((pm) => add(pm.name, "politician", { subtype: "former-pm", ...pm }));
  keyFigures.forEach((figure) => add(figure.name, "politician", { subtype: "key-figure", ...figure }));
  parties.forEach((party) => {
    add(party.abbreviation, "party");
    add(party.name, "party");
  });
  labels.forEach((label) => add(label, "topic"));

  return { registry, chiefMinisters, parties, NATIONAL_RULING, NATIONAL_OPPOSITION };
}

// Flat, search-friendly view of the same registry /category/[slug] resolves
// against — states, parties, politicians, and topics, each with the slug
// that already resolves correctly.
export async function getAllCategoryEntries() {
  const { registry } = await buildRegistry();
  return Array.from(registry.entries()).map(([slug, entry]) => ({
    slug,
    label: entry.label,
    type: entry.type,
  }));
}

export async function getCategoryInfo(slug) {
  const { registry, chiefMinisters, parties, NATIONAL_RULING, NATIONAL_OPPOSITION } = await buildRegistry();
  const entry = registry.get(slug);
  if (!entry) return null;

  const { label, type, data } = entry;

  let current = NATIONAL_RULING;
  let opposition = NATIONAL_OPPOSITION;
  let currentLabel = "Ruling / Current";
  let oppositionLabel = "Opposition";
  let description = `Comprehensive coverage of ${label} — the latest developments, analysis, and updates from across Indian politics.`;
  let bio = null;
  let profile = null;

  if (type === "state") {
    const cm = chiefMinisters.find((c) => c.state.toLowerCase() === label.toLowerCase());
    const stateProfile = await getStateProfile(label);
    if (cm) {
      current = { name: cm.name, role: `Chief Minister, ${cm.state} — ${cm.party}`, icon: "fa-solid fa-user-tie", photo: cm.photo };
      opposition = { name: cm.oppositionParty, role: `Principal Opposition, ${cm.state} Assembly`, icon: "fa-solid fa-people-group" };
      description = `${label} is governed by the ${cm.party}, led by Chief Minister ${cm.name}. Track the latest political developments, policy decisions, and electoral dynamics shaping ${label}.`;

      const yearsAsRuler = cm.since ? new Date().getFullYear() - cm.since : null;
      profile = {
        founded: stateProfile?.formed ?? null,
        history: stateProfile?.history ?? null,
        achievements: stateProfile?.achievements ?? null,
        rulingParty: cm.party,
        oppositionParty: cm.oppositionParty,
        yearsAsRuler,
        rulerSince: cm.since,
      };
    }
  } else if (type === "party") {
    const party = parties.find(
      (p) => p.name.toLowerCase() === label.toLowerCase() || p.abbreviation.toLowerCase() === label.toLowerCase()
    );
    if (party) {
      const isRuling = party.abbreviation === "BJP";
      const counterpart = parties.find((p) => p.abbreviation === (isRuling ? "INC" : "BJP"));
      const partyAsCard = { name: `${party.name} (${party.abbreviation})`, role: isRuling ? "Ruling Party (National)" : "Opposition Party", icon: "fa-solid fa-flag" };
      const counterpartAsCard = counterpart
        ? { name: `${counterpart.name} (${counterpart.abbreviation})`, role: isRuling ? "Principal Opposition" : "Ruling Party (National)", icon: "fa-solid fa-flag" }
        : isRuling
          ? NATIONAL_OPPOSITION
          : NATIONAL_RULING;

      current = isRuling ? partyAsCard : counterpartAsCard;
      opposition = isRuling ? counterpartAsCard : partyAsCard;
      description = `${party.name} (${party.abbreviation}), founded in ${party.founded}, is a major political party in India. Explore its latest activities, statements, and role in the current political landscape.`;

      profile = {
        founded: party.founded,
        foundedPlace: party.foundedPlace,
        founders: party.founders,
        ideology: party.ideology,
        history: party.history,
        achievements: party.achievements,
        yearsInPower: party.yearsInPower,
      };
    }
  } else if (type === "politician") {
    bio = data.bio ?? null;

    if (data.subtype === "cm") {
      current = { name: data.name, role: `Chief Minister, ${data.state} — ${data.party}`, icon: "fa-solid fa-user-tie", photo: data.photo };
      opposition = { name: data.oppositionParty, role: `Principal Opposition, ${data.state} Assembly`, icon: "fa-solid fa-people-group" };
      currentLabel = "Chief Minister";
      oppositionLabel = "Principal Opposition";
      const yearsAsRuler = data.since ? new Date().getFullYear() - data.since : null;
      description = `${data.name} serves as the Chief Minister of ${data.state}, representing the ${data.party}${
        yearsAsRuler ? `, in office since ${data.since} (around ${yearsAsRuler} years)` : ""
      }.`;
    } else if (data.subtype === "former-pm") {
      current = { name: data.name, role: `Former Prime Minister of India (${data.tenure})`, icon: "fa-solid fa-user-tie", photo: data.photo };
      opposition = NATIONAL_RULING;
      currentLabel = "Former Prime Minister";
      oppositionLabel = "Current Prime Minister";
      description = `${data.name} served as the Prime Minister of India (${data.tenure}). Explore their legacy and lasting impact on Indian politics.`;
    } else {
      const isOppositionFigure = data.position.toLowerCase().includes("opposition");
      current = { name: data.name, role: data.position, icon: "fa-solid fa-user-tie", photo: data.photo };
      opposition = isOppositionFigure ? NATIONAL_RULING : NATIONAL_OPPOSITION;
      currentLabel = "Featured Leader";
      oppositionLabel = isOppositionFigure ? "Ruling Counterpart" : "Principal Opposition";
      description = `${data.name} currently serves as ${data.position}. Follow their statements, policy positions, and role in shaping national politics.`;
    }
  }

  const relatedNews = allTeasers()
    .filter((story) => story.category && slugify(story.category) === slug)
    .slice(0, 6);

  const relatedSlugs = new Set(relatedNews.map((story) => story.slug));
  const recommendedNews = allTeasers()
    .filter((story) => story.slug && !relatedSlugs.has(story.slug))
    .slice(0, 4);

  // Personal/education/career-timeline detail only exists for the
  // "politician" type (real biographical data) — undefined for state/party/
  // topic pages, which CategoryDetailView already treats as "nothing to show".
  const isPolitician = type === "politician";

  return {
    label,
    type,
    subtype: data?.subtype ?? null,
    description,
    current,
    opposition,
    currentLabel,
    oppositionLabel,
    bio,
    born: isPolitician ? data.born : null,
    died: isPolitician ? data.died : null,
    birthPlace: isPolitician ? data.birthPlace : null,
    education: isPolitician ? data.education : null,
    careerTimeline: isPolitician ? data.careerTimeline : null,
    profile,
    relatedNews,
    recommendedNews,
  };
}
