const PERMISSIONS = Object.freeze({
  DASHBOARD: "dashboard",
  MY_CONTENT: "my_content",
  CREATE_ARTICLE: "create_article",
  CREATE_BLOG: "create_blog",
  CREATE_VIDEO: "create_video",
  REVIEW_CONTENT: "review_content",
  CONTENT_HISTORY: "content_history",
  TEAM_MEMBERS: "team_members",
  MANAGE_CATEGORIES: "manage_categories",
  MANAGE_CAREERS: "manage_careers",
  MANAGE_WALLETS: "manage_wallets",
  MANAGE_POINT_RATES: "manage_point_rates",
  MANAGE_SITE_DATA: "manage_site_data",
  SITE_POLITICIANS: "site_politicians",
  SITE_PARTIES: "site_parties",
  SITE_STATES: "site_states",
  SITE_PARLIAMENT: "site_parliament",
  SITE_SCHEDULES: "site_schedules",
  SITE_VIDHAN_SABHAS: "site_vidhan_sabhas",
  SITE_HOME_WIDGETS: "site_home_widgets",
  SITE_WIDGET_BREAKING_NEWS: "site_widget_breaking_news",
  SITE_WIDGET_POLL: "site_widget_poll",
  SITE_WIDGET_ELECTION_RESULTS: "site_widget_election_results",
  SITE_WIDGET_OTHER: "site_widget_other",
  SITE_PAGE_PROFILES: "site_page_profiles",
});

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
  USER: [],
  AUTHOR: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.MY_CONTENT,
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.CREATE_BLOG,
    PERMISSIONS.CREATE_VIDEO,
  ],
  EDITOR: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.MY_CONTENT,
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.CREATE_BLOG,
    PERMISSIONS.CREATE_VIDEO,
    PERMISSIONS.REVIEW_CONTENT,
    PERMISSIONS.CONTENT_HISTORY,
  ],
  INVESTOR: [PERMISSIONS.DASHBOARD],
  SUBADMIN: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.TEAM_MEMBERS,
    PERMISSIONS.MANAGE_WALLETS,
    PERMISSIONS.MANAGE_POINT_RATES,
    PERMISSIONS.MANAGE_SITE_DATA,
    PERMISSIONS.SITE_POLITICIANS,
    PERMISSIONS.SITE_PARTIES,
    PERMISSIONS.SITE_STATES,
    PERMISSIONS.SITE_PARLIAMENT,
    PERMISSIONS.SITE_SCHEDULES,
    PERMISSIONS.SITE_VIDHAN_SABHAS,
    PERMISSIONS.SITE_HOME_WIDGETS,
    PERMISSIONS.SITE_WIDGET_BREAKING_NEWS,
    PERMISSIONS.SITE_WIDGET_POLL,
    PERMISSIONS.SITE_WIDGET_ELECTION_RESULTS,
    PERMISSIONS.SITE_WIDGET_OTHER,
    PERMISSIONS.SITE_PAGE_PROFILES,
  ],
  ADMIN: ALL_PERMISSIONS,
});

function normalizePermissions(value, role) {
  if (role === "ADMIN") return [...ALL_PERMISSIONS];
  if (value === null || value === undefined) return [...(ROLE_DEFAULT_PERMISSIONS[role] || [])];
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { parsed = []; }
  }
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.filter((permission) => ALL_PERMISSIONS.includes(permission)))];
}

module.exports = { PERMISSIONS, ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, normalizePermissions };
