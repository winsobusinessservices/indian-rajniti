const express = require("express");
const {
  listPostComments,
  createComment,
  listAllComments,
  updateCommentVisibility,
  deleteComment,
} = require("../controllers/comments/comments.controller");
const { authenticate, optionalAuthenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/comments/post/:slug", optionalAuthenticate, listPostComments);
router.post("/comments", authenticate, createComment);
router.get("/admin/comments", authenticate, authorize("ADMIN"), listAllComments);
router.patch("/admin/comments/:id/visibility", authenticate, authorize("ADMIN"), updateCommentVisibility);
router.delete("/comments/:id", authenticate, deleteComment);

module.exports = router;

