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
- Auth: Google SSO with backend verification. Production can grant access to members of the CyberSwarmSac Organizers Google Group.
- Editable content:
  - Hero pretitle/title/subtitle/countdown/CTA
  - Event details, map source mode (Google iframe or manual pin), form/map URLs, and draggable map pin (lat/lng/zoom)
  - Registration section copy
  - Footer copy
  - Participating organizations
  - Agenda and admin updates (including ticker messages)
  - Full raw JSON content

### Required env vars for Google SSO

Create `.env.local`:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
VITE_GOOGLE_MAPS_EMBED_API_KEY=your_referrer_restricted_maps_embed_key
VITE_ADMIN_EMAILS=you@yourdomain.com,second-admin@yourdomain.com
```

`VITE_ADMIN_EMAILS` is optional and works as a fallback email allowlist. For the Google Group-based admin gate, configure the server-side Workspace variables below.

`VITE_GOOGLE_MAPS_EMBED_API_KEY` is optional. It lets the public site render the selected manual pin inside a Google Maps embed. Without it, manual-pin mode falls back to an OpenStreetMap embed while pasted Google iframe mode keeps using the saved Google embed URL.

### Optional admin integrations

Server-side integration secrets belong on the API service, not in the browser-facing Vite env:

```bash
CALENDAR_FEED_URL=https://calendar.google.com/calendar/ical/.../basic.ics
CALENDAR_PUBLIC_URL=https://calendar.google.com/calendar/u/0?cid=...
TEAM_INBOX_URL=https://mail.google.com/mail/u/0/#inbox
GOOGLE_WORKSPACE_DOMAIN=cyberswarmsac.com
GOOGLE_WORKSPACE_ADMIN_CONSOLE_URL=https://admin.google.com/
GOOGLE_WORKSPACE_DRIVE_FOLDER_URL=https://drive.google.com/drive/folders/...
GOOGLE_WORKSPACE_SHARED_DRIVE_URL=https://drive.google.com/drive/u/0/folders/...
GOOGLE_WORKSPACE_GROUP_EMAIL=team@cyberswarmsac.com

# Admin access via Google Workspace group membership
GOOGLE_WORKSPACE_ORGANIZER_GROUP_EMAIL=organizers@cyberswarmsac.com
GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL=workspace-admin@cyberswarmsac.com
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# Or use one of these instead of separate client email/private key values:
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account",...}
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64=base64_encoded_service_account_json
GOOGLE_WORKSPACE_SCOPES=groups,calendar,gmail,forms,drive

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=team@cyberswarmsac.com
SMTP_PASS=your_provider_app_password
SMTP_FROM=team@cyberswarmsac.com
SMTP_FROM_NAME=CyberSwarm Team
SMTP_REPLY_TO=team@cyberswarmsac.com
```

The admin dashboard can also read a Google Forms response sheet through the attendee feed URL. Use a Google Sheets CSV export/published feed or an Apps Script JSON endpoint; admins can paste a normal Google Sheets link and the API will try to convert it to the CSV export URL.

For Google Workspace access, use one delegated service account credential and authorize the scopes in `GOOGLE_WORKSPACE_SCOPES` in Google Workspace Admin Console. The friendly aliases expand to these scopes: `groups` -> `https://www.googleapis.com/auth/admin.directory.group.member.readonly`, `calendar` -> `https://www.googleapis.com/auth/calendar.readonly`, `gmail` -> `https://www.googleapis.com/auth/gmail.send`, `forms` -> `https://www.googleapis.com/auth/forms.responses.readonly`, and `drive` -> `https://www.googleapis.com/auth/drive.readonly`.

The API checks `/admin` users against `GOOGLE_WORKSPACE_ORGANIZER_GROUP_EMAIL`; `VITE_ADMIN_EMAILS` still works as an emergency explicit allowlist. Specific resource IDs and links, such as a calendar, form, or Drive folder, should live in the admin dashboard because those are operational settings, not secrets.

## Content storage

Content is stored server-side via the `/api/content` backend endpoint and persisted in Docker volume data.

Browser local storage (`cyberswarm_site_content_v1`) is now used only as a client cache/fallback.
