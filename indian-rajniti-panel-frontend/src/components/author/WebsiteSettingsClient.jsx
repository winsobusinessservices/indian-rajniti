"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { mediaUrl, sitesApi } from "@/lib/api";

const inputClass = "mt-1.5 w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const defaults = {
  name: "Indian Rajneeti",
  subtitle: "",
  description: "",
  primaryColor: "#002068",
  secondaryColor: "#8f4e00",
  socialText: "",
  servicesEnabled: false,
  logoUrl: "",
  iconUrl: "",
};

function siteToForm(site) {
  let socialLinks = site?.social_links || [];
  if (typeof socialLinks === "string") {
    try { socialLinks = JSON.parse(socialLinks); } catch { socialLinks = []; }
  }
  return {
    name: site?.name || defaults.name,
    subtitle: site?.subtitle || "",
    description: site?.description || "",
    primaryColor: site?.primary_color || defaults.primaryColor,
    secondaryColor: site?.secondary_color || defaults.secondaryColor,
    socialText: socialLinks.map((item) => `${item.label} | ${item.url}`).join("\n"),
    servicesEnabled: Boolean(site?.services_enabled),
    logoUrl: site?.logo_url || "",
    iconUrl: site?.icon_url || "",
  };
}

function buildPayload(form, files) {
  const data = new FormData();
  data.append("name", form.name);
  data.append("subtitle", form.subtitle);
  data.append("description", form.description);
  data.append("primaryColor", form.primaryColor);
  data.append("secondaryColor", form.secondaryColor);
  data.append("servicesEnabled", String(form.servicesEnabled));
  data.append("socialLinks", JSON.stringify(form.socialText.split("\n").map((line) => {
    const divider = line.indexOf("|");
    return divider < 0 ? null : { label: line.slice(0, divider).trim(), url: line.slice(divider + 1).trim() };
  }).filter(Boolean)));
  if (files.logoFile) data.append("logoFile", files.logoFile);
  if (files.iconFile) data.append("iconFile", files.iconFile);
  return data;
}

export default function WebsiteSettingsClient() {
  const [form, setForm] = useState(defaults);
  const [files, setFiles] = useState({ logoFile: null, iconFile: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    sitesApi.list()
      .then((data) => { if (active) setForm(siteToForm(data.sites?.[0])); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = await sitesApi.updateSettings(buildPayload(form, files));
      setForm(siteToForm(data.site));
      setFiles({ logoFile: null, iconFile: null });
      window.dispatchEvent(new CustomEvent("panel-site-settings-changed", { detail: { site: data.site } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="rounded-xl border border-outline-variant/30 bg-surface p-8 text-center text-on-surface-variant">Loading website settings…</div>;

  return (
    <form onSubmit={save} className="space-y-6">
      {error && <p className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-4 sm:p-6">
        <h2 className="font-headline-lg text-xl text-primary">Brand details</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm">Website name<input className={inputClass} value={form.name} onChange={(event) => set("name", event.target.value)} required /></label>
          <label className="text-sm">Subtitle<input className={inputClass} value={form.subtitle} onChange={(event) => set("subtitle", event.target.value)} placeholder="A short line shown with the brand" /></label>
          <label className="text-sm md:col-span-2">Description<textarea className={`${inputClass} min-h-28 resize-y`} value={form.description} onChange={(event) => set("description", event.target.value)} /></label>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-4 sm:p-6">
        <h2 className="font-headline-lg text-xl text-primary">Logo and browser icon</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="rounded-lg border border-outline-variant/25 bg-surface p-4 text-sm">
            <span className="font-semibold">Website logo</span>
            <span className="mt-1 block text-xs text-on-surface-variant">A wide transparent PNG or WebP works best.</span>
            {form.logoUrl && <Image src={mediaUrl(form.logoUrl)} alt="Current Indian Rajneeti logo" width={320} height={120} unoptimized className="mt-4 h-24 w-full rounded border border-outline-variant/20 bg-white object-contain p-3" />}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFiles((current) => ({ ...current, logoFile: event.target.files?.[0] || null }))} className="mt-4 block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-on-primary" />
            {files.logoFile && <span className="mt-2 block text-xs text-primary">Selected: {files.logoFile.name}</span>}
          </label>
          <label className="rounded-lg border border-outline-variant/25 bg-surface p-4 text-sm">
            <span className="font-semibold">Browser tab icon</span>
            <span className="mt-1 block text-xs text-on-surface-variant">Upload a square PNG, JPG, or WebP image.</span>
            {form.iconUrl && <Image src={mediaUrl(form.iconUrl)} alt="Current browser tab icon" width={96} height={96} unoptimized className="mt-4 h-24 w-24 rounded border border-outline-variant/20 bg-white object-contain p-2" />}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFiles((current) => ({ ...current, iconFile: event.target.files?.[0] || null }))} className="mt-4 block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-on-primary" />
            {files.iconFile && <span className="mt-2 block text-xs text-primary">Selected: {files.iconFile.name}</span>}
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-4 sm:p-6">
        <h2 className="font-headline-lg text-xl text-primary">Theme and links</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm">Primary colour<div className="mt-1.5 flex gap-2"><input type="color" className="h-11 w-14 rounded border border-outline-variant/30 bg-surface p-1" value={form.primaryColor} onChange={(event) => set("primaryColor", event.target.value)} /><input className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 text-sm" value={form.primaryColor} onChange={(event) => set("primaryColor", event.target.value)} pattern="#[0-9A-Fa-f]{6}" required /></div></label>
          <label className="text-sm">Secondary colour<div className="mt-1.5 flex gap-2"><input type="color" className="h-11 w-14 rounded border border-outline-variant/30 bg-surface p-1" value={form.secondaryColor} onChange={(event) => set("secondaryColor", event.target.value)} /><input className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2.5 text-sm" value={form.secondaryColor} onChange={(event) => set("secondaryColor", event.target.value)} pattern="#[0-9A-Fa-f]{6}" required /></div></label>
          <label className="text-sm md:col-span-2">Social links <span className="text-xs text-on-surface-variant">(one per line: Facebook | https://facebook.com/...)</span><textarea className={`${inputClass} min-h-28 resize-y`} value={form.socialText} onChange={(event) => set("socialText", event.target.value)} /></label>
          <label className="flex items-center gap-3 rounded-lg border border-outline-variant/25 bg-surface px-3 py-3 text-sm md:col-span-2"><input type="checkbox" checked={form.servicesEnabled} onChange={(event) => set("servicesEnabled", event.target.checked)} /><span><strong className="block">Enable Services menu</strong><span className="text-xs text-on-surface-variant">Show service pages on the Indian Rajneeti frontend.</span></span></label>
        </div>
      </section>

      <div className="flex justify-end"><button disabled={saving} className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save Website Settings"}</button></div>
    </form>
  );
}
