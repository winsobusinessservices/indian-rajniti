const error = { $ref: "#/components/schemas/ErrorResponse" };
const secured = [{ cookieAuth: [] }, { bearerAuth: [] }];

const json = (schema, description = "Successful response") => ({
  description,
  content: { "application/json": { schema } },
});

const commonErrors = (extra = {}) => ({
  400: json(error, "Invalid request"),
  401: json(error, "Authentication required"),
  403: json(error, "Insufficient permission"),
  500: json(error, "Server error"),
  ...extra,
});

const pathParameter = (name, description = `${name} identifier`, schema = { type: "integer" }) => ({
  in: "path",
  name,
  required: true,
  description,
  schema,
});

const queryParameter = (name, description, schema) => ({
  in: "query",
  name,
  required: false,
  description,
  schema,
});

const jsonBody = (schema, required = true) => ({
  required,
  content: { "application/json": { schema } },
});

const successMessage = json({ $ref: "#/components/schemas/SuccessResponse" });

const schemas = {
  SuccessResponse: {
    type: "object",
    required: ["success"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string" },
    },
  },
  SocialLink: {
    type: "object",
    required: ["label", "url"],
    properties: {
      label: { type: "string", example: "Facebook" },
      url: { type: "string", format: "uri", example: "https://facebook.com/indianrajneeti" },
    },
  },
  Site: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      name: { type: "string", example: "Indian Rajneeti" },
      subtitle: { type: "string", nullable: true },
      description: { type: "string", nullable: true },
      slug: { type: "string", example: "indian-rajneeti" },
      domain: { type: "string", example: "indianrajneeti.com" },
      logo_url: { type: "string", nullable: true },
      icon_url: { type: "string", nullable: true },
      primary_color: { type: "string", example: "#002068" },
      secondary_color: { type: "string", example: "#8f4e00" },
      social_links: { type: "array", items: { $ref: "#/components/schemas/SocialLink" } },
      services_enabled: { type: "boolean" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  ServiceInput: {
    type: "object",
    required: ["title", "content"],
    properties: {
      title: { type: "string", maxLength: 180 },
      slug: { type: "string" },
      summary: { type: "string", nullable: true },
      content: { type: "string", description: "Sanitized rich-text HTML" },
      icon: { type: "string", nullable: true },
      imageUrl: { type: "string", nullable: true },
      ctaLabel: { type: "string", nullable: true },
      ctaUrl: { type: "string", nullable: true },
      seoTitle: { type: "string", nullable: true },
      seoDescription: { type: "string", nullable: true },
      sortOrder: { type: "integer", default: 0 },
      isVisible: { type: "boolean", default: true },
    },
  },
  Service: {
    allOf: [
      { $ref: "#/components/schemas/ServiceInput" },
      {
        type: "object",
        properties: {
          id: { type: "integer" },
          site_id: { type: "integer" },
          image_url: { type: "string", nullable: true },
          cta_label: { type: "string", nullable: true },
          cta_url: { type: "string", nullable: true },
          seo_title: { type: "string", nullable: true },
          seo_description: { type: "string", nullable: true },
          sort_order: { type: "integer" },
          is_visible: { type: "boolean" },
        },
      },
    ],
  },
  Comment: {
    type: "object",
    properties: {
      id: { type: "integer" },
      postType: { type: "string", enum: ["ARTICLE", "BLOG", "WORDPRESS"] },
      postSlug: { type: "string" },
      postTitle: { type: "string" },
      content: { type: "string" },
      hidden: { type: "boolean" },
      canDelete: { type: "boolean" },
      authorName: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  ContentLimits: {
    type: "object",
    required: ["AUTHOR", "EDITOR"],
    properties: {
      AUTHOR: { $ref: "#/components/schemas/ContentTypeLimits" },
      EDITOR: { $ref: "#/components/schemas/ContentTypeLimits" },
    },
  },
  ContentTypeLimits: {
    type: "object",
    required: ["ARTICLE", "BLOG", "VIDEO"],
    properties: {
      ARTICLE: { type: "integer", minimum: 1, maximum: 1000 },
      BLOG: { type: "integer", minimum: 1, maximum: 1000 },
      VIDEO: { type: "integer", minimum: 1, maximum: 1000 },
    },
  },
  DeletionRecord: {
    type: "object",
    properties: {
      id: { type: "integer" },
      entity_type: { type: "string" },
      entity_id: { type: "integer" },
      entity_title: { type: "string", nullable: true },
      reason: { type: "string", nullable: true },
      state: { type: "string", enum: ["ACTIVE", "RESTORED", "PERMANENT"] },
      deleted_at: { type: "string", format: "date-time" },
    },
  },
  SiteHeader: {
    type: "object",
    properties: {
      showUpcomingRallies: { type: "boolean" },
      showWeather: { type: "boolean" },
      showUpcomingEvents: { type: "boolean" },
      menuItems: {
        type: "array",
        maxItems: 50,
        items: {
          type: "object",
          required: ["label", "href"],
          properties: {
            label: { type: "string" },
            href: { type: "string" },
            enabled: { type: "boolean" },
            feature: { type: "string" },
            requiresServices: { type: "boolean" },
          },
        },
      },
      countdown: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          title: { type: "string" },
          targetAt: { type: "string", format: "date-time" },
          link: { type: "string" },
          buttonLabel: { type: "string" },
        },
      },
    },
  },
};

const paths = {
  "/api/sites/current": {
    get: {
      tags: ["Sites"], summary: "Get the active Indian Rajneeti website settings",
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, site: { $ref: "#/components/schemas/Site" } } }), 503: json(error, "Website is not configured") },
    },
  },
  "/api/admin/sites": {
    get: {
      tags: ["Sites"], summary: "Get the manageable Indian Rajneeti website", security: secured,
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, sites: { type: "array", items: { $ref: "#/components/schemas/Site" } } } }), ...commonErrors() },
    },
  },
  "/api/admin/site-features": {
    get: {
      tags: ["Sites"], summary: "Get enabled website features", security: secured,
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, site: { $ref: "#/components/schemas/Site" }, features: { type: "object", additionalProperties: { type: "boolean" } } } }), ...commonErrors() },
    },
  },
  "/api/admin/site-settings": {
    patch: {
      tags: ["Sites"], summary: "Update Indian Rajneeti branding and theme", security: secured,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object", required: ["name"],
              properties: {
                name: { type: "string" }, subtitle: { type: "string" }, description: { type: "string" },
                primaryColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                secondaryColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                socialLinks: { type: "string", description: "JSON array of SocialLink objects" },
                servicesEnabled: { type: "boolean" },
                logoFile: { type: "string", format: "binary" }, iconFile: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, site: { $ref: "#/components/schemas/Site" } } }), ...commonErrors({ 404: json(error, "Website settings not found") }) },
    },
  },
  "/api/services": {
    get: {
      tags: ["Services"], summary: "List public services",
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, site: { $ref: "#/components/schemas/Site" }, services: { type: "array", items: { $ref: "#/components/schemas/Service" } } } }), 500: json(error, "Server error") },
    },
  },
  "/api/services/{slug}": {
    get: {
      tags: ["Services"], summary: "Get a public service", parameters: [pathParameter("slug", "Service slug", { type: "string" })],
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, site: { $ref: "#/components/schemas/Site" }, service: { $ref: "#/components/schemas/Service" } } }), 404: json(error, "Service not found"), 500: json(error, "Server error") },
    },
  },
  "/api/admin/services": {
    get: {
      tags: ["Services"], summary: "List services for administration", security: secured,
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, services: { type: "array", items: { $ref: "#/components/schemas/Service" } } } }), ...commonErrors() },
    },
    post: {
      tags: ["Services"], summary: "Create a service", security: secured, requestBody: jsonBody({ $ref: "#/components/schemas/ServiceInput" }),
      responses: { 201: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, service: { $ref: "#/components/schemas/Service" } } }, "Service created"), ...commonErrors({ 409: json(error, "Service slug already exists") }) },
    },
  },
  "/api/admin/services/{id}": {
    patch: {
      tags: ["Services"], summary: "Update a service", security: secured, parameters: [pathParameter("id", "Service identifier")], requestBody: jsonBody({ $ref: "#/components/schemas/ServiceInput" }),
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, service: { $ref: "#/components/schemas/Service" } } }), ...commonErrors({ 404: json(error, "Service not found"), 409: json(error, "Service slug already exists") }) },
    },
    delete: {
      tags: ["Services"], summary: "Delete a service", security: secured, parameters: [pathParameter("id", "Service identifier")],
      responses: { 200: successMessage, ...commonErrors({ 404: json(error, "Service not found") }) },
    },
  },
  "/api/comments/post/{slug}": {
    get: {
      tags: ["Comments"], summary: "List comments for a published post", parameters: [pathParameter("slug", "Post slug", { type: "string" })],
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, disabled: { type: "boolean" }, comments: { type: "array", items: { $ref: "#/components/schemas/Comment" } } } }), 500: json(error, "Server error") },
    },
  },
  "/api/comments": {
    post: {
      tags: ["Comments"], summary: "Post a comment", security: secured,
      requestBody: jsonBody({ type: "object", required: ["postSlug", "content"], properties: { postSlug: { type: "string" }, content: { type: "string", maxLength: 1000 } } }),
      responses: { 201: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, comment: { $ref: "#/components/schemas/Comment" } } }), ...commonErrors({ 404: json(error, "Published post not found"), 422: json(error, "Comment rejected by moderation") }) },
    },
  },
  "/api/admin/comments": {
    get: {
      tags: ["Comments"], summary: "List comments for moderation", security: secured,
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, comments: { type: "array", items: { $ref: "#/components/schemas/Comment" } } } }), ...commonErrors() },
    },
  },
  "/api/admin/comments/{id}/visibility": {
    patch: {
      tags: ["Comments"], summary: "Hide or show a comment", security: secured, parameters: [pathParameter("id", "Comment identifier")],
      requestBody: jsonBody({ type: "object", required: ["hidden"], properties: { hidden: { type: "boolean" } } }),
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, comment: { $ref: "#/components/schemas/Comment" } } }), ...commonErrors({ 404: json(error, "Comment not found") }) },
    },
  },
  "/api/comments/{id}": {
    delete: {
      tags: ["Comments"], summary: "Move a comment to deleted items", security: secured, parameters: [pathParameter("id", "Comment identifier")],
      requestBody: jsonBody({ type: "object", properties: { reason: { type: "string" } } }, false),
      responses: { 200: successMessage, ...commonErrors({ 404: json(error, "Comment not found") }) },
    },
  },
  "/api/content-limits/me": {
    get: {
      tags: ["Content limits"], summary: "Get the signed-in contributor's daily posting usage", security: secured,
      responses: { 200: json({ type: "object", additionalProperties: true }), ...commonErrors() },
    },
  },
  "/api/admin/content-limits": {
    get: {
      tags: ["Content limits"], summary: "Get daily posting limits", security: secured,
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, limits: { $ref: "#/components/schemas/ContentLimits" } } }), ...commonErrors() },
    },
    put: {
      tags: ["Content limits"], summary: "Update daily posting limits", security: secured,
      requestBody: jsonBody({ type: "object", required: ["limits"], properties: { limits: { $ref: "#/components/schemas/ContentLimits" } } }),
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, limits: { $ref: "#/components/schemas/ContentLimits" } } }), ...commonErrors() },
    },
  },
  "/api/admin/deletions": {
    get: {
      tags: ["Deleted items"], summary: "List deletion-audit records", security: secured,
      parameters: [queryParameter("state", "Deletion state filter", { type: "string", enum: ["ACTIVE", "RESTORED", "PERMANENT", "ALL"], default: "ACTIVE" })],
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, deletions: { type: "array", items: { $ref: "#/components/schemas/DeletionRecord" } } } }), ...commonErrors() },
    },
  },
  "/api/admin/deletions/{id}/restore": {
    patch: {
      tags: ["Deleted items"], summary: "Restore a deleted item", security: secured, parameters: [pathParameter("id", "Deletion record identifier")],
      responses: { 200: successMessage, ...commonErrors({ 404: json(error, "Deleted item unavailable"), 409: json(error, "A conflicting record exists") }) },
    },
  },
  "/api/admin/deletions/{id}/permanent": {
    delete: {
      tags: ["Deleted items"], summary: "Permanently delete an item", security: secured, parameters: [pathParameter("id", "Deletion record identifier")],
      responses: { 200: successMessage, ...commonErrors({ 404: json(error, "Deleted item unavailable") }) },
    },
  },
  "/api/admin/reference-visibility": {
    get: {
      tags: ["Categories"], summary: "List politician, party, and state visibility settings", security: secured,
      responses: { 200: json({ type: "object", additionalProperties: true }), ...commonErrors() },
    },
  },
  "/api/admin/reference-visibility/{type}/{id}": {
    patch: {
      tags: ["Categories"], summary: "Update a reference item's visibility", security: secured,
      parameters: [pathParameter("type", "Reference type", { type: "string", enum: ["politician", "party", "state"] }), pathParameter("id", "Reference item identifier")],
      requestBody: jsonBody({ type: "object", required: ["isVisible"], properties: { isVisible: { type: "boolean" } } }),
      responses: { 200: successMessage, ...commonErrors({ 404: json(error, "Reference item not found") }) },
    },
  },
  "/api/admin/site-management": {
    get: {
      tags: ["Site management"], summary: "Get header, homepage widget, and section settings", security: secured,
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, widgets: { type: "object", additionalProperties: true }, sections: { type: "array", items: { type: "object", additionalProperties: true } } } }), ...commonErrors() },
    },
  },
  "/api/admin/site-management/header": {
    put: {
      tags: ["Site management"], summary: "Update public header and navigation settings", security: secured,
      requestBody: jsonBody({ type: "object", required: ["header"], properties: { header: { $ref: "#/components/schemas/SiteHeader" } } }),
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, header: { $ref: "#/components/schemas/SiteHeader" } } }), ...commonErrors() },
    },
  },
  "/api/wallet/bonuses/{bonusId}/acknowledge": {
    patch: {
      tags: ["Wallet"], summary: "Acknowledge a contributor bonus notification", security: secured, parameters: [pathParameter("bonusId", "Bonus identifier")],
      responses: { 200: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, acknowledgedAt: { type: "string", format: "date-time" } } }), ...commonErrors({ 404: json(error, "Bonus not found") }) },
    },
  },
  "/api/admin/wallets/bonuses": {
    post: {
      tags: ["Wallet"], summary: "Award bonus points for approved content", security: secured,
      requestBody: jsonBody({
        type: "object", required: ["userId", "contentId", "contentType", "points", "reason"],
        properties: {
          userId: { type: "integer" }, contentId: { type: "integer" },
          contentType: { type: "string", enum: ["ARTICLE", "BLOG", "VIDEO"] },
          points: { type: "integer", minimum: 1, maximum: 1000000 },
          reason: { type: "string", minLength: 5, maxLength: 500 },
        },
      }),
      responses: { 201: json({ type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, bonus: { type: "object", additionalProperties: true } } }), ...commonErrors({ 404: json(error, "Contributor or content not found") }) },
    },
  },
};

for (const resource of ["articles", "blogs", "videos"]) {
  paths[`/api/${resource}/{id}/comments`] = {
    patch: {
      tags: ["Content"],
      summary: `Enable or disable comments for a ${resource.slice(0, -1)}`,
      security: secured,
      parameters: [pathParameter("id", "Content identifier")],
      requestBody: jsonBody({
        type: "object",
        required: ["enabled"],
        properties: { enabled: { type: "boolean" } },
      }),
      responses: {
        200: json({
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            post: { type: "object", additionalProperties: true },
          },
        }),
        ...commonErrors({ 404: json(error, "Content not found") }),
      },
    },
  };
}

module.exports = { paths, schemas };
