import {
  DEFAULT_DIRECTIONS_DESTINATION,
  DEFAULT_DIRECTIONS_URL,
  DEFAULT_MAP_EMBED_URL,
  LEGACY_DEFAULT_DIRECTIONS_URL,
  LEGACY_DEFAULT_MAP_EMBED_URL,
  buildDirectionsUrlFromEmbedUrl,
  buildGoogleMapsDirectionsUrl,
} from '../lib/google-maps.js';

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const nowIso = () => new Date().toISOString();

export const DEFAULT_HERO_CONFIG = {
  pretitle: 'Sacramento State University Presents',
  title_line_1: 'CYBER',
  title_line_2: 'SWARM',
  subtitle:
    'Cybersecurity Panel & Networking Event - Where collective defense meets collective intelligence.',
  countdown_target: '2026-04-15T09:00:00',
  cta_label: 'Join the Swarm',
};

export const DEFAULT_EVENT_CONFIG = {
  id: 'event-config-1',
  created_date: '2026-02-20T09:00:00.000Z',
  event_date: '2026-04-15',
  event_time: '9:00 AM - 5:00 PM PST',
  venue_name: 'The WELL',
  venue_name_line_1: 'The WELL',
  venue_name_line_2: 'Sacramento State University',
  venue_address: '6000 J St, Sacramento, CA 95819',
  google_maps_embed_url: DEFAULT_MAP_EMBED_URL,
  google_maps_directions_url: DEFAULT_DIRECTIONS_URL,
  google_form_embed_url: '',
};

export const DEFAULT_REGISTRATION_CONFIG = {
  heading_top: 'JOIN THE',
  heading_bottom: 'SWARM',
  description:
    'Register now to secure your spot at the premier cybersecurity event at Sacramento State.',
  placeholder_title: '[ REGISTRATION FORM WILL BE EMBEDDED HERE ]',
  placeholder_note: 'Admin: Add your Google Form URL in Event Config',
};

export const DEFAULT_FOOTER_CONFIG = {
  brand_name: 'CyberSwarm',
  copyright_template: '(c) {year} Sac State CyberSwarm. All rights reserved.',
  organization_text: 'Sacramento State University',
  accessibility_help_text: 'Need help accessing this site or registering?',
  accessibility_email: 'accessibility@cyberswarmsac.com',
  accessibility_phone: '',
};

export const DEFAULT_ORGANIZATIONS_SECTION_CONFIG = {
  heading: 'Participating Organizations',
};

export const DEFAULT_ORGANIZATIONS = [
  { id: 'org-1', name: 'CISCO', order: 1, active: true },
  { id: 'org-2', name: 'HPE', order: 2, active: true },
  { id: 'org-3', name: 'PALO ALTO', order: 3, active: true },
  { id: 'org-4', name: 'CROWDSTRIKE', order: 4, active: true },
  { id: 'org-5', name: 'WIZ', order: 5, active: true },
  { id: 'org-6', name: 'FORTINET', order: 6, active: true },
  { id: 'org-7', name: 'SPLUNK', order: 7, active: true },
  { id: 'org-8', name: 'MANDIANT', order: 8, active: true },
];

export const DEFAULT_AGENDA_ITEMS = [
  {
    id: 'agenda-1',
    order: 1,
    title: 'Opening Keynote: State of Modern Threat Intelligence',
    description:
      'A tactical briefing on current ransomware and identity attack trends affecting higher education and enterprises.',
    speaker: 'Dr. Maya Patel',
    company: 'Sac State',
    start_time: '09:00 AM',
    end_time: '09:45 AM',
    session_type: 'keynote',
    active: true,
  },
  {
    id: 'agenda-2',
    order: 2,
    title: 'Panel: Security Operations in the AI Era',
    description:
      'Leaders discuss detection engineering, automation, and how SOC teams are adapting with limited resources.',
    speaker: 'Industry Panel',
    company: 'Cisco, CrowdStrike, Splunk',
    start_time: '10:00 AM',
    end_time: '11:00 AM',
    session_type: 'panel',
    active: true,
  },
  {
    id: 'agenda-3',
    order: 3,
    title: 'Networking Break',
    description: 'Meet recruiters, students, and practitioners in the expo hall.',
    speaker: '',
    company: '',
    start_time: '11:00 AM',
    end_time: '11:30 AM',
    session_type: 'networking',
    active: true,
  },
  {
    id: 'agenda-4',
    order: 4,
    title: 'Hands-On Workshop: Incident Response Tabletop',
    description:
      'An interactive response simulation focused on triage, containment, and executive communication.',
    speaker: 'Alex Chen',
    company: 'Palo Alto Networks',
    start_time: '11:30 AM',
    end_time: '01:00 PM',
    session_type: 'workshop',
    active: true,
  },
  {
    id: 'agenda-5',
    order: 5,
    title: 'Closing Session and Career Q&A',
    description:
      'Final takeaways, pathway advice for students, and open Q&A with hiring teams.',
    speaker: 'Community Speakers',
    company: 'Partner Organizations',
    start_time: '01:15 PM',
    end_time: '02:00 PM',
    session_type: 'panel',
    active: true,
  },
];

export const DEFAULT_ADMIN_UPDATES = [
  {
    id: 'update-1',
    message: 'Registration check-in opens at 08:15 near the main auditorium.',
    priority: 'normal',
    active: true,
    created_date: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'update-2',
    message: 'Workshop capacity is limited. Arrive early for guaranteed seating.',
    priority: 'urgent',
    active: true,
    created_date: '2026-03-01T08:30:00.000Z',
  },
];

export const DEFAULT_SITE_CONTENT = {
  hero: DEFAULT_HERO_CONFIG,
  eventConfig: DEFAULT_EVENT_CONFIG,
  registration: DEFAULT_REGISTRATION_CONFIG,
  footer: DEFAULT_FOOTER_CONFIG,
  organizationsSection: DEFAULT_ORGANIZATIONS_SECTION_CONFIG,
  organizations: DEFAULT_ORGANIZATIONS,
  agendaItems: DEFAULT_AGENDA_ITEMS,
  adminUpdates: DEFAULT_ADMIN_UPDATES,
};

const normalizeOrganizations = (value) => {
  if (!Array.isArray(value)) return DEFAULT_ORGANIZATIONS.map((row) => ({ ...row }));

  return value.map((row, index) => {
    if (typeof row === 'string') {
      return {
        id: createId('org'),
        name: row,
        order: index + 1,
        active: true,
      };
    }

    return {
      id: row.id || createId('org'),
      name: row.name || '',
      order: Number.isFinite(row.order) ? row.order : index + 1,
      active: row.active ?? true,
    };
  });
};

const normalizeAgendaItems = (value) => {
  if (!Array.isArray(value)) return DEFAULT_AGENDA_ITEMS.map((row) => ({ ...row }));

  return value.map((row, index) => ({
    id: row.id || createId('agenda'),
    order: Number.isFinite(row.order) ? row.order : index + 1,
    title: row.title || '',
    description: row.description || '',
    speaker: row.speaker || '',
    company: row.company || '',
    session_label: row.session_label || '',
    start_time: row.start_time || '',
    end_time: row.end_time || '',
    session_type: row.session_type || 'panel',
    active: row.active ?? true,
  }));
};

const normalizeAdminUpdates = (value) => {
  if (!Array.isArray(value)) return DEFAULT_ADMIN_UPDATES.map((row) => ({ ...row }));

  return value.map((row) => ({
    id: row.id || createId('update'),
    message: row.message || '',
    priority: row.priority === 'urgent' ? 'urgent' : 'normal',
    active: row.active ?? true,
    created_date: row.created_date || nowIso(),
  }));
};

const asObject = (value) => (value && typeof value === 'object' ? value : {});

const LEGACY_DEFAULT_VENUE_NAME = 'Sacramento State University';
const LEGACY_DEFAULT_ACCESSIBILITY_PHONE = '(916) 278-6011';

export const normalizeSiteContent = (raw) => {
  const source = asObject(raw);

  const rawEventConfig = source.eventConfig;
  const eventConfig = rawEventConfig && typeof rawEventConfig === 'object'
    ? rawEventConfig
    : Array.isArray(source.EventConfig)
      ? asObject(source.EventConfig[0])
      : {};
  const normalizedEventConfig = {
    ...DEFAULT_EVENT_CONFIG,
    ...eventConfig,
    venue_name_line_1: String(
      eventConfig.venue_name_line_1 ?? eventConfig.venue_name ?? DEFAULT_EVENT_CONFIG.venue_name_line_1
    ),
    venue_name_line_2: String(eventConfig.venue_name_line_2 ?? ''),
    google_maps_embed_url: String(
      eventConfig.google_maps_embed_url || DEFAULT_EVENT_CONFIG.google_maps_embed_url
    ),
    google_maps_directions_url: String(
      eventConfig.google_maps_directions_url ||
        buildGoogleMapsDirectionsUrl(eventConfig.directions_destination) ||
        buildDirectionsUrlFromEmbedUrl(
          eventConfig.google_maps_embed_url || DEFAULT_EVENT_CONFIG.google_maps_embed_url,
          eventConfig.venue_address || DEFAULT_EVENT_CONFIG.venue_address,
          DEFAULT_DIRECTIONS_DESTINATION
        ) ||
        DEFAULT_EVENT_CONFIG.google_maps_directions_url
    ),
  };
  const isLegacyVenueDefault =
    normalizedEventConfig.venue_name_line_1.trim() === LEGACY_DEFAULT_VENUE_NAME &&
    normalizedEventConfig.venue_name_line_2.trim() === '' &&
    String(normalizedEventConfig.venue_address || '').trim() === DEFAULT_EVENT_CONFIG.venue_address;

  if (isLegacyVenueDefault) {
    normalizedEventConfig.venue_name = DEFAULT_EVENT_CONFIG.venue_name;
    normalizedEventConfig.venue_name_line_1 = DEFAULT_EVENT_CONFIG.venue_name_line_1;
    normalizedEventConfig.venue_name_line_2 = DEFAULT_EVENT_CONFIG.venue_name_line_2;
  }

  if (normalizedEventConfig.google_maps_embed_url === LEGACY_DEFAULT_MAP_EMBED_URL) {
    normalizedEventConfig.google_maps_embed_url = DEFAULT_EVENT_CONFIG.google_maps_embed_url;
  }

  if (
    normalizedEventConfig.google_maps_directions_url === LEGACY_DEFAULT_DIRECTIONS_URL ||
    !normalizedEventConfig.google_maps_directions_url.trim() ||
    isLegacyVenueDefault
  ) {
    normalizedEventConfig.google_maps_directions_url =
      buildDirectionsUrlFromEmbedUrl(
        normalizedEventConfig.google_maps_embed_url,
        normalizedEventConfig.venue_address,
        DEFAULT_DIRECTIONS_DESTINATION
      ) || DEFAULT_EVENT_CONFIG.google_maps_directions_url;
  }

  return {
    hero: {
      ...DEFAULT_HERO_CONFIG,
      ...asObject(source.hero),
    },
    eventConfig: {
      ...normalizedEventConfig,
    },
    registration: {
      ...DEFAULT_REGISTRATION_CONFIG,
      ...asObject(source.registration),
    },
    footer: {
      ...DEFAULT_FOOTER_CONFIG,
      ...asObject(source.footer),
      accessibility_email:
        String(asObject(source.footer).accessibility_email || '').trim() ||
        DEFAULT_FOOTER_CONFIG.accessibility_email,
      accessibility_phone:
        String(asObject(source.footer).accessibility_phone || '').trim() === LEGACY_DEFAULT_ACCESSIBILITY_PHONE
          ? ''
          : String(asObject(source.footer).accessibility_phone || '').trim(),
    },
    organizationsSection: {
      ...DEFAULT_ORGANIZATIONS_SECTION_CONFIG,
      ...asObject(source.organizationsSection),
      heading: String(
        source.organizationsSection?.heading ??
          source.organizations_heading ??
          DEFAULT_ORGANIZATIONS_SECTION_CONFIG.heading
      ),
    },
    organizations: normalizeOrganizations(source.organizations ?? source.companies),
    agendaItems: normalizeAgendaItems(source.agendaItems ?? source.AgendaItem),
    adminUpdates: normalizeAdminUpdates(source.adminUpdates ?? source.AdminUpdate),
  };
};
