// Handlers for /articles, /blogs, /videos. Each has its own table/model
// (different required fields per type), but the same workflow: create ->
// DRAFT -> submit -> AI check -> editor review -> APPROVED/REJECTED.
// `req.contentType` (ARTICLE/BLOG/VIDEO) is set by content.routes.js.
const Article = require("../../models/article.model");
const Blog = require("../../models/blog.model");
const Video = require("../../models/video.model");
const { fileUrl } = require("../../middleware/upload.middleware");
const { deriveExternalThumbnail } = require("../../utils/videoThumbnail");

const MODERATOR_ROLES = ["EDITOR", "ADMIN"];
const isModerator = (role) => MODERATOR_ROLES.includes(role);

const MODEL = { ARTICLE: Article, BLOG: Blog, VIDEO: Video };
const TYPE_LABEL = { ARTICLE: "Article", BLOG: "Blog", VIDEO: "Video" };

// Each type has different required fields and a different subset of the
// request body maps onto its model's create/update payload.
const REQUIRED_FIELDS = {
  ARTICLE: ["title", "excerpt", "content", "featuredImage", "category"],
  BLOG: ["title", "content", "featuredImage", "category"],
  VIDEO: ["title", "description", "videoSource", "videoUrl", "thumbnail", "category"],
};

// Uploaded files (multer, keyed by field name) win over any same-named body
// field. On create there's no body fallback, so the field is simply empty
// and required-field validation catches it. On edit, the frontend sends the
// post's *existing* path as that body field when the author didn't pick a
// new file, so the image/video is preserved instead of getting wiped out.
function pickFile(files, field) {
  return files?.[field]?.[0];
}

function orUndefined(value) {
  return value || undefined;
}

function parseTags(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw.split(",").map((t) => t.trim()).filter(Boolean);
  }
}

function extractFields(type, body, files = {}) {
  const tags = parseTags(body.tags);

  if (type === "ARTICLE") {
    const { title, excerpt, content, category } = body;
    const featuredImageFile = pickFile(files, "featuredImage");
    const featuredImage = featuredImageFile ? fileUrl(type, featuredImageFile) : body.featuredImage;
    return {
      title,
      excerpt,
      content,
      featuredImage,
      category,
      state: orUndefined(body.state),
      tags,
      relatedPolitician: orUndefined(body.relatedPolitician),
      relatedElection: orUndefined(body.relatedElection),
    };
  }
  if (type === "BLOG") {
    const { title, content, category } = body;
    const featuredImageFile = pickFile(files, "featuredImage");
    const featuredImage = featuredImageFile ? fileUrl(type, featuredImageFile) : body.featuredImage;
    return {
      title,
      excerpt: orUndefined(body.excerpt),
      content,
      featuredImage,
      category,
      tags,
      relatedArticleId: orUndefined(body.relatedArticleId),
    };
  }
  // VIDEO
  const { title, description, videoSource, category } = body;
  const videoFile = pickFile(files, "videoFile");
  const videoUrl = videoSource === "UPLOAD" && videoFile ? fileUrl(type, videoFile) : body.videoUrl;
  const thumbnailFile = pickFile(files, "thumbnail");
  // An author linking a YouTube/Vimeo video isn't required to also upload a
  // thumbnail — fall back to the provider's own thumbnail, derived straight
  // from the URL, before the required-field check below runs. An UPLOAD
  // video has no URL to derive from, so it still needs a manual thumbnail.
  const thumbnail = thumbnailFile ? fileUrl(type, thumbnailFile) : body.thumbnail || deriveExternalThumbnail(videoUrl);
  return {
    title,
    description,
    videoSource,
    videoUrl,
    thumbnail,
    category,
    state: orUndefined(body.state),
    tags,
    relatedArticleId: orUndefined(body.relatedArticleId),
    relatedPolitician: orUndefined(body.relatedPolitician),
  };
}

function validateRequired(type, fields) {
  const missing = REQUIRED_FIELDS[type].filter((key) => !fields[key]);
  if (missing.length) {
    return `Missing required field(s): ${missing.join(", ")}`;
  }
  return null;
}

// The `type` isn't a column — each table IS a type — but the frontend needs
// it to know which resource a row came from once articles/blogs/videos are
// merged into one list, or which endpoint to hit next for edit/delete/etc.
function tagType(type, item) {
  return Array.isArray(item) ? item.map((row) => ({ ...row, type })) : { ...item, type };
}

async function loadOwnedContent(req, res) {
  const Model = MODEL[req.contentType];
  const item = await Model.findById(req.params.id);
  if (!item) {
    res.status(404).json({ success: false, message: `${TYPE_LABEL[req.contentType]} not found` });
    return null;
  }
  if (item.author_id !== req.user.userId && !isModerator(req.user.role)) {
    res.status(403).json({ success: false, message: "You do not have permission to access this content" });
    return null;
  }
  return item;
}

const createContent = async (req, res) => {
  try {
    const Model = MODEL[req.contentType];
    const fields = extractFields(req.contentType, req.body, req.files);

    const validationError = validateRequired(req.contentType, fields);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const item = await Model.create({ authorId: req.user.userId, ...fields });
    return res.status(201).json({
      success: true,
      message: `${TYPE_LABEL[req.contentType]} draft created`,
      post: tagType(req.contentType, item),
    });
  } catch (error) {
    console.error(`Create ${req.contentType} error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const listContent = async (req, res) => {
  try {
    const Model = MODEL[req.contentType];
    const { status } = req.query;
    const posts = await Model.findForUser(req.user, { status });
    return res.status(200).json({ success: true, posts: tagType(req.contentType, posts) });
  } catch (error) {
    console.error(`List ${req.contentType} error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Moderator-only: every author's content, not just the caller's own — backs
// the review queue (status=PENDING) and the content history page.
const listAllContent = async (req, res) => {
  try {
    const Model = MODEL[req.contentType];
    const { status } = req.query;
    const posts = await Model.findAll({ status });
    console.log(`List all ${req.contentType} for ${req.user.role}:`, posts.length, "items");
    return res.status(200).json({ success: true, posts: tagType(req.contentType, posts) });
  } catch (error) {
    console.error(`List all ${req.contentType} error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getContentById = async (req, res) => {
  try {
    const item = await loadOwnedContent(req, res);
    if (!item) return;
    return res.status(200).json({ success: true, post: tagType(req.contentType, item) });
  } catch (error) {
    console.error(`Get ${req.contentType} error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateContent = async (req, res) => {
  try {
    const item = await loadOwnedContent(req, res);
    if (!item) return;

    // loadOwnedContent lets any moderator through (for viewing/deleting/
    // reviewing another author's content), but editing the actual content is
    // narrower: an editor may only edit their own work. Admins are exempt —
    // they have full access, same as the review-permission rule.
    if (req.user.role === "EDITOR" && item.author_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Editors cannot edit another author's content.",
      });
    }

    const Model = MODEL[req.contentType];
    const fields = extractFields(req.contentType, req.body, req.files);
    const validationError = validateRequired(req.contentType, fields);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const updated = await Model.update(item.id, fields);
    return res.status(200).json({
      success: true,
      message: `${TYPE_LABEL[req.contentType]} updated and moved back to draft`,
      post: tagType(req.contentType, updated),
    });
  } catch (error) {
    console.error(`Update ${req.contentType} error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteContent = async (req, res) => {
  try {
    const item = await loadOwnedContent(req, res);
    if (!item) return;

    // No audit-log table exists yet, so this is recorded to the server log
    // rather than persisted — good enough for now, but if this needs to
    // survive a restart or reach the author, it'll need a real audit table.
    if (req.body?.reason) {
      console.log(
        `${TYPE_LABEL[req.contentType]} ${item.id} ("${item.title}") deleted by user ${req.user.userId} (${req.user.role}). Reason: ${req.body.reason}`
      );
    }

    await MODEL[req.contentType].remove(item.id);
    return res.status(200).json({ success: true, message: `${TYPE_LABEL[req.contentType]} deleted` });
  } catch (error) {
    console.error(`Delete ${req.contentType} error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const submitContent = async (req, res) => {
  try {
    const item = await loadOwnedContent(req, res);
    if (!item) return;

    if (!["DRAFT", "REJECTED"].includes(item.status)) {
      return res.status(400).json({
        success: false,
        message: `Only drafts or rejected ${TYPE_LABEL[req.contentType].toLowerCase()}s can be submitted (current status: ${item.status})`,
      });
    }

    const updated = await MODEL[req.contentType].submit(item.id);
    return res.status(200).json({
      success: true,
      message: `${TYPE_LABEL[req.contentType]} submitted for review`,
      post: tagType(req.contentType, updated),
    });
  } catch (error) {
    console.error(`Submit ${req.contentType} error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getContentStatus = async (req, res) => {
  try {
    const item = await loadOwnedContent(req, res);
    if (!item) return;

    return res.status(200).json({
      success: true,
      status: {
        workflowStatus: item.status,
        aiStatus: item.ai_status,
        aiNotes: item.ai_notes,
        aiNotesSummary: item.ai_summary,
        aiGrammarIssues: item.ai_grammar_issues ? JSON.parse(item.ai_grammar_issues) : null,
        aiCorrectedContent: item.ai_corrected_content,
        aiQualityScore: item.ai_quality_score,
        aiRecommendation: item.ai_recommendation,
        reviewerId: item.reviewer_id,
        reviewNotes: item.review_notes,
        submittedAt: item.submitted_at,
        reviewedAt: item.reviewed_at,
        publishedAt: item.published_at,
      },
    });
  } catch (error) {
    console.error(`Get ${req.contentType} status error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Editors can only review AUTHOR-submitted content — content from an editor
// or admin (including an editor's own) requires an admin's review instead.
// Admins are never restricted here; they review everything. `findById` joins
// in the author's role, so this needs no extra lookup.
function canReview(reviewerRole, authorRole) {
  return reviewerRole !== "EDITOR" || authorRole === "AUTHOR";
}

const reviewContent = async (req, res) => {
  try {
    const Model = MODEL[req.contentType];
    const item = await Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: `${TYPE_LABEL[req.contentType]} not found` });
    }

    if (!canReview(req.user.role, item.author_role)) {
      return res.status(403).json({
        success: false,
        message: "Editors can only review content submitted by authors — content from an editor or admin requires admin review.",
      });
    }

    const { action, notes } = req.body;
    if (!["APPROVE", "REJECT", "UPDATE"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be one of APPROVE, REJECT, or UPDATE" });
    }

    const fields = action === "UPDATE" ? extractFields(req.contentType, req.body) : {};
    if (action === "UPDATE") {
      const validationError = validateRequired(req.contentType, { ...item, ...fields });
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }
    }

    const updated = await Model.review(item.id, { reviewerId: req.user.userId, action, notes, ...fields });
    return res.status(200).json({
      success: true,
      message: `${TYPE_LABEL[req.contentType]} ${action.toLowerCase()}d`,
      post: tagType(req.contentType, updated),
    });
  } catch (error) {
    console.error(`Review ${req.contentType} error:`, error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createContent,
  listContent,
  listAllContent,
  getContentById,
  updateContent,
  deleteContent,
  submitContent,
  getContentStatus,
  reviewContent,
};
