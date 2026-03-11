import {
  DEFAULT_SITE_CONTENT,
  normalizeSiteContent,
} from '@/data/siteData';

const CONTENT_STORAGE_KEY = 'cyberswarm_site_content_v1';
const USER_STORAGE_KEY = 'cyberswarm_user';
const CONTENT_UPDATED_EVENT = 'cyberswarm:content-updated';

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

const writeStoredContent = (content) => {
  if (!isBrowser) return;
  window.localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(content));
  dispatchContentUpdated();
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

const createEntityClient = (entityName, idPrefix) => ({
  async list(sortKey, limit) {
    const content = readStoredContent();
    const rows = readEntityRows(content, entityName);
    return limitRows(sortRows(rows, sortKey), limit);
  },
  async filter(filters, sortKey, limit) {
    const content = readStoredContent();
    const rows = readEntityRows(content, entityName);
    return limitRows(sortRows(filterRows(rows, filters), sortKey), limit);
  },
  async replaceAll(rows) {
    const content = readStoredContent();
    const updated = writeEntityRows(content, entityName, rows);
    writeStoredContent(normalizeSiteContent(updated));
    return this.list();
  },
  async create(payload) {
    const content = readStoredContent();
    const rows = readEntityRows(content, entityName);
    const row = {
      id: payload?.id || createId(idPrefix),
      created_date: payload?.created_date || new Date().toISOString(),
      ...payload,
    };
    rows.push(row);
    const updated = writeEntityRows(content, entityName, rows);
    writeStoredContent(normalizeSiteContent(updated));
    return row;
  },
  async update(id, patch) {
    const content = readStoredContent();
    const rows = readEntityRows(content, entityName);
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) {
      throw new Error(`Entity "${entityName}" row "${id}" not found.`);
    }
    rows[index] = { ...rows[index], ...patch };
    const updated = writeEntityRows(content, entityName, rows);
    writeStoredContent(normalizeSiteContent(updated));
    return rows[index];
  },
  async remove(id) {
    const content = readStoredContent();
    const rows = readEntityRows(content, entityName).filter((row) => row.id !== id);
    const updated = writeEntityRows(content, entityName, rows);
    writeStoredContent(normalizeSiteContent(updated));
    return rows;
  },
});

const getStoredUser = () => {
  if (!isBrowser) return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

export const appClient = {
  content: {
    async get() {
      return readStoredContent();
    },
    async save(content) {
      const normalized = normalizeSiteContent(content);
      writeStoredContent(normalized);
      return normalized;
    },
    async reset() {
      const defaults = deepClone(DEFAULT_SITE_CONTENT);
      writeStoredContent(defaults);
      return defaults;
    },
    subscribe(callback) {
      if (!isBrowser) return () => {};

      const listener = async () => {
        callback(await appClient.content.get());
      };

      window.addEventListener(CONTENT_UPDATED_EVENT, listener);
      window.addEventListener('storage', listener);
      listener();

      return () => {
        window.removeEventListener(CONTENT_UPDATED_EVENT, listener);
        window.removeEventListener('storage', listener);
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
  },
};
