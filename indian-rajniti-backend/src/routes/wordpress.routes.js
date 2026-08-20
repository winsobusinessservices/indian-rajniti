// Routes for the legacy WordPress database (wplh_posts / wplh_postmeta),
// namespaced under /wordpress so it reads clearly as the old-schema source
// rather than this app's native data.
const express = require("express");
const routes = express.Router();
const { getPosts, getPostById, getPostBySlug } = require("../controllers/wordpress/wpPost.controller");

/**
 * @openapi
 * /api/wordpress/posts:
 *   get:
 *     summary: List posts from the legacy WordPress database (wplh_posts + wplh_postmeta)
 *     tags: [WordPress (Legacy DB)]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, default: publish }
 *         description: post_status column (e.g. publish, draft)
 *       - in: query
 *         name: type
 *         schema: { type: string, default: post }
 *         description: post_type column (e.g. post, page)
 *     responses:
 *       200:
 *         description: Paginated list of posts, each including a resolved featured_image URL
 */
routes.get("/wordpress/posts", getPosts);

/**
 * @openapi
 * /api/wordpress/posts/slug/{slug}:
 *   get:
 *     summary: Get a single WordPress post by its slug (post_name)
 *     tags: [WordPress (Legacy DB)]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The matching post, including a resolved featured_image URL
 *       404:
 *         description: Post not found
 */
routes.get("/wordpress/posts/slug/:slug", getPostBySlug);

/**
 * @openapi
 * /api/wordpress/posts/{id}:
 *   get:
 *     summary: Get a single WordPress post by its ID
 *     tags: [WordPress (Legacy DB)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: The matching post, including a resolved featured_image URL
 *       404:
 *         description: Post not found
 */
routes.get("/wordpress/posts/:id", getPostById);

module.exports = routes;
