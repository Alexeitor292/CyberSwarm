import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_SITE_CONTENT, normalizeSiteContent } from '../src/data/siteData.js';

const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), '.data');
const CONTENT_FILE = join(DATA_DIR, 'site-content.json');
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const REQUEST_TIMEOUT_MS = 10000;
const BODY_LIMIT_BYTES = 1024 * 1024;

const clone = (value) => JSON.parse(JSON.stringify(value));

const ensureStorage = async () => {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(CONTENT_FILE, 'utf8');
  } catch (_error) {
    const initial = normalizeSiteContent(clone(DEFAULT_SITE_CONTENT));
    await writeFile(CONTENT_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
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
  const tempFile = `${CONTENT_FILE}.tmp`;
  await writeFile(tempFile, JSON.stringify(normalized, null, 2), 'utf8');
  await rename(tempFile, CONTENT_FILE);
  return normalized;
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

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
    return { ok: false, status: 403, error: `Access denied for ${email}.` };
  }

  return {
    ok: true,
    user: {
      email,
      name: String(profile?.name || email),
      picture: String(profile?.picture || ''),
    },
  };
};

const readRequestJson = async (request) =>
  new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;

    request.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > BODY_LIMIT_BYTES) {
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

const sendNotFound = (response) => sendJson(response, 404, { error: 'Not found.' });

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      });
      response.end();
      return;
    }

    if ((pathname === '/health' || pathname === '/api/health') && request.method === 'GET') {
      sendJson(response, 200, { ok: true });
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
