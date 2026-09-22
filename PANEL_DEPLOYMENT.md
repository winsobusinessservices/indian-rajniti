# Public site and staff panel deployment

Deploy the applications as three services that share the existing database and backend API:

- `indian-rajniti-frontend` -> `https://indianrajniti.in`
- `indian-rajniti-panel-frontend` -> `https://indianrajneeti.com`
- `indian-rajniti-backend` -> your API domain

## Frontend environment

Public frontend:

```env
NEXT_PUBLIC_API_URL=https://api.indianrajneeti.com/api
NEXT_PUBLIC_SITE_URL=https://indianrajniti.in
NEXT_PUBLIC_PANEL_URL=https://indianrajneeti.com
```

Panel frontend:

```env
NEXT_PUBLIC_API_URL=https://api.indianrajneeti.com/api
NEXT_PUBLIC_SITE_URL=https://indianrajneeti.com
NEXT_PUBLIC_PUBLIC_SITE_URL=https://indianrajniti.in
```

## Backend environment

Both frontends use this one backend. `CLIENT_ORIGIN` identifies the public site
and `PANEL_ORIGIN` identifies the staff panel; the backend allows both origins.
Multiple public aliases can still be supplied as a comma-separated list.

```env
CLIENT_ORIGIN=https://indianrajniti.in,https://www.indianrajniti.in
PANEL_ORIGIN=https://indianrajneeti.com,https://www.indianrajneeti.com
COOKIE_SAME_SITE=none
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

The public site and API are on different sites (`.in` and `.com`), so `COOKIE_SAME_SITE=none` is required in production. Production cookies are already marked secure. Do not set `COOKIE_DOMAIN` to either domain: a cookie domain cannot span both `indianrajniti.in` and `indianrajneeti.com`. Both frontends authenticate by sending credentials to the same API domain.

The panel runs locally on port `3001` with `npm run dev`; the public frontend remains on port `3000`.

## Google sign-in

Use the same Google **Web application** client ID for the public site, panel,
and backend. In Google Cloud Console, add every browser origin that can show
the Google button under **Authorized JavaScript origins** (origins only, with
no path):

```text
https://indianrajniti.in
https://www.indianrajniti.in
https://indianrajneeti.com
https://www.indianrajneeti.com
http://localhost:3000
http://localhost:3001
```

The backend verifies the Google ID token and then applies the same database
role used by password login. The panel accepts `AUTHOR`, `EDITOR`, `SUBADMIN`,
and `ADMIN`; public `USER` and `INVESTOR` accounts stay on the public site.
