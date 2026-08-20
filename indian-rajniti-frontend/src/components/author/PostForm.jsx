"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authorApi, mediaUrl } from "@/lib/api";

const TYPE_LABEL = {
  ARTICLE: "Article",
  BLOG: "Blog",
  VIDEO: "Video",
};

const MODERATOR_ROLES = ["EDITOR", "ADMIN"];

const VIDEO_SOURCES = ["YOUTUBE", "VIMEO", "UPLOAD", "EXTERNAL"];

function initialForm(post) {
  return {
    title: post?.title || "",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    description: post?.description || "",
    featuredImage: post?.featured_image || "",
    thumbnail: post?.thumbnail || "",
    videoSource: post?.video_source || VIDEO_SOURCES[0],
    videoUrl: post?.video_url || "",
    category: post?.category || "",
    state: post?.state || "",
    tags: (post?.tags || []).join(", "),
    relatedArticleId: post?.related_article_id || "",
    relatedPolitician: post?.related_politician || "",
    relatedElection: post?.related_election || "",
  };
}

// Builds a multipart body: files ride as real File objects, everything else
// as plain fields. When editing and no new file was picked, the post's
// existing path (form.featuredImage etc.) is sent through so the backend
// keeps the current image/video instead of wiping it out.
function buildFormData(type, form, files) {
  const fd = new FormData();
  const tags = form.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  fd.append("title", form.title);
  fd.append("category", form.category);
  fd.append("tags", JSON.stringify(tags));

  if (type === "ARTICLE" || type === "BLOG") {
    if (form.excerpt) fd.append("excerpt", form.excerpt);
    fd.append("content", form.content);
    if (files.featuredImage) fd.append("featuredImage", files.featuredImage);
    else if (form.featuredImage) fd.append("featuredImage", form.featuredImage);
  }

  if (type === "ARTICLE") {
    if (form.state) fd.append("state", form.state);
    if (form.relatedPolitician) fd.append("relatedPolitician", form.relatedPolitician);
    if (form.relatedElection) fd.append("relatedElection", form.relatedElection);
  }

  if (type === "BLOG" && form.relatedArticleId) {
    fd.append("relatedArticleId", form.relatedArticleId);
  }

  if (type === "VIDEO") {
    fd.append("description", form.description);
    fd.append("videoSource", form.videoSource);
    if (form.state) fd.append("state", form.state);
    if (form.relatedArticleId) fd.append("relatedArticleId", form.relatedArticleId);
    if (form.relatedPolitician) fd.append("relatedPolitician", form.relatedPolitician);

    if (files.thumbnail) fd.append("thumbnail", files.thumbnail);
    else if (form.thumbnail) fd.append("thumbnail", form.thumbnail);

    if (form.videoSource === "UPLOAD") {
      if (files.videoFile) fd.append("videoFile", files.videoFile);
      else if (form.videoUrl) fd.append("videoUrl", form.videoUrl);
    } else {
      fd.append("videoUrl", form.videoUrl);
    }
  }

  return fd;
}

// Mirrors REQUIRED_FIELDS in the backend's content.controller.js, plus the
// file inputs' `required` conditions below — run explicitly (rather than
// relying only on the native `required` attributes) because those attributes
// sit on hidden file inputs, whose browser validation messages don't surface
// usefully to the user.
function validateForm(type, form, files, isEdit) {
  const missing = [];

  if (!form.title.trim()) missing.push("Title");
  if (!form.category.trim()) missing.push("Category");

  if (type === "ARTICLE" || type === "BLOG") {
    if (type === "ARTICLE" && !form.excerpt.trim()) missing.push("Excerpt");
    if (!form.content.trim()) missing.push("Content");
    if (!isEdit && !files.featuredImage && !form.featuredImage) missing.push("Featured Image");
  }

  if (type === "VIDEO") {
    if (!form.description.trim()) missing.push("Description");
    if (!form.videoSource) missing.push("Video Source");

    if (form.videoSource === "UPLOAD") {
      if (!isEdit && !files.thumbnail && !form.thumbnail) missing.push("Thumbnail");
      if (!isEdit && !files.videoFile && !form.videoUrl) missing.push("Video File");
    } else if (!form.videoUrl.trim()) {
      missing.push("Video URL");
    }
  }

  return missing;
}

const fieldClass =
  "w-full border border-outline-variant/30 bg-surface-container-low rounded px-3 py-2.5 text-on-surface focus:border-primary focus:outline-none font-body-md transition-colors";
const sectionClass = "bg-surface-container-low/60 rounded-lg border border-primary/30 p-5";

function SectionTitle({ icon, children }) {
  return (
    <h2 className="flex items-center gap-2 font-headline-md text-sm text-primary uppercase tracking-wide mb-4">
      <i className={`fa-solid ${icon}`} />
      {children}
    </h2>
  );
}

function FieldLabel({ icon, required, children }) {
  return (
    <label className="flex items-center gap-1.5 font-label-md text-xs text-on-surface-variant mb-1.5">
      <i className={`fa-solid ${icon} text-primary/60 text-[11px]`} />
      {children}
      {required && <span className="text-error">*</span>}
    </label>
  );
}

// A styled dropzone-style file picker (native input hidden underneath) so
// uploads don't fall back to the bare, unstyled browser "Choose File" button.
function FileUploadField({ name, icon, label, accept, required, currentUrl, onChange, selectedFile }) {
  const inputId = `field-${name}`;
  return (
    <div>
      <FieldLabel icon={icon} required={required}>
        {label}
      </FieldLabel>
      <label
        htmlFor={inputId}
        className="flex items-center gap-3 px-3 py-2.5 border-2 border-dashed border-outline-variant/40 rounded-lg bg-surface-container-low hover:border-primary/60 hover:bg-surface-container transition-colors cursor-pointer"
      >
        <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-cloud-arrow-up text-primary" />
        </span>
        <span className="flex-grow min-w-0">
          <span className="block font-label-md text-sm text-on-surface truncate">
            {selectedFile ? selectedFile.name : "Click to upload"}
          </span>
          <span className="block font-body-md text-[11px] text-on-surface-variant truncate">
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(0)} KB selected`
              : currentUrl
                ? "Replace current file"
                : accept === "video/*"
                  ? "MP4 or WebM"
                  : "PNG or JPG"}
          </span>
        </span>
        {currentUrl && !selectedFile && (
          <a
            href={mediaUrl(currentUrl)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-label-md text-primary hover:underline flex-shrink-0"
          >
            View
          </a>
        )}
      </label>
      <input id={inputId} type="file" name={name} accept={accept} required={required} onChange={onChange} className="hidden" />
    </div>
  );
}

/**
 * `redirectTo`: where to go after a successful create/edit — defaults to the
 * content list, since creation now lives on its own page rather than inline
 * on the dashboard.
 */


export default function PostForm({ type, post, redirectTo = "/author/content" }) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = Boolean(post);
  const [form, setForm] = useState(() => initialForm(post));
  const [files, setFiles] = useState({});
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Blogs and videos can reference an article — pull the picker options from
  // whatever articles this user is permitted to see. GET /articles is always
  // self-scoped now (own content only, regardless of role), so editors/admins
  // — who could previously reference any author's article here — use the
  // moderator-only history endpoint instead to keep that same breadth.
  useEffect(() => {
    if (type !== "BLOG" && type !== "VIDEO") return;
    const isModerator = MODERATOR_ROLES.includes(user?.role);
    const request = isModerator ? authorApi.listHistoryByType("ARTICLE") : authorApi.listByType("ARTICLE");
    request.then((data) => setArticles(data.posts)).catch(() => setArticles([]));
  }, [type, user?.role]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles((prev) => ({ ...prev, [name]: fileList?.[0] || null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const missing = validateForm(type, form, files, isEdit);
    if (missing.length) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
  
      const formData = buildFormData(type, form, files);
 
      let data;
      if (isEdit) {
        data = await authorApi.updatePost(type, post.id, formData);
      } else if (type === "ARTICLE") {
        data = await authorApi.createArticle(formData);
      } else if (type === "BLOG") {
        data = await authorApi.createBlog(formData);
      } else {
        data = await authorApi.createVideo(formData);
      }

      setSuccess(data.message);
      setTimeout(() => router.push(redirectTo), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const label = TYPE_LABEL[type];

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Main column: the actual writing */}
      <div className="lg:col-span-2 space-y-5">
        <div className={sectionClass}>
          <SectionTitle icon="fa-pen-nib">Basic Info</SectionTitle>
          <div className="space-y-4">
            <div>
              <FieldLabel icon="fa-heading" required>
                Title
              </FieldLabel>
              <input type="text" name="title" required value={form.title} onChange={handleChange} className={fieldClass} />
            </div>

            {type === "ARTICLE" && (
              <div>
                <FieldLabel icon="fa-align-left" required>
                  Excerpt
                </FieldLabel>
                <input type="text" name="excerpt" required value={form.excerpt} onChange={handleChange} className={fieldClass} />
              </div>
            )}

            {type === "BLOG" && (
              <div>
                <FieldLabel icon="fa-align-left">Excerpt</FieldLabel>
                <input type="text" name="excerpt" value={form.excerpt} onChange={handleChange} className={fieldClass} />
              </div>
            )}

            {type === "VIDEO" ? (
              <div>
                <FieldLabel icon="fa-align-left" required>
                  Description
                </FieldLabel>
                <textarea
                  name="description"
                  required
                  rows={12}
                  value={form.description}
                  onChange={handleChange}
                  className={`${fieldClass} resize-y`}
                />
              </div>
            ) : (
              <div>
                <FieldLabel icon="fa-file-lines" required>
                  Content
                </FieldLabel>
                <textarea
                  name="content"
                  required
                  rows={16}
                  value={form.content}
                  onChange={handleChange}
                  className={`${fieldClass} resize-y`}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar: publish action, media, categorization */}
      <div className="space-y-5">


        <div className={sectionClass}>
          <SectionTitle icon="fa-photo-film">Media</SectionTitle>
          <div className="space-y-4">
            {type === "VIDEO" ? (
              <>
                <div>
                  <FieldLabel icon="fa-clapperboard" required>
                    Video Source
                  </FieldLabel>
                  <select name="videoSource" required value={form.videoSource} onChange={handleChange} className={fieldClass}>
                    {VIDEO_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                <FileUploadField
                  name="thumbnail"
                  icon="fa-image"
                  label="Thumbnail"
                  accept="image/*"
                  required={!isEdit && form.videoSource === "UPLOAD"}
                  currentUrl={form.thumbnail}
                  selectedFile={files.thumbnail}
                  onChange={handleFileChange}
                />
                {form.videoSource !== "UPLOAD" && (
                  <p className="text-xs font-body-md text-on-surface-variant -mt-2">
                    Optional — leave blank to use the video&apos;s own thumbnail (YouTube/Vimeo).
                  </p>
                )}

                {form.videoSource === "UPLOAD" ? (
                  <FileUploadField
                    name="videoFile"
                    icon="fa-file-video"
                    label="Video File"
                    accept="video/*"
                    required={!isEdit}
                    currentUrl={form.videoUrl}
                    selectedFile={files.videoFile}
                    onChange={handleFileChange}
                  />
                ) : (
                  <div>
                    <FieldLabel icon="fa-link" required>
                      Video URL
                    </FieldLabel>
                    <input
                      type="url"
                      name="videoUrl"
                      required
                      placeholder="https://..."
                      value={form.videoUrl}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                  </div>
                )}
              </>
            ) : (
              <FileUploadField
                name="featuredImage"
                icon="fa-image"
                label="Featured Image"
                accept="image/*"
                required={!isEdit}
                currentUrl={form.featuredImage}
                selectedFile={files.featuredImage}
                onChange={handleFileChange}
              />
            )}
          </div>
        </div>

        <div className={sectionClass}>
          <SectionTitle icon="fa-tags">Categorization</SectionTitle>
          <div className="space-y-5">
            <div>
              <FieldLabel icon="fa-folder-open" required>
                Category
              </FieldLabel>
              <input type="text" name="category" required value={form.category} onChange={handleChange} className={fieldClass} />
            </div>

            {(type === "ARTICLE" || type === "VIDEO") && (
              <div>
                <FieldLabel icon="fa-location-dot">State</FieldLabel>
                <input type="text" name="state" value={form.state} onChange={handleChange} className={fieldClass} />
              </div>
            )}

            <div>
              <FieldLabel icon="fa-tag">Tags</FieldLabel>
              <input
                type="text"
                name="tags"
                placeholder="comma, separated, tags"
                value={form.tags}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>

            {(type === "BLOG" || type === "VIDEO") && (
              <div>
                <FieldLabel icon="fa-link">Related Article</FieldLabel>
                <select name="relatedArticleId" value={form.relatedArticleId} onChange={handleChange} className={fieldClass}>
                  <option value="">None</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(type === "ARTICLE" || type === "VIDEO") && (
              <div>
                <FieldLabel icon="fa-user-tie">Related Politician</FieldLabel>
                <input
                  type="text"
                  name="relatedPolitician"
                  value={form.relatedPolitician}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </div>
            )}

            {type === "ARTICLE" && (
              <div>
                <FieldLabel icon="fa-vote-yea">Related Election</FieldLabel>
                <input
                  type="text"
                  name="relatedElection"
                  value={form.relatedElection}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </div>
            )}
          </div>
        </div>
                <div className={`{sectionClass}`}>
          <SectionTitle icon="fa-cloud-arrow-up">Publish</SectionTitle>

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-error font-body-md mb-3" role="alert">
              <i className="fa-solid fa-triangle-exclamation mt-0.5" />
              {error}
            </p>
          )}
          {success && (
            <p className="flex items-start gap-1.5 text-sm text-primary font-body-md mb-3" role="status">
              <i className="fa-solid fa-circle-check mt-0.5" />
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded font-label-md uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
          >
            <i className={`fa-solid ${loading ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Save Draft"}
          </button>
          <p className="text-xs font-body-md text-on-surface-variant mt-3">
            {isEdit
              ? "Saving moves this back to Draft — you'll need to submit it for review again."
              : `Saves as a draft. Submit it for review from "${label} content" when you're ready.`}
          </p>
        </div>
      </div>

    </form>
  );
}
