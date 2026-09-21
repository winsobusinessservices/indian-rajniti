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

const postKey = (post) => `${post.type}:${post.id}`;

function localDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

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
  const [selected, setSelected] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [scheduleAt, setScheduleAt] = useState("");

  useEffect(() => {
    authorApi
      .listAllHistory({ status: "PENDING" })
      .then((items) => setPosts(items.filter((post) => !post.scheduled_publish_at)))
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
      setSelected((current) => {
        const next = new Set(current);
        next.delete(postKey(post));
        return next;
      });
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
    setSelected((current) => {
      const next = new Set(current);
      next.delete(`${type}:${id}`);
      return next;
    });
    setRejectTarget(null);
  };

  const handleDelete = async (reason) => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    await authorApi.deletePost(type, id, reason);
    setPosts((prev) => prev.filter((p) => !(p.type === type && p.id === id)));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(`${type}:${id}`);
      return next;
    });
    setDeleteTarget(null);
  };

  const openSchedule = (post) => {
    setScheduleTarget(post);
    setScheduleAt(post.scheduled_publish_at
      ? localDateTimeValue(new Date(post.scheduled_publish_at))
      : localDateTimeValue(new Date(Date.now() + 30 * 60 * 1000)));
    setActionError("");
  };

  const handleSchedule = async () => {
    if (!scheduleTarget || !scheduleAt) return;
    setActionError("");
    try {
      await authorApi.reviewPost(scheduleTarget.type, scheduleTarget.id, {
        action: "SCHEDULE",
        scheduledPublishAt: new Date(scheduleAt).toISOString(),
      });
      setPosts((current) => current.filter((post) => postKey(post) !== postKey(scheduleTarget)));
      setScheduleTarget(null);
      setScheduleAt("");
    } catch (err) {
      setActionError(err.message);
    }
  };

  const selectedPosts = posts.filter((post) => selected.has(postKey(post)));
  const hasRestrictedSelection = user?.role !== "ADMIN" && selectedPosts.some((post) => post.author_role !== "AUTHOR");
  const hasNonOwnedSelection = user?.role !== "ADMIN" && selectedPosts.some(
    (post) => Number(post.author_id) !== Number(user?.id)
  );

  const toggleSelected = (post) => {
    setSelected((current) => {
      const next = new Set(current);
      const key = postKey(post);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selectedPosts.length === posts.length ? new Set() : new Set(posts.map(postKey)));
  };

  const handleBulkAction = async (notes) => {
    if (!bulkAction || selectedPosts.length === 0) return;
    setActionError("");
    const data = await authorApi.bulkModerate(
      bulkAction,
      selectedPosts.map((post) => ({ type: post.type, id: post.id })),
      notes
    );
    const processed = new Set(data.processed.map((item) => `${item.type}:${item.id}`));
    setPosts((current) => current.filter((post) => !processed.has(postKey(post))));
    setSelected(new Set());
    setBulkAction(null);
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
        {user?.role === "EDITOR"
          ? "Pending content from the authors assigned to you."
          : "Every article, blog, and video submitted for review, waiting on you."}
      </p>

      {actionError && (
        <p className="text-sm text-error font-body-md mb-4" role="alert">
          {actionError}
        </p>
      )}

      {!loading && posts.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/25 bg-surface-container-low p-3">
          <label className="flex min-h-9 cursor-pointer items-center gap-2 px-2 font-label-md text-sm text-on-surface">
            <input type="checkbox" checked={selectedPosts.length === posts.length} onChange={toggleAll} className="h-4 w-4 accent-primary" />
            Select all
          </label>
          <span className="font-body-md text-xs text-on-surface-variant">{selectedPosts.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedPosts.length || hasRestrictedSelection}
              onClick={() => setBulkAction("APPROVE")}
              title={hasRestrictedSelection ? "Editors cannot approve content submitted by Editors or Admins" : undefined}
              className="min-h-9 rounded bg-green-600 px-3 font-label-md text-xs text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              <i className="fa-solid fa-check mr-1.5" />Approve
            </button>
            <button
              type="button"
              disabled={!selectedPosts.length || hasRestrictedSelection}
              onClick={() => setBulkAction("REJECT")}
              className="min-h-9 rounded bg-yellow-500 px-3 font-label-md text-xs text-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              <i className="fa-solid fa-rotate-left mr-1.5" />Reject
            </button>
            <button
              type="button"
              disabled={!selectedPosts.length || hasNonOwnedSelection}
              onClick={() => setBulkAction("DELETE")}
              title={hasNonOwnedSelection ? "Authors and editors can only delete their own content" : undefined}
              className="min-h-9 rounded border border-error/40 px-3 font-label-md text-xs text-error hover:bg-error hover:text-on-error disabled:cursor-not-allowed disabled:opacity-45"
            >
              <i className="fa-solid fa-trash mr-1.5" />Delete
            </button>
          </div>
        </div>
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
              <input
                type="checkbox"
                checked={selected.has(postKey(post))}
                onChange={() => toggleSelected(post)}
                aria-label={`Select ${post.title}`}
                className="mt-3 h-4 w-4 shrink-0 accent-primary"
              />
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
                  {post.scheduled_publish_at && (
                    <span className="text-[10px] font-body-md text-on-surface-variant">
                      <i className="fa-solid fa-clock mr-1" />Scheduled {new Date(post.scheduled_publish_at).toLocaleString()}
                    </span>
                  )}
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
                    {(post.type === "ARTICLE" || post.type === "BLOG") && (
                      <button
                        onClick={() => openSchedule(post)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-label-md border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors"
                      >
                        <i className="fa-solid fa-calendar-clock" /> {post.scheduled_publish_at ? "Reschedule" : "Schedule"}
                      </button>
                    )}
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
                {(user?.role === "ADMIN" || Number(post.author_id) === Number(user?.id)) && (
                  <button
                    onClick={() => setDeleteTarget(post)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-label-md border border-error/40 text-error rounded hover:bg-error hover:text-on-error transition-colors"
                  >
                    <i className="fa-solid fa-trash" /> Delete
                  </button>
                )}
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

      {scheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
          <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
            <h2 id="schedule-title" className="font-headline-lg text-xl text-primary">Schedule approval &amp; publication</h2>
            <p className="mt-2 font-body-md text-sm text-on-surface-variant">
              This content will remain pending and private until the selected time, then approve and publish automatically.
            </p>
            <label htmlFor="scheduled-publication-time" className="mt-5 block font-label-md text-xs text-on-surface-variant">
              Publication date and time
            </label>
            <input
              id="scheduled-publication-time"
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              className="mt-1.5 w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-on-surface outline-none focus:border-primary"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setScheduleTarget(null)} className="rounded border border-outline-variant/40 px-4 py-2 font-label-md text-sm">
                Cancel
              </button>
              <button type="button" onClick={handleSchedule} disabled={!scheduleAt} className="rounded bg-primary px-4 py-2 font-label-md text-sm text-on-primary disabled:opacity-50">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      <ReasonModal
        open={!!bulkAction}
        onClose={() => setBulkAction(null)}
        onConfirm={handleBulkAction}
        title={`${bulkAction === "APPROVE" ? "Approve" : bulkAction === "REJECT" ? "Reject" : "Delete"} ${selectedPosts.length} selected item${selectedPosts.length === 1 ? "" : "s"}?`}
        description={bulkAction === "DELETE" ? "Selected content will be moved to Deleted Items and can be restored by an Admin." : "This action will be applied to every selected item."}
        confirmLabel={bulkAction === "APPROVE" ? "Approve All" : bulkAction === "REJECT" ? "Reject All" : "Delete All"}
        placeholder={bulkAction === "REJECT" ? "Explain what the authors need to change..." : "Why is this content being deleted?"}
        required={bulkAction !== "APPROVE"}
        danger={bulkAction === "DELETE"}
      />

      <ReasonModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this post?"
        description="This post will move to Deleted Items and can be restored by an Admin."
        confirmLabel="Delete"
        placeholder="Why is this being deleted?"
        danger
        required="true"
      />
    </div>
  );
}
