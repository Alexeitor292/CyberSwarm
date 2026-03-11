# CyberSwarm

This app is fully decoupled from Base44 and now includes a built-in admin CMS at `/admin`.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

Optional: run backend API locally (for shared-content behavior):

```bash
npm run dev:api
```

3. Build for production:

```bash
npm run build
```

## Deploy settings

Use these settings in your hosting provider:

- Build command: `npm run build`
- Publish/output directory: `dist`

Do not deploy the raw source folder directly.

Your host must support SPA fallback routing so `/admin` resolves to `index.html`.

For self-hosted production on Proxmox LXC + Docker + Nginx + Cloudflare Tunnel, use:

- [`deploy/PROXMOX_CLOUDFLARE_RUNBOOK.md`](./deploy/PROXMOX_CLOUDFLARE_RUNBOOK.md)

## Admin Dashboard

- URL: `https://cyberswarmsac.com/admin`
- Auth: Google SSO (Google token is re-verified by the backend on content writes)
- Editable content:
  - Hero pretitle/title/subtitle/countdown/CTA
  - Event details, form/map URLs, and draggable map pin (lat/lng/zoom)
  - Registration section copy
  - Footer copy
  - Participating organizations
  - Agenda and admin updates (including ticker messages)
  - Full raw JSON content

### Required env vars for Google SSO

Create `.env.local`:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
VITE_ADMIN_EMAILS=you@yourdomain.com,second-admin@yourdomain.com
```

`VITE_ADMIN_EMAILS` is optional. If set, only listed emails can access `/admin`.

## Content storage

Content is stored server-side via the `/api/content` backend endpoint and persisted in Docker volume data.

Browser local storage (`cyberswarm_site_content_v1`) is now used only as a client cache/fallback.
