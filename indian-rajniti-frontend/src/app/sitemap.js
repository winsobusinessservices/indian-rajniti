import { SITE_URL } from "@/lib/site";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const STATIC_ROUTES = [
  "",
  "/about",
  "/contact",
  "/top-news",
  "/trending",
  "/blogs",
  "/videos",
  "/press-conferences",
  "/speeches",
  "/rallies",
  "/elections",
  "/loksabha",
  "/rajyasabha",
  "/key-political-figures",
  "/former-prime-ministers",
  "/cm",
  "/parties",
  "/state",
  "/political-calendar",
  "/careers",
];

export default async function sitemap() {
  const now = new Date();
  const entries = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "hourly" : "daily",
    priority: route === "" ? 1 : 0.7,
  }));

  try {
    const response = await fetch(`${API_BASE_URL}/news/home`, { next: { revalidate: 3600 } });
    if (!response.ok) return entries;
    const { posts = [] } = await response.json();
    const dynamicEntries = posts
      .filter((post) => post.slug)
      .map((post) => ({
        url: `${SITE_URL}/news/${post.slug}`,
        lastModified: post.time ? new Date(post.time) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      }));
    return [...entries, ...dynamicEntries];
  } catch {
    return entries;
  }
}
