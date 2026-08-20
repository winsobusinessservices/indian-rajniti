"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authorApi, authApi } from "@/lib/api";
import { SkeletonBlock, SkeletonText } from "@/components/common/Skeleton";
import { DashboardRowsSkeleton } from "@/components/common/PageSkeletons";

const MODERATOR_ROLES = ["EDITOR", "ADMIN"];

const CREATE_CARDS = [
  { type: "article", label: "Article", icon: "fa-newspaper" },
  { type: "blog", label: "Blog", icon: "fa-pen-nib" },
  { type: "video", label: "Video", icon: "fa-video" },
];

const TYPE_ICON = {
  ARTICLE: "fa-newspaper",
  BLOG: "fa-pen-nib",
  VIDEO: "fa-video",
};

const STATUS_BADGE = {
  DRAFT: "bg-outline-variant text-on-surface",
  PENDING: "bg-yellow-500 text-black",
  APPROVED: "bg-green-600 text-white",
  REJECTED: "bg-error text-on-error",
};

// Same colors as MyPostsClient's status badges, reused here so a bar and a
// badge for the same status always match — a chart shouldn't invent its own
// palette when the product already has one for this exact meaning.
const STATUS_ROWS = [
  { key: "DRAFT", label: "Draft", barClass: "bg-outline-variant" },
  { key: "PENDING", label: "Pending", barClass: "bg-yellow-500" },
  { key: "APPROVED", label: "Approved", barClass: "bg-green-600" },
  { key: "REJECTED", label: "Rejected", barClass: "bg-error" },
];

// Only approved (published) work earns points — draft/pending/rejected count
// toward the totals above but not here, so points track published output.
const POINTS_PER_TYPE = { ARTICLE: 10, BLOG: 5, VIDEO: 15 };

function StatTile({ label, value, icon }) {
  return (
    <div className="p-4 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center gap-3">
      <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <i className={`fa-solid ${icon} text-primary`} />
      </span>
      <div>
        {/* font-body-md is the sans (Inter) token — stat values stay sans
            per convention, never the site's serif display face. */}
        <p className="font-body-md text-2xl font-semibold text-on-surface leading-tight">{value}</p>
        <p className="font-label-md text-xs text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}

function StatusBarChart({ counts }) {
  const max = Math.max(1, ...STATUS_ROWS.map((row) => counts[row.key] || 0));

  return (
    <div className="space-y-3">
      {STATUS_ROWS.map((row) => {
        const count = counts[row.key] || 0;
        return (
          <div key={row.key} className="flex items-center gap-3">
            <span className="w-20 flex-shrink-0 font-label-md text-xs text-on-surface-variant">{row.label}</span>
            <div
              className="flex-grow h-5 bg-surface-container-low rounded-full overflow-hidden"
              title={`${row.label}: ${count}`}
            >
              <div
                className={`h-full rounded-full ${row.barClass} transition-all`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right font-body-md text-sm text-on-surface tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function PointsCard({ points, approvedByType }) {
  return (
    <div className="p-6 bg-gradient-to-br from-primary to-primary-container rounded-lg text-on-primary flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
      <div>
        <p className="font-label-md text-xs uppercase tracking-widest text-on-primary/80 mb-1">Collected Points</p>
        {/* Hero figure: sans, ≥48px, exactly one per view. */}
        <p className="font-body-lg text-5xl font-bold">{points.toLocaleString()}</p>
      </div>
      <div className="flex flex-col gap-1 text-sm font-body-md text-on-primary/90 sm:border-l sm:border-white/20 sm:pl-8">
        <span>{approvedByType.ARTICLE} approved article{approvedByType.ARTICLE === 1 ? "" : "s"} × {POINTS_PER_TYPE.ARTICLE} pts</span>
        <span>{approvedByType.BLOG} approved blog{approvedByType.BLOG === 1 ? "" : "s"} × {POINTS_PER_TYPE.BLOG} pts</span>
        <span>{approvedByType.VIDEO} approved video{approvedByType.VIDEO === 1 ? "" : "s"} × {POINTS_PER_TYPE.VIDEO} pts</span>
      </div>
    </div>
  );
}

const ROLE_LABEL = { AUTHOR: "Author", EDITOR: "Editor", ADMIN: "Admin", INVESTOR:"Investor" };

export default function AuthorDashboardClient() {
  const { user } = useAuth();
  const isModerator = MODERATOR_ROLES.includes(user?.role);
  const isAdmin = user?.role === "ADMIN";
  const isInvestor = user?.role === "INVESTOR";
  const roleLabel = ROLE_LABEL[user?.role] || "Author";
  const [posts, setPosts] = useState([]);
  const [userCounts, setUserCounts] = useState({ total: 0, authors: 0, editors: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // GET /:resource is always self-scoped now (own content only, regardless
  // of role) — an admin's (and, read-only, an investor's) dashboard should
  // reflect everything they actually have access to, so it uses the
  // moderator/investor-only history endpoint (every author, every status)
  // instead of the personal one everyone else gets.
  useEffect(() => {
    const request = isAdmin || isInvestor ? authorApi.listAllHistory() : authorApi.listAllTypes();
    request
      .then(setPosts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin, isInvestor]);

  // Investor-only: the site's user totals (total/authors/editors), read-only.
  useEffect(() => {
    if (!isInvestor) return;
    authApi
      .listUsers()
      .then((data) => {
        const users = data.users || [];
        setUserCounts({
          total: users.length,
          authors: users.filter((u) => u.role === "AUTHOR").length,
          editors: users.filter((u) => u.role === "EDITOR").length,
        });
      })
      .catch((err) => setError(err.message));
  }, [isInvestor]);

  const typeCounts = { ARTICLE: 0, BLOG: 0, VIDEO: 0 };
  const statusCounts = { DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
  const approvedByType = { ARTICLE: 0, BLOG: 0, VIDEO: 0 };

  posts.forEach((post) => {
    typeCounts[post.type] = (typeCounts[post.type] || 0) + 1;
    statusCounts[post.status] = (statusCounts[post.status] || 0) + 1;
    if (post.status === "APPROVED") approvedByType[post.type] = (approvedByType[post.type] || 0) + 1;
  });

  const totalPoints = Object.entries(approvedByType).reduce(
    (sum, [type, count]) => sum + count * POINTS_PER_TYPE[type],
    0
  );

  const recentPosts = posts.slice(0, 6);

  return (
    <div className="max-w-full mx-auto px-4 md:px-16 py-10">
      <h1 className="font-display-lg text-3xl text-primary mb-2">{roleLabel} Dashboard</h1>
      <p className="font-body-md text-on-surface-variant mb-8">
        {isInvestor
          ? "Read-only, site-wide totals across users, content, and review status."
          : isAdmin
            ? "Site-wide overview of every author's articles, blogs, and videos, at every stage."
            : "Create new content, or manage everything you've already submitted."}
      </p>

      {isModerator && !loading && (
        <Link
          href="/author/review"
          className={`flex items-center gap-3 p-5 rounded-lg border-2 transition-all mb-8 ${
            statusCounts.PENDING > 0
              ? "border-yellow-500/50 bg-yellow-500/10 hover:border-yellow-500"
              : "border-outline-variant/30 bg-surface-container-low hover:border-primary/50"
          }`}
        >
          <span
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              statusCounts.PENDING > 0 ? "bg-yellow-500 text-black" : "bg-green-600 text-white"
            }`}
          >
            <i className={`fa-solid ${statusCounts.PENDING > 0 ? "fa-clipboard-check" : "fa-circle-check"}`} />
          </span>
          <div className="flex-grow">
            <h3 className="font-headline-md text-base text-on-surface">Review Queue</h3>
            <p className="font-body-md text-xs text-on-surface-variant">
              {statusCounts.PENDING > 0
                ? `${statusCounts.PENDING} submission${statusCounts.PENDING === 1 ? "" : "s"} from authors waiting on your review`
                : "All caught up — nothing pending review"}
            </p>
          </div>
          <i className="fa-solid fa-arrow-right text-on-surface-variant" />
        </Link>
      )}

      {error && (
        <p className="text-sm text-error font-body-md mb-6" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div aria-hidden="true" className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-20" />
            ))}
          </div>
          <SkeletonBlock className="h-24 mb-8" />
          <SkeletonBlock className="h-32 mb-10" />
          <SkeletonText className="w-40 h-6 mb-4" />
          <DashboardRowsSkeleton count={3} />
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatTile label="Articles" value={typeCounts.ARTICLE} icon="fa-newspaper" />
            <StatTile label="Blogs" value={typeCounts.BLOG} icon="fa-pen-nib" />
            <StatTile label="Videos" value={typeCounts.VIDEO} icon="fa-video" />
            <StatTile label={isAdmin || isInvestor ? "Total (Site-Wide)" : "Total Posts"} value={posts.length} icon="fa-layer-group" />
          </div>

          {/* Investor-only: site-wide user/approval totals — the whole
              reason this role has a dashboard at all. Read-only, no links. */}
          {isInvestor && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
              <StatTile label="Total Users" value={userCounts.total} icon="fa-users" />
              <StatTile label="Authors" value={userCounts.authors} icon="fa-pen-nib" />
              <StatTile label="Editors" value={userCounts.editors} icon="fa-user-tie" />
              <StatTile label="Approved" value={statusCounts.APPROVED} icon="fa-circle-check" />
              <StatTile label="Rejected" value={statusCounts.REJECTED} icon="fa-circle-xmark" />
            </div>
          )}

          {/* Collected points — a personal author incentive, so it's not
              shown for admin/investor, where it'd just be "everyone's points
              added up," not a meaningful number for anyone. */}
          {!isAdmin && !isInvestor && (
            <div className="mb-8">
              <PointsCard points={totalPoints} approvedByType={approvedByType} />
            </div>
          )}

          {/* Status breakdown */}
          <div className="mb-10 p-5 bg-surface-container-low/60 rounded-lg border border-outline-variant/15">
            <h2 className="font-headline-md text-sm text-primary uppercase tracking-wide mb-4">
              {isAdmin || isInvestor ? "Site-Wide Review Status" : "Review Status"}
            </h2>
            <StatusBarChart counts={statusCounts} />
          </div>
        </>
      )}

      {/* Quick actions and Recent Posts are write-oriented (create, edit,
          review, navigate into individual posts) — Investors get totals
          only, per the role's read-only scope. */}
      {!isInvestor && (
        <>
          <h2 className="font-headline-lg text-primary text-xl mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {CREATE_CARDS.map((card) => (
              <Link
                key={card.type}
                href={`/author/create/${card.type}`}
                className="flex items-center gap-3 p-5 rounded-lg border-2 border-outline-variant/30 bg-surface-container hover:border-primary/50 transition-all"
              >
                <span className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                  <i className={`fa-solid ${card.icon}`} />
                </span>
                <div>
                  <h3 className="font-headline-md text-base text-on-surface">Create {card.label}</h3>
                  <p className="font-body-md text-xs text-on-surface-variant">New {card.label.toLowerCase()} draft</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            <Link
              href="/author/content"
              className="flex items-center gap-3 p-5 rounded-lg border-2 border-outline-variant/30 bg-surface-container-low hover:border-primary/50 transition-all"
            >
              <span className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-list" />
              </span>
              <div>
                <h3 className="font-headline-md text-base text-on-surface">My Content</h3>
                <p className="font-body-md text-xs text-on-surface-variant">
                  View, edit, delete, and submit your own articles, blogs, and videos
                </p>
              </div>
            </Link>

            {isModerator && (
              <Link
                href="/author/history"
                className="flex items-center gap-3 p-5 rounded-lg border-2 border-outline-variant/30 bg-surface-container-low hover:border-primary/50 transition-all"
              >
                <span className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-clock-rotate-left" />
                </span>
                <div>
                  <h3 className="font-headline-md text-base text-on-surface">Content History</h3>
                  <p className="font-body-md text-xs text-on-surface-variant">
                    Every author&apos;s content, at every stage, with full review history
                  </p>
                </div>
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/author/team"
                className="flex items-center gap-3 p-5 rounded-lg border-2 border-outline-variant/30 bg-surface-container-low hover:border-primary/50 transition-all"
              >
                <span className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-user-plus" />
                </span>
                <div>
                  <h3 className="font-headline-md text-base text-on-surface">Add Team Member</h3>
                  <p className="font-body-md text-xs text-on-surface-variant">
                    Create an Author, Editor, or Investor account with their required documents
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* Recent posts */}
          {!loading && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-lg text-primary text-xl">{isAdmin ? "Recent Activity" : "Recent Posts"}</h2>
                <Link
                  href={isAdmin ? "/author/history" : "/author/content"}
                  className="font-label-sm text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  VIEW ALL <i className="fa-solid fa-arrow-right text-xs" />
                </Link>
              </div>

              {recentPosts.length === 0 ? (
                <p className="font-body-md text-on-surface-variant">
                  {isAdmin
                    ? "No content has been submitted by anyone yet."
                    : "Nothing here yet — create your first article, blog, or video above."}
                </p>
              ) : (
                <div className="space-y-3">
                  {recentPosts.map((post) => (
                    <Link
                      key={`${post.type}-${post.id}`}
                      href={`/author/view/${post.type.toLowerCase()}/${post.id}${isAdmin ? "?from=history" : ""}`}
                      className="flex items-center gap-4 p-4 bg-surface-container rounded-lg border border-outline-variant/20 hover:border-primary/40 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <i className={`fa-solid ${TYPE_ICON[post.type]} text-primary`} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${STATUS_BADGE[post.status]}`}>
                            {post.status}
                          </span>
                          <span className="text-[10px] font-label-md text-on-surface-variant uppercase">{post.type}</span>
                          {isAdmin && post.author_name && (
                            <span className="text-[10px] font-body-md text-on-surface-variant">by {post.author_name}</span>
                          )}
                        </div>
                        <h3 className="font-headline-md text-sm text-on-surface truncate">{post.title}</h3>
                      </div>
                      <span className="text-xs font-body-md text-on-surface-variant flex-shrink-0">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
