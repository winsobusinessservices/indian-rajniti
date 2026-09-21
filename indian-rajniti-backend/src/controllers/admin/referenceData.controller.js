const Politician = require("../../models/politician.model");
const Party = require("../../models/party.model");
const State = require("../../models/state.model");
const HomeWidget = require("../../models/homeWidget.model");
const DeletionAudit = require("../../models/deletionAudit.model");

const POLITICIAN_CATEGORIES = ["KEY_FIGURE", "FORMER_PM", "CHIEF_MINISTER", "PARTY_LEADER"];
const STATE_KINDS = ["STATE", "UNION_TERRITORY"];

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function text(value, max = 10000) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function integer(value, fallback = null) {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

function array(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value).split("\n").map((item) => item.trim()).filter(Boolean);
  }
}

function careerTimeline(value) {
  return array(value).map((entry) => {
    if (typeof entry === "string") {
      const [role = "", organization = "", fromYear = "", toYear = ""] = entry
        .split("|")
        .map((item) => item.trim());
      return { role, organization, fromYear, toYear };
    }
    if (!entry || typeof entry !== "object") return null;
    return {
      role: text(entry.role ?? entry.title, 500) || "",
      organization: text(entry.organization, 500) || "",
      fromYear: text(entry.fromYear ?? entry.from ?? entry.startYear, 50) || "",
      toYear: text(entry.toYear ?? entry.to ?? entry.endYear, 50) || "",
    };
  }).filter((entry) => entry?.role);
}

function politicianInput(body, existing) {
  const name = text(body.name, 150);
  const category = String(body.category || "").toUpperCase();
  if (!name || !POLITICIAN_CATEGORIES.includes(category)) throw new Error("Name and a valid politician category are required");
  return {
    slug: existing?.slug || slugify(body.slug || name),
    name,
    photoUrl: text(body.photoUrl ?? body.photo_url, 2000),
    replacePhoto: true,
    bornYear: integer(body.bornYear ?? body.born_year),
    diedYear: integer(body.diedYear ?? body.died_year),
    birthPlace: text(body.birthPlace ?? body.birth_place, 250),
    party: text(body.party, 250),
    state: text(body.state, 150),
    category,
    currentPosition: text(body.currentPosition ?? body.current_position, 500),
    stillInOffice: bool(body.stillInOffice ?? body.still_in_office) ? 1 : 0,
    oppositionParty: text(body.oppositionParty ?? body.opposition_party, 250),
    sinceYear: integer(body.sinceYear ?? body.since_year),
    education: array(body.education),
    careerTimeline: careerTimeline(body.careerTimeline ?? body.career_timeline),
    summary: text(body.summary, 2000),
    bio: array(body.bio),
    sortOrder: integer(body.sortOrder ?? body.sort_order, existing?.sort_order || 0),
  };
}

function partyInput(body, existing) {
  const name = text(body.name, 200);
  const abbreviation = text(body.abbreviation, 30);
  if (!name || !abbreviation) throw new Error("Party name and abbreviation are required");
  return {
    slug: existing?.slug || slugify(body.slug || abbreviation), name, abbreviation,
    photoUrl: text(body.photoUrl ?? body.photo_url, 2000),
    replacePhoto: true,
    foundedYear: integer(body.foundedYear ?? body.founded_year),
    foundedPlace: text(body.foundedPlace ?? body.founded_place, 250),
    founders: array(body.founders), ideology: text(body.ideology, 2000),
    history: text(body.history), achievements: text(body.achievements),
    currentStatus: text(body.currentStatus ?? body.current_status, 3000),
    yearsInPower: text(body.yearsInPower ?? body.years_in_power, 1000),
    sortOrder: integer(body.sortOrder ?? body.sort_order, existing?.sort_order || 0),
  };
}

function stateInput(body, existing) {
  const name = text(body.name, 150);
  const kind = String(body.kind || "STATE").toUpperCase();
  if (!name || !STATE_KINDS.includes(kind)) throw new Error("State name and a valid kind are required");
  return {
    slug: existing?.slug || slugify(body.slug || name), name,
    capital: text(body.capital, 150),
    imageUrl: text(body.imageUrl ?? body.image_url, 2000),
    currentCmName: text(body.currentCmName ?? body.current_cm_name, 200),
    cmImageUrl: text(body.cmImageUrl ?? body.cm_image_url, 2000),
    oppositionLeaderName: text(body.oppositionLeaderName ?? body.opposition_leader_name, 200),
    oppositionParty: text(body.oppositionParty ?? body.opposition_party, 250),
    oppositionLeaderImageUrl: text(body.oppositionLeaderImageUrl ?? body.opposition_leader_image_url, 2000),
    kind, formed: text(body.formed, 150),
    history: text(body.history), achievements: text(body.achievements),
    sortOrder: integer(body.sortOrder ?? body.sort_order, existing?.sort_order || 0),
  };
}

async function listReferenceData(req, res) {
  const [politicians, parties, states, widgets] = await Promise.all([
    Politician.findAll(), Party.findAll(), State.findAll(),
    HomeWidget.getAll(),
  ]);
  const parliament = widgets.parliament_data || null;
  const pageProfiles = widgets.page_profiles || null;
  return res.json({
    success: true,
    politicians,
    parties,
    states,
    parliament,
    loksabha: parliament?.loksabha || null,
    rajyasabha: parliament?.rajyasabha || null,
    elections: pageProfiles?.elections || null,
    events: widgets.political_calendar || [],
    rallies: widgets.political_rallys || [],
    vidhanSabhas: widgets.vidhan_sabhas || [],
    homeWidgets: widgets,
    pageProfiles,
  });
}

function crudHandlers(model, input, label, entityType) {
  return {
    create: async (req, res) => {
      try {
        const data = input(req.body);
        await model.upsert(data);
        return res.status(201).json({ success: true, message: `${label} created`, item: await model.findBySlug(data.slug) });
      } catch (error) {
        const duplicate = error.code === "ER_DUP_ENTRY";
        return res.status(duplicate ? 409 : 400).json({ success: false, message: duplicate ? `${label} already exists` : error.message });
      }
    },
    update: async (req, res) => {
      try {
        const existing = await model.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: `${label} not found` });
        const data = input(req.body, existing);
        await model.upsert(data);
        return res.json({ success: true, message: `${label} updated`, item: await model.findBySlug(data.slug) });
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
    },
    remove: async (req, res) => {
      const deleted = await DeletionAudit.softDelete({ entityType, entityId: req.params.id, deletedBy: req.user.userId, reason: req.body?.reason });
      if (!deleted) return res.status(404).json({ success: false, message: `${label} not found` });
      return res.json({ success: true, message: `${label} moved to deleted items` });
    },
  };
}

const politicianCrud = crudHandlers(Politician, politicianInput, "Politician", "POLITICIAN");
const partyCrud = crudHandlers(Party, partyInput, "Party", "PARTY");
const stateCrud = crudHandlers(State, stateInput, "State/UT", "STATE");

async function updateParliament(req, res) {
  const parliament = req.body.parliament;
  if (!parliament || typeof parliament !== "object" || Array.isArray(parliament)) {
    return res.status(400).json({ success: false, message: "Parliament details are required" });
  }
  await HomeWidget.upsert("parliament_data", parliament);
  return res.json({ success: true, message: "Parliament data updated", parliament });
}

const SCHEDULE_WIDGETS = { events: "political_calendar", rallies: "political_rallys" };

async function updateSchedule(req, res) {
  const widgetKey = SCHEDULE_WIDGETS[req.params.type];
  if (!widgetKey) return res.status(404).json({ success: false, message: "Schedule type not found" });
  if (!Array.isArray(req.body.items)) {
    return res.status(400).json({ success: false, message: "Schedule items are required" });
  }
  const items = req.body.items.map((item, index) => ({
    id: text(item.id, 100) || `${Date.now()}-${index}`,
    date: text(item.date, 100),
    title: text(item.title, 500),
  }));
  if (items.some((item) => !item.date || !item.title)) {
    return res.status(400).json({ success: false, message: "Date and title are required for every item" });
  }
  await HomeWidget.upsert(widgetKey, items);
  return res.json({ success: true, message: `${req.params.type === "events" ? "Events" : "Rallies"} updated`, items });
}

async function updateVidhanSabhas(req, res) {
  if (!Array.isArray(req.body.items)) {
    return res.status(400).json({ success: false, message: "Vidhan Sabha records are required" });
  }
  const items = req.body.items.map((item, index) => ({
    id: text(item.id, 100) || `${Date.now()}-${index}`,
    state: text(item.state, 150),
    name: text(item.name, 200),
    totalSeats: integer(item.totalSeats ?? item.total_seats, 0),
    chiefMinister: text(item.chiefMinister ?? item.chief_minister, 200),
    rulingParty: text(item.rulingParty ?? item.ruling_party, 150),
    speaker: text(item.speaker, 200),
    oppositionLeader: text(item.oppositionLeader ?? item.opposition_leader, 200),
    oppositionParty: text(item.oppositionParty ?? item.opposition_party, 150),
    currentTerm: text(item.currentTerm ?? item.current_term, 250),
    nextElection: text(item.nextElection ?? item.next_election, 150),
  }));
  if (items.some((item) => !item.state || !item.name || item.totalSeats < 1)) {
    return res.status(400).json({ success: false, message: "State, assembly name and total seats are required" });
  }
  await HomeWidget.upsert("vidhan_sabhas", items);
  return res.json({ success: true, message: "Vidhan Sabha data updated", items });
}

async function getVidhanSabhas(req, res) {
  const widgets = await HomeWidget.getAll();
  return res.json({ success: true, vidhanSabhas: widgets.vidhan_sabhas || [] });
}

async function updateHomeWidget(req, res) {
  const widgetKey = String(req.params.key || "").trim();
  const widgets = await HomeWidget.getAll();
  if (!Object.prototype.hasOwnProperty.call(widgets, widgetKey)) {
    return res.status(404).json({ success: false, message: "Home widget not found" });
  }
  if (req.body.data === undefined) {
    return res.status(400).json({ success: false, message: "Widget data is required" });
  }
  let data = req.body.data;
  if (widgetKey === "poll_of_the_day") {
    const question = text(data?.question, 500);
    const options = Array.isArray(data?.options) ? data.options.slice(0, 2).map((option) => ({ label: text(option.label, 250), votes: 0, pct: 0 })) : [];
    if (!question || options.length !== 2 || options.some((option) => !option.label)) {
      return res.status(400).json({ success: false, message: "A poll question and exactly two options are required" });
    }
    data = { question, options, totalVotes: 0 };
  }
  await HomeWidget.upsert(widgetKey, data);
  return res.json({ success: true, message: "Home widget updated", key: widgetKey, data });
}

async function updatePageProfiles(req, res) {
  const profiles = req.body.profiles;
  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) {
    return res.status(400).json({ success: false, message: "Page profile details are required" });
  }
  const allowed = ["speeches", "rallies", "elections"];
  const normalized = {};
  for (const key of allowed) {
    const profile = profiles[key] || {};
    normalized[key] = {
      description: text(profile.description, 3000),
      currentLabel: text(profile.currentLabel, 150),
      oppositionLabel: text(profile.oppositionLabel, 150),
      current: {
        name: text(profile.current?.name, 200),
        role: text(profile.current?.role, 500),
        photo: text(profile.current?.photo, 2000),
      },
      opposition: {
        name: text(profile.opposition?.name, 200),
        role: text(profile.opposition?.role, 500),
        photo: text(profile.opposition?.photo, 2000),
      },
      bio: array(profile.bio).slice(0, 10),
      facts: array(profile.facts).slice(0, 12).map((fact) => typeof fact === "string" ? fact : text(fact?.label, 500)).filter(Boolean),
    };
    if (!normalized[key].description) return res.status(400).json({ success: false, message: `${key} description is required` });
  }
  await HomeWidget.upsert("page_profiles", normalized);
  return res.json({ success: true, message: "Page information updated", profiles: normalized });
}

async function getPageProfiles(req, res) {
  const widgets = await HomeWidget.getAll();
  return res.json({ success: true, profiles: widgets.page_profiles || null });
}

async function votePoll(req, res) {
  try {
    const optionIndex = integer(req.body.optionIndex, -1);
    const poll = await HomeWidget.votePoll(optionIndex);
    return res.json({ success: true, message: "Vote recorded", poll });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getParliament(req, res) {
  const widgets = await HomeWidget.getAll();
  return res.json({ success: true, parliament: widgets.parliament_data || null });
}

module.exports = { listReferenceData, politicianCrud, partyCrud, stateCrud, updateParliament, updateSchedule, updateVidhanSabhas, updateHomeWidget, updatePageProfiles, votePoll, getParliament, getVidhanSabhas, getPageProfiles };
