"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authorApi } from "@/lib/api";
import ReasonModal from "@/components/common/ReasonModal";
import { DashboardRowsSkeleton } from "@/components/common/PageSkeletons";

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

/**
 * The editor-facing counterpart to MyPostsClient — instead of one author's
 * content across every status, this is every PENDING submission across every
 * author, since that's the actual day-to-day editor task: work the queue
 * down to zero, not browse a mixed list.
 */
export default function ReviewQueueClient() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    authorApi
      .listAllHistory({ status: "PENDING" })
      .then(setPosts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Approve doesn't need a reason, so it stays a direct action; REJECT and
  // DELETE both route through the ReasonModal instead of window.prompt/confirm.
  const handleApprove = async (post) => {
    setActionError("");
    try {
      await authorApi.reviewPost(post.type, post.id, { action: "APPROVE" });
      setPosts((prev) => prev.filter((p) => !(p.type === post.type && p.id === post.id)));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleReject = async (notes) => {
    // Guards against a React Compiler auto-memoization quirk, not just a
    // defensive nicety: the compiler generates a dependency check that reads
    // rejectTarget.type/.id on every render (to decide whether to recompute
    // this memoized callback), including the very first render where
    // rejectTarget is still null — well before this function is ever called.
    if (!rejectTarget) return;
    const { type, id } = rejectTarget;
    await authorApi.reviewPost(type, id, { action: "REJECT", notes });
    setPosts((prev) => prev.filter((p) => !(p.type === type && p.id === id)));
    setRejectTarget(null);
  };

  const handleDelete = async (reason) => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    await authorApi.deletePost(type, id, reason);
    setPosts((prev) => prev.filter((p) => !(p.type === type && p.id === id)));
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-full mx-auto px-4 md:px-16 py-10">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="font-display-lg text-3xl text-primary">Review Queue</h1>
        {!loading && posts.length > 0 && (
          <span className="bg-yellow-500 text-black text-xs font-bold px-2.5 py-1 rounded-full">{posts.length}</span>
        )}
      </div>
      <p className="font-body-md text-on-surface-variant mb-8">
        Every article, blog, and video submitted for review, from every author, waiting on you.
      </p>

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
        <div className="text-center py-16">
          <i className="fa-solid fa-circle-check text-4xl text-green-600 mb-4" />
          <p className="font-headline-md text-lg text-on-surface">Queue is empty</p>
          <p className="font-body-md text-sm text-on-surface-variant">Nothing is waiting for review right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const canReview = user?.role === "ADMIN" || post.author_role === "AUTHOR";
            return (
            <div
              key={`${post.type}-${post.id}`}
              className="flex items-start gap-4 p-4 bg-surface-container rounded-lg border border-outline-variant/20"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid ${TYPE_ICON[post.type]} text-primary`} />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${AI_BADGE[post.ai_status]}`}>
                    AI: {post.ai_status.replace("_", " ")}
                  </span>
                  {post.ai_quality_score != null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-surface-container-high text-on-surface-variant">
                      Quality: {post.ai_quality_score}/100
                    </span>
                  )}
                  {post.ai_language && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-surface-container-high text-on-surface-variant">
                      <i className="fa-solid fa-language mr-1" />
                      {post.ai_language}
                    </span>
                  )}
                  <span className="text-[10px] font-label-md text-on-surface-variant uppercase">{post.type}</span>
                  {post.author_name && (
                    <span className="text-[10px] font-body-md text-on-surface-variant">
                      by {post.author_name}
                      {post.author_role && post.author_role !== "AUTHOR" && ` (${post.author_role})`}
                    </span>
                  )}
                </div>
                <h3 className="font-headline-md text-base text-on-surface truncate">{post.title}</h3>
                {(post.excerpt || post.description) && (
                  <p className="font-body-md text-sm text-on-surface-variant line-clamp-2 mt-1">
                    {post.excerpt || post.description}
                  </p>
                )}
                {post.ai_summary && (
                  <p className="font-body-md text-xs text-on-surface-variant italic mt-1 line-clamp-2">
                    <i className="fa-solid fa-robot mr-1" />
                    {post.ai_summary}
                  </p>
                )}
                {(post.ai_grammar_issues?.length > 0 || post.ai_spelling_issues?.length > 0) && (
                  <p className="font-body-md text-xs text-amber-700 mt-1">
                    <i className="fa-solid fa-spell-check mr-1" />
                    {post.ai_grammar_issues?.length > 0 &&
                      `${post.ai_grammar_issues.length} grammar issue${post.ai_grammar_issues.length === 1 ? "" : "s"}`}
                    {post.ai_grammar_issues?.length > 0 && post.ai_spelling_issues?.length > 0 && ", "}
                    {post.ai_spelling_issues?.length > 0 &&
                      `${post.ai_spelling_issues.length} spelling issue${post.ai_spelling_issues.length === 1 ? "" : "s"}`}{" "}
                    found — see full details on the post
                  </p>
                )}
                {post.ai_notes && (
                  <p className="font-body-md text-xs text-amber-700 mt-1">
                    <i className="fa-solid fa-triangle-exclamation mr-1" />
                    {post.ai_notes}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link
                  href={`/author/view/${post.type.toLowerCase()}/${post.id}?from=review`}
                  className="px-3 py-1.5 text-xs font-label-md border border-outline-variant/40 rounded hover:border-primary hover:text-primary transition-colors text-center"
                >
                  View
                </Link>
                {canReview ? (
                  <>
                    <button
                      onClick={() => handleApprove(post)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-label-md bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      <i className="fa-solid fa-check" /> Approve &amp; Publish
                    </button>
                    <button
                      onClick={() => setRejectTarget(post)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-label-md bg-yellow-500 text-black rounded hover:bg-yellow-600 transition-colors"
                    >
                      <i className="fa-solid fa-rotate-left" /> Send for Changes
                    </button>
                  </>
                ) : (
                  <p className="text-[10px] font-label-md text-on-surface-variant text-center px-1">
                    Requires admin review
                  </p>
                )}
                <button
                  onClick={() => setDeleteTarget(post)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-label-md border border-error/40 text-error rounded hover:bg-error hover:text-on-error transition-colors"
                >
                  <i className="fa-solid fa-trash" /> Delete
                </button>
              </div>
            </div>
          );
          })}
        </div>
      )}

      <ReasonModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        title="Send for changes"
        description="This note is sent to the author explaining what needs to change before this can be approved."
        confirmLabel="Send for Changes"
        placeholder="What needs to change?"
        required="true"
      />

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
    </div>
  );
}
