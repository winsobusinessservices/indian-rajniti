const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Uploaded media is served from the backend's root (e.g. /uploads/...), not
// under /api, so strip the /api suffix to get a base for building <img>/src.
export const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export function mediaUrl(path) {
  if (!path) return "";
  return /^https?:\/\//.test(path) ? path : `${MEDIA_BASE_URL}${path}`;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

// For multipart bodies (file uploads) — no Content-Type header, so the
// browser sets the correct multipart boundary itself.
async function requestForm(path, { method = "POST", formData } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
}

export const authApi = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  changePassword: (payload) => request("/auth/change-password", { method: "POST", body: payload }),
  forgotPassword: (payload) => request("/auth/forgot-password", { method: "POST", body: payload }),
  resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: payload }),
  updateUserRole: (id, role) => request(`/auth/users/${id}/role`, { method: "PATCH", body: { role } }),
  // Admin/Investor only — backs the Investor read-only dashboard's user
  // totals (total users, authors, editors).
  listUsers: () => request("/auth/users"),
  // Admin only — combined name/email/role editor for the Team Members table.
  updateUser: (id, payload) => request(`/auth/users/${id}`, { method: "PATCH", body: payload }),
  // Admin only — removes a team member's account entirely.
  deleteUser: (id) => request(`/auth/users/${id}`, { method: "DELETE" }),
  // Admin assigning an Author/Editor/Investor role (with KYC documents) to an
  // already-registered account — no password is set here, the person must
  // already exist via register().
  assignRole: (formData) => requestForm("/auth/admin/users", { formData }),
};

function toQueryString(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value);
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

// Backend resources are type-scoped REST endpoints (/articles, /blogs,
// /videos), each following the same create -> draft -> submit -> AI check ->
// editor review workflow. `GET /:resource` is always scoped to the caller's
// own content, regardless of role — "my content" means MY content. Moderator
// visibility into everyone else's content lives at `GET /:resource/history`
// instead (review queue / content history), never mixed into this one.
const RESOURCE_PATH = { ARTICLE: "articles", BLOG: "blogs", VIDEO: "videos" };

export const authorApi = {
  // Create/update send multipart form data — featured images, thumbnails, and
  // uploaded video files ride along as real files, not URL strings.
  createArticle: (formData) => requestForm("/articles", { formData }),
  createBlog: (formData) => requestForm("/blogs", { formData }),
  createVideo: (formData) => requestForm("/videos", { formData }),

  listByType: (type, filters) => request(`/${RESOURCE_PATH[type]}${toQueryString(filters)}`),

  // Convenience: the "My Content" dashboard shows all three types together,
  // even though the backend itself has no combined endpoint.
  async listAllTypes(filters) {
    const lists = await Promise.all(
      Object.keys(RESOURCE_PATH).map((type) => authorApi.listByType(type, filters).then((data) => data.posts))
    );
    return lists.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Moderator-only — every author's content. Backs the review queue
  // (status=PENDING) and the content history page (no/any status filter).
  listHistoryByType: (type, filters) => request(`/${RESOURCE_PATH[type]}/history${toQueryString(filters)}`),

  async listAllHistory(filters) {
    const lists = await Promise.all(
      Object.keys(RESOURCE_PATH).map((type) => authorApi.listHistoryByType(type, filters).then((data) => data.posts))
    );
    return lists.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getPost: (type, id) => request(`/${RESOURCE_PATH[type]}/${id}`),
  updatePost: (type, id, formData) => requestForm(`/${RESOURCE_PATH[type]}/${id}`, { method: "PUT", formData }),
  deletePost: (type, id, reason) => request(`/${RESOURCE_PATH[type]}/${id}`, { method: "DELETE", body: reason ? { reason } : undefined }),
  submitPost: (type, id) => request(`/${RESOURCE_PATH[type]}/${id}/submit`, { method: "POST" }),
  getPostStatus: (type, id) => request(`/${RESOURCE_PATH[type]}/${id}/status`),
  reviewPost: (type, id, payload) => request(`/${RESOURCE_PATH[type]}/${id}/review`, { method: "POST", body: payload }),
};

// Job postings the site is hiring for — admin creates/manages, any logged-in
// member can browse and apply. Distinct from authApi's role-application
// flow (self-signup to become an Author/Editor/Investor on the platform).
export const careersApi = {
  create: (payload) => request("/careers", { method: "POST", body: payload }),
  update: (id, payload) => request(`/careers/${id}`, { method: "PATCH", body: payload }),
  list: () => request("/careers"),
  listForAdmin: (status) => request(`/careers/manage${toQueryString({ status })}`),
  getBySlug: (slug) => request(`/careers/${slug}`),
  setStatus: (id, status) => request(`/careers/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => request(`/careers/${id}`, { method: "DELETE" }),
  apply: (id, formData) => requestForm(`/careers/${id}/apply`, { formData }),
  getMyApplication: (id) => request(`/careers/${id}/my-application`),
  listApplications: (id) => request(`/careers/${id}/applications`),
  reviewApplication: (id, appId, payload) => request(`/careers/${id}/applications/${appId}/review`, { method: "POST", body: payload }),
};


