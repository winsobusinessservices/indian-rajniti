"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || "https://indianrajniti.in").replace(/\/$/, "");

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/20 bg-surface-container-lowest/95 px-4 py-3 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <button
          type="button"
          aria-label="Open workspace menu"
          onClick={() => window.dispatchEvent(new Event("open-workspace-menu"))}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/30 text-primary lg:hidden"
        >
          <i className="fa-solid fa-bars" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-headline-md truncate text-base text-primary">Indian Rajneeti Panel</p>
          <p className="truncate text-xs text-on-surface-variant">{user?.name} · {user?.role}</p>
        </div>
        <a href={PUBLIC_SITE_URL} className="hidden rounded-lg px-3 py-2 text-sm text-primary hover:bg-surface-container sm:inline-flex">
          View website
        </a>
        <button type="button" onClick={handleLogout} className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary hover:bg-primary-container">
          Sign out
        </button>
      </div>
    </header>
  );
}
