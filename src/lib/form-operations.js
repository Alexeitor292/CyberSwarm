export const normalizeExternalUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;

  try {
    return new URL(candidate).toString();
  } catch (_error) {
    return '';
  }
};

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const stringValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const getMatchingValue = (row, configuredField, fallbackKeys = []) => {
  if (!row || typeof row !== 'object') return '';

  const entries = Object.entries(row);
  const preferredKeys = [configuredField, ...fallbackKeys]
    .map((value) => normalizeKey(value))
    .filter(Boolean);

  for (const preferredKey of preferredKeys) {
    const exact = entries.find(([key]) => normalizeKey(key) === preferredKey);
    if (exact) return stringValue(exact[1]);
  }

  for (const preferredKey of preferredKeys) {
    const partial = entries.find(([key]) => normalizeKey(key).includes(preferredKey));
    if (partial) return stringValue(partial[1]);
  }

  return '';
};

const parseDateValue = (value) => {
  const raw = stringValue(value);
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const buildRecordId = (prefix, row, index, primaryFields) => {
  const seed = primaryFields
    .map((field) => stringValue(field))
    .filter(Boolean)
    .join('|');

  if (seed) {
    return `${prefix}-${seed.toLowerCase().replace(/[^a-z0-9|]+/g, '-')}`;
  }

  return `${prefix}-${index + 1}`;
};

const sortByNewest = (left, right) => {
  const leftTime = left.sortTimestamp ?? -Infinity;
  const rightTime = right.sortTimestamp ?? -Infinity;
  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.sourceIndex - left.sourceIndex;
};

export const buildSponsorLeadRecords = (rows, operations = {}) =>
  (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const name = getMatchingValue(row, operations.sponsor_name_field, [
        'name',
        'full name',
        'contact name',
      ]);
      const email = getMatchingValue(row, operations.sponsor_email_field, [
        'email',
        'email address',
        'work email',
      ]).toLowerCase();
      const company = getMatchingValue(row, operations.sponsor_company_field, [
        'company',
        'organization',
        'employer',
        'sponsor company',
      ]);
      const interest = getMatchingValue(row, operations.sponsor_interest_field, [
        'interest',
        'sponsorship interest',
        'package',
        'tier',
        'message',
        'notes',
      ]);
      const timestampText = getMatchingValue(row, operations.sponsor_timestamp_field, [
        'timestamp',
        'submitted at',
        'submission time',
        'created at',
      ]);
      const sortTimestamp = parseDateValue(timestampText);

      return {
        id: buildRecordId('sponsor-lead', row, index, [email, company, name, timestampText]),
        sourceIndex: index,
        sortTimestamp,
        submittedAt: timestampText,
        name,
        email,
        company,
        interest,
        raw: row,
      };
    })
    .filter((item) => item.name || item.email || item.company || item.interest)
    .sort(sortByNewest);

export const buildAttendeeRecords = (rows, operations = {}) =>
  (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const name = getMatchingValue(row, operations.attendee_name_field, [
        'name',
        'full name',
        'attendee name',
      ]);
      const email = getMatchingValue(row, operations.attendee_email_field, [
        'email',
        'email address',
        'student email',
      ]).toLowerCase();
      const company = getMatchingValue(row, operations.attendee_company_field, [
        'company',
        'organization',
        'org name',
        'organization name',
        'employer',
        'school',
      ]);
      const role = getMatchingValue(row, operations.attendee_role_field, [
        'role',
        'you are',
        'attendee type',
        'title',
        'job title',
        'student type',
      ]);
      const status = getMatchingValue(row, operations.attendee_status_field, [
        'status',
        'attendance status',
        'registration status',
      ]);
      const timestampText = getMatchingValue(row, operations.attendee_timestamp_field, [
        'timestamp',
        'submitted at',
        'submission time',
        'created at',
      ]);
      const sortTimestamp = parseDateValue(timestampText);

      return {
        id: buildRecordId('attendee', row, index, [email, name, timestampText]),
        sourceIndex: index,
        sortTimestamp,
        submittedAt: timestampText,
        name,
        email,
        company,
        role,
        status,
        raw: row,
      };
    })
    .filter((item) => item.name || item.email)
    .sort(sortByNewest);

export const buildRecipientList = (records, options = {}) => {
  const search = stringValue(options.search).toLowerCase();
  const statusFilter = stringValue(options.status).toLowerCase();
  const recipients = [];
  const seen = new Set();

  for (const record of Array.isArray(records) ? records : []) {
    const email = stringValue(record.email).toLowerCase();
    if (!email || seen.has(email)) continue;

    if (
      statusFilter &&
      statusFilter !== 'all' &&
      stringValue(record.status).toLowerCase() !== statusFilter
    ) {
      continue;
    }

    if (search) {
      const haystack = [
        record.name,
        record.email,
        record.company,
        record.role,
        record.status,
      ]
        .map((value) => stringValue(value).toLowerCase())
        .join(' ');

      if (!haystack.includes(search)) continue;
    }

    seen.add(email);
    recipients.push(record);
  }

  return recipients;
};

export const exportRowsToCsv = (rows) => {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return '';

  const headers = Array.from(
    items.reduce((set, item) => {
      Object.keys(item || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const escapeCell = (value) => {
    const cell = stringValue(value).replace(/"/g, '""');
    return /[",\n]/.test(cell) ? `"${cell}"` : cell;
  };

  return [
    headers.join(','),
    ...items.map((row) => headers.map((header) => escapeCell(row?.[header])).join(',')),
  ].join('\n');
};

export const formatFeedDate = (value) => {
  const timestamp = parseDateValue(value);
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
};

export const getUniqueStatuses = (records) =>
  Array.from(
    new Set(
      (Array.isArray(records) ? records : [])
        .map((record) => stringValue(record.status))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));

export const filterRecords = (records, search = '') => {
  const query = stringValue(search).toLowerCase();
  if (!query) return Array.isArray(records) ? records : [];

  return (Array.isArray(records) ? records : []).filter((record) =>
    [
      record.name,
      record.email,
      record.company,
      record.role,
      record.status,
      record.interest,
      record.supportAmount,
      record.phone,
      record.organizationName,
      record.contactName,
      record.message,
      record.website,
      record.bringSwag ? 'swag' : '',
      record.venueBranding ? 'branding' : '',
      record.submittedAt,
    ]
      .map((value) => stringValue(value).toLowerCase())
      .join(' ')
      .includes(query)
  );
};
