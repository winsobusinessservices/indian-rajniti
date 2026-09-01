"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useIsClient } from "@/hooks/useIsClient";
import { getPoliticalCalendar, getPoliticalRallys, getWeatherSnapshot } from "@/features/news/news.api";
import SearchBox from "@/components/search/SearchBox";
import MobileMenu from "./MobileMenu";
import ProfileMenu from "./ProfileMenu";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import HeaderWeather from "@/components/layout/HeaderWeather";


// Renders only after mount so the server-rendered markup (which has no
// notion of the visitor's clock) never mismatches the client's first paint.
// `now` is computed fresh at render time rather than stored in state — the
// effect only ever schedules a re-render (via the `tick` counter) or sets
// state from an async callback, never synchronously, so there's no
// setState-in-effect cascade to fix.




function UpcomingEvents() {
  const [events, setEvents] = useState([]);


  useEffect(() => {
    getPoliticalCalendar().then((data) => setEvents(data.slice(0, 2)));
  }, []);

  if (!events.length) return null;

  return (
    <Link href="/political-calendar" className="hidden md:flex flex-col gap-2 items-end group">
      <span className="flex items-center gap-2 font-headline-md text-base text-primary group-hover:underline">
        <i className="fa-solid fa-calendar-days" />
        Upcoming Events
      </span>
      {events.map((event) => (
        <div key={event.id} className="flex items-center gap-2 text-sm font-body-md text-on-surface-variant">
          <span className="font-label-md text-xs text-on-primary bg-primary px-2.5 py-1 rounded-sm flex-shrink-0">
            {event.date}
          </span>
          <span className="truncate max-w-[240px] group-hover:text-primary transition-colors">{event.title}</span>
        </div>
      ))}
    </Link>
  );
}

function UpcomingRallies() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    getPoliticalRallys().then((data) => setEvents(data.slice(0, 2)));
  }, []);

  if (!events.length) return null;

  return (
    <Link href="/rallies" className="hidden md:flex flex-col gap-2 items-end group">
      <span className="flex items-center gap-2 font-headline-md text-base text-primary group-hover:underline">
        <i className="fa-solid fa-calendar-days" />
        Upcoming Rallies
      </span>
      {events.map((event) => (
        <div key={event.id} className="flex items-center gap-2 text-sm font-body-md text-on-surface-variant">
          <span className="font-label-md text-xs text-on-primary bg-primary px-2.5 py-1 rounded-sm flex-shrink-0">
            {event.date}
          </span>
          <span className="truncate max-w-[240px] group-hover:text-primary transition-colors">{event.title}</span>
        </div>
      ))}
    </Link>
  );
}



export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileButtonRef = useRef(null);
  const hasWorkspaceSidebar = Boolean(user) && (["AUTHOR", "EDITOR", "ADMIN", "SUBADMIN"].includes(user.role) || user.permissions?.length > 0);

  const openProfileMenu = () => {
    setAnchorRect(profileButtonRef.current.getBoundingClientRect());
    setProfileOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const openWorkspaceMenu = () => {
    window.dispatchEvent(new Event("open-workspace-menu"));
  };



  return (
    <>
    <header
      className="relative w-full bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
      style={{ zIndex: 185, backgroundColor: "#faf9f7" }}
    >
      <div className="w-full bg-surface border-b border-outline-variant/30 py-4">
        <div className="max-w-full mx-auto px-4 md:px-16 grid grid-cols-3 items-center">
          <div className=" flex flex-col items-start">
            <UpcomingRallies />
             <HeaderWeather />

          </div>

          <Link href="/" className="block justify-self-center flex flex-col items-center gap-1 md:gap-2">
          
            <Image src="/images/logo.png" alt="Indian Rajneeti" width={160} height={64} className="h-20 md:h-30 w-auto object-contain" priority />
          </Link>
          <div className="justify-self-end">
            <UpcomingEvents />
          </div>
        </div>
      </div>
    </header>

      <nav
        className="sticky top-0 z-[190] isolate border-b border-outline-variant/30 bg-surface py-2 shadow-sm"
        style={{ position: "sticky", top: 0, zIndex: 190, backgroundColor: "#faf9f7" }}
      >
        <div className={`max-w-full mx-auto px-4  ${hasWorkspaceSidebar?"md:px-2":"md:px-16 gap-10"}  flex min-w-0 items-center justify-between gap-2`}>
          {hasWorkspaceSidebar ? (
            <button
              type="button"
              onClick={openWorkspaceMenu}
              aria-label="Open workspace menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary active:scale-95 lg:invisible"
            >
              <i className="fa-solid fa-bars text-lg" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="text-on-surface-variant hover:text-primary transition-colors hover:scale-110 active:scale-95"
            >
              <i className="fa-solid fa-bars text-lg" />
            </button>
          )}

          <div className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={
                    isActive
                      ? "h-full flex items-center px-1 border-b-2 border-secondary text-primary font-bold py-3"
                      : "h-full flex items-center font-label-md text-on-surface-variant hover:text-primary transition-all px-1 relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300"
                  }
                >
                  {link.label.toUpperCase()}
                </Link>
              );
            })}

          
          </div>
           

          <div className="flex min-w-0 shrink-0 items-center gap-1">

            
                <SearchBox
                  autoFocus
                  onNavigate={() => setSearchOpen(false)}
                  placeholder="Search..."
                  wrapperClassName="w-40"
                  inputClassName="w-full border-b border-outline-variant/50 bg-transparent py-1 text-sm font-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
             

            {!loading && user ? (
              <button
                ref={profileButtonRef}
                onClick={openProfileMenu}
                className="flex min-w-0 items-center gap-2 rounded-full border border-outline-variant/30 py-1 pl-1 pr-2 hover:border-primary transition-colors cursor-pointer sm:pr-3"
              >
                <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
                  <i className="fa-solid fa-user text-white text-sm" />
                </span>
                <span className="hidden font-label-md text-sm text-on-surface max-w-[120px] truncate sm:block">{user.name}</span>
                <i className="fa-solid fa-chevron-down text-[10px] text-on-surface-variant" />
              </button>
            ) : (
              !loading && (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:block font-label-md text-primary border border-primary px-4 py-1 hover:bg-primary hover:text-on-primary transition-all duration-300 cursor-pointer"
                  >
                    LOGIN
                  </Link>
                  <Link
                    href="/register"
                    className="font-label-md text-on-primary bg-primary px-4 py-1.5 hover:bg-primary-container transition-all duration-300 cursor-pointer"
                  >
                    SIGN UP
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {!hasWorkspaceSidebar && <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />}

      {user && (
        <>
          <ProfileMenu
            open={profileOpen}
            anchorRect={anchorRect}
            onClose={() => setProfileOpen(false)}
            user={user}
            onChangePassword={() => setChangePasswordOpen(true)}
            onLogout={handleLogout}
          />
          <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
        </>
      )}
    </>
  );
}
