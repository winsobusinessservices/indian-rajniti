"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { referenceAdminApi } from "@/lib/api";
import { DEFAULT_PARLIAMENT } from "@/features/parliament/parliament.api";
import { DEFAULT_PAGE_PROFILES } from "@/features/events/pageProfiles";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { useConfirmDialog } from "@/components/common/ConfirmDialogProvider";

const HOME_WIDGET_PERMISSIONS = [
  PERMISSIONS.SITE_HOME_WIDGETS,
  PERMISSIONS.SITE_WIDGET_BREAKING_NEWS,
  PERMISSIONS.SITE_WIDGET_POLL,
  PERMISSIONS.SITE_WIDGET_ELECTION_RESULTS,
  PERMISSIONS.SITE_WIDGET_OTHER,
];

function canManageWidget(user, key) {
  if (hasPermission(user, PERMISSIONS.SITE_HOME_WIDGETS)) return true;
  const permission = {
    breaking_news: PERMISSIONS.SITE_WIDGET_BREAKING_NEWS,
    poll_of_the_day: PERMISSIONS.SITE_WIDGET_POLL,
    election_results: PERMISSIONS.SITE_WIDGET_ELECTION_RESULTS,
  }[key] || PERMISSIONS.SITE_WIDGET_OTHER;
  return hasPermission(user, permission);
}

const PAGE_SIZE = 7;
const TABS = [
  ["politicians", "Politicians", "fa-user-tie", PERMISSIONS.SITE_POLITICIANS],
  ["parties", "Parties", "fa-flag", PERMISSIONS.SITE_PARTIES],
  ["states", "States & Assemblies", "fa-landmark", PERMISSIONS.SITE_STATES],
  ["parliament", "Parliament", "fa-building-columns", PERMISSIONS.SITE_PARLIAMENT],
  ["vidhanSabhas", "Vidhan Sabha", "fa-gavel", PERMISSIONS.SITE_VIDHAN_SABHAS],
  ["events", "Upcoming Events", "fa-calendar-days", PERMISSIONS.SITE_SCHEDULES],
  ["rallies", "Upcoming Rallies", "fa-bullhorn", PERMISSIONS.SITE_SCHEDULES],
  ["pageContent", "Speeches, Rallies & Elections", "fa-newspaper", PERMISSIONS.SITE_PAGE_PROFILES],
].map(([key, label, icon, permission]) => ({ key, label, icon, permission }));

const EMPTY = {
  politicians: {
    name: "",
    category: "KEY_FIGURE",
    photo_url: "",
    born_year: "",
    died_year: "",
    birth_place: "",
    party: "",
    state: "",
    current_position: "",
    still_in_office: false,
    opposition_party: "",
    since_year: "",
    education: "",
    career_timeline: "",
    summary: "",
    bio: "",
    sort_order: 0,
  },
  parties: {
    name: "",
    abbreviation: "",
    photo_url: "",
    founded_year: "",
    founded_place: "",
    founders: "",
    ideology: "",
    history: "",
    achievements: "",
    current_status: "",
    years_in_power: "",
    sort_order: 0,
  },
  states: {
    name: "",
    capital: "",
    image_url: "",
    current_cm_name: "",
    cm_image_url: "",
    opposition_leader_name: "",
    opposition_party: "",
    opposition_leader_image_url: "",
    kind: "STATE",
    formed: "",
    history: "",
    achievements: "",
    sort_order: 0,
  },
  events: { date: "", title: "" },
  rallies: { date: "", title: "" },
  vidhanSabhas: {
    state: "",
    name: "",
    totalSeats: "",
    chiefMinister: "",
    rulingParty: "",
    speaker: "",
    oppositionLeader: "",
    oppositionParty: "",
    currentTerm: "",
    nextElection: "",
  },
};

const FIELDS = {
  politicians: [
    ["name", "Name", "text", true],
    ["category", "Category", "politician-category", true],
    ["photo_url", "Photo URL or uploaded image path", "text"],
    ["current_position", "Current position", "text"],
    ["party", "Party", "text"],
    ["state", "State", "text"],
    ["birth_place", "Birth place", "text"],
    ["born_year", "Born year", "number"],
    ["died_year", "Died year", "number"],
    ["since_year", "In office since", "number"],
    ["opposition_party", "Opposition party", "text"],
    ["still_in_office", "Still in office", "checkbox"],
    ["education", "Education (one entry per line)", "textarea"],
    ["career_timeline", "Career history (one entry per line)", "textarea"],
    ["summary", "Short summary", "textarea"],
    ["bio", "Biography (one paragraph per line)", "textarea"],
    ["sort_order", "Display order", "number"],
  ],
  parties: [
    ["name", "Party name", "text", true],
    ["abbreviation", "Abbreviation", "text", true],
    ["photo_url", "Logo URL or uploaded image path", "text"],
    ["founded_year", "Founded year", "number"],
    ["founded_place", "Founded place", "text"],
    ["founders", "Founders (one per line)", "textarea"],
    ["ideology", "Ideology", "textarea"],
    ["history", "History", "textarea"],
    ["achievements", "Achievements", "textarea"],
    ["current_status", "Current status", "textarea"],
    ["years_in_power", "Years in power", "textarea"],
    ["sort_order", "Display order", "number"],
  ],
  states: [
    ["name", "State / UT name", "text", true],
    ["kind", "Type", "state-kind", true],
    ["capital", "Capital", "text"],
    ["image_url", "State image URL or uploaded image path", "text"],
    ["current_cm_name", "Current Chief Minister name", "text"],
    ["cm_image_url", "Chief Minister photo URL or uploaded image path", "text"],
    ["opposition_leader_name", "Opposition Leader name", "text"],
    ["opposition_party", "Principal opposition party", "text"],
    ["opposition_leader_image_url", "Opposition Leader photo URL or uploaded image path", "text"],
    ["formed", "Formation", "text"],
    ["history", "Political and assembly history", "textarea"],
    ["achievements", "Achievements", "textarea"],
    ["sort_order", "Display order", "number"],
  ],
  events: [
    ["date", "Date", "text", true],
    ["title", "Event title", "text", true],
  ],
  rallies: [
    ["date", "Date", "text", true],
    ["title", "Rally title", "text", true],
  ],
  vidhanSabhas: [
    ["state", "State", "text", true],
    ["name", "Assembly name", "text", true],
    ["totalSeats", "Total seats", "number", true],
    ["currentTerm", "Current term", "text"],
    ["chiefMinister", "Chief Minister", "text"],
    ["rulingParty", "Ruling party", "text"],
    ["speaker", "Speaker", "text"],
    ["oppositionLeader", "Leader of Opposition", "text"],
    ["oppositionParty", "Opposition party", "text"],
    ["nextElection", "Next election", "text"],
  ],
};

const HOUSE_FIELDS = [
  ["label", "House name", "text"],
  ["fullName", "Full name", "text"],
  ["totalSeats", "Total seats", "number"],
  ["formed", "Formation", "text"],
  ["currentTerm", "Current term", "text"],
  ["leaderOfHouse.name", "Leader of House", "text"],
  ["leaderOfHouse.role", "Leader role", "text"],
  ["leaderOfHouse.party", "Leader party", "text"],
  ["leaderOfHouse.photo", "Leader photo URL", "text"],
  ["leaderOfOpposition.name", "Opposition leader", "text"],
  ["leaderOfOpposition.role", "Opposition role", "text"],
  ["leaderOfOpposition.party", "Opposition party", "text"],
  ["leaderOfOpposition.photo", "Opposition photo URL", "text"],
  ["presidingOfficer.name", "Presiding officer", "text"],
  ["presidingOfficer.role", "Presiding officer role", "text"],
  ["deputyPresidingOfficer.name", "Deputy presiding officer", "text"],
  ["deputyPresidingOfficer.role", "Deputy role", "text"],
  [
    "compositionText",
    "Party seats (one per line, for example: BJP | 240)",
    "textarea",
  ],
  ["history", "History", "textarea"],
  ["achievements", "Achievements", "textarea"],
];

const inputClass =
  "w-full rounded-md border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary";
const lines = (value) =>
  String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const careerEntries = (value) =>
  lines(value).map((line) => {
    const [role = "", organization = "", fromYear = "", toYear = ""] = line
      .split("|")
      .map((item) => item.trim());
    return { role, organization, fromYear, toYear };
  });
const careerText = (value) =>
  (value || [])
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : [
            entry.role || entry.title,
            entry.organization,
            entry.fromYear || entry.from || entry.startYear,
            entry.toYear || entry.to || entry.endYear,
          ]
            .filter(Boolean)
            .join(" | "),
    )
    .join("\n");

function toForm(type, item) {
  const form = { ...EMPTY[type], ...item };
  if (type === "politicians")
    Object.assign(form, {
      education: (item.education || []).join("\n"),
      bio: (item.bio || []).join("\n"),
      career_timeline: careerText(item.career_timeline),
      still_in_office: Boolean(item.still_in_office),
    });
  if (type === "parties") form.founders = (item.founders || []).join("\n");
  return form;
}

function payloadOf(type, form) {
  const payload = { ...form };
  if (type === "politicians")
    Object.assign(payload, {
      education: lines(form.education),
      bio: lines(form.bio),
      career_timeline: careerEntries(form.career_timeline),
    });
  if (type === "parties") payload.founders = lines(form.founders);
  return payload;
}

function Field({ definition, value, onChange }) {
  const [name, label, type, required] = definition;
  if (type === "checkbox")
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(name, event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        {label}
      </label>
    );
  if (type === "politician-category" || type === "state-kind") {
    const options =
      type === "politician-category"
        ? [
            ["KEY_FIGURE", "Key figure"],
            ["FORMER_PM", "Former Prime Minister"],
            ["CHIEF_MINISTER", "Chief Minister"],
            ["PARTY_LEADER", "Party leader"],
          ]
        : [
            ["STATE", "State"],
            ["UNION_TERRITORY", "Union Territory"],
          ];
    return (
      <label className="text-xs font-label-md text-on-surface-variant">
        {label}
        <select
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className={`${inputClass} mt-1.5`}
        >
          {options.map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const textarea = type === "textarea";
  return (
    <label
      className={`text-xs font-label-md text-on-surface-variant ${textarea ? "sm:col-span-2" : ""}`}
    >
      {label}
      {required && <span className="text-error"> *</span>}
      {textarea ? (
        <textarea
          rows={4}
          required={required}
          value={value ?? ""}
          onChange={(event) => onChange(name, event.target.value)}
          className={`${inputClass} mt-1.5`}
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value ?? ""}
          onChange={(event) => onChange(name, event.target.value)}
          className={`${inputClass} mt-1.5`}
        />
      )}
    </label>
  );
}

function DataTable({ rows, columns, onEdit, onDelete, page, setPage }) {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const visible = rows.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );
  return (
    <>
      <div className="overflow-x-auto rounded-md border border-outline-variant/30">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-surface-container text-xs uppercase text-on-surface-variant">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  {column.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id || row.key}
                className="border-t border-outline-variant/25"
              >
                {columns.map((column) => (
                  <td key={column.key} className="max-w-64 truncate px-4 py-3">
                    {row[column.key] || "—"}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="rounded border border-primary/40 px-2.5 py-1 text-xs text-primary"
                    >
                      Edit
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        className="rounded border border-error/40 px-2.5 py-1 text-xs text-error"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-6 text-center text-sm text-on-surface-variant">
            No matching records found.
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
        <span>
          Showing {visible.length} of {rows.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={activePage === 1}
            onClick={() => setPage(activePage - 1)}
            className="rounded border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            {activePage} / {pageCount}
          </span>
          <button
            type="button"
            disabled={activePage === pageCount}
            onClick={() => setPage(activePage + 1)}
            className="rounded border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

function houseToForm(house) {
  return {
    ...structuredClone(house),
    compositionText: (house.composition || [])
      .map((item) => `${item.party} | ${item.seats}`)
      .join("\n"),
  };
}
function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}
function setPath(object, path, value) {
  const keys = path.split(".");
  const copy = structuredClone(object);
  let cursor = copy;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] ||= {};
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = value;
  return copy;
}

function friendlyLabel(value) {
  if (["url", "postUrl", "post_url", "link"].includes(String(value)))
    return "Post URL / Link";
  const labels = {
    hasImage: "Show image",
    verified: "Show verified badge",
    excerpt: "Description",
    image: "Image URL",
    change: "Seat change",
    stats: "Post statistics",
    tag: "Badge label",
  };
  if (labels[value]) return labels[value];
  return String(value)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const TECHNICAL_WIDGET_FIELDS = new Set([
  "id",
  "icon",
  "tagClass",
  "statusClass",
  "verdictClass",
  "colorClass",
]);
const SOCIAL_PLATFORMS = {
  x: { label: "X (Twitter)", icon: "fa-brands fa-x-twitter" },
  facebook: { label: "Facebook", icon: "fa-brands fa-facebook" },
  instagram: { label: "Instagram", icon: "fa-brands fa-instagram" },
  youtube: { label: "YouTube", icon: "fa-brands fa-youtube" },
  linkedin: { label: "LinkedIn", icon: "fa-brands fa-linkedin" },
  website: { label: "Website", icon: "fa-solid fa-globe" },
};

function socialPlatform(item) {
  const source = `${item.label || ""} ${item.icon || ""}`.toLowerCase();
  const platform = Object.keys(SOCIAL_PLATFORMS).find((key) =>
    source.includes(key === "x" ? "twitter" : key),
  );
  if (platform) return platform;
  if (source.includes("globe") || source.includes("external-link")) return "website";
  return "facebook";
}

function prepareWidget(key, data) {
  const copy = structuredClone(data);
  if (["x_feed", "facebook_updates"].includes(key) && Array.isArray(copy)) {
    return copy.map((item) => {
      const rawUrl = String(item.url || item.link || "");
      const postUrl = rawUrl.match(
        /https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^\s"'<>]+\/status\/\d+[^\s"'<>]*/i,
      )?.[0];
      return { id: item.id, url: (postUrl || rawUrl).replace(/&amp;/g, "&") };
    });
  }
  if (key === "follow_us" && Array.isArray(copy))
    return copy.map((item) => {
      const platform = socialPlatform(item);
      return {
        id: item.id,
        platform,
        name: platform === "website" && item.label !== "Website" ? item.label || "" : "",
        url: item.url || item.link || "",
      };
    });
  return copy;
}

function SocialPostLinksEditor({ platform, value, onChange }) {
  const confirmDelete = useConfirmDialog();
  const label = platform === "x_feed" ? "X post" : "Facebook post";
  return (
    <fieldset className="space-y-3 rounded-md border border-outline-variant/30 p-4">
      <legend className="px-1 text-sm font-label-md text-primary">
        {friendlyLabel(platform)}
      </legend>
      <p className="text-sm text-on-surface-variant">
        Paste the public URL of each {label}. The original post will be embedded
        automatically.
      </p>
      {value.map((item, index) => (
        <div
          key={item.id || index}
          className="flex flex-col gap-2 rounded-md bg-surface-container-low p-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-xs font-label-md text-on-surface-variant">
            {label} URL
            <input
              type="url"
              required
              placeholder={
                platform === "x_feed"
                  ? "https://x.com/account/status/..."
                  : "https://www.facebook.com/.../posts/..."
              }
              value={item.url || ""}
              onChange={(event) =>
                onChange(
                  value.map((entry, itemIndex) =>
                    itemIndex === index
                      ? { ...entry, url: event.target.value }
                      : entry,
                  ),
                )
              }
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <button
            type="button"
            onClick={async () => {
              const confirmed = await confirmDelete({ title: `Delete ${label}?`, description: `This ${label.toLowerCase()} URL will be removed from the list.` });
              if (confirmed) onChange(value.filter((_, itemIndex) => itemIndex !== index));
            }}
            className="rounded-md border border-error/40 px-3 py-2.5 text-xs text-error"
          >
            Delete
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { id: `${Date.now()}`, url: "" }])}
        className="rounded-md border border-primary/40 px-3 py-2 text-xs text-primary"
      >
        Add {label} URL
      </button>
    </fieldset>
  );
}

function FollowUsEditor({ value, onChange }) {
  const confirmDelete = useConfirmDialog();
  return (
    <fieldset className="space-y-3 rounded-md border border-outline-variant/30 p-4">
      <legend className="px-1 text-sm font-label-md text-primary">
        Follow Us Links
      </legend>
      <p className="text-sm text-on-surface-variant">
        Choose a social platform and paste your website profile or channel URL.
        The correct icon is selected automatically.
      </p>
      {value.map((item, index) => (
        <div
          key={item.id || index}
          className={`grid gap-3 rounded-md bg-surface-container-low p-3 sm:items-end ${item.platform === "website" ? "sm:grid-cols-[160px_180px_1fr_auto]" : "sm:grid-cols-[180px_1fr_auto]"}`}
        >
          <label className="text-xs font-label-md text-on-surface-variant">
            Platform
            <select
              value={item.platform}
              onChange={(event) =>
                onChange(
                  value.map((entry, itemIndex) =>
                    itemIndex === index
                      ? { ...entry, platform: event.target.value }
                      : entry,
                  ),
                )
              }
              className={`${inputClass} mt-1.5`}
            >
              {Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => (
                <option key={key} value={key}>
                  {platform.label}
                </option>
              ))}
            </select>
          </label>
          {item.platform === "website" && (
            <label className="text-xs font-label-md text-on-surface-variant">
              Website name
              <input
                type="text"
                required
                maxLength={100}
                placeholder="Example News"
                value={item.name || ""}
                onChange={(event) =>
                  onChange(
                    value.map((entry, itemIndex) =>
                      itemIndex === index
                        ? { ...entry, name: event.target.value }
                        : entry,
                    ),
                  )
                }
                className={`${inputClass} mt-1.5`}
              />
            </label>
          )}
          <label className="text-xs font-label-md text-on-surface-variant">
            {item.platform === "website" ? "Website URL" : "Profile or channel URL"}
            <input
              type="url"
              required
              placeholder="https://..."
              value={item.url || ""}
              onChange={(event) =>
                onChange(
                  value.map((entry, itemIndex) =>
                    itemIndex === index
                      ? { ...entry, url: event.target.value }
                      : entry,
                  ),
                )
              }
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <button
            type="button"
            onClick={async () => {
              const confirmed = await confirmDelete({ title: "Delete social link?", description: "This social profile or channel link will be removed from the list." });
              if (confirmed) onChange(value.filter((_, itemIndex) => itemIndex !== index));
            }}
            className="rounded-md border border-error/40 px-3 py-2.5 text-xs text-error"
          >
            Delete
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...value,
            { id: `${Date.now()}`, platform: "facebook", url: "" },
          ])
        }
        className="rounded-md border border-primary/40 px-3 py-2 text-xs text-primary"
      >
        Add social link
      </button>
    </fieldset>
  );
}

function PollEditor({ value, onChange }) {
  const options = [
    value.options?.[0] || { label: "" },
    value.options?.[1] || { label: "" },
  ];
  return (
    <fieldset className="grid grid-cols-1 gap-4 rounded-md border border-outline-variant/30 p-4">
      <legend className="px-1 text-sm font-label-md text-primary">
        Poll of the Day
      </legend>
      <p className="text-sm text-on-surface-variant">
        Enter one question and two choices. Votes and percentages are calculated
        automatically from user selections.
      </p>
      <label className="text-xs font-label-md text-on-surface-variant">
        Question
        <textarea
          rows={3}
          value={value.question || ""}
          onChange={(event) =>
            onChange({ ...value, question: event.target.value })
          }
          className={`${inputClass} mt-1.5`}
        />
      </label>
      {options.map((option, index) => (
        <label
          key={index}
          className="text-xs font-label-md text-on-surface-variant"
        >
          Option {index + 1}
          <input
            type="text"
            value={option.label || ""}
            onChange={(event) =>
              onChange({
                ...value,
                options: options.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, label: event.target.value }
                    : item,
                ),
              })
            }
            className={`${inputClass} mt-1.5`}
          />
        </label>
      ))}
      <p className="text-xs text-on-surface-variant">
        Saving creates a fresh poll and resets its generated vote count to zero.
      </p>
    </fieldset>
  );
}

function emptyLike(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, emptyLike(child)]),
    );
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  return "";
}

function WidgetValueEditor({ label, value, onChange, depth = 0 }) {
  const confirmDelete = useConfirmDialog();
  if (Array.isArray(value)) {
    const objects =
      value.length > 0 &&
      value.every(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      );
    if (!objects)
      return (
        <label className="block text-xs font-label-md text-on-surface-variant">
          {friendlyLabel(label)}{" "}
          <span className="font-normal">(one item per line)</span>
          <textarea
            rows={Math.min(10, Math.max(4, value.length))}
            value={value.join("\n")}
            onChange={(event) => onChange(lines(event.target.value))}
            className={`${inputClass} mt-1.5`}
          />
        </label>
      );
    return (
      <fieldset className="space-y-3 rounded-md border border-outline-variant/30 p-3">
        <legend className="px-1 text-sm font-label-md text-primary">
          {friendlyLabel(label)}
        </legend>
        {value.map((item, index) => (
          <div
            key={`${label}-${index}`}
            className="rounded-md bg-surface-container-low p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-label-md text-on-surface-variant">
                Item {index + 1}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await confirmDelete({ title: `Delete item ${index + 1}?`, description: "This widget item will be removed. This action cannot be undone after saving." });
                  if (confirmed) onChange(value.filter((_, itemIndex) => itemIndex !== index));
                }}
                className="text-xs text-error"
              >
                Delete item
              </button>
            </div>
            <WidgetValueEditor
              label="Details"
              value={item}
              depth={depth + 1}
              onChange={(next) =>
                onChange(
                  value.map((entry, itemIndex) =>
                    itemIndex === index ? next : entry,
                  ),
                )
              }
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, emptyLike(value[0])])}
          className="rounded-md border border-primary/40 px-3 py-2 text-xs text-primary"
        >
          Add item
        </button>
      </fieldset>
    );
  }
  if (value && typeof value === "object")
    return (
      <fieldset
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${depth ? "" : "rounded-md border border-outline-variant/30 p-4"}`}
      >
        <legend className="px-1 text-sm font-label-md text-primary">
          {friendlyLabel(label)}
        </legend>
        {Object.entries(value)
          .filter(([key]) => !TECHNICAL_WIDGET_FIELDS.has(key))
          .map(([key, child]) => (
            <div
              key={key}
              className={
                child && typeof child === "object" ? "sm:col-span-2" : ""
              }
            >
              <WidgetValueEditor
                label={key}
                value={child}
                depth={depth + 1}
                onChange={(next) => onChange({ ...value, [key]: next })}
              />
            </div>
          ))}
      </fieldset>
    );
  if (typeof value === "boolean")
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        {friendlyLabel(label)}
      </label>
    );
  if (typeof value === "number")
    return (
      <label className="text-xs font-label-md text-on-surface-variant">
        {friendlyLabel(label)}
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`${inputClass} mt-1.5`}
        />
      </label>
    );
  if (["url", "postUrl", "post_url", "link"].includes(String(label)))
    return (
      <label className="text-xs font-label-md text-on-surface-variant">
        {friendlyLabel(label)}
        <input
          type="url"
          placeholder="https://..."
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} mt-1.5`}
        />
      </label>
    );
  return (
    <label className="text-xs font-label-md text-on-surface-variant">
      {friendlyLabel(label)}
      <textarea
        rows={String(value).length > 120 ? 4 : 2}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} mt-1.5`}
      />
    </label>
  );
}

export function HomeWidgetsAdmin({ widgets, onReload, user }) {
  const keys = Object.keys(widgets || {})
    .filter((key) => key !== "site_header" && canManageWidget(user, key))
    .sort();
  const [selected, setSelected] = useState(keys[0] || "");
  const [value, setValue] = useState(() =>
    prepareWidget(keys[0], widgets?.[keys[0]] ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const widgetIcon = (key) => ({
    breaking_news: "fa-bolt",
    poll_of_the_day: "fa-square-poll-vertical",
    election_results: "fa-check-to-slot",
    political_calendar: "fa-calendar-days",
    political_rallys: "fa-bullhorn",
    x_feed: "fa-x-twitter",
    facebook_updates: "fa-facebook-f",
    follow_us: "fa-share-nodes",
    pm_corner: "fa-user-tie",
    parliament_data: "fa-landmark",
  }[key] || "fa-table-cells-large");
  const choose = (key) => {
    setSelected(key);
    setValue(prepareWidget(key, widgets[key]));
    setError("");
  };
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const social = ["x_feed", "facebook_updates"].includes(selected);
      let payload = social
        ? value
            .filter((item) => item.url?.trim())
            .map((item) => ({
              id: item.id || `${Date.now()}`,
              url: item.url.trim(),
            }))
        : value;
      if (selected === "follow_us")
        payload = value
          .filter((item) => item.url?.trim())
          .map((item) => {
            const platform = SOCIAL_PLATFORMS[item.platform] || SOCIAL_PLATFORMS.website;
            return {
              id: item.id || `${Date.now()}`,
              label: item.platform === "website" ? item.name?.trim() || "Website" : platform.label,
              icon: platform.icon,
              url: item.url.trim(),
            };
          });
      if (selected === "poll_of_the_day")
        payload = {
          question: value.question?.trim(),
          options: (value.options || [])
            .slice(0, 2)
            .map((option) => ({
              label: option.label?.trim(),
              votes: 0,
              pct: 0,
            })),
          totalVotes: 0,
        };
      await referenceAdminApi.updateHomeWidget(selected, payload);
      setValue(prepareWidget(selected, payload));
      await onReload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  if (!keys.length)
    return (
      <p className="rounded-lg bg-surface p-6 text-sm text-on-surface-variant">
        No home widgets are available.
      </p>
    );
  return (
    <section
      inert={saving}
      aria-busy={saving}
      className="rounded-lg border border-outline-variant/30 bg-surface p-4 sm:p-6"
    >
      <h2 className="font-headline-lg text-xl text-primary">
        Manage Home Page Widgets
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Choose a section and edit its normal fields. No JSON or coding is
        needed.
      </p>
      {error && (
        <p className="mt-4 rounded-md bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}
      <div className="mt-5 flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-outline-variant/25 bg-surface-container-low p-3" role="tablist" aria-label="Home widgets">
        {keys.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={selected === key} onClick={() => choose(key)} className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-label-md transition-colors ${selected === key ? "border-primary bg-primary text-on-primary" : "border-outline-variant/30 bg-surface text-on-surface-variant hover:border-primary hover:text-primary"}`}>
            <i className={`fa-solid ${widgetIcon(key)}`} aria-hidden="true" />
            <span>{friendlyLabel(key)}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-outline-variant/25 bg-surface-container-low/40 p-4 sm:p-5">
        <div className="mb-5 flex items-center gap-3 border-b border-outline-variant/20 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary"><i className={`fa-solid ${widgetIcon(selected)}`} aria-hidden="true" /></span>
          <div><h3 className="font-headline-md text-base text-primary">{friendlyLabel(selected)}</h3><p className="text-xs text-on-surface-variant">Edit the content displayed in this widget.</p></div>
        </div>
        {["x_feed", "facebook_updates"].includes(selected) ? (
          <SocialPostLinksEditor
            platform={selected}
            value={value}
            onChange={setValue}
          />
        ) : selected === "follow_us" ? (
          <FollowUsEditor value={value} onChange={setValue} />
        ) : selected === "poll_of_the_day" ? (
          <PollEditor value={value} onChange={setValue} />
        ) : (
          <WidgetValueEditor
            label={selected}
            value={value}
            onChange={setValue}
          />
        )}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-5 rounded-md bg-primary px-5 py-2.5 text-sm font-label-md text-on-primary disabled:opacity-60"
      >
        {saving
          ? "Saving…"
          : selected === "poll_of_the_day"
            ? "Save New Poll"
            : "Save Home Widget"}
      </button>
    </section>
  );
}

function PageContentAdmin({ profiles, onReload }) {
  const merged = Object.fromEntries(
    Object.entries(DEFAULT_PAGE_PROFILES).map(([key, defaults]) => [
      key,
      {
        ...defaults,
        ...(profiles?.[key] || {}),
        current: { ...defaults.current, ...(profiles?.[key]?.current || {}) },
        opposition: {
          ...defaults.opposition,
          ...(profiles?.[key]?.opposition || {}),
        },
      },
    ]),
  );
  const [selected, setSelected] = useState("speeches");
  const [form, setForm] = useState(() => ({
    ...merged.speeches,
    bio: merged.speeches.bio.join("\n"),
    facts: merged.speeches.facts.join("\n"),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const choose = (key) => {
    const profile = merged[key];
    setSelected(key);
    setForm({
      ...profile,
      bio: profile.bio.join("\n"),
      facts: profile.facts.join("\n"),
    });
    setError("");
  };
  const change = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));
  const changePerson = (group, name, value) =>
    setForm((current) => ({
      ...current,
      [group]: { ...current[group], [name]: value },
    }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const profile = {
        ...form,
        bio: lines(form.bio),
        facts: lines(form.facts),
      };
      await referenceAdminApi.updatePageProfiles({
        ...merged,
        [selected]: profile,
      });
      await onReload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const labels = {
    speeches: "Speeches",
    rallies: "Rallies",
    elections: "Elections",
  };
  const articleCategories = {
    speeches: "Speech",
    rallies: "Rally",
    elections: "Elections",
  };
  return (
    <section className="rounded-lg border border-outline-variant/30 bg-surface p-4 sm:p-6">
      <h2 className="font-headline-lg text-xl text-primary">
        Page Information
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Edit what each public page explains, its highlighted sides or leaders,
        history paragraphs, and key facts.
      </p>
      {error && (
        <p className="mt-4 rounded-md bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-2 overflow-x-auto">
        {Object.keys(labels).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => choose(key)}
            className={`rounded-md px-4 py-2 text-sm ${selected === key ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface"}`}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <form
        onSubmit={save}
        inert={saving}
        aria-busy={saving}
        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field
          definition={[
            "description",
            "What this page is about",
            "textarea",
            true,
          ]}
          value={form.description}
          onChange={change}
        />
        <Field
          definition={["currentLabel", "First section heading", "text"]}
          value={form.currentLabel}
          onChange={change}
        />
        <Field
          definition={["oppositionLabel", "Second section heading", "text"]}
          value={form.oppositionLabel}
          onChange={change}
        />
        <Field
          definition={[
            "currentName",
            "First highlighted name or group",
            "text",
          ]}
          value={form.current.name}
          onChange={(_, value) => changePerson("current", "name", value)}
        />
        <Field
          definition={["currentRole", "First highlighted description", "text"]}
          value={form.current.role}
          onChange={(_, value) => changePerson("current", "role", value)}
        />
        <Field
          definition={["currentPhoto", "First highlighted photo URL or uploaded image path", "text"]}
          value={form.current.photo}
          onChange={(_, value) => changePerson("current", "photo", value)}
        />
        <Field
          definition={[
            "oppositionName",
            "Second highlighted name or group",
            "text",
          ]}
          value={form.opposition.name}
          onChange={(_, value) => changePerson("opposition", "name", value)}
        />
        <Field
          definition={[
            "oppositionRole",
            "Second highlighted description",
            "text",
          ]}
          value={form.opposition.role}
          onChange={(_, value) => changePerson("opposition", "role", value)}
        />
        <Field
          definition={["oppositionPhoto", "Second highlighted photo URL or uploaded image path", "text"]}
          value={form.opposition.photo}
          onChange={(_, value) => changePerson("opposition", "photo", value)}
        />
        <Field
          definition={[
            "bio",
            "History and explanation (one paragraph per line)",
            "textarea",
          ]}
          value={form.bio}
          onChange={change}
        />
        <Field
          definition={["facts", "Key facts (one fact per line)", "textarea"]}
          value={form.facts}
          onChange={change}
        />
        <button
          disabled={saving}
          className="w-fit rounded-md bg-primary px-5 py-2.5 text-sm font-label-md text-on-primary disabled:opacity-60"
        >
          {saving ? "Saving…" : `Save ${labels[selected]} Page`}
        </button>
      </form>
      <div className="mt-6 border-t border-outline-variant/30 pt-4">
        <p className="text-sm text-on-surface-variant">
          To add news coverage beneath this information:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(labels).map(([key, label]) => (
            <Link
              key={key}
              href={`/author/create/article?category=${encodeURIComponent(articleCategories[key])}`}
              className="rounded-md border border-primary/40 px-3 py-2 text-xs text-primary"
            >
              Add {label} Article
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ReferenceDataAdminClient() {
  const { user } = useAuth();
  const confirmDelete = useConfirmDialog();
  const allowedTabs = useMemo(() => TABS.filter((item) =>
    item.key === "homeWidgets"
      ? HOME_WIDGET_PERMISSIONS.some((permission) => hasPermission(user, permission))
      : hasPermission(user, item.permission)
  ), [user]);
  const [data, setData] = useState({
    politicians: [],
    parties: [],
    states: [],
    parliament: DEFAULT_PARLIAMENT,
    events: [],
    rallies: [],
    vidhanSabhas: [],
  });
  const [tab, setTab] = useState(() => allowedTabs[0]?.key || "");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => ({ ...(EMPTY[allowedTabs[0]?.key] || {}) }));
  const [houseKey, setHouseKey] = useState("loksabha");
  const [houseForm, setHouseForm] = useState(() =>
    houseToForm(DEFAULT_PARLIAMENT.loksabha),
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await referenceAdminApi.list();
      setData({
        ...result,
        parliament: result.parliament || DEFAULT_PARLIAMENT,
      });
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    referenceAdminApi
      .list()
      .then((result) => {
        if (active)
          setData({
            ...result,
            parliament: result.parliament || DEFAULT_PARLIAMENT,
          });
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => {
    if (tab === "parliament") return Object.values(data.parliament);
    if (tab === "homeWidgets") return [];
    if (tab === "pageContent") return [];
    const term = search.toLowerCase();
    return (data[tab] || []).filter(
      (item) =>
        `${item.name || ""} ${item.title || ""} ${item.abbreviation || ""} ${item.state || ""} ${item.date || ""}`
          .toLowerCase()
          .includes(term) &&
        (!filter || item.category === filter || item.kind === filter),
    );
  }, [data, filter, search, tab]);

  const chooseTab = (next) => {
    setTab(next);
    setEditing(null);
    setForm({ ...(EMPTY[next] || {}) });
    setSearch("");
    setFilter("");
    setPage(1);
    setError("");
  };
  const scrollTabsWithWheel = (event) => {
    const tabList = event.currentTarget;
    const distance =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    const maxScroll = tabList.scrollWidth - tabList.clientWidth;
    const canScroll =
      maxScroll > 0 &&
      ((distance < 0 && tabList.scrollLeft > 0) ||
        (distance > 0 && tabList.scrollLeft < maxScroll));

    if (canScroll) {
      event.preventDefault();
      tabList.scrollLeft += distance;
    }
  };
  const reset = () => {
    setEditing(null);
    setForm({ ...EMPTY[tab] });
    setError("");
  };
  const edit = (item) => {
    setEditing(item);
    setForm(toForm(tab, item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (["events", "rallies", "vidhanSabhas"].includes(tab)) {
        const current = data[tab] || [];
        const item = { ...form, id: editing?.id || `${Date.now()}` };
        const next = editing
          ? current.map((entry) => (entry.id === editing.id ? item : entry))
          : [item, ...current];
        if (tab === "vidhanSabhas")
          await referenceAdminApi.updateVidhanSabhas(next);
        else await referenceAdminApi.updateSchedule(tab, next);
      } else {
        const payload = payloadOf(tab, form);
        if (editing) await referenceAdminApi.update(tab, editing.id, payload);
        else await referenceAdminApi.create(tab, payload);
      }
      await load();
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (item) => {
    const label = item.name || item.title || "this item";
    const confirmed = await confirmDelete({
      title: `Delete ${label}?`,
      description: "This Site Data item will be moved to Deleted Items and can be restored by an Admin.",
    });
    if (!confirmed) return;
    try {
      const next = (data[tab] || []).filter((entry) => entry.id !== item.id);
      if (tab === "vidhanSabhas")
        await referenceAdminApi.updateVidhanSabhas(next);
      else if (["events", "rallies"].includes(tab))
        await referenceAdminApi.updateSchedule(tab, next);
      else await referenceAdminApi.remove(tab, item.id);
      await load();
      if (editing?.id === item.id) reset();
    } catch (err) {
      setError(err.message);
    }
  };
  const selectHouse = (item) => {
    setHouseKey(item.key);
    setHouseForm(houseToForm(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveHouse = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const colors = [
        "bg-primary",
        "bg-secondary",
        "bg-surface-tint",
        "bg-error",
        "bg-green-600",
        "bg-amber-500",
        "bg-orange-500",
        "bg-outline-variant",
      ];
      const house = structuredClone(houseForm);
      house.totalSeats = Number(house.totalSeats) || 0;
      house.composition = lines(house.compositionText)
        .map((line, index) => {
          const [party, seats] = line.split("|").map((part) => part.trim());
          return {
            party,
            seats: Number(seats) || 0,
            colorClass: colors[index % colors.length],
          };
        })
        .filter((item) => item.party);
      delete house.compositionText;
      await referenceAdminApi.updateParliament({
        ...data.parliament,
        [houseKey]: house,
      });
      await load();
      setHouseForm(houseToForm(house));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns =
    tab === "politicians"
      ? [
          ["name", "Name"],
          ["category", "Category"],
          ["party", "Party"],
          ["current_position", "Position"],
        ]
      : tab === "parties"
        ? [
            ["name", "Party"],
            ["abbreviation", "Short name"],
            ["founded_year", "Founded"],
          ]
        : tab === "states"
          ? [
              ["name", "Name"],
              ["kind", "Type"],
              ["capital", "Capital"],
            ]
          : tab === "vidhanSabhas"
            ? [
                ["state", "State"],
                ["name", "Assembly"],
                ["totalSeats", "Seats"],
                ["chiefMinister", "Chief Minister"],
                ["rulingParty", "Ruling party"],
              ]
            : [
                ["date", "Date"],
                ["title", "Title"],
              ];
  const tableColumns = columns.map(([key, label]) => ({ key, label }));

  if (tab === "homeWidgets")
    return (
      <div className="space-y-6">
        <div className="flex w-full min-w-0 max-w-full snap-x gap-2 overflow-x-scroll overscroll-x-contain rounded-lg border border-outline-variant/30 bg-surface p-2 pb-3 touch-pan-x [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]" role="tablist" aria-label="Site data sections" onWheel={scrollTabsWithWheel}>
          {allowedTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => chooseTab(item.key)}
              role="tab"
              aria-selected={tab === item.key}
              className={`flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-label-md ${tab === item.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              <i className={`fa-solid ${item.icon}`} />
              {item.label}
            </button>
          ))}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-md bg-error/10 px-4 py-3 text-sm text-error"
          >
            {error}
          </p>
        )}
        <HomeWidgetsAdmin widgets={data.homeWidgets} onReload={load} user={user} />
      </div>
    );

  if (tab === "pageContent")
    return (
      <div className="space-y-6">
        <div className="flex w-full min-w-0 max-w-full snap-x gap-2 overflow-x-scroll overscroll-x-contain rounded-lg border border-outline-variant/30 bg-surface p-2 pb-3 touch-pan-x [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]" role="tablist" aria-label="Site data sections" onWheel={scrollTabsWithWheel}>
          {allowedTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => chooseTab(item.key)}
              role="tab"
              aria-selected={tab === item.key}
              className={`flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-label-md ${tab === item.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              <i className={`fa-solid ${item.icon}`} />
              {item.label}
            </button>
          ))}
        </div>
        <PageContentAdmin profiles={data.pageProfiles} onReload={load} />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex w-full min-w-0 max-w-full snap-x gap-2 overflow-x-scroll overscroll-x-contain rounded-lg border border-outline-variant/30 bg-surface p-2 pb-3 touch-pan-x [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]" role="tablist" aria-label="Site data sections" onWheel={scrollTabsWithWheel}>
        {allowedTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => chooseTab(item.key)}
            role="tab"
            aria-selected={tab === item.key}
            className={`flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-label-md ${tab === item.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
          >
            <i className={`fa-solid ${item.icon}`} />
            {item.label}
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-error/10 px-4 py-3 text-sm text-error"
        >
          {error}
        </p>
      )}
      {tab === "parliament" ? (
        <>
          <form
            onSubmit={saveHouse}
            inert={saving}
            aria-busy={saving}
            className="rounded-lg border border-outline-variant/30 bg-surface p-4 sm:p-6"
          >
            <h2 className="font-headline-lg text-xl text-primary">
              Edit {houseForm.label}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Fill in the fields below. No JSON or coding is needed.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {HOUSE_FIELDS.map((field) => (
                <Field
                  key={field[0]}
                  definition={field}
                  value={getPath(houseForm, field[0])}
                  onChange={(name, value) =>
                    setHouseForm((current) => setPath(current, name, value))
                  }
                />
              ))}
            </div>
            <button
              disabled={saving}
              className="mt-5 rounded-md bg-primary px-5 py-2.5 text-sm font-label-md text-on-primary disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save House Details"}
            </button>
          </form>
          <section className="rounded-lg border border-outline-variant/30 bg-surface p-4 sm:p-6">
            <h2 className="mb-4 font-headline-lg text-xl text-primary">
              Parliament houses
            </h2>
            <DataTable
              rows={items}
              columns={[
                ["label", "House"],
                ["fullName", "Full name"],
                ["totalSeats", "Seats"],
                ["currentTerm", "Current term"],
              ].map(([key, label]) => ({ key, label }))}
              onEdit={selectHouse}
              page={page}
              setPage={setPage}
            />
          </section>
        </>
      ) : (
        <>
          <form
            onSubmit={save}
            inert={saving}
            aria-busy={saving}
            className="rounded-lg border border-outline-variant/30 bg-surface p-4 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-headline-lg text-xl text-primary">
                {editing
                  ? `Edit ${editing.name || editing.title}`
                  : `Add ${TABS.find((item) => item.key === tab)?.label}`}
              </h2>
              {editing && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs text-primary"
                >
                  CANCEL
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FIELDS[tab].map((field) => (
                <Field
                  key={field[0]}
                  definition={field}
                  value={form[field[0]]}
                  onChange={(name, value) =>
                    setForm((current) => ({ ...current, [name]: value }))
                  }
                />
              ))}
            </div>
            <button
              disabled={saving}
              className="mt-5 rounded-md bg-primary px-5 py-2.5 text-sm font-label-md text-on-primary disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Update" : "Add"}
            </button>
          </form>
          <section className="rounded-lg border border-outline-variant/30 bg-surface p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="font-headline-lg text-xl text-primary">
                Saved records
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search table…"
                  className={inputClass}
                />
                {tab === "politicians" && (
                  <select
                    value={filter}
                    onChange={(event) => {
                      setFilter(event.target.value);
                      setPage(1);
                    }}
                    className={inputClass}
                  >
                    <option value="">All categories</option>
                    <option value="KEY_FIGURE">Key figures</option>
                    <option value="FORMER_PM">Former PMs</option>
                    <option value="CHIEF_MINISTER">Chief Ministers</option>
                    <option value="PARTY_LEADER">Party leaders</option>
                  </select>
                )}
                {tab === "states" && (
                  <select
                    value={filter}
                    onChange={(event) => {
                      setFilter(event.target.value);
                      setPage(1);
                    }}
                    className={inputClass}
                  >
                    <option value="">All types</option>
                    <option value="STATE">States</option>
                    <option value="UNION_TERRITORY">Union Territories</option>
                  </select>
                )}
              </div>
            </div>
            {loading ? (
              <p>Loading…</p>
            ) : (
              <DataTable
                rows={items}
                columns={tableColumns}
                onEdit={edit}
                onDelete={remove}
                page={page}
                setPage={setPage}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
