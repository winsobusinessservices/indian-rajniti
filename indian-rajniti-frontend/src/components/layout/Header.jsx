"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useIsClient } from "@/hooks/useIsClient";
import { getManagedPages, getPoliticalCalendar, getPoliticalRallys, getSiteHeaderSettings, getSectionVisibility, getSiteNavigation } from "@/features/news/news.api";
import SearchBox from "@/components/search/SearchBox";
import MobileMenu from "./MobileMenu";
import ProfileMenu from "./ProfileMenu";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import HeaderWeather from "@/components/layout/HeaderWeather";
import { useSite } from "@/context/SiteContext";
import { mediaUrl } from "@/lib/api";


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
    <Link href="/political-calendar" className="hidden md:flex flex-col gap-2 items-start group">
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
    <Link href="/political-rallies" className="hidden md:flex flex-col gap-2 items-start group">
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

function HeaderCountdown({ countdown, showRalliesFallback, mobile = false }) {
  const mounted = useIsClient();
  const [now, setNow] = useState(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initialTimer = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);
  if (!mounted || now === null || !countdown?.enabled || !countdown.targetAt) return null;
  const remaining = new Date(countdown.targetAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return showRalliesFallback && !mobile ? <UpcomingRallies /> : null;
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const units = [["Days", days], ["Hrs", hours], ["Min", minutes], ["Sec", seconds]];
  return (
    <Link href={countdown.link || "/elections"} className={`group w-full rounded-lg border border-primary/10 bg-surface-container-low p-2.5 transition-colors hover:border-primary/10 hover:bg-primary/5 ${mobile ? "flex md:hidden" : "hidden max-w-[19rem] md:block"} flex-col`}>
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-headline-md text-sm text-primary"><i className="fa-solid fa-hourglass-half mr-2" />{countdown.title || "Election Results"}</span>
        <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white">Live</span>
      </span>
      <span className="mt-2 grid grid-cols-4 gap-1.5">
        {units.map(([label, value]) => <span key={label} className="rounded border border-outline-variant/25 bg-surface px-1 py-1.5 text-center"><strong className="block text-sm leading-none text-on-surface">{String(value).padStart(2, "0")}</strong><small className="mt-1 block text-[7px] uppercase tracking-wide text-on-surface-variant">{label}</small></span>)}
      </span>
      <span className="mt-2 flex items-center justify-end text-[9px] font-bold uppercase tracking-wide text-primary">{countdown.buttonLabel || "View results"}<i className="fa-solid fa-arrow-right ml-1.5 transition-transform group-hover:translate-x-0.5" /></span>
    </Link>
  );
}



export default function Header() {
  const site = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerSettings, setHeaderSettings] = useState({ showUpcomingRallies: true, showWeather: true, showUpcomingEvents: true, menuItems: [], countdown: { enabled: false } });
  const [featureVisibility, setFeatureVisibility] = useState({});
  const [managedPages, setManagedPages] = useState({});
  const [siteNavigation, setSiteNavigation] = useState({ more: [], legal: [] });
  const profileButtonRef = useRef(null);

  useEffect(() => {
    getSiteHeaderSettings().then((settings) => setHeaderSettings((current) => ({ ...current, ...settings, menuItems: Array.isArray(settings.menuItems) ? settings.menuItems : [], countdown: { ...current.countdown, ...(settings.countdown || {}) } }))).catch(() => {});
    getSectionVisibility().then(setFeatureVisibility).catch(() => {});
    getManagedPages().then(setManagedPages).catch(() => {});
    getSiteNavigation().then(setSiteNavigation).catch(() => {});
  }, []);

  const visibleNavLinks = (headerSettings.menuItems || []).filter((link) => link.enabled !== false && link.label && link.href && (!link.feature || featureVisibility[link.feature] !== false) && (!link.requiresServices || site.services_enabled));

  const openProfileMenu = () => {
    setAnchorRect(profileButtonRef.current.getBoundingClientRect());
    setProfileOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
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
            {headerSettings.countdown?.enabled ? <HeaderCountdown countdown={headerSettings.countdown} showRalliesFallback={headerSettings.showUpcomingRallies} /> : headerSettings.showUpcomingRallies && <UpcomingRallies />}
            {headerSettings.showWeather && <HeaderWeather />}

          </div>

          <Link href="/" className="block justify-self-center flex flex-col items-center gap-1 md:gap-2">
          
            <Image src={site.logo_url ? mediaUrl(site.logo_url) : "/images/logo.png"} alt={site.name} width={160} height={64} className="h-20 md:h-30 w-auto object-contain" priority unoptimized={Boolean(site.logo_url)} />
          </Link>
          <div className="justify-self-end">
            {headerSettings.showUpcomingEvents && <UpcomingEvents />}
          </div>
        </div>
        {headerSettings.countdown?.enabled && (
          <div className="px-4 pt-3 md:hidden">
            <HeaderCountdown countdown={headerSettings.countdown} mobile />
          </div>
        )}
      </div>
    </header>

      <nav
        className="sticky top-0 z-[190] isolate border-b border-outline-variant/30 bg-surface py-2 shadow-sm"
        style={{ position: "sticky", top: 0, zIndex: 190, backgroundColor: "#faf9f7" }}
      >
        <div className="max-w-full mx-auto px-4 md:px-16 gap-10 flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary active:scale-95"
          >
            <i className="fa-solid fa-bars text-lg" aria-hidden="true" />
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap lg:flex">
            {visibleNavLinks.map((link) => {
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

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={visibleNavLinks} featureVisibility={featureVisibility} managedPages={managedPages} siteNavigation={siteNavigation} />

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
