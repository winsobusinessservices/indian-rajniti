"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authApi, authorApi } from "@/lib/api";
import { DashboardRowsSkeleton } from "@/components/common/PageSkeletons";

const STATUS_ROWS = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];

function Stat({ label, value, icon }) {
  return <div className="flex items-center gap-3 rounded-lg border border-outline-variant/20 bg-surface-container p-4">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><i className={`fa-solid ${icon}`} /></span>
    <span><strong className="block text-2xl text-on-surface">{value}</strong><span className="text-xs text-on-surface-variant">{label}</span></span>
  </div>;
}

export default function InvestorDashboardClient() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || user?.role !== "INVESTOR") return;
    Promise.all([authorApi.listAllHistory(), authApi.listUsers()])
      .then(([postData, userData]) => {
        setPosts(postData || []);
        setUsers(userData.users || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  const counts = useMemo(() => ({
    articles: posts.filter((post) => post.type === "ARTICLE").length,
    blogs: posts.filter((post) => post.type === "BLOG").length,
    videos: posts.filter((post) => post.type === "VIDEO").length,
    authors: users.filter((member) => member.role === "AUTHOR").length,
    editors: users.filter((member) => member.role === "EDITOR").length,
  }), [posts, users]);

  if (authLoading) return null;
  if (!user) return <div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="mb-3 text-2xl text-primary">Sign in required</h1><Link href="/login" className="bg-primary px-5 py-2 text-on-primary">Sign in</Link></div>;
  if (user.role !== "INVESTOR") return <div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="mb-3 text-2xl text-primary">Investor access only</h1><Link href="/" className="text-primary underline">Back to website</Link></div>;

  return <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-10">
    <h1 className="text-3xl text-primary">Investor Dashboard</h1>
    <p className="mb-8 mt-2 text-on-surface-variant">A read-only view of publishing volume and editorial capacity.</p>
    {error && <p className="mb-6 text-error" role="alert">{error}</p>}
    {loading ? <DashboardRowsSkeleton count={3} /> : <>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Articles" value={counts.articles} icon="fa-newspaper" />
        <Stat label="Blogs" value={counts.blogs} icon="fa-pen-nib" />
        <Stat label="Videos" value={counts.videos} icon="fa-video" />
        <Stat label="Authors" value={counts.authors} icon="fa-user-pen" />
        <Stat label="Editors" value={counts.editors} icon="fa-user-check" />
      </div>
      <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-5">
        <h2 className="mb-4 text-lg text-primary">Editorial status</h2>
        <div className="grid gap-3 sm:grid-cols-4">{STATUS_ROWS.map((status) => <Stat key={status} label={status.toLowerCase()} value={posts.filter((post) => post.status === status).length} icon="fa-chart-simple" />)}</div>
      </section>
    </>}
  </div>;
}
