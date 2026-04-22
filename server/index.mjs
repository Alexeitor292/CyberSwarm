import { createServer } from 'node:http';
import { createSign } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { join } from 'node:path';
import tls from 'node:tls';
import { DEFAULT_SITE_CONTENT, normalizeSiteContent } from '../src/data/siteData.js';

const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), '.data');
const CONTENT_FILE = join(DATA_DIR, 'site-content.json');
const SPONSOR_REQUESTS_FILE = join(DATA_DIR, 'sponsor-requests.json');
const LOGO_UPLOADS_DIR = join(DATA_DIR, 'uploads', 'logos');
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DIRECTORY_HAS_MEMBER_URL = 'https://admin.googleapis.com/admin/directory/v1/groups';
const GOOGLE_DIRECTORY_GROUP_MEMBERS_URL = 'https://admin.googleapis.com/admin/directory/v1/groups';
const GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE = 'https://www.googleapis.com/auth/admin.directory.group.member.readonly';
const GOOGLE_CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars';
const GOOGLE_GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const GOOGLE_FORMS_RESPONSES_READONLY_SCOPE = 'https://www.googleapis.com/auth/forms.responses.readonly';
const GOOGLE_DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const GOOGLE_SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DRIVE_DRIVES_URL = 'https://www.googleapis.com/drive/v3/drives';
const GOOGLE_SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const GOOGLE_DRIVE_SHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const REQUEST_TIMEOUT_MS = 10000;
const BODY_LIMIT_BYTES = 1024 * 1024;
const LOGO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_UPLOAD_REQUEST_LIMIT_BYTES = 12 * 1024 * 1024;
const FEED_REQUEST_TIMEOUT_MS = 15000;
const FEED_BODY_LIMIT_BYTES = 2 * 1024 * 1024;
const FEED_ALLOWED_HOST_SUFFIXES = ['google.com', 'googleusercontent.com'];
const LOGO_UPLOAD_MIME_TO_EXTENSION = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
});
const LOGO_UPLOAD_EXTENSION_TO_MIME = Object.freeze({
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
});
const BASE64_PAYLOAD_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const ATTENDEE_SHARED_DRIVE_ID_HINT = String(process.env.ATTENDEE_SHARED_DRIVE_ID || '').trim();
const ATTENDEE_SHEET_NAME_HINT = String(process.env.ATTENDEE_SHEET_FILE_NAME || '').trim();
const ATTENDEE_SHEET_TAB_NAME_HINT = String(process.env.ATTENDEE_SHEET_TAB_NAME || '').trim();
const ATTENDEE_SHARED_DRIVE_NAME_HINT = String(process.env.ATTENDEE_SHARED_DRIVE_NAME || '').trim();
const CALENDAR_FEED_URL = String(
  process.env.CALENDAR_FEED_URL || process.env.GOOGLE_CALENDAR_ICS_URL || ''
).trim();
const CALENDAR_PUBLIC_URL = String(
  process.env.CALENDAR_PUBLIC_URL || process.env.GOOGLE_CALENDAR_PUBLIC_URL || ''
).trim();
const CALENDAR_ID = String(
  process.env.CALENDAR_ID || process.env.GOOGLE_CALENDAR_ID || process.env.GOOGLE_WORKSPACE_CALENDAR_ID || ''
).trim().toLowerCase().slice(0, 320);
const TEAM_INBOX_URL = String(
  process.env.TEAM_INBOX_URL || process.env.MAIL_INBOX_URL || process.env.SMTP_INBOX_URL || ''
).trim();
const WORKSPACE_DOMAIN = String(
  process.env.GOOGLE_WORKSPACE_DOMAIN || process.env.WORKSPACE_DOMAIN || 'cyberswarmsac.com'
).trim().slice(0, 255);
const WORKSPACE_ADMIN_CONSOLE_URL = String(
  process.env.GOOGLE_WORKSPACE_ADMIN_CONSOLE_URL || process.env.WORKSPACE_ADMIN_CONSOLE_URL || 'https://admin.google.com/'
).trim().slice(0, 500);
const WORKSPACE_DRIVE_FOLDER_URL = String(
  process.env.GOOGLE_WORKSPACE_DRIVE_FOLDER_URL || process.env.WORKSPACE_DRIVE_FOLDER_URL || ''
).trim().slice(0, 500);
const WORKSPACE_SHARED_DRIVE_URL = String(
  process.env.GOOGLE_WORKSPACE_SHARED_DRIVE_URL || process.env.WORKSPACE_SHARED_DRIVE_URL || ''
).trim().slice(0, 500);
const WORKSPACE_GROUP_EMAIL = String(
  process.env.GOOGLE_WORKSPACE_GROUP_EMAIL || process.env.WORKSPACE_GROUP_EMAIL || 'team@cyberswarmsac.com'
).trim().toLowerCase().slice(0, 320);
const ORGANIZER_GROUP_EMAIL = String(
  process.env.GOOGLE_WORKSPACE_ORGANIZER_GROUP_EMAIL ||
    process.env.GOOGLE_ORGANIZER_GROUP_EMAIL ||
    process.env.GOOGLE_WORKSPACE_GROUP_EMAIL ||
    process.env.WORKSPACE_GROUP_EMAIL ||
    ''
).trim().toLowerCase().slice(0, 320);
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = String(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || '').trim();
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64 = String(
  process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64 || ''
).trim();
const GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL = String(process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || '')
  .trim()
  .slice(0, 320);
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();
const GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL = String(
  process.env.GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL || process.env.GOOGLE_DELEGATED_ADMIN_EMAIL || ''
).trim().toLowerCase().slice(0, 320);
const GOOGLE_WORKSPACE_SCOPES_INPUT = String(process.env.GOOGLE_WORKSPACE_SCOPES || '').trim();
const SMTP_COMMAND_TIMEOUT_MS = 15000;
const SMTP_BODY_LIMIT_BYTES = 100 * 1024;
const SMTP_MAX_RECIPIENTS = 250;
const GMAIL_NOTIFY_FROM = String(
  process.env.GMAIL_NOTIFY_FROM || process.env.GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL || ''
).trim().toLowerCase().slice(0, 320);
const ORGANIZER_NOTIFY_TO = String(
  process.env.ORGANIZER_NOTIFY_EMAIL || 'organizers@cyberswarmsac.com'
).trim().toLowerCase().slice(0, 320);

const clone = (value) => JSON.parse(JSON.stringify(value));

const parseJsonEnv = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

const GOOGLE_WORKSPACE_SCOPE_ALIASES = {
  group: GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE,
  groups: GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE,
  directory: GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE,
  'directory.groups': GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE,
  calendar: GOOGLE_CALENDAR_READONLY_SCOPE,
  'calendar.readonly': GOOGLE_CALENDAR_READONLY_SCOPE,
  gmail: GOOGLE_GMAIL_SEND_SCOPE,
  'gmail.send': GOOGLE_GMAIL_SEND_SCOPE,
  forms: GOOGLE_FORMS_RESPONSES_READONLY_SCOPE,
  'forms.responses': GOOGLE_FORMS_RESPONSES_READONLY_SCOPE,
  'forms.responses.readonly': GOOGLE_FORMS_RESPONSES_READONLY_SCOPE,
  drive: GOOGLE_DRIVE_READONLY_SCOPE,
  'drive.readonly': GOOGLE_DRIVE_READONLY_SCOPE,
  sheets: GOOGLE_SHEETS_READONLY_SCOPE,
  'sheets.readonly': GOOGLE_SHEETS_READONLY_SCOPE,
};

const DEFAULT_GOOGLE_WORKSPACE_SCOPES = [
  GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_GMAIL_SEND_SCOPE,
  GOOGLE_FORMS_RESPONSES_READONLY_SCOPE,
  GOOGLE_DRIVE_READONLY_SCOPE,
  GOOGLE_SHEETS_READONLY_SCOPE,
];

const expandGoogleWorkspaceScope = (value) => {
  const scope = String(value || '').trim();
  if (!scope) return '';
  return GOOGLE_WORKSPACE_SCOPE_ALIASES[scope.toLowerCase()] || scope;
};

const normalizeGoogleWorkspaceScopes = (value) => {
  const rawScopes = Array.isArray(value)
    ? value
    : String(value || '')
        .split(/[\s,]+/)
        .filter(Boolean);

  return [...new Set(rawScopes.map(expandGoogleWorkspaceScope).filter(Boolean))].sort();
};

const GOOGLE_WORKSPACE_SCOPES = normalizeGoogleWorkspaceScopes(
  GOOGLE_WORKSPACE_SCOPES_INPUT || DEFAULT_GOOGLE_WORKSPACE_SCOPES
);

const SERVICE_ACCOUNT_CREDENTIALS = (() => {
  const directJson = parseJsonEnv(GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
  if (directJson) return directJson;

  if (!GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64) return {};

  try {
    return parseJsonEnv(Buffer.from(GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64, 'base64').toString('utf8')) || {};
  } catch (_error) {
    return {};
  }
})();

const DIRECTORY_SERVICE_ACCOUNT_CLIENT_EMAIL = (
  GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || String(SERVICE_ACCOUNT_CREDENTIALS.client_email || '')
).trim();
const DIRECTORY_SERVICE_ACCOUNT_PRIVATE_KEY = (
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || String(SERVICE_ACCOUNT_CREDENTIALS.private_key || '')
).replace(/\\n/g, '\n');

const createId = (prefix) =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const stringValue = (value, maxLength = 4000) => String(value ?? '').trim().slice(0, maxLength);
const lowerStringValue = (value, maxLength = 4000) =>
  stringValue(value, maxLength).toLowerCase();
const booleanValue = (value) => {
  if (value === true || value === false) return value;
  const normalized = stringValue(value, 32).toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue(value, 320));
const sanitizeUploadStem = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return normalized || 'logo';
};

const getSafeUploadFilename = (value) => {
  const name = String(value || '').trim();
  if (!name || name.includes('/') || name.includes('\\')) return '';
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return '';
  return name;
};

const parseUploadDataPayload = (rawValue) => {
  const raw = String(rawValue || '').trim();
  if (!raw) return { mimeType: '', dataBase64: '' };

  const dataUrlMatch = raw.match(/^data:([^;,]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    return {
      mimeType: String(dataUrlMatch[1] || '').trim().toLowerCase(),
      dataBase64: String(dataUrlMatch[2] || '').replace(/\s+/g, ''),
    };
  }

  return { mimeType: '', dataBase64: raw.replace(/\s+/g, '') };
};

const SMTP_CONFIG = {
  host: stringValue(process.env.SMTP_HOST, 255),
  port: Number(process.env.SMTP_PORT || 587),
  secure: booleanValue(process.env.SMTP_SECURE),
  user: stringValue(process.env.SMTP_USER, 320),
  pass: String(process.env.SMTP_PASS || ''),
  from: stringValue(process.env.SMTP_FROM || process.env.SMTP_USER, 320),
  fromName: stringValue(process.env.SMTP_FROM_NAME || 'CyberSwarm Team', 120),
  replyTo: stringValue(process.env.SMTP_REPLY_TO, 320),
};
const SMTP_EHLO_NAME = stringValue(process.env.SMTP_EHLO_NAME || 'cyberswarm.local', 255);

const ensureJsonFile = async (filename, initialValue) => {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(filename, 'utf8');
  } catch (_error) {
    await writeFile(filename, JSON.stringify(initialValue, null, 2), 'utf8');
  }
};

const writeJsonFile = async (filename, value) => {
  await mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${filename}.tmp`;
  await writeFile(tempFile, JSON.stringify(value, null, 2), 'utf8');
  await rename(tempFile, filename);
  return value;
};

const normalizeSponsorRequestRecord = (raw) => {
  const createdAt = stringValue(raw?.createdAt, 80) || new Date().toISOString();
  const supportAmount = stringValue(raw?.supportAmount ?? raw?.support_amount, 160);
  const message = stringValue(raw?.message ?? raw?.notes ?? raw?.supportNotes, 2400);
  const bringSwag = booleanValue(raw?.bringSwag ?? raw?.bring_swag);
  const venueBranding = booleanValue(raw?.venueBranding ?? raw?.venue_branding);

  return {
    id: stringValue(raw?.id, 120) || createId('sponsor-request'),
    createdAt,
    submittedAt: createdAt,
    sortTimestamp: Date.parse(createdAt) || Date.now(),
    organizationName: stringValue(
      raw?.organizationName ?? raw?.organization_name ?? raw?.company,
      160
    ),
    company: stringValue(raw?.organizationName ?? raw?.organization_name ?? raw?.company, 160),
    contactName: stringValue(raw?.contactName ?? raw?.contact_name ?? raw?.name, 120),
    name: stringValue(raw?.contactName ?? raw?.contact_name ?? raw?.name, 120),
    email: lowerStringValue(raw?.email ?? raw?.contactEmail ?? raw?.contact_email, 320),
    phone: stringValue(raw?.phone, 48),
    website: stringValue(raw?.website, 320),
    supportAmount,
    bringSwag,
    venueBranding,
    message,
    interest: [supportAmount, bringSwag ? 'Bringing swag' : '', venueBranding ? 'Venue branding' : '', message]
      .filter(Boolean)
      .join(' | '),
    source: stringValue(raw?.source, 40) || 'public-site',
  };
};

const ensureStorage = async () => {
  await ensureJsonFile(CONTENT_FILE, normalizeSiteContent(clone(DEFAULT_SITE_CONTENT)));
  await ensureJsonFile(SPONSOR_REQUESTS_FILE, []);
};

const readStoredContent = async () => {
  await ensureStorage();
  try {
    const raw = await readFile(CONTENT_FILE, 'utf8');
    return normalizeSiteContent(JSON.parse(raw));
  } catch (_error) {
    const fallback = normalizeSiteContent(clone(DEFAULT_SITE_CONTENT));
    await writeStoredContent(fallback);
    return fallback;
  }
};

const writeStoredContent = async (content) => {
  await ensureStorage();
  const normalized = normalizeSiteContent(content);
  return writeJsonFile(CONTENT_FILE, normalized);
};

const readStoredSponsorRequests = async () => {
  await ensureStorage();
  try {
    const raw = await readFile(SPONSOR_REQUESTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : [];

    return rows
      .map((row) => normalizeSponsorRequestRecord(row))
      .sort((left, right) => right.sortTimestamp - left.sortTimestamp);
  } catch (_error) {
    await writeStoredSponsorRequests([]);
    return [];
  }
};

const writeStoredSponsorRequests = async (requests) => {
  await ensureStorage();
  const normalized = (Array.isArray(requests) ? requests : [])
    .map((row) => normalizeSponsorRequestRecord(row))
    .sort((left, right) => right.sortTimestamp - left.sortTimestamp);

  return writeJsonFile(SPONSOR_REQUESTS_FILE, normalized);
};

const getBearerToken = (authorizationHeader) => {
  const value = String(authorizationHeader || '');
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
};

const fetchGoogleProfile = async (token) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return response.json();
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const googleWorkspaceAccessTokenCache = new Map();

const encodeBase64UrlJson = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const hasGoogleWorkspaceDelegationConfig = () =>
  Boolean(
    DIRECTORY_SERVICE_ACCOUNT_CLIENT_EMAIL &&
      DIRECTORY_SERVICE_ACCOUNT_PRIVATE_KEY &&
      GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL
  );

const hasGoogleWorkspaceScope = (scope) =>
  GOOGLE_WORKSPACE_SCOPES.includes(expandGoogleWorkspaceScope(scope));

const hasOrganizerGroupLookupConfig = () =>
  Boolean(
    ORGANIZER_GROUP_EMAIL &&
      hasGoogleWorkspaceDelegationConfig() &&
      hasGoogleWorkspaceScope(GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE)
  );

const createServiceAccountAssertion = (scopes, subjectEmail = GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL) => {
  const normalizedScopes = normalizeGoogleWorkspaceScopes(scopes);
  if (!hasGoogleWorkspaceDelegationConfig()) {
    throw new Error('Google Workspace service account delegation is not configured.');
  }

  const subject = lowerStringValue(subjectEmail, 320);
  if (!isValidEmail(subject)) {
    throw new Error('Google Workspace delegated subject email is invalid.');
  }

  if (!normalizedScopes.length) {
    throw new Error('Google Workspace OAuth scopes are not configured.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: DIRECTORY_SERVICE_ACCOUNT_CLIENT_EMAIL,
    scope: normalizedScopes.join(' '),
    aud: GOOGLE_OAUTH_TOKEN_URL,
    exp: now + 3600,
    iat: now,
    sub: subject,
  };
  const unsignedToken = `${encodeBase64UrlJson(header)}.${encodeBase64UrlJson(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(DIRECTORY_SERVICE_ACCOUNT_PRIVATE_KEY).toString('base64url');

  return `${unsignedToken}.${signature}`;
};

const getGoogleWorkspaceAccessToken = async (scopes, subjectEmail = GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL) => {
  const normalizedScopes = normalizeGoogleWorkspaceScopes(scopes);
  const subject = lowerStringValue(subjectEmail, 320);
  const cacheKey = `${subject}::${normalizedScopes.join(' ')}`;
  const cached = googleWorkspaceAccessTokenCache.get(cacheKey);

  if (cached?.token && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: createServiceAccountAssertion(normalizedScopes, subject),
      }),
      signal: controller.signal,
    });
    const rawBody = await response.text();
    const payload = parseJsonEnv(rawBody) || {};

    if (!response.ok || !payload.access_token) {
      throw new Error(
        payload.error_description || payload.error || `Google Workspace token exchange failed (${response.status}).`
      );
    }

    const expiresIn = Number(payload.expires_in || 3600);
    const cacheEntry = {
      token: String(payload.access_token),
      expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    };
    googleWorkspaceAccessTokenCache.set(cacheKey, cacheEntry);

    return cacheEntry.token;
  } finally {
    clearTimeout(timer);
  }
};

const gmailSendTokenCache = new Map();

const getGmailSendAccessToken = async (senderEmail) => {
  const cached = gmailSendTokenCache.get(senderEmail);
  if (cached?.token && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: DIRECTORY_SERVICE_ACCOUNT_CLIENT_EMAIL,
    scope: GOOGLE_GMAIL_SEND_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    exp: now + 3600,
    iat: now,
    sub: senderEmail,
  };
  const unsigned = `${encodeBase64UrlJson(header)}.${encodeBase64UrlJson(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(DIRECTORY_SERVICE_ACCOUNT_PRIVATE_KEY).toString('base64url')}`;

  try {
    const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: controller.signal,
    });
    const payload = parseJsonEnv(await res.text()) || {};
    if (!res.ok || !payload.access_token) {
      throw new Error(payload.error_description || payload.error || `Gmail token exchange failed (${res.status}).`);
    }
    const expiresIn = Number(payload.expires_in || 3600);
    const entry = { token: String(payload.access_token), expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000 };
    gmailSendTokenCache.set(senderEmail, entry);
    return entry.token;
  } finally {
    clearTimeout(timer);
  }
};

const buildRfc822Message = ({ from, to, subject, text, replyTo }) => {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ];
  if (replyTo) headers.push(`Reply-To: ${replyTo}`);
  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${text}`, 'utf8').toString('base64url');
};

const withInlineStyle = (tag, rule) => {
  if (!tag || !rule) return tag;
  const stylePattern = /\sstyle\s*=\s*(['"])(.*?)\1/i;
  if (!stylePattern.test(tag)) {
    return tag.replace(/>$/, ` style="${rule}">`);
  }
  return tag.replace(stylePattern, (full, quote, styleValue = '') => {
    if (new RegExp(`(^|;)\\s*${rule.split(':')[0]}\\s*:`, 'i').test(styleValue)) {
      return full;
    }
    const suffix = styleValue.trim() && !styleValue.trim().endsWith(';') ? ';' : '';
    return ` style=${quote}${styleValue}${suffix}${rule}${quote}`;
  });
};

const normalizeMailingHtml = (value) => {
  const raw = stringValue(value, SMTP_BODY_LIMIT_BYTES);
  if (!raw) return '';

  // ReactQuill emits line breaks as <p> tags. Most mail clients apply default
  // paragraph margins, which makes a single Enter look like a double-spaced line.
  return raw.replace(/<p(?:\s[^>]*)?>/gi, (tag) => withInlineStyle(tag, 'margin:0;'));
};

const sendGmailApiEmail = async ({ from, to, subject, text, replyTo }) => {
  const senderEmail = from || GMAIL_NOTIFY_FROM;
  if (!senderEmail || !isValidEmail(senderEmail)) {
    throw new Error('Gmail notify sender email is not configured.');
  }
  if (!DIRECTORY_SERVICE_ACCOUNT_CLIENT_EMAIL || !DIRECTORY_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Google Workspace service account credentials are not configured.');
  }
  const token = await getGmailSendAccessToken(senderEmail);
  const raw = buildRfc822Message({ from: senderEmail, to, subject, text, replyTo });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = parseJsonEnv(await res.text()) || {};
      throw new Error(err.error?.message || `Gmail API send failed (${res.status}).`);
    }
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Build an RFC 822 message with HTML, CC, and BCC support
 */
const buildRfc822MessageWithHtml = ({ from, to, cc = [], bcc = [], subject, html, text, replyTo, messageId = null }) => {
  const boundaries = {
    mixed: `boundary-mixed-${Date.now()}`,
    alternative: `boundary-alternative-${Date.now()}`,
  };

  const headers = [
    `From: ${from}`,
    `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    ...(Array.isArray(cc) && cc.length > 0 ? [`Cc: ${cc.join(', ')}`] : []),
    ...(Array.isArray(bcc) && bcc.length > 0 ? [`Bcc: ${bcc.join(', ')}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundaries.alternative}"`,
  ];
  if (replyTo) headers.push(`Reply-To: ${replyTo}`);
  if (messageId) headers.push(`Message-ID: ${messageId}`);

  const textPart = text ? `--${boundaries.alternative}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(text, 'utf8').toString('base64')}\r\n` : '';
  const normalizedHtml = normalizeMailingHtml(html);

  const htmlPart = normalizedHtml ? `--${boundaries.alternative}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(normalizedHtml, 'utf8').toString('base64')}\r\n` : '';

  const emailBody = `${headers.join('\r\n')}\r\n\r\n${textPart}${htmlPart}--${boundaries.alternative}--`;

  return Buffer.from(emailBody, 'utf8').toString('base64url');
};

/**
 * Send email via Gmail API with HTML and CC/BCC support
 */
const sendGmailApiEmailWithHtml = async ({ from, to, cc = [], bcc = [], subject, html, text, replyTo }) => {
  const senderEmail = from || GMAIL_NOTIFY_FROM;
  if (!senderEmail || !isValidEmail(senderEmail)) {
    throw new Error('Gmail notify sender email is not configured.');
  }
  if (!DIRECTORY_SERVICE_ACCOUNT_CLIENT_EMAIL || !DIRECTORY_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Google Workspace service account credentials are not configured.');
  }

  const token = await getGmailSendAccessToken(senderEmail);
  const raw = buildRfc822MessageWithHtml({
    from: senderEmail,
    to,
    cc,
    bcc,
    subject,
    html,
    text,
    replyTo,
    messageId: `<${Date.now()}.${Math.random().toString(36).slice(2)}@cyberswarm>`,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = parseJsonEnv(await res.text()) || {};
      throw new Error(err.error?.message || `Gmail API send failed (${res.status}).`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const notifyOrganizersOfSponsorInquiry = async (inquiry) => {
  if (!GMAIL_NOTIFY_FROM || !isValidEmail(GMAIL_NOTIFY_FROM)) return;
  const org = stringValue(inquiry.organizationName || inquiry.company, 160) || '(unknown)';
  const contact = stringValue(inquiry.contactName || inquiry.name, 120) || '(unknown)';
  const email = inquiry.email || '(none)';
  const phone = inquiry.phone || '(none)';
  const support = inquiry.supportAmount || '(not provided)';
  const extras = [
    inquiry.bringSwag ? 'Bringing swag' : '',
    inquiry.venueBranding ? 'Venue branding requested' : '',
  ].filter(Boolean).join(', ') || 'None';
  const notes = stringValue(inquiry.message, 2400) || 'None';
  const lines = [
    'A new sponsor inquiry was submitted on the CyberSwarm website.',
    '',
    `Organization: ${org}`,
    `Contact: ${contact}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Support Amount: ${support}`,
    `Extras: ${extras}`,
    '',
    'Notes:',
    notes,
    '',
    `Submitted: ${inquiry.createdAt || new Date().toISOString()}`,
    `Request ID: ${inquiry.id || '(none)'}`,
  ];
  await sendGmailApiEmail({
    from: GMAIL_NOTIFY_FROM,
    to: ORGANIZER_NOTIFY_TO,
    subject: `New Sponsor Inquiry — ${org} · CyberSwarm`,
    text: lines.join('\n'),
    replyTo: isValidEmail(email) ? email : undefined,
  });
};

const checkOrganizerGroupMembership = async (email) => {
  if (!ORGANIZER_GROUP_EMAIL) {
    return { configured: false, isMember: false };
  }

  if (!hasOrganizerGroupLookupConfig()) {
    const missingScope = hasGoogleWorkspaceDelegationConfig() && !hasGoogleWorkspaceScope(GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE);
    return {
      configured: true,
      isMember: false,
      error: missingScope
        ? 'Organizer group lookup needs the "groups" scope in GOOGLE_WORKSPACE_SCOPES.'
        : 'Organizer group lookup needs Google Workspace service account delegation env vars.',
    };
  }

  const token = await getGoogleWorkspaceAccessToken(GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const groupKey = encodeURIComponent(ORGANIZER_GROUP_EMAIL);
    const memberKey = encodeURIComponent(email);
    const response = await fetch(`${GOOGLE_DIRECTORY_HAS_MEMBER_URL}/${groupKey}/hasMember/${memberKey}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    const payload = parseJsonEnv(await response.text()) || {};

    if (!response.ok) {
      throw new Error(payload.error?.message || `Organizer group lookup failed (${response.status}).`);
    }

    return { configured: true, isMember: Boolean(payload.isMember) };
  } finally {
    clearTimeout(timer);
  }
};

const listOrganizerGroupMemberEmails = async () => {
  if (!hasOrganizerGroupLookupConfig()) {
    return [];
  }

  const token = await getGoogleWorkspaceAccessToken(GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE);
  const groupKey = encodeURIComponent(ORGANIZER_GROUP_EMAIL);
  const members = [];
  let pageToken = '';

  for (let page = 0; page < 10; page += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const query = new URLSearchParams({
        maxResults: '200',
        ...(pageToken ? { pageToken } : {}),
      });
      const response = await fetch(`${GOOGLE_DIRECTORY_GROUP_MEMBERS_URL}/${groupKey}/members?${query.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      const payload = parseJsonEnv(await response.text()) || {};
      if (!response.ok) {
        throw new Error(payload.error?.message || `Organizer group member lookup failed (${response.status}).`);
      }

      for (const member of Array.isArray(payload.members) ? payload.members : []) {
        const email = lowerStringValue(member?.email, 320);
        if (isValidEmail(email)) {
          members.push(email);
        }
      }

      pageToken = stringValue(payload.nextPageToken, 120);
      if (!pageToken) break;
    } finally {
      clearTimeout(timer);
    }
  }

  return [...new Set(members)].sort();
};

const normalizeGoogleCalendarEvent = (item, ownerEmail) => {
  const startRaw = stringValue(item?.start?.dateTime || item?.start?.date, 80);
  const endRaw = stringValue(item?.end?.dateTime || item?.end?.date, 80);
  const startDate = startRaw ? new Date(startRaw) : null;
  const endDate = endRaw ? new Date(endRaw) : null;
  const startTimestamp = startDate && !Number.isNaN(startDate.getTime()) ? startDate.getTime() : 0;
  const endTimestamp = endDate && !Number.isNaN(endDate.getTime()) ? endDate.getTime() : startTimestamp;

  return {
    id: stringValue(item?.id || item?.iCalUID, 160),
    title: stringValue(item?.summary, 240) || '(untitled event)',
    description: stringValue(item?.description, 2400),
    location: stringValue(item?.location, 320),
    url: stringValue(item?.htmlLink, 500),
    startAt: startTimestamp ? new Date(startTimestamp).toISOString() : '',
    endAt: endTimestamp ? new Date(endTimestamp).toISOString() : '',
    startTimestamp,
    endTimestamp,
    ownerEmail,
    organizerEmail: lowerStringValue(item?.organizer?.email || ownerEmail, 320),
    allDay: Boolean(item?.start?.date && !item?.start?.dateTime),
  };
};

const fetchGoogleCalendarEventsForUser = async (email, options = {}) => {
  const ownerEmail = lowerStringValue(email, 320);
  if (!isValidEmail(ownerEmail)) return [];

  const token = await getGoogleWorkspaceAccessToken(GOOGLE_CALENDAR_READONLY_SCOPE, ownerEmail);
  const nowIso = new Date().toISOString();
  const timeMin = stringValue(options.timeMin, 80) || nowIso;
  const timeMax = stringValue(options.timeMax, 80);
  const maxResults = Math.max(1, Math.min(250, Number(options.maxResults || 60)));
  const query = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin,
    maxResults: String(maxResults),
    ...(timeMax ? { timeMax } : {}),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent('primary')}/events?${query.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    );
    const payload = parseJsonEnv(await response.text()) || {};
    if (!response.ok) {
      throw new Error(payload.error?.message || `Calendar events request failed (${response.status}).`);
    }

    return (Array.isArray(payload.items) ? payload.items : [])
      .map((item) => normalizeGoogleCalendarEvent(item, ownerEmail))
      .filter((event) => event.startTimestamp)
      .sort((left, right) => left.startTimestamp - right.startTimestamp);
  } finally {
    clearTimeout(timer);
  }
};

const fetchDashboardCalendarEvents = async (currentUserEmail) => {
  const now = new Date();
  const horizon = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);

  if (hasGoogleWorkspaceDelegationConfig() && hasGoogleWorkspaceScope(GOOGLE_CALENDAR_READONLY_SCOPE)) {
    const userRows = await fetchGoogleCalendarEventsForUser(currentUserEmail, {
      timeMin: now.toISOString(),
      timeMax: horizon.toISOString(),
      maxResults: 80,
    });

    let organizerEmails = [];
    let organizerGroupError = '';
    if (hasOrganizerGroupLookupConfig()) {
      try {
        organizerEmails = await listOrganizerGroupMemberEmails();
      } catch (error) {
        organizerGroupError = error instanceof Error ? error.message : 'Could not resolve organizer group members.';
      }
    }
    if (!organizerEmails.length && isValidEmail(currentUserEmail)) {
      organizerEmails = [currentUserEmail];
    }

    const organizerResults = await Promise.allSettled(
      organizerEmails.map((email) =>
        fetchGoogleCalendarEventsForUser(email, {
          timeMin: now.toISOString(),
          timeMax: horizon.toISOString(),
          maxResults: 40,
        })
      )
    );

    const organizerRowsRaw = organizerResults.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    );
    const organizerRows = [...new Map(
      organizerRowsRaw.map((event) => [
        `${event.organizerEmail || event.ownerEmail || ''}|${event.id}|${event.startAt}`,
        event,
      ])
    ).values()]
      .sort((left, right) => left.startTimestamp - right.startTimestamp)
      .slice(0, 400);

    const failedOrganizerFetches = organizerResults.filter((result) => result.status === 'rejected').length;

    return {
      configured: true,
      source: 'google-calendar-api',
      rows: organizerRows,
      rowCount: organizerRows.length,
      userRows,
      userRowCount: userRows.length,
      organizerRows,
      organizerRowCount: organizerRows.length,
      organizerEmails,
      organizerCount: organizerEmails.length,
      failedOrganizerFetches,
      warning: organizerGroupError || '',
      fetchedAt: new Date().toISOString(),
    };
  }

  const fallback = await fetchCalendarEvents();
  return {
    ...fallback,
    source: 'ics-feed',
    userRows: Array.isArray(fallback.rows) ? fallback.rows : [],
    userRowCount: Array.isArray(fallback.rows) ? fallback.rows.length : 0,
    organizerRows: Array.isArray(fallback.rows) ? fallback.rows : [],
    organizerRowCount: Array.isArray(fallback.rows) ? fallback.rows.length : 0,
    organizerEmails: [],
    organizerCount: 0,
    failedOrganizerFetches: 0,
    warning: fallback.error || '',
  };
};

const authenticateAdmin = async (request) => {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    return { ok: false, status: 401, error: 'Missing bearer token.' };
  }

  const profile = await fetchGoogleProfile(token);
  const email = String(profile?.email || '').toLowerCase();
  if (!email) {
    return { ok: false, status: 401, error: 'Invalid or expired Google token.' };
  }

  const baseUser = {
    email,
    name: String(profile?.name || email),
    picture: String(profile?.picture || ''),
  };

  if (!ORGANIZER_GROUP_EMAIL) {
    return {
      ok: false,
      status: 403,
      error: `Access denied for ${email}. Organizer group access is not configured on the API server.`,
    };
  }

  try {
    const membership = await checkOrganizerGroupMembership(email);
    if (membership.isMember) {
      return {
        ok: true,
        user: { ...baseUser, authSource: 'organizer-group', organizerGroupEmail: ORGANIZER_GROUP_EMAIL },
      };
    }

    return {
      ok: false,
      status: 403,
      error: membership.error
        ? `Access denied for ${email}. ${membership.error}`
        : `Access denied for ${email}. Not a member of ${ORGANIZER_GROUP_EMAIL}.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 403,
      error: `Access denied for ${email}. ${
        error instanceof Error && error.message ? error.message : 'Could not check organizer group membership.'
      }`,
    };
  }
};

const readRequestJson = async (request, maxBytes = BODY_LIMIT_BYTES) =>
  new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;

    request.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('Request body too large.'));
        request.destroy();
        return;
      }
      body += chunk.toString('utf8');
    });

    request.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (_error) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    request.on('error', (error) => reject(error));
  });

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
};

const sendBinary = (response, statusCode, data, contentType) => {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  response.end(data);
};

const sendNotFound = (response) => sendJson(response, 404, { error: 'Not found.' });

const isAllowedFeedHost = (hostname) =>
  FEED_ALLOWED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );

const normalizeGoogleSheetExportUrl = (url) => {
  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/i);
  if (!match) return url;

  if (
    url.pathname.includes('/export') ||
    url.pathname.includes('/gviz/tq') ||
    url.searchParams.get('output') === 'csv'
  ) {
    return url;
  }

  const hashGid = url.hash.match(/gid=(\d+)/i)?.[1];
  const gid = url.searchParams.get('gid') || hashGid || '0';
  return new URL(
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(match[1])}/export?format=csv&gid=${encodeURIComponent(gid)}`
  );
};

const normalizeFeedUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || !isAllowedFeedHost(url.hostname.toLowerCase())) {
      return null;
    }
    return url.hostname.toLowerCase() === 'docs.google.com' ? normalizeGoogleSheetExportUrl(url) : url;
  } catch (_error) {
    return null;
  }
};

const escapeDriveQueryLiteral = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const extractDriveIdFromUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const directMatch = url.pathname.match(/\/(?:drives|folders)\/([a-zA-Z0-9_-]{10,})/);
    if (directMatch?.[1]) return directMatch[1];

    const folderMatch = url.pathname.match(/\/drive\/folders\/([a-zA-Z0-9_-]{10,})/);
    if (folderMatch?.[1]) return folderMatch[1];

    return String(url.searchParams.get('id') || '').trim();
  } catch (_error) {
    return '';
  }
};

const pickAttendeeDriveFile = (files, hint = '') => {
  const normalizedHint = String(hint || '').trim().toLowerCase();

  const scoreName = (name) => {
    const normalized = String(name || '').toLowerCase();
    if (!normalized) return 0;
    if (normalizedHint && normalized === normalizedHint) return 100;

    let score = 0;
    if (normalizedHint && normalized.includes(normalizedHint)) score += 25;
    if (normalized.includes('attendee')) score += 14;
    if (normalized.includes('registration')) score += 12;
    if (normalized.includes('form responses')) score += 10;
    if (normalized.includes('rsvp')) score += 8;
    if (normalized.includes('roster')) score += 6;
    if (normalized.includes('signup')) score += 4;
    return score;
  };

  return [...files]
    .sort((left, right) => {
      const scoreDiff = scoreName(right.name) - scoreName(left.name);
      if (scoreDiff !== 0) return scoreDiff;

      const leftTime = Date.parse(left.modifiedTime || '') || 0;
      const rightTime = Date.parse(right.modifiedTime || '') || 0;
      return rightTime - leftTime;
    })
    .at(0);
};

const pickSharedDrive = (drives, hint = '') => {
  const normalizedHint = String(hint || '').trim().toLowerCase();

  return [...drives]
    .sort((left, right) => {
      const leftName = String(left?.name || '').toLowerCase();
      const rightName = String(right?.name || '').toLowerCase();

      const leftScore = leftName === normalizedHint ? 100 : leftName.includes(normalizedHint) ? 25 : 0;
      const rightScore = rightName === normalizedHint ? 100 : rightName.includes(normalizedHint) ? 25 : 0;
      if (rightScore !== leftScore) return rightScore - leftScore;

      return rightName.localeCompare(leftName);
    })
    .at(0);
};

const pickSheetTab = (sheets, tabNameHint = '') => {
  const normalizedHint = String(tabNameHint || '').trim().toLowerCase();
  if (!Array.isArray(sheets) || !sheets.length) return null;

  const ranked = [...sheets].sort((left, right) => {
    const leftName = String(left?.properties?.title || '').toLowerCase();
    const rightName = String(right?.properties?.title || '').toLowerCase();

    const leftScore = leftName === normalizedHint ? 100 : leftName.includes(normalizedHint) ? 25 : 0;
    const rightScore = rightName === normalizedHint ? 100 : rightName.includes(normalizedHint) ? 25 : 0;
    if (rightScore !== leftScore) return rightScore - leftScore;

    return leftName.localeCompare(rightName);
  });

  return ranked.at(0);
};

const toSheetRows = (values = []) => {
  if (!Array.isArray(values) || !values.length) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = Array.isArray(values[0]) ? values[0] : [];
  const headers = rawHeaders.map((header, index) => {
    const normalized = String(header || '').replace(/^\uFEFF/, '').trim();
    return normalized || `column_${index + 1}`;
  });

  const rows = values
    .slice(1)
    .filter((cells) => Array.isArray(cells) && cells.some((cell) => String(cell || '').trim()))
    .map((cells, rowIndex) =>
      headers.reduce(
        (record, header, columnIndex) => ({
          ...record,
          [header]: String(cells[columnIndex] || '').trim(),
        }),
        { __row: rowIndex + 1 }
      )
    );

  return { headers, rows };
};

const resolveAttendeeDriveId = async (operations = {}) => {
  if (ATTENDEE_SHARED_DRIVE_ID_HINT) {
    return ATTENDEE_SHARED_DRIVE_ID_HINT;
  }

  const sharedDriveUrl = String(
    operations?.workspace_shared_drive_url || operations?.workspace_drive_folder_url || ''
  ).trim();
  const fromUrl = extractDriveIdFromUrl(sharedDriveUrl);
  if (fromUrl) return fromUrl;

  const driveNameHint = ATTENDEE_SHARED_DRIVE_NAME_HINT;
  if (!driveNameHint) {
    throw new Error(
      'Set Workspace Shared Drive URL in Integrations or ATTENDEE_SHARED_DRIVE_NAME in env before using dynamic attendee sync.'
    );
  }

  const token = await getGoogleWorkspaceAccessToken(GOOGLE_DRIVE_READONLY_SCOPE);
  const query = new URLSearchParams({
    pageSize: '100',
    useDomainAdminAccess: 'true',
    fields: 'drives(id,name)',
  });
  const response = await fetch(`${GOOGLE_DRIVE_DRIVES_URL}?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const raw = await response.text();
  const payload = parseJsonEnv(raw) || {};
  if (!response.ok) {
    throw new Error(
      payload.error?.message || payload.error_description || `Drive list lookup failed (${response.status}).`
    );
  }

  const drives = Array.isArray(payload.drives) ? payload.drives.filter((drive) => drive?.id && drive?.name) : [];
  if (!drives.length) {
    return '';
  }

  const selected = pickSharedDrive(drives, driveNameHint);
  if (!selected?.id) {
    throw new Error(`Shared drive "${driveNameHint}" was not found.`);
  }

  return String(selected.id);
};

const fetchAttendeeDriveFeed = async (operations = {}) => {
  if (!hasGoogleWorkspaceDelegationConfig()) {
    throw new Error('Google Workspace service account delegation env vars are required for dynamic attendee sync.');
  }

  if (!hasGoogleWorkspaceScope(GOOGLE_DRIVE_READONLY_SCOPE)) {
    throw new Error('Dynamic attendee sync requires the "drive" scope in GOOGLE_WORKSPACE_SCOPES.');
  }

  if (!hasGoogleWorkspaceScope(GOOGLE_SHEETS_READONLY_SCOPE)) {
    throw new Error('Dynamic attendee sync requires the "sheets.readonly" scope in GOOGLE_WORKSPACE_SCOPES.');
  }

  const driveId = await resolveAttendeeDriveId(operations);

  const hint = ATTENDEE_SHEET_NAME_HINT;
  const listToken = await getGoogleWorkspaceAccessToken(GOOGLE_DRIVE_READONLY_SCOPE);
  const queryParts = [`mimeType='${GOOGLE_DRIVE_SHEET_MIME_TYPE}'`, 'trashed=false'];
  if (hint) {
    queryParts.push(`name contains '${escapeDriveQueryLiteral(hint)}'`);
  }

  const listQuery = new URLSearchParams({
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    orderBy: 'modifiedTime desc,name',
    pageSize: '50',
    q: queryParts.join(' and '),
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,driveId)',
  });
  if (driveId) {
    listQuery.set('corpora', 'drive');
    listQuery.set('driveId', driveId);
  } else {
    listQuery.set('corpora', 'allDrives');
  }

  const listRes = await fetch(`${GOOGLE_DRIVE_FILES_URL}?${listQuery.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${listToken}` },
  });
  const listRaw = await listRes.text();
  const listPayload = parseJsonEnv(listRaw) || {};
  if (!listRes.ok) {
    throw new Error(
      listPayload.error?.message || listPayload.error_description || `Drive file lookup failed (${listRes.status}).`
    );
  }

  const files = Array.isArray(listPayload.files)
    ? listPayload.files.filter((file) => file?.id && file?.mimeType === GOOGLE_DRIVE_SHEET_MIME_TYPE)
    : [];

  if (!files.length) {
    throw new Error(
      hint
        ? `No Google Sheet found for hint "${hint}". Share the sheet with ${GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL || 'the delegated admin user'} or set ATTENDEE_SHARED_DRIVE_ID.`
        : `No Google Sheets found in the configured drive context. Share the sheet with ${GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL || 'the delegated admin user'} or set ATTENDEE_SHARED_DRIVE_ID.`
    );
  }

  const selected = pickAttendeeDriveFile(files, hint);
  if (!selected?.id) {
    throw new Error('Could not resolve an attendee spreadsheet from Google Drive.');
  }

  const tabHint = ATTENDEE_SHEET_TAB_NAME_HINT;
  const sheetToken = await getGoogleWorkspaceAccessToken(GOOGLE_SHEETS_READONLY_SCOPE);
  const metadataQuery = new URLSearchParams({
    includeGridData: 'false',
    fields: 'sheets(properties(sheetId,title))',
  });
  const metadataRes = await fetch(
    `${GOOGLE_SHEETS_API_URL}/${encodeURIComponent(selected.id)}?${metadataQuery.toString()}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${sheetToken}` },
    }
  );
  const metadataRaw = await metadataRes.text();
  const metadataPayload = parseJsonEnv(metadataRaw) || {};
  if (!metadataRes.ok) {
    throw new Error(
      metadataPayload.error?.message ||
        metadataPayload.error_description ||
        `Sheets metadata lookup failed (${metadataRes.status}).`
    );
  }

  const selectedTab = pickSheetTab(metadataPayload.sheets || [], tabHint);
  if (!selectedTab?.properties?.title) {
    throw new Error(
      tabHint
        ? `Worksheet "${tabHint}" was not found in ${selected.name || 'the selected spreadsheet'}.`
        : 'No worksheet tabs were found in the selected spreadsheet.'
    );
  }

  const tabTitle = String(selectedTab.properties.title);
  const valueRange = `'${tabTitle.replace(/'/g, "''")}'`;
  const valuesQuery = new URLSearchParams({
    majorDimension: 'ROWS',
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const valuesRes = await fetch(
    `${GOOGLE_SHEETS_API_URL}/${encodeURIComponent(selected.id)}/values/${encodeURIComponent(valueRange)}?${valuesQuery.toString()}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${sheetToken}` },
    }
  );
  const valuesRaw = await valuesRes.text();
  const valuesPayload = parseJsonEnv(valuesRaw) || {};
  if (!valuesRes.ok) {
    throw new Error(
      valuesPayload.error?.message ||
        valuesPayload.error_description ||
        `Sheets values lookup failed (${valuesRes.status}).`
    );
  }

  const parsed = toSheetRows(valuesPayload.values || []);
  const tabId = Number(selectedTab.properties.sheetId || 0);
  return {
    sourceUrl:
      selected.webViewLink ||
      `https://docs.google.com/spreadsheets/d/${encodeURIComponent(selected.id)}/edit#gid=${encodeURIComponent(tabId)}`,
    sourceHost: 'sheets.googleapis.com',
    format: 'sheets-api',
    headers: parsed.headers,
    rows: parsed.rows,
    rowCount: parsed.rows.length,
    fetchedAt: new Date().toISOString(),
    fileId: selected.id,
    fileName: String(selected.name || ''),
    sheetId: tabId,
    sheetName: tabTitle,
    driveId: driveId || String(selected.driveId || ''),
    driveSource: 'shared-drive-auto',
  };
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  const pushValue = () => {
    row.push(value);
    value = '';
  };

  const pushRow = () => {
    if (row.length === 1 && row[0] === '' && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      pushValue();
      continue;
    }

    if (char === '\n') {
      pushValue();
      pushRow();
      continue;
    }

    if (char === '\r') {
      continue;
    }

    value += char;
  }

  pushValue();
  if (row.length > 1 || row[0] !== '' || rows.length === 0) {
    pushRow();
  }

  const headers = (rows.shift() || []).map((header, index) =>
    String(header || '').replace(/^\uFEFF/, '').trim() || `column_${index + 1}`
  );
  const records = rows
    .filter((cells) => cells.some((cell) => String(cell || '').trim()))
    .map((cells, rowIndex) =>
      headers.reduce(
        (record, header, columnIndex) => ({
          ...record,
          [header]: String(cells[columnIndex] || '').trim(),
        }),
        { __row: rowIndex + 1 }
      )
    );

  return { headers, rows: records };
};

const normalizeJsonRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload.filter((row) => row && typeof row === 'object' && !Array.isArray(row));
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.rows)) {
      return payload.rows.filter((row) => row && typeof row === 'object' && !Array.isArray(row));
    }

    if (Array.isArray(payload.data)) {
      return payload.data.filter((row) => row && typeof row === 'object' && !Array.isArray(row));
    }
  }

  return [];
};

const collectHeaders = (rows) =>
  Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => {
        if (key !== '__row') set.add(key);
      });
      return set;
    }, new Set())
  );

const fetchRemoteFeed = async (sourceUrl) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json,text/csv,text/plain,*/*',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Remote feed returned ${response.status} ${response.statusText}.`);
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const body = await response.text();

    if (Buffer.byteLength(body, 'utf8') > FEED_BODY_LIMIT_BYTES) {
      throw new Error('Remote feed is too large.');
    }

    if (contentType.includes('text/html') || body.trim().toLowerCase().startsWith('<!doctype html')) {
      throw new Error('Remote feed returned HTML. Publish the Google Sheet as CSV or use an Apps Script JSON endpoint.');
    }

    const looksLikeJson =
      contentType.includes('application/json') ||
      body.trim().startsWith('[') ||
      body.trim().startsWith('{');

    if (looksLikeJson) {
      const payload = JSON.parse(body);
      const rows = normalizeJsonRows(payload);
      return {
        sourceUrl,
        sourceHost: new URL(sourceUrl).hostname,
        format: 'json',
        headers: collectHeaders(rows),
        rows,
        rowCount: rows.length,
        fetchedAt: new Date().toISOString(),
      };
    }

    const parsed = parseCsv(body);
    return {
      sourceUrl,
      sourceHost: new URL(sourceUrl).hostname,
      format: 'csv',
      headers: parsed.headers,
      rows: parsed.rows,
      rowCount: parsed.rows.length,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
};

const getIntegrationStatus = () => {
  const calendarUrl = (() => {
    try {
      return CALENDAR_FEED_URL ? new URL(CALENDAR_FEED_URL) : null;
    } catch (_error) {
      return null;
    }
  })();

  return {
    calendar: {
      configured: Boolean(calendarUrl),
      sourceHost: calendarUrl?.hostname || '',
      publicUrl: CALENDAR_PUBLIC_URL,
      calendarId: CALENDAR_ID,
    },
    email: {
      smtpConfigured: Boolean(SMTP_CONFIG.host && SMTP_CONFIG.port && SMTP_CONFIG.from),
      smtpHost: SMTP_CONFIG.host,
      smtpPort: SMTP_CONFIG.port,
      smtpSecure: SMTP_CONFIG.secure,
      fromAddress: SMTP_CONFIG.from,
      fromName: SMTP_CONFIG.fromName,
      replyTo: SMTP_CONFIG.replyTo,
      inboxConfigured: Boolean(TEAM_INBOX_URL),
      inboxUrl: TEAM_INBOX_URL,
    },
    googleWorkspace: {
      configured: hasGoogleWorkspaceDelegationConfig(),
      serviceAccountConfigured: Boolean(DIRECTORY_SERVICE_ACCOUNT_CLIENT_EMAIL && DIRECTORY_SERVICE_ACCOUNT_PRIVATE_KEY),
      delegatedAdminConfigured: Boolean(GOOGLE_WORKSPACE_DELEGATED_ADMIN_EMAIL),
      scopeCount: GOOGLE_WORKSPACE_SCOPES.length,
      scopes: {
        groupMembership: hasGoogleWorkspaceScope(GOOGLE_DIRECTORY_MEMBERSHIP_SCOPE),
        calendarReadonly: hasGoogleWorkspaceScope(GOOGLE_CALENDAR_READONLY_SCOPE),
        gmailSend: hasGoogleWorkspaceScope(GOOGLE_GMAIL_SEND_SCOPE),
        formsResponsesReadonly: hasGoogleWorkspaceScope(GOOGLE_FORMS_RESPONSES_READONLY_SCOPE),
        driveReadonly: hasGoogleWorkspaceScope(GOOGLE_DRIVE_READONLY_SCOPE),
      },
    },
    workspace: {
      domain: WORKSPACE_DOMAIN,
      adminConsoleUrl: WORKSPACE_ADMIN_CONSOLE_URL,
      driveFolderUrl: WORKSPACE_DRIVE_FOLDER_URL,
      sharedDriveUrl: WORKSPACE_SHARED_DRIVE_URL,
      groupEmail: WORKSPACE_GROUP_EMAIL,
      organizerGroupEmail: ORGANIZER_GROUP_EMAIL,
      organizerGroupConfigured: Boolean(ORGANIZER_GROUP_EMAIL),
      organizerGroupAuthConfigured: hasOrganizerGroupLookupConfig(),
      adminAllowlistConfigured: ADMIN_EMAILS.length > 0,
      adminAllowlistCount: ADMIN_EMAILS.length,
      adminAccessRestricted: Boolean(ADMIN_EMAILS.length > 0 || ORGANIZER_GROUP_EMAIL),
    },
  };
};

const normalizeCalendarFeedUrl = () => {
  try {
    const url = new URL(CALENDAR_FEED_URL);
    return url.protocol === 'https:' ? url : null;
  } catch (_error) {
    return null;
  }
};

const unfoldIcsLines = (text) => {
  const lines = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
};

const decodeIcsText = (value) =>
  String(value || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();

const parseIcsProperty = (line) => {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) return null;

  const rawName = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [name, ...paramPairs] = rawName.split(';');
  const params = paramPairs.reduce((items, pair) => {
    const [key, ...rest] = pair.split('=');
    if (!key || !rest.length) return items;
    return {
      ...items,
      [key.toUpperCase()]: rest.join('=').replace(/^"|"$/g, ''),
    };
  }, {});

  return { name: name.toUpperCase(), params, value };
};

const parseIcsDate = (value, params = {}) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const dateOnlyMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnlyMatch || params.VALUE === 'DATE') {
    const [, year, month, day] = dateOnlyMatch || [];
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dateTimeMatch = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!dateTimeMatch) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, year, month, day, hour, minute, second, isUtc] = dateTimeMatch;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const timestamp = isUtc
    ? Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5])
    : new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]).getTime();
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseIcsEvents = (text) => {
  const events = [];
  let currentLines = null;

  for (const line of unfoldIcsLines(text)) {
    if (line === 'BEGIN:VEVENT') {
      currentLines = [];
      continue;
    }

    if (line === 'END:VEVENT') {
      if (currentLines) events.push(currentLines);
      currentLines = null;
      continue;
    }

    if (currentLines) currentLines.push(line);
  }

  return events
    .map((lines, index) => {
      const properties = lines.reduce((items, line) => {
        const property = parseIcsProperty(line);
        if (!property) return items;
        return {
          ...items,
          [property.name]: property,
        };
      }, {});
      const start = parseIcsDate(properties.DTSTART?.value, properties.DTSTART?.params);
      const end = parseIcsDate(properties.DTEND?.value, properties.DTEND?.params);
      const summary = decodeIcsText(properties.SUMMARY?.value);

      return {
        id: decodeIcsText(properties.UID?.value) || `calendar-event-${index + 1}`,
        title: summary || 'Untitled calendar event',
        description: decodeIcsText(properties.DESCRIPTION?.value),
        location: decodeIcsText(properties.LOCATION?.value),
        url: decodeIcsText(properties.URL?.value),
        startAt: start?.toISOString() || '',
        endAt: end?.toISOString() || '',
        startTimestamp: start?.getTime() || 0,
        endTimestamp: end?.getTime() || start?.getTime() || 0,
      };
    })
    .filter((event) => event.startTimestamp)
    .filter((event) => event.endTimestamp >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((left, right) => left.startTimestamp - right.startTimestamp);
};

const fetchCalendarEvents = async () => {
  const calendarUrl = normalizeCalendarFeedUrl();
  if (!calendarUrl) {
    return {
      rows: [],
      rowCount: 0,
      fetchedAt: new Date().toISOString(),
      configured: false,
      error: 'Calendar feed is not configured.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(calendarUrl, {
      method: 'GET',
      headers: { Accept: 'text/calendar,text/plain,*/*' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Calendar feed returned ${response.status} ${response.statusText}.`);
    }

    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > FEED_BODY_LIMIT_BYTES) {
      throw new Error('Calendar feed is too large.');
    }

    const rows = parseIcsEvents(body);
    return {
      rows,
      rowCount: rows.length,
      fetchedAt: new Date().toISOString(),
      configured: true,
      sourceHost: calendarUrl.hostname,
    };
  } finally {
    clearTimeout(timer);
  }
};

const sanitizeHeaderValue = (value, maxLength = 500) =>
  stringValue(value, maxLength).replace(/[\r\n]+/g, ' ');

const encodeHeaderValue = (value) => {
  const safeValue = sanitizeHeaderValue(value);
  return /^[\x00-\x7F]*$/.test(safeValue)
    ? safeValue
    : `=?UTF-8?B?${Buffer.from(safeValue, 'utf8').toString('base64')}?=`;
};

const extractEmailAddress = (value) => {
  const raw = sanitizeHeaderValue(value, 320);
  const angleMatch = raw.match(/<([^>]+)>/);
  return lowerStringValue(angleMatch?.[1] || raw, 320);
};

const formatEmailAddress = (name, email) => {
  const safeName = sanitizeHeaderValue(name, 120);
  if (!safeName) return email;
  return `"${safeName.replace(/"/g, '\\"')}" <${email}>`;
};

const normalizeEmailRecipients = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
        .split(/[,\n;]/)
        .map((item) => item.trim());
  const seen = new Set();

  return source
    .map((item) => extractEmailAddress(item))
    .filter((item) => {
      if (!isValidEmail(item) || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, SMTP_MAX_RECIPIENTS);
};

const createSmtpReader = (initialSocket) => {
  let activeSocket = null;
  let lineBuffer = '';
  const lines = [];
  let pending = null;

  const rejectPending = (error) => {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.reject(error);
    pending = null;
  };

  const drain = () => {
    if (!pending) return;

    while (lines.length) {
      const line = lines.shift();
      pending.lines.push(line);

      if (/^\d{3} /.test(line)) {
        const completed = pending;
        pending = null;
        clearTimeout(completed.timer);
        completed.resolve({
          code: Number(line.slice(0, 3)),
          message: completed.lines.join('\n'),
        });
        return;
      }
    }
  };

  const onData = (chunk) => {
    lineBuffer += chunk.toString('utf8');
    let index = lineBuffer.indexOf('\n');

    while (index !== -1) {
      lines.push(lineBuffer.slice(0, index).replace(/\r$/, ''));
      lineBuffer = lineBuffer.slice(index + 1);
      index = lineBuffer.indexOf('\n');
    }

    drain();
  };

  const onError = (error) => rejectPending(error);
  const onClose = () => rejectPending(new Error('SMTP connection closed unexpectedly.'));

  const detach = () => {
    if (!activeSocket) return;
    activeSocket.off('data', onData);
    activeSocket.off('error', onError);
    activeSocket.off('close', onClose);
  };

  const attach = (socket) => {
    detach();
    activeSocket = socket;
    activeSocket.on('data', onData);
    activeSocket.on('error', onError);
    activeSocket.on('close', onClose);
  };

  const readResponse = () =>
    new Promise((resolve, reject) => {
      if (pending) {
        reject(new Error('SMTP response reader is already waiting.'));
        return;
      }

      pending = {
        resolve,
        reject,
        lines: [],
        timer: setTimeout(
          () => rejectPending(new Error('SMTP server response timed out.')),
          SMTP_COMMAND_TIMEOUT_MS
        ),
      };
      drain();
    });

  attach(initialSocket);
  return { attach, detach, readResponse };
};

const smtpResponseError = (command, response) =>
  new Error(`SMTP command "${command}" failed with ${response.code}: ${response.message}`);

const sendSmtpEmail = async ({ recipients, subject, body, replyTo, fromName }) => {
  const fromAddress = extractEmailAddress(SMTP_CONFIG.from);
  if (!SMTP_CONFIG.host || !SMTP_CONFIG.port || !isValidEmail(fromAddress)) {
    throw new Error('SMTP server is not configured.');
  }

  const recipientList = normalizeEmailRecipients(recipients);
  if (!recipientList.length) {
    throw new Error('At least one valid recipient is required.');
  }

  const messageBody = stringValue(body, SMTP_BODY_LIMIT_BYTES);
  if (!messageBody) {
    throw new Error('Email body is required.');
  }

  const subjectText = sanitizeHeaderValue(subject || 'CyberSwarm Update', 300);
  const replyToAddress = extractEmailAddress(replyTo || SMTP_CONFIG.replyTo);
  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `From: ${formatEmailAddress(fromName || SMTP_CONFIG.fromName, fromAddress)}`,
    'To: undisclosed-recipients:;',
    `Subject: ${encodeHeaderValue(subjectText)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    replyToAddress && isValidEmail(replyToAddress) ? `Reply-To: ${replyToAddress}` : '',
  ].filter(Boolean);
  const smtpMessage = `${headers.join('\r\n')}\r\n\r\n${messageBody}`
    .replace(/\r?\n/g, '\r\n')
    .replace(/^\./gm, '..');

  let socket = SMTP_CONFIG.secure
    ? tls.connect({ host: SMTP_CONFIG.host, port: SMTP_CONFIG.port, servername: SMTP_CONFIG.host })
    : net.connect({ host: SMTP_CONFIG.host, port: SMTP_CONFIG.port });

  await new Promise((resolve, reject) => {
    socket.once(SMTP_CONFIG.secure ? 'secureConnect' : 'connect', resolve);
    socket.once('error', reject);
  });

  const reader = createSmtpReader(socket);
  let isSecureSession = SMTP_CONFIG.secure;
  const command = async (value, expectedCodes) => {
    socket.write(`${value}\r\n`);
    const response = await reader.readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw smtpResponseError(value, response);
    }
    return response;
  };

  try {
    const greeting = await reader.readResponse();
    if (greeting.code !== 220) {
      throw smtpResponseError('connect', greeting);
    }

    let ehlo = await command(`EHLO ${SMTP_EHLO_NAME}`, [250]);

    if (!SMTP_CONFIG.secure && /STARTTLS/i.test(ehlo.message)) {
      await command('STARTTLS', [220]);
      const secureSocket = tls.connect({ socket, servername: SMTP_CONFIG.host });
      reader.attach(secureSocket);
      socket = secureSocket;
      await new Promise((resolve, reject) => {
        secureSocket.once('secureConnect', resolve);
        secureSocket.once('error', reject);
      });
      isSecureSession = true;
      ehlo = await command(`EHLO ${SMTP_EHLO_NAME}`, [250]);
    }

    if ((SMTP_CONFIG.user || SMTP_CONFIG.pass) && !isSecureSession) {
      throw new Error('SMTP authentication requires STARTTLS or SMTP_SECURE=true.');
    }

    if (SMTP_CONFIG.user && SMTP_CONFIG.pass) {
      try {
        await command(
          `AUTH PLAIN ${Buffer.from(`\0${SMTP_CONFIG.user}\0${SMTP_CONFIG.pass}`, 'utf8').toString('base64')}`,
          [235]
        );
      } catch (_plainError) {
        await command('AUTH LOGIN', [334]);
        await command(Buffer.from(SMTP_CONFIG.user, 'utf8').toString('base64'), [334]);
        await command(Buffer.from(SMTP_CONFIG.pass, 'utf8').toString('base64'), [235]);
      }
    }

    await command(`MAIL FROM:<${fromAddress}>`, [250]);
    for (const recipient of recipientList) {
      await command(`RCPT TO:<${recipient}>`, [250, 251]);
    }
    await command('DATA', [354]);
    socket.write(`${smtpMessage}\r\n.\r\n`);
    const dataResponse = await reader.readResponse();
    if (dataResponse.code !== 250) {
      throw smtpResponseError('DATA body', dataResponse);
    }

    await command('QUIT', [221]);
    socket.end();

    return {
      ok: true,
      accepted: recipientList.length,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    socket.destroy();
    throw error;
  } finally {
    reader.detach();
  }
};

/**
 * Helper functions for mailing features
 */

/**
 * Get attendees list from feed with email addresses
 */
const getMailingAttendeesRecipients = async () => {
  const content = await readStoredContent();
  
  // Try to fetch attendees from feed
  let feedData = null;
  if (content?.operations?.attendee_feed_url) {
    try {
      feedData = await fetchRemoteFeed(content.operations.attendee_feed_url);
    } catch (err) {
      // Fallback to dynamic fetch
    }
  }
  
  if (!feedData) {
    try {
      feedData = await fetchAttendeeDriveFeed(content?.operations || {});
    } catch (err) {
      throw new Error(`Could not fetch attendees: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  const rows = Array.isArray(feedData?.rows) ? feedData.rows : [];
  const emailColumn = content?.operations?.attendee_email_column || 'Email';
  const nameColumn = content?.operations?.attendee_name_column || 'Name';

  const recipients = rows
    .map((row) => ({
      address: String(row[emailColumn] || '').trim().toLowerCase(),
      name: String(row[nameColumn] || '').trim() || undefined,
    }))
    .filter((r) => r.address && isValidEmail(r.address));

  return {
    recipients,
    total: recipients.length,
    fetchedAt: new Date().toISOString(),
  };
};

/**
 * Get sponsors list with email addresses
 */
const getMailingSponsorsRecipients = async () => {
  const content = await readStoredContent();
  const sponsors = Array.isArray(content?.sponsors) ? content.sponsors : [];
  const sponsorRequests = await readStoredSponsorRequests();

  const sponsorCardRecipients = sponsors
    .map((sponsor) => ({
      address: String(sponsor?.email || sponsor?.contact_email || sponsor?.contactEmail || '').trim().toLowerCase(),
      name: String(sponsor?.name || sponsor?.title || '').trim() || undefined,
    }))
    .filter((r) => r.address && isValidEmail(r.address));

  const sponsorInquiryRecipients = (Array.isArray(sponsorRequests) ? sponsorRequests : [])
    .map((request) => ({
      address: String(request?.email || '').trim().toLowerCase(),
      name: String(request?.contactName || request?.name || request?.organizationName || request?.company || '').trim() || undefined,
    }))
    .filter((r) => r.address && isValidEmail(r.address));

  const dedupedByEmail = new Map();
  for (const recipient of [...sponsorCardRecipients, ...sponsorInquiryRecipients]) {
    if (!dedupedByEmail.has(recipient.address)) {
      dedupedByEmail.set(recipient.address, recipient);
    }
  }

  const recipients = [...dedupedByEmail.values()];

  return {
    recipients,
    total: recipients.length,
    fetchedAt: new Date().toISOString(),
  };
};

/**
 * Get mailing recipients summary (counts)
 */
const getMailingRecipientsSummary = async () => {
  try {
    const [attendeesResult, sponsorsResult] = await Promise.all([
      getMailingAttendeesRecipients(),
      getMailingSponsorsRecipients(),
    ]);
    
    return {
      attendees: {
        count: attendeesResult.total,
        fetchedAt: attendeesResult.fetchedAt,
      },
      sponsors: {
        count: sponsorsResult.total,
        fetchedAt: sponsorsResult.fetchedAt,
      },
    };
  } catch (error) {
    throw new Error(`Could not fetch mailing recipients: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Send mailing campaign to recipients
 */
const sendMailingCampaign = async ({
  to = [],
  cc = [],
  bcc = [],
  subject = '',
  html = '',
  text = '',
  recipientType = 'manual', // manual, attendees, sponsors
  deliveryMode = 'shared',
  replyTo = null,
}) => {
  if (!DIRECTORY_SERVICE_ACCOUNT_CLIENT_EMAIL || !DIRECTORY_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Google Workspace service account credentials are not configured.');
  }

  if (!GMAIL_NOTIFY_FROM || !isValidEmail(GMAIL_NOTIFY_FROM)) {
    throw new Error('Gmail sender email is not configured.');
  }

  if (!to.length && !cc.length && !bcc.length) {
    throw new Error('At least one recipient is required.');
  }

  if (!subject || !subject.trim()) {
    throw new Error('Email subject is required.');
  }

  if (!html && !text) {
    throw new Error('Email body (HTML or text) is required.');
  }

  // Get the authenticated user's email for reply-to if needed
  const finalReplyTo = replyTo || GMAIL_NOTIFY_FROM;

  const normalizedTo = [...new Set(to.map((value) => String(value || '').trim().toLowerCase()).filter(isValidEmail))];
  const normalizedCc = [...new Set(cc.map((value) => String(value || '').trim().toLowerCase()).filter(isValidEmail))];
  const normalizedBcc = [...new Set(bcc.map((value) => String(value || '').trim().toLowerCase()).filter(isValidEmail))];
  const allRecipients = [...new Set([...normalizedTo, ...normalizedCc, ...normalizedBcc])];

  if (!allRecipients.length) {
    throw new Error('At least one valid recipient email is required.');
  }

  // Send via Gmail API with HTML and CC/BCC support
  try {
    let result;

    if (deliveryMode === 'private') {
      result = [];
      for (const recipient of allRecipients) {
        const sendResult = await sendGmailApiEmailWithHtml({
          from: GMAIL_NOTIFY_FROM,
          to: [recipient],
          cc: [],
          bcc: [],
          subject: subject.trim(),
          html: html || undefined,
          text: text || undefined,
          replyTo: finalReplyTo,
        });
        result.push(sendResult);
      }
    } else {
      result = await sendGmailApiEmailWithHtml({
        from: GMAIL_NOTIFY_FROM,
        to: normalizedTo,
        cc: normalizedCc,
        bcc: normalizedBcc,
        subject: subject.trim(),
        html: html || undefined,
        text: text || undefined,
        replyTo: finalReplyTo,
      });
    }

    return {
      ok: true,
      result,
      recipientType,
      deliveryMode,
      recipientCount: allRecipients.length,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
      });
      response.end();
      return;
    }

    if ((pathname === '/health' || pathname === '/api/health') && request.method === 'GET') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (pathname.startsWith('/api/uploads/logos/') && request.method === 'GET') {
      const fileName = getSafeUploadFilename(
        decodeURIComponent(pathname.replace('/api/uploads/logos/', '')).trim()
      );
      if (!fileName) {
        sendNotFound(response);
        return;
      }

      const extension = String(fileName.split('.').pop() || '').toLowerCase();
      const contentType =
        LOGO_UPLOAD_EXTENSION_TO_MIME[extension] || 'application/octet-stream';
      const filePath = join(LOGO_UPLOADS_DIR, fileName);

      try {
        const payload = await readFile(filePath);
        sendBinary(response, 200, payload, contentType);
      } catch (_error) {
        sendNotFound(response);
      }
      return;
    }

    if (pathname === '/api/content' && request.method === 'GET') {
      const content = await readStoredContent();
      sendJson(response, 200, content);
      return;
    }

    if (pathname === '/api/content' && request.method === 'PUT') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      const body = await readRequestJson(request);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        sendJson(response, 400, { error: 'Body must be a JSON object.' });
        return;
      }

      const saved = await writeStoredContent(body);
      sendJson(response, 200, {
        ...saved,
        _meta: { updatedBy: authResult.user.email, updatedAt: new Date().toISOString() },
      });
      return;
    }

    if (pathname === '/api/content/reset' && request.method === 'POST') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      const reset = await writeStoredContent(clone(DEFAULT_SITE_CONTENT));
      sendJson(response, 200, {
        ...reset,
        _meta: { updatedBy: authResult.user.email, updatedAt: new Date().toISOString() },
      });
      return;
    }

    if (pathname === '/api/admin/session' && request.method === 'GET') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      sendJson(response, 200, {
        ok: true,
        user: authResult.user,
        workspace: getIntegrationStatus().workspace,
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    if (pathname === '/api/admin/uploads/logo' && request.method === 'POST') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      const body = await readRequestJson(request, LOGO_UPLOAD_REQUEST_LIMIT_BYTES);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        sendJson(response, 400, { error: 'Body must be a JSON object.' });
        return;
      }

      const parsedPayload = parseUploadDataPayload(body.dataBase64 ?? body.data ?? body.content);
      const requestedMimeType = stringValue(body.mimeType, 120).toLowerCase();
      const mimeType = requestedMimeType || parsedPayload.mimeType;
      const extension = LOGO_UPLOAD_MIME_TO_EXTENSION[mimeType];
      if (!extension) {
        sendJson(response, 400, {
          error: 'Unsupported image type. Use PNG, JPEG, WEBP, GIF, or SVG.',
        });
        return;
      }

      const base64Payload = parsedPayload.dataBase64;
      if (!base64Payload || !BASE64_PAYLOAD_PATTERN.test(base64Payload)) {
        sendJson(response, 400, { error: 'Invalid file payload.' });
        return;
      }

      const binary = Buffer.from(base64Payload, 'base64');
      if (!binary.length) {
        sendJson(response, 400, { error: 'Uploaded file is empty.' });
        return;
      }

      if (binary.length > LOGO_UPLOAD_MAX_BYTES) {
        sendJson(response, 400, {
          error: `Logo upload exceeds ${Math.round(LOGO_UPLOAD_MAX_BYTES / (1024 * 1024))} MB limit.`,
        });
        return;
      }

      const rawName = stringValue(body.fileName, 200);
      const nameRoot = rawName.includes('.') ? rawName.slice(0, rawName.lastIndexOf('.')) : rawName;
      const safeStem = sanitizeUploadStem(nameRoot);
      const stamp = Date.now();
      const uniqueId = createId('logo').replace(/^logo-/, '').replace(/[^a-z0-9-]/gi, '').slice(0, 18);
      const fileName = `${safeStem}-${stamp}-${uniqueId}.${extension}`;
      const destination = join(LOGO_UPLOADS_DIR, fileName);

      await mkdir(LOGO_UPLOADS_DIR, { recursive: true });
      await writeFile(destination, binary);

      sendJson(response, 201, {
        ok: true,
        url: `/api/uploads/logos/${encodeURIComponent(fileName)}`,
        fileName,
        mimeType,
        sizeBytes: binary.length,
        uploadedAt: new Date().toISOString(),
      });
      return;
    }

    if (pathname === '/api/sponsor-requests' && request.method === 'POST') {
      const body = await readRequestJson(request);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        sendJson(response, 400, { error: 'Body must be a JSON object.' });
        return;
      }

      const nextRequest = normalizeSponsorRequestRecord({
        ...body,
        id: createId('sponsor-request'),
        createdAt: new Date().toISOString(),
        source: 'public-site',
      });

      if (!nextRequest.organizationName) {
        sendJson(response, 400, { error: 'Organization name is required.' });
        return;
      }

      if (!nextRequest.contactName) {
        sendJson(response, 400, { error: 'Contact name is required.' });
        return;
      }

      if (!isValidEmail(nextRequest.email)) {
        sendJson(response, 400, { error: 'A valid email address is required.' });
        return;
      }

      if (!nextRequest.supportAmount) {
        sendJson(response, 400, { error: 'Please share how your organization can support the event.' });
        return;
      }

      const stored = await readStoredSponsorRequests();
      await writeStoredSponsorRequests([nextRequest, ...stored]);

      notifyOrganizersOfSponsorInquiry(nextRequest).catch((err) => {
        console.error('[sponsor-notify] Gmail notification failed:', err.message);
      });

      sendJson(response, 201, {
        ok: true,
        requestId: nextRequest.id,
        submittedAt: nextRequest.createdAt,
      });
      return;
    }

    if (pathname === '/api/admin/sponsor-requests' && request.method === 'GET') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      const rows = await readStoredSponsorRequests();
      sendJson(response, 200, {
        rows,
        rowCount: rows.length,
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    if (pathname.startsWith('/api/admin/sponsor-requests/') && request.method === 'DELETE') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      const requestId = decodeURIComponent(pathname.replace('/api/admin/sponsor-requests/', '')).trim();
      if (!requestId) {
        sendJson(response, 400, { error: 'Sponsor request id is required.' });
        return;
      }

      const rows = await readStoredSponsorRequests();
      const nextRows = rows.filter((row) => String(row?.id || '').trim() !== requestId);
      if (nextRows.length === rows.length) {
        sendJson(response, 404, { error: 'Sponsor request not found.' });
        return;
      }

      await writeStoredSponsorRequests(nextRows);
      sendJson(response, 200, {
        ok: true,
        requestId,
        deletedAt: new Date().toISOString(),
      });
      return;
    }

    if (pathname === '/api/admin/integrations/status' && request.method === 'GET') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      sendJson(response, 200, {
        ...getIntegrationStatus(),
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    if (pathname === '/api/admin/calendar/events' && request.method === 'GET') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      try {
        const payload = await fetchDashboardCalendarEvents(authResult.user.email);
        sendJson(response, 200, payload);
      } catch (error) {
        sendJson(response, 502, {
          rows: [],
          rowCount: 0,
          userRows: [],
          userRowCount: 0,
          organizerRows: [],
          organizerRowCount: 0,
          configured: Boolean(normalizeCalendarFeedUrl() || hasGoogleWorkspaceScope(GOOGLE_CALENDAR_READONLY_SCOPE)),
          error: error instanceof Error ? error.message : 'Could not load calendar events.',
          fetchedAt: new Date().toISOString(),
        });
      }
      return;
    }

    if (pathname === '/api/admin/email/send' && request.method === 'POST') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      const body = await readRequestJson(request);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        sendJson(response, 400, { error: 'Body must be a JSON object.' });
        return;
      }

      try {
        const result = await sendSmtpEmail({
          recipients: body.recipients,
          subject: body.subject,
          body: body.body,
          replyTo: body.replyTo,
          fromName: body.fromName,
        });

        sendJson(response, 200, {
          ...result,
          requestedBy: authResult.user.email,
        });
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Email could not be sent.',
        });
      }
      return;
    }

    if (pathname === '/api/admin/mailing/recipients' && request.method === 'GET') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      try {
        const summary = await getMailingRecipientsSummary();
        sendJson(response, 200, summary);
      } catch (error) {
        sendJson(response, 502, {
          attendees: { count: 0, fetchedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'Unknown error' },
          sponsors: { count: 0, fetchedAt: new Date().toISOString() },
        });
      }
      return;
    }

    if (pathname === '/api/admin/mailing/send' && request.method === 'POST') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      const body = await readRequestJson(request);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        sendJson(response, 400, { error: 'Body must be a JSON object.' });
        return;
      }

      try {
        let result;

        // Handle different recipient types
        if (body.recipientType === 'attendees') {
          const attendeesResult = await getMailingAttendeesRecipients();
          result = await sendMailingCampaign({
            to: attendeesResult.recipients.map((r) => r.address),
            cc: body.cc || [],
            bcc: body.bcc || [],
            subject: body.subject,
            html: body.html,
            text: body.text,
            replyTo: body.replyTo,
            recipientType: 'attendees',
            deliveryMode: body.deliveryMode || 'shared',
          });
        } else if (body.recipientType === 'sponsors') {
          const sponsorsResult = await getMailingSponsorsRecipients();
          result = await sendMailingCampaign({
            to: sponsorsResult.recipients.map((r) => r.address),
            cc: body.cc || [],
            bcc: body.bcc || [],
            subject: body.subject,
            html: body.html,
            text: body.text,
            replyTo: body.replyTo,
            recipientType: 'sponsors',
            deliveryMode: body.deliveryMode || 'shared',
          });
        } else {
          // Manual recipient list
          result = await sendMailingCampaign({
            to: body.to || [],
            cc: body.cc || [],
            bcc: body.bcc || [],
            subject: body.subject,
            html: body.html,
            text: body.text,
            replyTo: body.replyTo,
            recipientType: 'manual',
            deliveryMode: body.deliveryMode || 'shared',
          });
        }

        sendJson(response, 200, {
          ...result,
          requestedBy: authResult.user.email,
        });
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Email could not be sent.',
        });
      }
      return;
    }

    if (pathname === '/api/admin/feed' && request.method === 'GET') {
      const authResult = await authenticateAdmin(request);
      if (!authResult.ok) {
        sendJson(response, authResult.status, { error: authResult.error });
        return;
      }

      try {
        const source = String(url.searchParams.get('source') || '').trim().toLowerCase();
        const sourceUrl = normalizeFeedUrl(url.searchParams.get('url'));

        if (!sourceUrl && source === 'attendee') {
          const content = await readStoredContent();
          const payload = await fetchAttendeeDriveFeed(content?.operations || {});
          sendJson(response, 200, payload);
          return;
        }

        if (!sourceUrl) {
          sendJson(response, 400, {
            error:
              'Feed URL must be a valid https Google Sheets or Apps Script URL, or pass source=attendee for dynamic shared-drive lookup.',
          });
          return;
        }

        const payload = await fetchRemoteFeed(sourceUrl.toString());
        sendJson(response, 200, payload);
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Feed request failed.',
        });
      }
      return;
    }

    sendNotFound(response);
  } catch (error) {
    sendJson(response, 500, {
      error: 'Internal server error.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`cyberswarm-api listening on port ${PORT}`);
});
