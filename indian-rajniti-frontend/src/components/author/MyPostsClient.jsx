"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authorApi } from "@/lib/api";
import AiCheckLoader from "@/components/common/AiCheckLoader";
import ReasonModal from "@/components/common/ReasonModal";
import { DashboardRowsSkeleton } from "@/components/common/PageSkeletons";

const STATUS_BADGE = {
  DRAFT: "bg-outline-variant text-on-surface",
  PENDING: "bg-yellow-500 text-black",
  APPROVED: "bg-green-600 text-white",
  REJECTED: "bg-error text-on-error",
};

const AI_BADGE = {
  NOT_CHECKED: "bg-surface-container-high text-on-surface-variant",
  PROCESSING: "bg-blue-100 text-blue-700",
  PASSED: "bg-green-100 text-green-700",
  FLAGGED: "bg-amber-100 text-amber-700",
  FAILED: "bg-surface-container-high text-on-surface-variant",
};

const TYPE_ICON = {
  ARTICLE: "fa-newspaper",
  BLOG: "fa-pen-nib",
  VIDEO: "fa-video",
};

export default function MyPostsClient({ compact = false, refreshSignal }) {
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [aiCheckingId, setAiCheckingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters = { status: statusFilter };
      const results = typeFilter
        ? (await authorApi.listByType(typeFilter, filters)).posts
        : await authorApi.listAllTypes(filters);
      setPosts(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    loadPosts();
    // refreshSignal isn't read directly, but bumping it (e.g. after a new
    // post is created elsewhere on the page) should trigger a re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPosts, refreshSignal]);

  const handleDelete = async (reason) => {
    // See ReviewQueueClient's handleDelete for why this guard isn't optional:
    // the React Compiler's auto-memoization reads deleteTarget.type/.id on
    // every render (including the first, when deleteTarget is still null)
    // to decide whether to recompute this callback.
    if (!deleteTarget) return;
    setActionError("");
    const { type, id } = deleteTarget;
    await authorApi.deletePost(type, id, reason);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeleteTarget(null);
  };

  const handleSubmit = async (post) => {
    setActionError("");
    setAiCheckingId(post.id);
    try {
      const data = await authorApi.submitPost(post.type, post.id);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? data.post : p)));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAiCheckingId(null);
    }
  };

  const content = (
    <>
      {aiCheckingId != null && <AiCheckLoader />}
      {!compact && <h1 className="font-display-lg text-3xl text-primary mb-6">My Content</h1>}

      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-outline-variant/40 rounded px-3 py-2 text-sm font-label-md bg-surface text-on-surface"
        >
          <option value="">All Types</option>
          <option value="ARTICLE">Articles</option>
          <option value="BLOG">Blogs</option>
          <option value="VIDEO">Videos</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-outline-variant/40 rounded px-3 py-2 text-sm font-label-md bg-surface text-on-surface"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {actionError && (
        <p className="text-sm text-error font-body-md mb-4" role="alert">
          {actionError}
        </p>
      )}

      {loading ? (
        <DashboardRowsSkeleton />
      ) : error ? (
        <p className="text-sm text-error font-body-md" role="alert">
          {error}
        </p>
      ) : posts.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">No content found.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={`${post.type}-${post.id}`}
              className="flex items-start gap-4 p-4 bg-surface-container rounded-lg border border-outline-variant/20"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid ${TYPE_ICON[post.type]} text-primary`} />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${STATUS_BADGE[post.status]}`}>
                    {post.status}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${AI_BADGE[post.ai_status]}`}>
                    AI: {post.ai_status.replace("_", " ")}
                  </span>
                  <span className="text-[10px] font-label-md text-on-surface-variant uppercase">{post.type}</span>
                </div>
                <h3 className="font-headline-md text-base text-on-surface truncate">{post.title}</h3>
                {(post.excerpt || post.description) && (
                  <p className="font-body-md text-sm text-on-surface-variant line-clamp-2 mt-1">
                    {post.excerpt || post.description}
                  </p>
                )}
                {post.ai_notes && (
               
                  <p className="font-body-md text-xs text-amber-700 mt-1">
                    <i className="fa-solid fa-triangle-exclamation mr-1" />
                    {post.ai_notes}
                  </p>
                )}
                {post.review_notes && (
                  <p className="font-body-md text-xs text-on-surface-variant mt-1 italic">Editor note: {post.review_notes}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <div className="flex gap-2">
                  <Link
                    href={`/author/view/${post.type.toLowerCase()}/${post.id}`}
                    className="px-3 py-1.5 text-xs font-label-md border border-outline-variant/40 rounded hover:border-primary hover:text-primary transition-colors"
                  >
                    View
                  </Link>
                  <Link
                    href={`/author/edit/${post.type.toLowerCase()}/${post.id}`}
                    className="px-3 py-1.5 text-xs font-label-md border border-outline-variant/40 rounded hover:border-primary hover:text-primary transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(post)}
                    className="px-3 py-1.5 text-xs font-label-md border border-error/40 text-error rounded hover:bg-error hover:text-on-error transition-colors"
                  >
                    Delete
                  </button>
                </div>
                {["DRAFT", "REJECTED"].includes(post.status) && (
                  <button
                    onClick={() => handleSubmit(post)}
                    disabled={aiCheckingId != null}
                    className="px-3 py-1.5 text-xs font-label-md bg-primary text-on-primary rounded hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Submit for Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReasonModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this post?"
        description="This cannot be undone."
        confirmLabel="Delete"
        placeholder="Why is this being deleted?"
        danger
        required="true"
      />
    </>
  );

  if (compact) return content;

  return <div className="max-w-full mx-auto px-4 md:px-16 py-10">{content}</div>;
}
