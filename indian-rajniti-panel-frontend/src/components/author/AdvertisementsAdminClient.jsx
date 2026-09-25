"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminSite } from "@/context/AdminSiteContext";
import { mediaUrl, referenceAdminApi, siteManagementApi } from "@/lib/api";

const PLACEMENTS = [
  { value: "home_leaderboard_desktop", label: "Homepage — desktop banner", size: "728 × 90 px" },
  { value: "home_leaderboard_mobile", label: "Homepage — mobile banner", size: "320 × 50 px" },
  { value: "home_sidebar_rectangle", label: "Homepage — right sidebar", size: "300 × 250 px" },
  { value: "article_left_rectangle", label: "Article page — left sidebar", size: "300 × 250 px" },
  { value: "article_right_skyscraper", label: "Article page — right sidebar", size: "300 × 600 px" },
  { value: "category_left_rectangle", label: "Category/topic page — left sidebar", size: "300 × 250 px" },
  { value: "category_right_skyscraper", label: "Category/topic page — right sidebar", size: "300 × 600 px" },
  { value: "listing_sidebar_rectangle", label: "Listing pages — right sidebar", size: "300 × 250 px" },
  { value: "sitewide_footer_leaderboard", label: "All pages — one ad above footer", size: "728 × 90 px" },
];

const EMPTY_FORM = {
  name: "",
  advertiser: "",
  title: "",
  description: "",
  ctaLabel: "Learn more",
  placement: PLACEMENTS[0].value,
  destinationUrl: "",
  altText: "",
  startAt: "",
  endAt: "",
  enabled: true,
  posterUrl: "",
};

function campaignStatus(advertisement) {
  if (!advertisement.enabled) return { label: "Inactive", className: "bg-surface-container-high text-on-surface-variant" };
  const now = Date.now();
  if (advertisement.startAt && new Date(advertisement.startAt).getTime() > now) return { label: "Scheduled", className: "bg-tertiary-container text-on-tertiary-container" };
  if (advertisement.endAt && new Date(advertisement.endAt).getTime() < now) return { label: "Ended", className: "bg-error-container text-on-error-container" };
  return { label: "Live", className: "bg-secondary-container text-on-secondary-container" };
}

function displayDate(value) {
  if (!value) return "No limit";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function AdvertisementsAdminClient() {
  const { activeSite, activeSiteId } = useAdminSite();
  const [advertisements, setAdvertisements] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [poster, setPoster] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [loadedSiteId, setLoadedSiteId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeSiteId) return;
    let active = true;
    siteManagementApi.get(activeSiteId)
      .then((data) => { if (active) setAdvertisements(Array.isArray(data.widgets?.advertisements) ? data.widgets.advertisements : []); })
      .finally(() => { if (active) setLoadedSiteId(String(activeSiteId)); });
    return () => { active = false; };
  }, [activeSiteId]);

  const loading = String(activeSiteId) !== loadedSiteId;

  const selectedPlacement = useMemo(() => PLACEMENTS.find((item) => item.value === form.placement), [form.placement]);
  const placementOccupant = useMemo(
    () => advertisements.find((item) => item.id !== editingId && item.enabled && item.placement === form.placement),
    [advertisements, editingId, form.placement]
  );
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function resetForm() {
    setForm(EMPTY_FORM);
    setPoster(null);
    setEditingId("");
    setError("");
  }

  function editAdvertisement(advertisement) {
    setEditingId(advertisement.id);
    setForm({ ...EMPTY_FORM, ...advertisement, placement: advertisement.placement || advertisement.placements?.[0] || EMPTY_FORM.placement, startAt: toDateTimeInput(advertisement.startAt), endAt: toDateTimeInput(advertisement.endAt) });
    setPoster(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function persist(nextAdvertisements) {
    const response = await referenceAdminApi.updateHomeWidget("advertisements", nextAdvertisements, activeSiteId);
    setAdvertisements(response.data || nextAdvertisements);
  }

  async function submit(event) {
    event.preventDefault();
    if (!poster && !form.posterUrl) return;
    if (form.enabled && placementOccupant) {
      setError(`This location is already used by “${placementOccupant.title || placementOccupant.name}”. Pause, remove, or move that advertisement first.`);
      return;
    }
    setError("");
    setSaving(true);
    try {
      let posterUrl = form.posterUrl;
      if (poster) {
        const body = new FormData();
        body.append("poster", poster);
        posterUrl = (await referenceAdminApi.uploadAdvertisementPoster(body)).posterUrl;
      }
      const advertisement = {
        ...form,
        id: editingId || `advertisement-${Date.now()}`,
        posterUrl,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : "",
        endAt: form.endAt ? new Date(form.endAt).toISOString() : "",
      };
      const next = editingId
        ? advertisements.map((item) => item.id === editingId ? advertisement : item)
        : [advertisement, ...advertisements];
      await persist(next);
      resetForm();
    } catch (err) {
      setError(err.message || "Unable to save the advertisement");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdvertisement(advertisement) {
    setError("");
    try {
      await persist(advertisements.map((item) => item.id === advertisement.id ? { ...item, enabled: !item.enabled } : item));
    } catch (err) {
      setError(err.message || "Unable to change the advertisement status");
    }
  }

  async function removeAdvertisement(advertisement) {
    if (!window.confirm(`Remove “${advertisement.name}”?`)) return;
    await persist(advertisements.filter((item) => item.id !== advertisement.id));
    if (editingId === advertisement.id) resetForm();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <form onSubmit={submit} className="h-fit rounded-xl border border-outline-variant/40 bg-surface p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><h2 className="font-headline-md text-xl text-on-surface">{editingId ? "Edit advertisement" : "Add advertisement"}</h2><p className="mt-1 text-sm text-on-surface-variant">For {activeSite?.name || "the active website"}</p></div>
          {editingId && <button type="button" onClick={resetForm} className="text-sm font-semibold text-primary hover:underline">Cancel</button>}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-on-surface">Campaign name
            <input required value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Election week banner" className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-on-surface">Advertiser
            <input value={form.advertiser} onChange={(event) => setField("advertiser", event.target.value)} placeholder="Business or organisation name" className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-on-surface">Display title
            <input required value={form.title || ""} onChange={(event) => setField("title", event.target.value)} placeholder="Headline shown on the advertisement" className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-on-surface">Description
            <textarea required value={form.description || ""} onChange={(event) => setField("description", event.target.value)} rows={3} placeholder="Short supporting message" className="mt-1.5 w-full resize-y rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-on-surface">Display location
            <select required value={form.placement} onChange={(event) => { setField("placement", event.target.value); setError(""); }} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal">
              {PLACEMENTS.map((placement) => {
                const occupant = advertisements.find((item) => item.id !== editingId && item.enabled && item.placement === placement.value);
                return <option key={placement.value} value={placement.value} disabled={Boolean(occupant)}>{placement.label} ({placement.size}){occupant ? ` — In use by ${occupant.title || occupant.name}` : ""}</option>;
              })}
            </select>
            <span className="mt-1 block text-xs font-normal text-on-surface-variant">Recommended poster size: {selectedPlacement?.size}</span>
            {placementOccupant && <span className="mt-1 block text-xs font-semibold text-error">Already in use by “{placementOccupant.title || placementOccupant.name}”. Choose another location or pause the existing advertisement.</span>}
          </label>
          <label className="block text-sm font-semibold text-on-surface">Poster image
            <input required={!form.posterUrl} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => setPoster(event.target.files?.[0] || null)} className="mt-1.5 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-primary-container file:px-3 file:py-1.5 file:text-on-primary-container" />
            {form.posterUrl && !poster && <span className="mt-1 block text-xs font-normal text-on-surface-variant">The current poster will be kept unless you select another file.</span>}
          </label>
          <label className="block text-sm font-semibold text-on-surface">Click-through URL
            <input type="url" value={form.destinationUrl || ""} onChange={(event) => setField("destinationUrl", event.target.value)} placeholder="https://advertiser.example.com" className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-on-surface">Button text
            <input value={form.ctaLabel || ""} onChange={(event) => setField("ctaLabel", event.target.value)} placeholder="Learn more" className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-on-surface">Image description
            <input value={form.altText || ""} onChange={(event) => setField("altText", event.target.value)} placeholder="Describe the poster for accessibility" className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-on-surface">Starts (optional)<input type="datetime-local" value={form.startAt || ""} onChange={(event) => setField("startAt", event.target.value)} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" /></label>
            <label className="block text-sm font-semibold text-on-surface">Ends (optional)<input type="datetime-local" value={form.endAt || ""} onChange={(event) => setField("endAt", event.target.value)} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-normal" /></label>
          </div>
          <label className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 text-sm font-semibold text-on-surface"><input type="checkbox" checked={form.enabled} onChange={(event) => setField("enabled", event.target.checked)} className="h-4 w-4" />Make this advertisement active</label>
          {error && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{error}</p>}
          <button disabled={saving} className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-60">{saving ? "Saving…" : editingId ? "Update advertisement" : "Publish advertisement"}</button>
        </div>
      </form>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="font-headline-md text-xl text-on-surface">Managed placements</h2><p className="mt-1 text-sm text-on-surface-variant">Only active campaigns inside their scheduled dates are shown.</p></div><span className="text-sm font-semibold text-on-surface-variant">{advertisements.length} total</span></div>
        {loading ? <div className="rounded-xl border border-outline-variant/40 bg-surface p-8 text-center text-on-surface-variant">Loading advertisements…</div> : advertisements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface p-10 text-center"><i className="fa-solid fa-rectangle-ad mb-3 text-3xl text-outline" /><h3 className="font-headline-md text-lg">No advertisements yet</h3><p className="mt-1 text-sm text-on-surface-variant">The public website will continue showing its demo artwork.</p></div>
        ) : <div className="space-y-4">{advertisements.map((advertisement) => {
          const status = campaignStatus(advertisement);
          const placement = PLACEMENTS.find((item) => item.value === advertisement.placement);
          return <article key={advertisement.id} className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface shadow-sm">
            <div className="grid sm:grid-cols-[180px_1fr]">
              <div className="flex items-center justify-center overflow-hidden border-b border-outline-variant/30 bg-[#f5f5f5] sm:border-b-0 sm:border-r"><img src={mediaUrl(advertisement.posterUrl)} alt={advertisement.altText || advertisement.name} className="block h-auto max-h-52 w-full object-contain" /></div>
              <div className="min-w-0 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-headline-md text-lg text-on-surface">{advertisement.title || advertisement.name}</h3><p className="text-sm text-on-surface-variant">{advertisement.advertiser || "Advertiser not specified"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span></div>
                {advertisement.description && <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{advertisement.description}</p>}
                <p className="mt-3 text-sm font-semibold text-primary">{placement?.label || advertisement.placement} <span className="font-normal text-on-surface-variant">({placement?.size})</span></p>
                <p className="mt-1 text-xs text-on-surface-variant">{displayDate(advertisement.startAt)} → {displayDate(advertisement.endAt)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editAdvertisement(advertisement)} className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-primary hover:bg-primary-container">Edit</button>
                  <button type="button" onClick={() => toggleAdvertisement(advertisement)} className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-low">{advertisement.enabled ? "Pause" : "Activate"}</button>
                  <button type="button" onClick={() => removeAdvertisement(advertisement)} className="rounded-lg px-3 py-2 text-xs font-bold text-error hover:bg-error-container">Remove</button>
                </div>
              </div>
            </div>
          </article>;
        })}</div>}
      </section>
    </div>
  );
}
