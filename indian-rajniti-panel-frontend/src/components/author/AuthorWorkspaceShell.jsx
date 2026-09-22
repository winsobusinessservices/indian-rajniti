"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS, hasAnyPermission, hasPermission } from "@/lib/permissions";

const STAFF_ROLES = ["AUTHOR", "EDITOR", "ADMIN", "SUBADMIN"];
const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || "https://indianrajniti.in").replace(/\/$/, "");
const ROLE_LABELS = { AUTHOR: "Author", EDITOR: "Editor", ADMIN: "Admin", SUBADMIN: "Subadmin" };

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/author/dashboard", icon: "fa-gauge-high", permission: PERMISSIONS.DASHBOARD },
      { label: "My Content", href: "/author/content", icon: "fa-folder-open", permission: PERMISSIONS.MY_CONTENT },
      { label: "Wallet", href: "/author/wallet", icon: "fa-wallet", roles: ["AUTHOR", "EDITOR"] },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "New Article", href: "/author/create/article", icon: "fa-newspaper", permission: PERMISSIONS.CREATE_ARTICLE },
      { label: "New Blog", href: "/author/create/blog", icon: "fa-pen-nib", permission: PERMISSIONS.CREATE_BLOG },
      { label: "New Video", href: "/author/create/video", icon: "fa-video", permission: PERMISSIONS.CREATE_VIDEO },
    ],
  },
  {
    label: "Editorial Tools",
    items: [
      { label: "Review Queue", href: "/author/review", icon: "fa-clipboard-check", permission: PERMISSIONS.REVIEW_CONTENT },
      { label: "Content History", href: "/author/history", icon: "fa-clock-rotate-left", permission: PERMISSIONS.CONTENT_HISTORY },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Team Members", href: "/author/team", icon: "fa-users-gear", permission: PERMISSIONS.TEAM_MEMBERS },
      { label: "Categories", href: "/author/categories", icon: "fa-folder-tree", permission: PERMISSIONS.MANAGE_CATEGORIES },
      { label: "Policies", href: "/author/policies", icon: "fa-scale-balanced", roles: ["ADMIN"] },
      { label: "Comments", href: "/author/comments", icon: "fa-comments", roles: ["ADMIN"] },
      { label: "Deleted Items", href: "/author/deleted-items", icon: "fa-trash-can-arrow-up", roles: ["ADMIN"] },
      { label: "Posting Limits", href: "/author/posting-limits", icon: "fa-gauge-high", roles: ["ADMIN"] },
      { label: "Site Data", href: "/author/site-data", icon: "fa-database", permission: PERMISSIONS.MANAGE_SITE_DATA },
      { label: "Site Management", href: "/author/site-management", icon: "fa-sliders", roles: ["ADMIN", "SUBADMIN"] },
      { label: "Careers", href: "/author/career", icon: "fa-briefcase", permission: PERMISSIONS.MANAGE_CAREERS },
      { label: "Wallet & Points", href: "/author/wallet-admin", icon: "fa-money-check-dollar", permissions: [PERMISSIONS.MANAGE_WALLETS, PERMISSIONS.MANAGE_POINT_RATES] },
    ],
  },
];

const ROLE_GROUP_ORDER = {
  ADMIN: ["Workspace", "Administration", "Editorial Tools", "Create"],
  SUBADMIN: ["Workspace", "Administration", "Editorial Tools", "Create"],
  AUTHOR: ["Workspace", "Create", "Editorial Tools", "Administration"],
  EDITOR: ["Workspace", "Editorial Tools", "Create", "Administration"],
};

function visibleNavGroups(user) {
  const order = ROLE_GROUP_ORDER[user.role] || NAV_GROUPS.map((group) => group.label);
  return NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        (!item.roles || item.roles.includes(user.role)) &&
        (!item.permission || hasPermission(user, item.permission)) &&
        (!item.permissions || hasAnyPermission(user, item.permissions))
      ),
    }))
    .filter((group) => group.items.length)
    .sort((left, right) => order.indexOf(left.label) - order.indexOf(right.label));
}

function isCurrentPath(pathname, href) {
  if (href === "/author/content") return pathname === href || pathname.startsWith("/author/edit/") || pathname.startsWith("/author/view/");
  return pathname === href;
}

function Sidebar({ user, pathname, onNavigate }) {
  const initials = (user.name || user.role).split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-full flex-col bg-primary text-on-primary">
      <Link href="/author/dashboard" onClick={onNavigate} className="flex items-center gap-3 border-b border-white/15 px-5 py-5">
        <span ><img src="/images/icon.png" alt="" className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-on-secondary" /></span>
        <span><span className="block font-headline-md text-base">Editorial Desk</span><span className="text-[11px] uppercase tracking-[0.16em] text-white/65">Indian Rajneeti</span></span>
      </Link>
      <nav aria-label="Panel navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {visibleNavGroups(user).map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">{group.label}</p>
            <div className="space-y-1">{group.items.map((item) => {
              const active = isCurrentPath(pathname, item.href);
              return <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active ? "bg-white text-primary" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                <span className="flex h-7 w-7 items-center justify-center"><i className={`fa-solid ${item.icon} text-xs`} /></span>{item.label}
              </Link>;
            })}</div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/15 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-on-secondary">{initials}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold">{user.name}</span><span className="block text-xs text-white/65">{ROLE_LABELS[user.role]} account</span></span>
        </div>
        <a href={PUBLIC_SITE_URL} className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"><i className="fa-solid fa-arrow-up-right-from-square" />Open public website</a>
      </div>
    </div>
  );
}

export default function AuthorWorkspaceShell({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const showTools = !loading && Boolean(user) && STAFF_ROLES.includes(user.role) && pathname.startsWith("/author");

  useEffect(() => {
    const openMenu = () => setOpen(true);
    window.addEventListener("open-workspace-menu", openMenu);
    return () => window.removeEventListener("open-workspace-menu", openMenu);
  }, []);

  if (!showTools) return children;
  return (
    <div className="workspace-shell flex min-h-screen flex-col lg:flex-row">
      <aside className="workspace-sidebar fixed inset-y-0 left-0 z-[220] hidden h-screen w-72 overflow-hidden shadow-xl lg:block"><Sidebar user={user} pathname={pathname} /></aside>
      {open && <div className="fixed inset-0 z-[230] lg:hidden">
        <button type="button" aria-label="Close workspace menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/55" />
        <aside className="absolute inset-y-0 left-0 w-72 max-w-[86vw] shadow-2xl"><Sidebar user={user} pathname={pathname} onNavigate={() => setOpen(false)} /></aside>
      </div>}
      <div className="workspace-main relative flex min-h-screen min-w-0 flex-1 flex-col lg:ml-72 lg:w-[calc(100%-18rem)]">{children}</div>
    </div>
  );
}
