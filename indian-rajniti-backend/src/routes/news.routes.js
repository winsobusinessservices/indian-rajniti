// Public, read-only homepage/news content — no auth, anyone can fetch it.
//   GET /news/home         everything the home page needs in one response
//   GET /news/posts/:slug  a single post (direct lookup, not currently
//                          used by the frontend but available for API consumers)
const express = require("express");
const { getHome, getPostBySlug } = require("../controllers/news/news.controller");

const router = express.Router();

/**
 * @openapi
 * /api/news/home:
 *   get:
 *     summary: Get everything the home page needs in one response
 *     description: Aggregates published articles/blogs/videos into hero slides, top stories, editorial picks, regional focus, trending, blogs, careers/speeches/rallies category slices, and video sections, plus admin-managed home widgets.
 *     tags: [News]
 *     responses:
 *       200:
 *         description: Home page content bundle (news sections, flat posts list, widgets)
 */
router.get("/news/home", getHome);

/**
 * @openapi
 * /api/news/posts/{slug}:
 *   get:
 *     summary: Get a single published article or blog post by slug
 *     description: Searches published articles then published blogs, and increments the post's view count.
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The matching post
 *       404:
 *         description: Post not found
 */
router.get("/news/posts/:slug", getPostBySlug);

module.exports = router;
