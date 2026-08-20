// Public, unauthenticated homepage/news content — backs the frontend's
// news.api.js. Every "post" (top stories, editorial, regional, trending,
// blogs, videos) comes from the SAME articles/blogs/videos tables authors
// already write into and editors already approve — there is no separate
// dummy-content table. Non-authored widgets (hero-adjacent stats, election
// results, poll of the day, etc.) still come from home_widgets.
const Article = require("../../models/article.model");
const Blog = require("../../models/blog.model");
const Video = require("../../models/video.model");
const HomeWidget = require("../../models/homeWidget.model");
const { deriveExternalThumbnail } = require("../../utils/videoThumbnail");

const POOL_LIMIT = 60;
const TRENDING_WINDOW_DAYS = 14;

function wordsOf(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean);
}

function readTimeOf(content) {
  const words = wordsOf(content).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

// Authors write plain text in a single textarea (see PostForm.jsx), not an
// array of paragraphs — split on blank lines so the detail page can render
// it the same way a structured paragraph array would be rendered.
function paragraphsOf(content) {
  const parts = (content || "")
    .split(/\n\s*\n|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [content || ""];
}

function dateLabel(row) {
  const at = row.published_at || row.created_at;
  return at ? new Date(at).toISOString() : null;
}

function toArticleTeaser(row) {
  return {
    id: row.id,
    type: "ARTICLE",
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    region: row.state || null,
    image: row.featured_image || null,
    author: row.author_name,
    time: dateLabel(row),
    views: row.views,
    tags: row.tags || null,
  };
}

function toBlogTeaser(row) {
  return {
    id: row.id,
    type: "BLOG",
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    image: row.featured_image || null,
    author: row.author_name,
    time: dateLabel(row),
    views: row.views,
    tags: row.tags || null,
  };
}

function toVideoTeaser(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    // Videos saved before thumbnail auto-derivation existed (or where an
    // author skipped it) still get a real thumbnail here, derived the same
    // way, instead of a bare icon placeholder on every card.
    image: row.thumbnail || deriveExternalThumbnail(row.video_url) || null,
    author: row.author_name,
    time: dateLabel(row),
    views: row.views,
  };
}

// Free-text category match (authors type their own category — there's no
// fixed taxonomy), used for the Speeches/Rallies/Careers routes and to split
// videos into Press Conference Archive vs. everything else.
function byCategory(rows, keyword, exclude = false) {
  return rows.filter((row) => {
    const matches = (row.category || "").toLowerCase().includes(keyword);
    return exclude ? !matches : matches;
  });
}

function distinctStates(articles) {
  const seen = new Set();
  const states = [];
  for (const row of articles) {
    if (row.state && !seen.has(row.state)) {
      seen.add(row.state);
      states.push(row.state);
    }
  }
  return states;
}

const getHome = async (req, res) => {
  try {
    const [articlesPool, blogsPool, videosPool, widgets] = await Promise.all([
      Article.findPublished({ orderBy: "recent", limit: POOL_LIMIT }),
      Blog.findPublished({ orderBy: "recent", limit: POOL_LIMIT }),
      Video.findPublished({ orderBy: "recent", limit: POOL_LIMIT }),
      HomeWidget.getAll(),
    ]);

    const byViews = [...articlesPool].sort(
      (a, b) => b.views - a.views || new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at)
    );

    const usedIds = new Set();
    const take = (rows, count) => {
      const picked = rows.filter((row) => !usedIds.has(row.id)).slice(0, count);
      picked.forEach((row) => usedIds.add(row.id));
      return picked;
    };

    const heroRows = take(byViews, 3);
    const topStoryRows = take(byViews, 6);
    const editorialRows = take(articlesPool, 4);
    const inDepthRows = take(byViews, 1);

    const badges = ["primary", "secondary", "tint"];
    const heroSlides = heroRows.map((row, index) => ({
      id: row.id,
      slug: row.slug,
      category: row.category,
      badge: badges[index % badges.length],
      title: row.title,
      excerpt: row.excerpt,
      image: row.featured_image || null,
    }));

    const cutoff = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const recentByViews = byViews.filter((row) => new Date(row.published_at || row.created_at) >= cutoff);
    const trendingRows = (recentByViews.length ? recentByViews : byViews).slice(0, 5);

    const regionalRows = [];
    const seenStates = new Set();
    for (const row of articlesPool) {
      if (row.state && !seenStates.has(row.state)) {
        seenStates.add(row.state);
        regionalRows.push(row);
      }
    }

    const news = {
      heroSlides,
      topStories: topStoryRows.map(toArticleTeaser),
      editorialOpinion: editorialRows.map(toArticleTeaser),
      regionalFocus: {
        states: distinctStates(articlesPool),
        stories: regionalRows.slice(0, 6).map(toArticleTeaser),
      },
      inDepthAnalysis: inDepthRows[0] ? toArticleTeaser(inDepthRows[0]) : null,
      trending: trendingRows.map(toArticleTeaser),
      blogs: blogsPool.map(toBlogTeaser),
      careers: byCategory(articlesPool, "career").map(toArticleTeaser),
      speeches: byCategory(articlesPool, "speech").map(toArticleTeaser),
      rallies: byCategory(articlesPool, "rally").map(toArticleTeaser),
      // Press Conference Archive is a real category match (like Speeches/
      // Rallies/Careers above), not a positional slice — with only a
      // handful of videos total, slicing past the first 6 left this section
      // permanently empty even when press-briefing videos genuinely existed.
      multimediaHub: byCategory(videosPool, "press", true).slice(0, 2).map(toVideoTeaser),
      videoHighlights: byCategory(videosPool, "press", true).slice(2, 6).map(toVideoTeaser),
      pressConferenceArchive: byCategory(videosPool, "press").map(toVideoTeaser),
      allVideos: videosPool.map(toVideoTeaser),
    };

    // Everything with a slug (articles + blogs) — backs getPostBySlug's
    // fallback pool, getRelatedPosts, allTeasers, and getAllCategoryLabels
    // on the frontend, without a second round trip per lookup.
    const posts = [...articlesPool.map(toArticleTeaser), ...blogsPool.map(toBlogTeaser)];

    return res.status(200).json({ success: true, news, posts, widgets });
  } catch (error) {
    console.error("Get home content error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Public single-post lookup — searches articles then blogs (APPROVED only)
// and counts a real view, unlike the cached /news/home bundle.
const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    let row = await Article.findPublishedBySlug(slug);
    let kind = "ARTICLE";
    if (!row) {
      row = await Blog.findPublishedBySlug(slug);
      kind = "BLOG";
    }
    if (!row) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (kind === "ARTICLE") await Article.incrementViews(row.id);
    else await Blog.incrementViews(row.id);

    const post = {
      slug: row.slug,
      category: row.category || row.state || "News",
      title: row.title,
      excerpt: row.excerpt,
      image: row.featured_image || null,
      date: dateLabel(row),
      author: row.author_name,
      readTime: readTimeOf(row.content),
      tags: row.tags || [],
      content: paragraphsOf(row.content),
    };

    return res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Get post by slug error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getHome, getPostBySlug };
