// Serves data from the legacy WordPress database (wplh_posts / wplh_postmeta).
const WpPost = require("../../models/wordpress/wpPost.model");

// =========================
// GET POSTS (list, paginated)
// =========================

const getPosts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const status = req.query.status || "publish";
    const type = req.query.type || "post";

    const [posts, total] = await Promise.all([
      WpPost.findAll({ page, limit, status, type }),
      WpPost.count({ status, type }),
    ]);

    return res.status(200).json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get WordPress posts error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// GET POST BY ID
// =========================

const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await WpPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("Get WordPress post by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// GET POST BY SLUG
// =========================

const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await WpPost.findBySlug(slug);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("Get WordPress post by slug error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getPosts,
  getPostById,
  getPostBySlug,
};
