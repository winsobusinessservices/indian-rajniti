import { SITE_URL } from "@/lib/site";
import { slugify } from "@/lib/slugify";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const STATIC_ROUTES = [
  { path: "", changeFrequency: "hourly", priority: 1 },
  { path: "/top-news", changeFrequency: "hourly", priority: 0.9 },
  { path: "/trending", changeFrequency: "hourly", priority: 0.9 },
  { path: "/blogs", changeFrequency: "daily", priority: 0.8 },
  { path: "/policies", changeFrequency: "weekly", priority: 0.8 },
  { path: "/videos", changeFrequency: "daily", priority: 0.8 },
  { path: "/category", changeFrequency: "daily", priority: 0.8 },
  { path: "/press-conferences", changeFrequency: "daily", priority: 0.8 },
  { path: "/speeches", changeFrequency: "daily", priority: 0.8 },
  { path: "/rallies", changeFrequency: "daily", priority: 0.8 },
  { path: "/elections", changeFrequency: "daily", priority: 0.9 },
  { path: "/loksabha", changeFrequency: "daily", priority: 0.8 },
  { path: "/rajyasabha", changeFrequency: "daily", priority: 0.8 },
  { path: "/political-calendar", changeFrequency: "daily", priority: 0.8 },
  { path: "/key-political-figures", changeFrequency: "weekly", priority: 0.7 },
  { path: "/former-prime-ministers", changeFrequency: "monthly", priority: 0.6 },
  { path: "/cm", changeFrequency: "weekly", priority: 0.7 },
  { path: "/parties", changeFrequency: "weekly", priority: 0.7 },
  { path: "/state", changeFrequency: "weekly", priority: 0.7 },
  { path: "/careers", changeFrequency: "weekly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.4 },
];

async function fetchJson(path) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 3600 } });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

function validDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

export default async function sitemap() {
  const [newsBundle, categoryData, politicianData, partyData, stateData, careerData, policyData] = await Promise.all([
    fetchJson("/news/home"),
    fetchJson("/categories"),
    fetchJson("/politicians"),
    fetchJson("/parties"),
    fetchJson("/states"),
    fetchJson("/careers"),
    fetchJson("/policies"),
  ]);

  const entries = STATIC_ROUTES.map(({ path, ...meta }) => ({ url: `${SITE_URL}${path}`, ...meta }));
  const posts = newsBundle?.posts || [];

  posts.filter((post) => post.slug).forEach((post) => {
    entries.push({
      url: `${SITE_URL}/news/${post.slug}`,
      lastModified: validDate(post.updated_at || post.time),
      changeFrequency: "weekly",
      priority: 0.9,
    });
  });

  const categorySlugs = new Set();
  const standaloneCategorySlugs = new Set();
  (categoryData?.categories || []).filter((category) => !category.route_owner).forEach((category) => {
    const slug = category.slug || slugify(category.name);
    if (!slug) return;
    standaloneCategorySlugs.add(slug);
    entries.push({ url: `${SITE_URL}/${slug}`, changeFrequency: "daily", priority: 0.7 });
  });
  posts.forEach((post) => {
    if (post.category) categorySlugs.add(slugify(post.category));
    (post.tags || []).forEach((tag) => categorySlugs.add(slugify(tag)));
  });
  (stateData?.states || []).forEach((state) => categorySlugs.add(state.slug || slugify(state.name)));
  (partyData?.parties || []).forEach((party) => {
    categorySlugs.add(party.slug || slugify(party.name));
    if (party.abbreviation) categorySlugs.add(slugify(party.abbreviation));
  });
  ["keyFigures", "formerPMs", "chiefMinisters"].forEach((group) => {
    (politicianData?.[group] || []).forEach((person) => categorySlugs.add(person.slug || slugify(person.name)));
  });
  categorySlugs.forEach((slug) => {
    if (slug && !standaloneCategorySlugs.has(slug)) entries.push({ url: `${SITE_URL}/category/${slug}`, changeFrequency: "daily", priority: 0.7 });
  });

  (careerData?.jobs || []).filter((job) => {
    const closesAt = validDate(job.closes_at);
    return job.slug && job.status === "OPEN" && (!closesAt || closesAt.getTime() > Date.now());
  }).forEach((job) => {
    entries.push({
      url: `${SITE_URL}/careers/${job.slug}`,
      lastModified: validDate(job.updated_at || job.created_at),
      changeFrequency: "weekly",
      priority: 0.5,
    });
  });

  (policyData?.policies || []).filter((policy) => policy.slug).forEach((policy) => {
    entries.push({
      url: `${SITE_URL}/policies/${policy.slug}`,
      lastModified: validDate(policy.updated_at || policy.published_at),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  });

  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
