"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { NAV_LINKS } from "@/lib/constants";
import { siteManagementApi } from "@/lib/api";
import { HomeWidgetsAdmin } from "@/components/author/ReferenceDataAdminClient";

const DEFAULT_HEADER = {
  showUpcomingRallies: true,
  showWeather: true,
  showUpcomingEvents: true,
  navItems: {},
  countdown: { enabled: false, title: "Election Results", targetAt: "", link: "/elections", buttonLabel: "View results" },
};

const inputClass = "mt-1.5 w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none";

function dateTimeInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant/25 bg-surface px-4 py-3">
      <div>
        <p className="font-label-md text-sm text-on-surface">{label}</p>
        {description && <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={`${checked ? "Disable" : "Enable"} ${label}`} disabled={disabled} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-primary" : "bg-outline-variant"}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function CountdownPreview({ countdown }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initialTimer = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); };
  }, []);
  const target = new Date(countdown.targetAt || "").getTime();
  const remaining = now === null || !Number.isFinite(target) ? 0 : Math.max(0, target - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const units = [
    ["Days", Math.floor(totalSeconds / 86400)],
    ["Hours", Math.floor((totalSeconds % 86400) / 3600)],
    ["Minutes", Math.floor((totalSeconds % 3600) / 60)],
    ["Seconds", totalSeconds % 60],
  ];
  return (
    <div className="rounded-lg border border-primary/25 bg-surface-container-low p-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Header preview</span>
          <i className="fa-solid fa-hourglass-half text-primary" aria-hidden="true" />
        </div>
        <h3 className="mt-3 truncate font-headline-md text-base text-primary">{countdown.title || "Election Results"}</h3>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {units.map(([label, value]) => <div key={label} className="rounded-md border border-outline-variant/25 bg-surface px-1 py-2 text-center"><strong className="block text-lg leading-none text-on-surface">{String(value).padStart(2, "0")}</strong><span className="mt-1 block text-[8px] uppercase tracking-wide text-on-surface-variant">{label}</span></div>)}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs"><span className="text-on-surface-variant">{countdown.enabled ? "Visible in website header" : "Currently disabled"}</span><span className="font-label-md text-primary">{countdown.buttonLabel || "View results"} <i className="fa-solid fa-arrow-right ml-1" /></span></div>
      </div>
    </div>
  );
}

export default function SiteManagementClient() {
  const { user } = useAuth();
  const [data, setData] = useState({ widgets: {}, sections: [] });
  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingSection, setUpdatingSection] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await siteManagementApi.get();
    setData(result);
    setHeader({
      ...DEFAULT_HEADER,
      ...(result.widgets?.site_header || {}),
      navItems: { ...(result.widgets?.site_header?.navItems || {}) },
      countdown: { ...DEFAULT_HEADER.countdown, ...(result.widgets?.site_header?.countdown || {}) },
    });
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    siteManagementApi.get()
      .then((result) => {
        if (!active) return;
        setData(result);
        setHeader({ ...DEFAULT_HEADER, ...(result.widgets?.site_header || {}), navItems: { ...(result.widgets?.site_header?.navItems || {}) }, countdown: { ...DEFAULT_HEADER.countdown, ...(result.widgets?.site_header?.countdown || {}) } });
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const saveHeader = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await siteManagementApi.updateHeader(header);
      setHeader(result.header);
      setMessage("Header and countdown settings saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = async (section) => {
    setUpdatingSection(section.section_key);
    setError("");
    try {
      await siteManagementApi.setSectionVisibility(section.section_key, !Boolean(section.is_visible));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingSection("");
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-surface-container-low" aria-label="Loading site management" />;

  return (
    <div className="space-y-8">
      {(error || message) && <p role={error ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${error ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>{error || message}</p>}

      <form onSubmit={saveHeader} inert={saving} aria-busy={saving} className="rounded-xl border border-primary/25 bg-surface-container-low/60 p-4 sm:p-6">
        <h2 className="font-headline-lg text-xl text-primary">Header &amp; Menu</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Control the content beside the logo and every main navigation item.</p>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Toggle label="Upcoming rallies" description="Shown to the left of the logo when the countdown is off." checked={header.showUpcomingRallies} onChange={(value) => setHeader((current) => ({ ...current, showUpcomingRallies: value }))} />
          <Toggle label="Weather" description="Weather beneath the left header content." checked={header.showWeather} onChange={(value) => setHeader((current) => ({ ...current, showWeather: value }))} />
          <Toggle label="Upcoming events" description="Shown to the right of the logo." checked={header.showUpcomingEvents} onChange={(value) => setHeader((current) => ({ ...current, showUpcomingEvents: value }))} />
        </div>

        <h3 className="mt-7 font-headline-md text-base text-primary">Header menu items</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {NAV_LINKS.map((item) => (
            <Toggle key={item.href} label={item.label} checked={header.navItems[item.href] !== false} onChange={(value) => setHeader((current) => ({ ...current, navItems: { ...current.navItems, [item.href]: value } }))} />
          ))}
        </div>

        <div className="mt-7 rounded-xl border border-outline-variant/30 bg-surface p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
            <div>
              <Toggle label="Header countdown timer" description="When enabled, this replaces Upcoming Rallies beside the logo." checked={header.countdown.enabled} onChange={(value) => setHeader((current) => ({ ...current, countdown: { ...current.countdown, enabled: value } }))} />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-label-md text-on-surface-variant">Countdown title<input className={inputClass} value={header.countdown.title} onChange={(event) => setHeader((current) => ({ ...current, countdown: { ...current.countdown, title: event.target.value } }))} required={header.countdown.enabled} /></label>
            <label className="text-xs font-label-md text-on-surface-variant">Result/event date and time<input type="datetime-local" className={inputClass} value={dateTimeInputValue(header.countdown.targetAt)} onChange={(event) => setHeader((current) => ({ ...current, countdown: { ...current.countdown, targetAt: event.target.value ? new Date(event.target.value).toISOString() : "" } }))} required={header.countdown.enabled} /></label>
            <label className="text-xs font-label-md text-on-surface-variant">Click destination<input className={inputClass} placeholder="/elections or https://..." value={header.countdown.link} onChange={(event) => setHeader((current) => ({ ...current, countdown: { ...current.countdown, link: event.target.value } }))} /></label>
            <label className="text-xs font-label-md text-on-surface-variant">Link label<input className={inputClass} value={header.countdown.buttonLabel} onChange={(event) => setHeader((current) => ({ ...current, countdown: { ...current.countdown, buttonLabel: event.target.value } }))} /></label>
              </div>
            </div>
            <CountdownPreview countdown={header.countdown} />
          </div>
        </div>
        <button disabled={saving} className="mt-5 rounded-md bg-primary px-5 py-2.5 text-sm font-label-md text-on-primary disabled:opacity-60">{saving ? "Saving…" : "Save Header Settings"}</button>
      </form>

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-4 sm:p-6">
        <h2 className="font-headline-lg text-xl text-primary">Homepage Section Visibility</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Enable or disable complete sections on the public homepage.</p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data.sections || []).map((section) => <Toggle key={section.section_key} label={section.label} checked={Boolean(section.is_visible)} disabled={updatingSection === section.section_key} onChange={() => toggleSection(section)} />)}
        </div>
      </section>

      <HomeWidgetsAdmin widgets={data.widgets} onReload={load} user={user} />
    </div>
  );
}
