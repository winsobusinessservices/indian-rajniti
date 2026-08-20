/**
 * Speeches and Rallies detail info — built on top of the SPEECHES/RALLIES
 * teaser lists in news.api.js (so every card here is a real /news/[slug]
 * page), shaped for the same CategoryDetailView used by /category/[slug]
 * and the Lok Sabha / Rajya Sabha / Elections pages.
 */
import { allTeasers, getSpeeches, getRallies } from "@/features/news/news.api";
import { getKeyFigures, findFigureByName } from "@/features/politicians/politician.api";

export async function getSpeechesInfo() {
  const relatedNews = await getSpeeches();
  const relatedSlugSet = new Set(relatedNews.map((story) => story.slug));
  const recommendedNews = allTeasers()
    .filter((story) => story.slug && !relatedSlugSet.has(story.slug))
    .slice(0, 4);

  const keyFigures = await getKeyFigures();
  const modi = findFigureByName(keyFigures, "Narendra Modi");
  const rahulGandhi = findFigureByName(keyFigures, "Rahul Gandhi");

  return {
    label: "Speeches",
    type: "speech",
    description:
      "From Independence Day addresses to budget speeches and floor replies during no-confidence debates, speeches remain one of the most closely tracked forms of political communication in India. Explore recent addresses from government and opposition leaders alike.",
    current: { name: "Narendra Modi", role: "Prime Minister — most frequently cited national addresses", icon: "fa-solid fa-user-tie", photo: modi?.photo },
    opposition: { name: "Rahul Gandhi", role: "Leader of Opposition — frequent floor speeches in the Lok Sabha", icon: "fa-solid fa-user-tie", photo: rahulGandhi?.photo },
    currentLabel: "Most Referenced Speaker",
    oppositionLabel: "Principal Opposition Voice",
    bio: [
      "Set-piece addresses — the Independence Day speech from the Red Fort, the Union Budget speech, and the President's address to Parliament — anchor the political calendar and are scrutinized for policy signals well beyond their immediate audience.",
      "Floor speeches during motions of confidence, no-confidence, and major bill debates carry particular weight, since they are made under procedural rules that guarantee opposition leaders dedicated speaking time to respond to the government's record.",
    ],
    facts: [
      { icon: "fa-solid fa-microphone", label: "Independence Day & Republic Day addresses" },
      { icon: "fa-solid fa-landmark", label: "Union Budget & Parliament floor speeches" },
      { icon: "fa-solid fa-earth-asia", label: "International forum addresses (UN, G20)" },
    ],
    relatedNews,
    recommendedNews,
  };
}

export async function getRalliesInfo() {
  const relatedNews = await getRallies();
  const relatedSlugSet = new Set(relatedNews.map((story) => story.slug));
  const recommendedNews = allTeasers()
    .filter((story) => story.slug && !relatedSlugSet.has(story.slug))
    .slice(0, 4);

  return {
    label: "Rallies",
    type: "rally",
    description:
      "Public rallies remain a core campaign tool across India's political spectrum, from mega state rallies drawing hundreds of thousands to joint opposition shows of unity ahead of assembly polls. Track the latest coverage from ruling and opposition rallies alike.",
    current: { name: "BJP-led NDA", role: "Ruling alliance — largest rally turnouts this quarter", icon: "fa-solid fa-people-group" },
    opposition: { name: "INDIA Bloc", role: "Opposition alliance — coordinated joint rallies", icon: "fa-solid fa-people-group" },
    currentLabel: "Ruling Alliance Rallies",
    oppositionLabel: "Opposition Rallies",
    bio: [
      "Large rallies are typically timed ahead of assembly or general elections, serving both to energize party workers and to signal ground-level momentum to the media and rival camps.",
      "Joint rallies, where multiple opposition parties share a single stage, have become a recurring feature of coalition politics, used to project unity even where seat-sharing arrangements remain unresolved.",
    ],
    facts: [
      { icon: "fa-solid fa-people-group", label: "Mega state rallies ahead of assembly elections" },
      { icon: "fa-solid fa-flag", label: "Joint opposition rallies signaling coalition unity" },
      { icon: "fa-solid fa-bullhorn", label: "Youth-wing rallies tied to voter registration drives" },
    ],
    relatedNews,
    recommendedNews,
  };
}
