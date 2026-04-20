import {
  DEFAULT_DIRECTIONS_DESTINATION,
  DEFAULT_DIRECTIONS_URL,
  DEFAULT_MAP_EMBED_URL,
  DEFAULT_PLACE_ID,
  DEFAULT_PLACE_URL,
  LEGACY_DEFAULT_DIRECTIONS_URL,
  LEGACY_DEFAULT_MAP_EMBED_URL,
  buildDirectionsUrlFromEmbedUrl,
  buildGoogleMapsDirectionsUrl,
  buildPlaceUrlFromEmbedUrl,
  directionsUrlHasPlaceId,
  normalizeGoogleMapsPlaceId,
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
  google_maps_place_url: DEFAULT_PLACE_URL,
  google_maps_place_id: DEFAULT_PLACE_ID,
  google_maps_directions_url: DEFAULT_DIRECTIONS_URL,
  google_form_embed_url: '',
};

export const DEFAULT_REGISTRATION_CONFIG = {
  heading_top: 'JOIN THE',
  heading_bottom: 'SWARM',
  description:
    'Register now to secure your spot at the premier cybersecurity event at Sacramento State.',
  placeholder_title: '[ REGISTRATION FORM WILL BE EMBEDDED HERE ]',
  placeholder_note: 'Admin: Connect your registration form in Integrations',
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

export const DEFAULT_SPONSORS_SECTION_CONFIG = {
  eyebrow: 'Sponsors',
  heading: 'Backed By Industry Leaders',
  description:
    'Organizations helping make CyberSwarm possible through direct support, visibility, and community investment.',
  cta_label: '',
  cta_url: '',
  sponsor_link_label: 'Visit Website',
  sponsor_profile_label: 'Profile',
  vip_group_label: 'Powered By',
  vip_group_subtitle: 'Front-of-stage partners',
  hide_vip_group_subtitle: false,
};

const normalizeBooleanField = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return fallback;
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

export const DEFAULT_SPONSORS = [];

export const DEFAULT_OPERATIONS_CONFIG = {
  sponsor_cta_label: 'Become a Sponsor',
  sponsor_form_url: '',
  sponsor_feed_url: '',
  sponsor_name_field: '',
  sponsor_email_field: '',
  sponsor_company_field: '',
  sponsor_interest_field: '',
  sponsor_timestamp_field: '',
  attendee_feed_url: '',
  attendee_name_field: 'Name',
  attendee_email_field: 'Email Address',
  attendee_company_field: 'Org Name',
  attendee_role_field: 'You are',
  attendee_status_field: '',
  attendee_timestamp_field: 'Timestamp',
  calendar_label: 'CyberSwarm Calendar',
  calendar_public_url: '',
  calendar_embed_url: '',
  workspace_domain: 'cyberswarmsac.com',
  workspace_admin_console_url: 'https://admin.google.com/',
  workspace_drive_folder_url: '',
  workspace_shared_drive_url: '',
  workspace_group_email: 'team@cyberswarmsac.com',
  enabled_google_widgets: ['workspace'],
  messaging_subject_prefix: 'CyberSwarm',
  messaging_reply_to: '',
  messaging_from_name: 'CyberSwarm Team',
  messaging_team_inbox_url: '',
};

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
  sponsorsSection: DEFAULT_SPONSORS_SECTION_CONFIG,
  sponsors: DEFAULT_SPONSORS,
  organizationsSection: DEFAULT_ORGANIZATIONS_SECTION_CONFIG,
  organizations: DEFAULT_ORGANIZATIONS,
  agendaItems: DEFAULT_AGENDA_ITEMS,
  adminUpdates: DEFAULT_ADMIN_UPDATES,
  operations: DEFAULT_OPERATIONS_CONFIG,
};

const normalizeSponsorLogoBackground = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['transparent', 'soft', 'light', 'dark', 'color'].includes(normalized)) {
    return normalized;
  }
  return 'transparent';
};

const normalizeSponsorLogoBackgroundColor = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const shortHexMatch = normalized.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }

  return '#ffffff';
};

const normalizeSponsorLogoScale = (value) => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return 110;
  return Math.min(400, Math.max(60, Math.round(scale)));
};

const normalizeSponsorLogoOffset = (value) => {
  const offset = Number(value);
  if (!Number.isFinite(offset)) return 0;
  return Math.min(100, Math.max(-100, Math.round(offset)));
};

const normalizeSponsorVip = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;

  if (['1', 'true', 'yes', 'y', 'vip'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n', 'regular', 'standard'].includes(normalized)) {
    return false;
  }

  return false;
};

const normalizeSponsors = (value) => {
  if (!Array.isArray(value)) return DEFAULT_SPONSORS.map((row) => ({ ...row }));

  return value.map((row, index) => {
    if (typeof row === 'string') {
      return {
        id: createId('sponsor'),
        name: row,
        logo_url: '',
        website_url: '',
        highlight: '',
        contact_name: '',
        email: '',
        phone: '',
        support_amount: '',
        interest_notes: '',
        bring_swag: false,
        venue_branding: false,
        vip: false,
        logo_background: 'transparent',
        logo_background_color: '#ffffff',
        logo_scale: 110,
        logo_offset_x: 0,
        logo_offset_y: 0,
        order: index + 1,
        active: true,
      };
    }

    return {
      id: row.id || createId('sponsor'),
      name: row.name || '',
      logo_url: String(row.logo_url || ''),
      website_url: String(row.website_url || ''),
      highlight: String(row.highlight || ''),
      contact_name: String(row.contact_name || row.contactName || ''),
      email: String(row.email || row.contact_email || row.contactEmail || ''),
      phone: String(row.phone || row.contact_phone || row.contactPhone || ''),
      support_amount: String(row.support_amount || row.supportAmount || ''),
      interest_notes: String(row.interest_notes || row.message || row.notes || ''),
      bring_swag: Boolean(row.bring_swag ?? row.bringSwag ?? false),
      venue_branding: Boolean(row.venue_branding ?? row.venueBranding ?? false),
      vip: normalizeSponsorVip(row.vip ?? row.is_vip ?? row.isVip ?? row.tier),
      logo_background: normalizeSponsorLogoBackground(row.logo_background),
      logo_background_color: normalizeSponsorLogoBackgroundColor(
        row.logo_background_color ?? row.logoBackgroundColor
      ),
      logo_scale: normalizeSponsorLogoScale(row.logo_scale),
      logo_offset_x: normalizeSponsorLogoOffset(row.logo_offset_x ?? row.logoOffsetX),
      logo_offset_y: normalizeSponsorLogoOffset(row.logo_offset_y ?? row.logoOffsetY),
      order: Number.isFinite(row.order) ? row.order : index + 1,
      active: row.active ?? true,
    };
  });
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

const normalizeOperationsConfig = (value) => {
  const source = asObject(value);

  return {
    ...DEFAULT_OPERATIONS_CONFIG,
    sponsor_cta_label: String(
      source.sponsor_cta_label ?? DEFAULT_OPERATIONS_CONFIG.sponsor_cta_label
    ),
    sponsor_form_url: String(source.sponsor_form_url || ''),
    sponsor_feed_url: String(source.sponsor_feed_url || ''),
    sponsor_name_field: String(source.sponsor_name_field || ''),
    sponsor_email_field: String(source.sponsor_email_field || ''),
    sponsor_company_field: String(source.sponsor_company_field || ''),
    sponsor_interest_field: String(source.sponsor_interest_field || ''),
    sponsor_timestamp_field: String(source.sponsor_timestamp_field || ''),
    attendee_feed_url: String(source.attendee_feed_url || ''),
    attendee_name_field: String(source.attendee_name_field || ''),
    attendee_email_field: String(source.attendee_email_field || ''),
    attendee_company_field: String(source.attendee_company_field || ''),
    attendee_role_field: String(source.attendee_role_field || ''),
    attendee_status_field: String(source.attendee_status_field || ''),
    attendee_timestamp_field: String(source.attendee_timestamp_field || ''),
    calendar_label: String(source.calendar_label ?? DEFAULT_OPERATIONS_CONFIG.calendar_label),
    calendar_public_url: String(source.calendar_public_url || ''),
    calendar_embed_url: String(source.calendar_embed_url || ''),
    workspace_domain: String(source.workspace_domain ?? DEFAULT_OPERATIONS_CONFIG.workspace_domain),
    workspace_admin_console_url: String(
      source.workspace_admin_console_url ?? DEFAULT_OPERATIONS_CONFIG.workspace_admin_console_url
    ),
    workspace_drive_folder_url: String(source.workspace_drive_folder_url || ''),
    workspace_shared_drive_url: String(source.workspace_shared_drive_url || ''),
    workspace_group_email: String(source.workspace_group_email ?? DEFAULT_OPERATIONS_CONFIG.workspace_group_email),
    enabled_google_widgets: Array.isArray(source.enabled_google_widgets)
      ? source.enabled_google_widgets.map((item) => String(item || '').trim()).filter(Boolean)
      : [...DEFAULT_OPERATIONS_CONFIG.enabled_google_widgets],
    messaging_subject_prefix: String(
      source.messaging_subject_prefix ?? DEFAULT_OPERATIONS_CONFIG.messaging_subject_prefix
    ),
    messaging_reply_to: String(source.messaging_reply_to || ''),
    messaging_from_name: String(
      source.messaging_from_name ?? DEFAULT_OPERATIONS_CONFIG.messaging_from_name
    ),
    messaging_team_inbox_url: String(source.messaging_team_inbox_url || ''),
  };
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
  const eventVenueQuery =
    [
      eventConfig.venue_name_line_1 ?? eventConfig.venue_name ?? DEFAULT_EVENT_CONFIG.venue_name_line_1,
      eventConfig.venue_name_line_2 ?? DEFAULT_EVENT_CONFIG.venue_name_line_2,
      eventConfig.venue_address || DEFAULT_EVENT_CONFIG.venue_address,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(', ') || DEFAULT_DIRECTIONS_DESTINATION;
  const normalizedPlaceId = normalizeGoogleMapsPlaceId(
    eventConfig.google_maps_place_id ||
      eventConfig.google_maps_place_url ||
      eventConfig.google_maps_directions_url
  );
  const normalizedPlaceUrl =
    String(eventConfig.google_maps_place_url || '').trim() ||
    buildPlaceUrlFromEmbedUrl(
      eventConfig.google_maps_embed_url || DEFAULT_EVENT_CONFIG.google_maps_embed_url,
      eventConfig.venue_address || DEFAULT_EVENT_CONFIG.venue_address,
      eventVenueQuery,
      normalizedPlaceId
    ) ||
    DEFAULT_EVENT_CONFIG.google_maps_place_url;
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
    google_maps_place_url: String(normalizedPlaceUrl),
    google_maps_place_id: normalizedPlaceId,
    google_maps_directions_url: String(
      eventConfig.google_maps_directions_url ||
        buildGoogleMapsDirectionsUrl(eventVenueQuery, normalizedPlaceId) ||
        buildGoogleMapsDirectionsUrl(eventConfig.directions_destination) ||
        buildDirectionsUrlFromEmbedUrl(
          eventConfig.google_maps_embed_url || DEFAULT_EVENT_CONFIG.google_maps_embed_url,
          eventConfig.venue_address || DEFAULT_EVENT_CONFIG.venue_address,
          eventVenueQuery,
          normalizedPlaceId
        ) ||
        DEFAULT_EVENT_CONFIG.google_maps_directions_url
    ),
  };
  const isLegacyVenueDefault =
    normalizedEventConfig.venue_name_line_1.trim() === LEGACY_DEFAULT_VENUE_NAME &&
    normalizedEventConfig.venue_name_line_2.trim() === '' &&
    String(normalizedEventConfig.venue_address || '').trim() === DEFAULT_EVENT_CONFIG.venue_address;
  const isDefaultVenue =
    normalizedEventConfig.venue_name_line_1.trim() === DEFAULT_EVENT_CONFIG.venue_name_line_1 &&
    normalizedEventConfig.venue_name_line_2.trim() === DEFAULT_EVENT_CONFIG.venue_name_line_2 &&
    String(normalizedEventConfig.venue_address || '').trim() === DEFAULT_EVENT_CONFIG.venue_address;

  if (isLegacyVenueDefault) {
    normalizedEventConfig.venue_name = DEFAULT_EVENT_CONFIG.venue_name;
    normalizedEventConfig.venue_name_line_1 = DEFAULT_EVENT_CONFIG.venue_name_line_1;
    normalizedEventConfig.venue_name_line_2 = DEFAULT_EVENT_CONFIG.venue_name_line_2;
  }

  if (!String(normalizedEventConfig.google_maps_place_id || '').trim() && (isDefaultVenue || isLegacyVenueDefault)) {
    normalizedEventConfig.google_maps_place_id = DEFAULT_EVENT_CONFIG.google_maps_place_id;
  }

  if (normalizedEventConfig.google_maps_embed_url === LEGACY_DEFAULT_MAP_EMBED_URL) {
    normalizedEventConfig.google_maps_embed_url = DEFAULT_EVENT_CONFIG.google_maps_embed_url;
  }

  if (
    !normalizedEventConfig.google_maps_place_url.trim() ||
    isLegacyVenueDefault ||
    ((isDefaultVenue || isLegacyVenueDefault) &&
      normalizeGoogleMapsPlaceId(normalizedEventConfig.google_maps_place_url) !==
        normalizedEventConfig.google_maps_place_id)
  ) {
    normalizedEventConfig.google_maps_place_url =
      buildPlaceUrlFromEmbedUrl(
        normalizedEventConfig.google_maps_embed_url,
        normalizedEventConfig.venue_address,
        eventVenueQuery,
        normalizedEventConfig.google_maps_place_id
      ) || DEFAULT_EVENT_CONFIG.google_maps_place_url;
  }

  if (
    normalizedEventConfig.google_maps_directions_url === LEGACY_DEFAULT_DIRECTIONS_URL ||
    !normalizedEventConfig.google_maps_directions_url.trim() ||
    isLegacyVenueDefault ||
    ((isDefaultVenue || isLegacyVenueDefault) &&
      !directionsUrlHasPlaceId(normalizedEventConfig.google_maps_directions_url))
  ) {
    normalizedEventConfig.google_maps_directions_url =
      buildGoogleMapsDirectionsUrl(eventVenueQuery, normalizedEventConfig.google_maps_place_id) ||
      buildDirectionsUrlFromEmbedUrl(
        normalizedEventConfig.google_maps_embed_url,
        normalizedEventConfig.venue_address,
        eventVenueQuery,
        normalizedEventConfig.google_maps_place_id
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
    sponsorsSection: {
      ...DEFAULT_SPONSORS_SECTION_CONFIG,
      ...asObject(source.sponsorsSection),
      eyebrow: (() => {
        const normalized = String(
          source.sponsorsSection?.eyebrow ?? DEFAULT_SPONSORS_SECTION_CONFIG.eyebrow
        ).trim();
        if (!normalized || normalized.toLowerCase() === 'featured partners') {
          return DEFAULT_SPONSORS_SECTION_CONFIG.eyebrow;
        }
        return normalized;
      })(),
      heading: String(source.sponsorsSection?.heading ?? DEFAULT_SPONSORS_SECTION_CONFIG.heading),
      description: String(
        source.sponsorsSection?.description ?? DEFAULT_SPONSORS_SECTION_CONFIG.description
      ),
      cta_label: String(source.sponsorsSection?.cta_label ?? ''),
      cta_url: String(source.sponsorsSection?.cta_url ?? ''),
      sponsor_link_label: String(
        source.sponsorsSection?.sponsor_link_label ??
          source.sponsorsSection?.visit_website_label ??
          DEFAULT_SPONSORS_SECTION_CONFIG.sponsor_link_label
      ),
      sponsor_profile_label: String(
        source.sponsorsSection?.sponsor_profile_label ??
          source.sponsorsSection?.profile_label ??
          DEFAULT_SPONSORS_SECTION_CONFIG.sponsor_profile_label
      ),
      vip_group_label: (() => {
        const normalized = String(
          source.sponsorsSection?.vip_group_label ??
            source.sponsorsSection?.vip_label ??
            DEFAULT_SPONSORS_SECTION_CONFIG.vip_group_label
        ).trim();
        if (!normalized || normalized.toLowerCase() === 'vip sponsors') {
          return DEFAULT_SPONSORS_SECTION_CONFIG.vip_group_label;
        }
        return normalized;
      })(),
      vip_group_subtitle: String(
        source.sponsorsSection?.vip_group_subtitle ??
          source.sponsorsSection?.vip_subtitle ??
          DEFAULT_SPONSORS_SECTION_CONFIG.vip_group_subtitle
      ),
      hide_vip_group_subtitle: normalizeBooleanField(
        source.sponsorsSection?.hide_vip_group_subtitle ??
          source.sponsorsSection?.hideVipGroupSubtitle,
        DEFAULT_SPONSORS_SECTION_CONFIG.hide_vip_group_subtitle
      ),
    },
    sponsors: normalizeSponsors(source.sponsors),
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
    operations: normalizeOperationsConfig(source.operations),
  };
};
