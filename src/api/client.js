import {
  DEFAULT_SITE_CONTENT,
  normalizeSiteContent,
} from '@/data/siteData';

const CONTENT_STORAGE_KEY = 'cyberswarm_site_content_v1';
const USER_STORAGE_KEY = 'cyberswarm_user';
const ADMIN_TOKEN_STORAGE_KEY = 'cyberswarm_admin_access_token';
const CONTENT_UPDATED_EVENT = 'cyberswarm:content-updated';
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const WRITE_LOCAL_FALLBACK = Boolean(import.meta.env.DEV);

const isBrowser = typeof window !== 'undefined';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const dispatchContentUpdated = () => {
  if (!isBrowser) return;
  window.dispatchEvent(new Event(CONTENT_UPDATED_EVENT));
};

const readStoredContent = () => {
  if (!isBrowser) return deepClone(DEFAULT_SITE_CONTENT);

  try {
    const raw = window.localStorage.getItem(CONTENT_STORAGE_KEY);
    if (!raw) return deepClone(DEFAULT_SITE_CONTENT);
    return normalizeSiteContent(JSON.parse(raw));
  } catch (_error) {
    return deepClone(DEFAULT_SITE_CONTENT);
  }
};

const writeStoredContent = (content, options = {}) => {
  if (!isBrowser) return;
  const normalized = normalizeSiteContent(content);
  window.localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(normalized));
  if (options.dispatch !== false) {
    dispatchContentUpdated();
  }
};

const compareValues = (left, right) => {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return leftDate - rightDate;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

const sortRows = (rows, sortKey) => {
  if (!sortKey) return rows;

  const descending = sortKey.startsWith('-');
  const field = descending ? sortKey.slice(1) : sortKey;
  const direction = descending ? -1 : 1;

  return [...rows].sort((a, b) => direction * compareValues(a[field], b[field]));
};

const limitRows = (rows, limit) => {
  if (typeof limit !== 'number' || limit <= 0) return rows;
  return rows.slice(0, limit);
};

const filterRows = (rows, filters = {}) => {
  const entries = Object.entries(filters);
  if (entries.length === 0) return rows;

  return rows.filter((row) => entries.every(([key, value]) => row[key] === value));
};

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const entityReaders = {
  AdminUpdate: (content) => content.adminUpdates,
  AgendaItem: (content) => content.agendaItems,
  EventConfig: (content) => [content.eventConfig],
  Organization: (content) => content.organizations,
};

const entityWriters = {
  AdminUpdate: (content, rows) => ({ ...content, adminUpdates: rows }),
  AgendaItem: (content, rows) => ({ ...content, agendaItems: rows }),
  EventConfig: (content, rows) => ({ ...content, eventConfig: rows[0] || content.eventConfig }),
  Organization: (content, rows) => ({ ...content, organizations: rows }),
};

const readEntityRows = (content, entityName) => deepClone(entityReaders[entityName](content) || []);

const writeEntityRows = (content, entityName, rows) => entityWriters[entityName](content, deepClone(rows));

const getStoredUser = () => {
  if (!isBrowser) return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

const getStoredAccessToken = () => {
  if (!isBrowser) return '';
  return String(window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '');
};

let accessToken = getStoredAccessToken();

const setAccessToken = (token) => {
  accessToken = String(token || '').trim();
  if (!isBrowser) return;

  if (accessToken) {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, accessToken);
    return;
  }

  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
};

const getApiUrl = (path) => `${API_BASE_URL}${path}`;

const readErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (payload?.error) return String(payload.error);
  } catch (_error) {
    // Ignore invalid JSON bodies.
  }
  return `${response.status} ${response.statusText}`;
};

const apiRequest = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) return null;
  return response.json();
};

const readContentFromApi = async () => {
  const payload = await apiRequest('/content', { method: 'GET' });
  return normalizeSiteContent(payload);
};

const writeContentToApi = async (content) => {
  const token = accessToken || getStoredAccessToken();
  if (!token) {
    throw new Error('Admin session expired. Please sign in again at /admin.');
  }

  const payload = await apiRequest('/content', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(normalizeSiteContent(content)),
  });

  return normalizeSiteContent(payload);
};

const resetContentFromApi = async () => {
  const token = accessToken || getStoredAccessToken();
  if (!token) {
    throw new Error('Admin session expired. Please sign in again at /admin.');
  }

  const payload = await apiRequest('/content/reset', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeSiteContent(payload);
};

const createEntityClient = (entityName, idPrefix) => ({
  async list(sortKey, limit) {
    const content = await appClient.content.get();
    const rows = readEntityRows(content, entityName);
    return limitRows(sortRows(rows, sortKey), limit);
  },
  async filter(filters, sortKey, limit) {
    const content = await appClient.content.get();
    const rows = readEntityRows(content, entityName);
    return limitRows(sortRows(filterRows(rows, filters), sortKey), limit);
  },
  async replaceAll(rows) {
    const content = await appClient.content.get();
    const updated = writeEntityRows(content, entityName, rows);
    await appClient.content.save(updated);
    return this.list();
  },
  async create(payload) {
    const content = await appClient.content.get();
    const rows = readEntityRows(content, entityName);
    const row = {
      id: payload?.id || createId(idPrefix),
      created_date: payload?.created_date || new Date().toISOString(),
      ...payload,
    };
    rows.push(row);
    const updated = writeEntityRows(content, entityName, rows);
    await appClient.content.save(updated);
    return row;
  },
  async update(id, patch) {
    const content = await appClient.content.get();
    const rows = readEntityRows(content, entityName);
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) {
      throw new Error(`Entity "${entityName}" row "${id}" not found.`);
    }
    rows[index] = { ...rows[index], ...patch };
    const updated = writeEntityRows(content, entityName, rows);
    await appClient.content.save(updated);
    return rows[index];
  },
  async remove(id) {
    const content = await appClient.content.get();
    const rows = readEntityRows(content, entityName).filter((row) => row.id !== id);
    const updated = writeEntityRows(content, entityName, rows);
    await appClient.content.save(updated);
    return rows;
  },
});

export const appClient = {
  content: {
    async get() {
      if (!isBrowser) return deepClone(DEFAULT_SITE_CONTENT);

      try {
        const content = await readContentFromApi();
        writeStoredContent(content, { dispatch: false });
        return content;
      } catch (_error) {
        return readStoredContent();
      }
    },
    async save(content) {
      const normalized = normalizeSiteContent(content);

      try {
        const saved = await writeContentToApi(normalized);
        writeStoredContent(saved);
        return saved;
      } catch (error) {
        if (WRITE_LOCAL_FALLBACK) {
          writeStoredContent(normalized);
          return normalized;
        }
        throw error;
      }
    },
    async reset() {
      try {
        const reset = await resetContentFromApi();
        writeStoredContent(reset);
        return reset;
      } catch (error) {
        if (WRITE_LOCAL_FALLBACK) {
          const defaults = deepClone(DEFAULT_SITE_CONTENT);
          writeStoredContent(defaults);
          return defaults;
        }
        throw error;
      }
    },
    subscribe(callback) {
      if (!isBrowser) return () => {};

      let closed = false;
      let polling = false;

      const emit = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          callback(await appClient.content.get());
        } finally {
          polling = false;
        }
      };

      const eventListener = () => {
        emit();
      };

      window.addEventListener(CONTENT_UPDATED_EVENT, eventListener);
      window.addEventListener('storage', eventListener);
      emit();

      const interval = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          emit();
        }
      }, 30000);

      return () => {
        closed = true;
        window.clearInterval(interval);
        window.removeEventListener(CONTENT_UPDATED_EVENT, eventListener);
        window.removeEventListener('storage', eventListener);
      };
    },
  },
  entities: {
    AdminUpdate: createEntityClient('AdminUpdate', 'update'),
    AgendaItem: createEntityClient('AgendaItem', 'agenda'),
    EventConfig: createEntityClient('EventConfig', 'event-config'),
    Organization: createEntityClient('Organization', 'org'),
  },
  auth: {
    async me() {
      const user = getStoredUser();
      if (!user) {
        throw new Error('not_authenticated');
      }
      return user;
    },
    setAccessToken(token) {
      setAccessToken(token);
    },
    clearAccessToken() {
      setAccessToken('');
    },
    getAccessToken() {
      return accessToken || getStoredAccessToken();
    },
  },
};
