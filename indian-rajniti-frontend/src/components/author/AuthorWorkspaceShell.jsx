"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { NAV_LINKS, SIDEBAR_CATEGORIES } from "@/lib/constants";
import SearchBox from "@/components/search/SearchBox";
import { slugify } from "@/lib/slugify";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

const CONTRIBUTOR_ROLES = ["AUTHOR", "EDITOR", "ADMIN"];

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/author/dashboard", icon: "fa-gauge-high", permission: PERMISSIONS.DASHBOARD },
      { label: "My Content", href: "/author/content", icon: "fa-folder-open", permission: PERMISSIONS.MY_CONTENT },
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
      { label: "Categories", href: "/author/categories", icon: "fa-tags", permission: PERMISSIONS.MANAGE_CATEGORIES },
      { label: "Site Data", href: "/author/site-data", icon: "fa-database", permission: PERMISSIONS.MANAGE_SITE_DATA },
      { label: "Careers", href: "/author/career", icon: "fa-briefcase", permission: PERMISSIONS.MANAGE_CAREERS },
    ],
  },
];

const ROLE_LABELS = { AUTHOR: "Author", EDITOR: "Editor", ADMIN: "Admin" };

const WEBSITE_ICONS = {
  "/": "fa-house",
  "/parties": "fa-flag",
  "/state": "fa-map-location-dot",
  "/elections": "fa-check-to-slot",
  "/blogs": "fa-book-open",
  "/loksabha": "fa-landmark-dome",
  "/rajyasabha": "fa-building-columns",
  "/rallies": "fa-people-group",
  "/speeches": "fa-microphone-lines",
  "/top-news": "fa-fire",
};

function isCurrentPath(pathname, href) {
  if (href === "/author/content") {
    return pathname === href || pathname.startsWith("/author/edit/") || pathname.startsWith("/author/view/");
  }
  return pathname === href;
}

function SidebarContent({ user, pathname, onNavigate }) {
  const initials = (user?.name || ROLE_LABELS[user?.role] || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col bg-primary text-on-primary">
      <div className="border-b border-white/15 px-5 py-5">
        <Link href="/author/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-on-secondary shadow-sm">
            <i className="fa-solid fa-landmark" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-headline-md text-base leading-tight">Editorial Desk</span>
            <span className="block font-label-md text-[11px] uppercase tracking-[0.16em] text-white/65">Indian Rajneeti</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Workspace and website navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <SearchBox
          onNavigate={onNavigate}
          placeholder="Search the website..."
          wrapperClassName="mb-5 px-1 [&_i]:text-white/60"
          inputClassName="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white/50 focus:outline-none"
        />

        {NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || hasPermission(user, item.permission)) }))
          .filter((group) => group.items.length > 0)
          .map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-2 px-3 font-label-md text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isCurrentPath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 font-label-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      active ? "bg-white text-primary shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-md ${active ? "bg-primary/10" : "bg-white/10 group-hover:bg-white/15"}`}>
                      <i className={`fa-solid ${item.icon} text-xs`} aria-hidden="true" />
                    </span>
                    <span>{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mb-2 border-t border-white/15 pt-5">
          <p className="mb-2 px-3 font-label-md text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Website
          </p>
          <div className="space-y-1">
            {NAV_LINKS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 font-label-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    active ? "bg-white text-primary shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-md ${active ? "bg-primary/10" : "bg-white/10 group-hover:bg-white/15"}`}>
                    <i className={`fa-solid ${WEBSITE_ICONS[item.href] || "fa-link"} text-xs`} aria-hidden="true" />
                  </span>
                  <span>{item.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mb-2 border-t border-white/15 pt-5">
          <p className="mb-2 px-3 font-label-md text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            More
          </p>
          <div className="space-y-1">
            {SIDEBAR_CATEGORIES.more.map((item) => {
              const label = typeof item === "string" ? item : item.label;
              const href = typeof item === "string" ? `/${slugify(label)}` : item.href;
              return (
                <Link key={label} href={href} onClick={onNavigate} className="flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                  <i className="fa-solid fa-chevron-right w-3 text-[9px] text-white/40" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
            <Link href="/more" onClick={onNavigate} className="mt-1 flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 font-label-md text-xs font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white">
              View all
              <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-t border-white/15 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-label-md text-xs font-bold text-on-secondary">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-label-md text-sm font-semibold">{user.name}</span>
            <span className="block text-xs text-white/65">{ROLE_LABELS[user.role]} account</span>
          </span>
        </div>
        <Link href="/" onClick={onNavigate} className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to website
        </Link>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-3">
          {SIDEBAR_CATEGORIES.legal.map((item) => (
            <Link key={item.label} href={item.href} onClick={onNavigate} className="text-[10px] text-white/50 hover:text-white hover:underline">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthorWorkspaceShell({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const showTools = !loading && (CONTRIBUTOR_ROLES.includes(user?.role) || (user?.role === "INVESTOR" && user?.permissions?.length > 0));

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 64rem)");
    const syncDesktop = () => setIsDesktop(desktopQuery.matches);
    syncDesktop();
    desktopQuery.addEventListener("change", syncDesktop);
    return () => desktopQuery.removeEventListener("change", syncDesktop);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    const openWorkspaceMenu = () => setOpen(true);
    window.addEventListener("open-workspace-menu", openWorkspaceMenu);
    return () => window.removeEventListener("open-workspace-menu", openWorkspaceMenu);
  }, []);

  if (!showTools) return children;

  return (
    <div className="workspace-shell flex min-h-screen flex-col lg:flex-row" style={{ width: "100%" }}>
      <aside
        className="workspace-sidebar sticky top-0 z-[220] hidden h-screen w-72 shrink-0 self-start overflow-hidden shadow-xl lg:block"
        style={isDesktop ? {
          display: "block",
          position: "fixed",
          inset: "0 auto 0 0",
          zIndex: 220,
          width: "18rem",
          height: "100dvh",
          overflow: "hidden",
        } : { display: "none" }}
      >
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-[230] lg:hidden">
          <button type="button" aria-label="Close author tools" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/55" />
          <aside role="dialog" aria-modal="true" aria-label="Workspace menu" className="absolute inset-y-0 left-0 w-72 max-w-[86vw] shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close author tools"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            <SidebarContent user={user} pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div
        className="workspace-main flex min-h-screen min-w-0 flex-1 flex-col"
        style={isDesktop ? { width: "calc(100% - 18rem)", marginLeft: "18rem" } : { width: "100%", marginLeft: 0 }}
      >
        {children}
      </div>
    </div>
  );
}
