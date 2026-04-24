// @ts-nocheck
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
  presentation_marquee_duration_seconds: 85,
};

export const DEFAULT_EVENT_CONFIG = {
  id: 'event-config-1',
  created_date: '2026-02-20T09:00:00.000Z',
  event_date: '2026-04-15',
  event_time: '05:00 PM - 08:00 PM PST',
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
  hide_organizations_section: false,
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
    title: 'Registration and Networking',
    description:
      'Attendees arrive, complete check-in, and engage in informal networking with panelists, sponsors, and fellow participants.',
    speaker: '',
    company: '',
    session_label: 'NETWORKING',
    start_time: '05:00 PM',
    end_time: '05:20 PM',
    session_type: 'networking',
    active: true,
  },
  {
    id: 'agenda-2',
    order: 2,
    title: 'Opening Remarks',
    description:
      'Introduction to the scope and intent of the event, including the structure of cybersecurity as a multi-disciplinary field across organizations and technical domains.',
    speaker: 'José Escoto, Zahra Aivazpour, Juan Campos, Kevin Bali',
    company: 'CyberSwarm Organizers',
    session_label: 'OPENING',
    start_time: '05:20 PM',
    end_time: '05:30 PM',
    session_type: 'keynote',
    active: true,
  },
  {
    id: 'agenda-3',
    order: 3,
    title: 'Panel 1: The Structure and Operation of the Cybersecurity Industry',
    description:
      'Examination of how cybersecurity functions across vendors, consultants, government agencies, and enterprise teams, including infrastructure and operational responsibilities.',
    speaker: 'Panelists',
    company: 'Industry Representatives',
    session_label: 'PANEL 1',
    start_time: '05:30 PM',
    end_time: '06:15 PM',
    session_type: 'panel',
    panelists: [
      {
        id: 'panel-1-mock-1',
        name: 'Maya Chen',
        role: 'Director of Security Operations',
        company: 'Northbridge Health',
        bio: 'Leads enterprise detection and response strategy across cloud platforms, endpoint telemetry, and incident escalation workflows.',
        active: true,
      },
      {
        id: 'panel-1-mock-2',
        name: 'Daniel Ortiz',
        role: 'Principal Cybersecurity Consultant',
        company: 'Sentinel Ridge Advisory',
        bio: 'Advises public and private sector teams on security architecture, maturity roadmaps, and operational readiness.',
        active: true,
      },
      {
        id: 'panel-1-mock-3',
        name: 'Avery Brooks',
        role: 'Senior Information Security Analyst',
        company: 'California Digital Services',
        bio: 'Supports cross-agency risk management and helps translate policy, governance, and technical controls into day-to-day practice.',
        active: true,
      },
    ],
    active: true,
  },
  {
    id: 'agenda-4',
    order: 4,
    title: 'Interactive Session 1',
    description:
      'Interactive session reinforcing key concepts from Panel 1, focusing on organizational roles, responsibilities, and security implementation.',
    speaker: '',
    company: '',
    session_label: 'INTERACTIVE',
    start_time: '06:15 PM',
    end_time: '06:25 PM',
    session_type: 'workshop',
    active: true,
  },
  {
    id: 'agenda-5',
    order: 5,
    title: 'Panel 2: Entry into the Cybersecurity Field',
    description:
      'Discussion of real-world career experiences, emphasizing networking, industry expectations, and the absence of a single defined path into cybersecurity.',
    speaker: 'Panelists',
    company: 'Industry Representatives',
    session_label: 'PANEL 2',
    start_time: '06:25 PM',
    end_time: '07:05 PM',
    session_type: 'panel',
    panelists: [
      {
        id: 'panel-2-mock-1',
        name: 'Jordan Lee',
        role: 'Security Engineer',
        company: 'Cloud Harbor',
        bio: 'Started in IT support before moving into cloud security engineering and now mentors students breaking into technical security roles.',
        active: true,
      },
      {
        id: 'panel-2-mock-2',
        name: 'Priya Shah',
        role: 'GRC Analyst',
        company: 'Vertex Financial',
        bio: 'Built a cybersecurity career through internships, compliance work, and cross-functional projects focused on governance and audit readiness.',
        active: true,
      },
      {
        id: 'panel-2-mock-3',
        name: 'Marcus Rivera',
        role: 'SOC Team Lead',
        company: 'Redwood Managed Defense',
        bio: 'Moved from help desk into a SOC role and now leads analysts while coaching early-career professionals on networking and growth.',
        active: true,
      },
    ],
    active: true,
  },
  {
    id: 'agenda-6',
    order: 6,
    title: 'Interactive Session 2',
    description:
      'Interactive session exploring career realities, common misconceptions, and the role of networking and opportunity in cybersecurity.',
    speaker: '',
    company: '',
    session_label: 'INTERACTIVE',
    start_time: '07:05 PM',
    end_time: '07:15 PM',
    session_type: 'workshop',
    active: true,
  },
  {
    id: 'agenda-7',
    order: 7,
    title: 'Networking and Open Discussion',
    description:
      'Attendees engage directly with panelists and sponsors to build professional connections and continue discussions.',
    speaker: '',
    company: '',
    session_label: 'NETWORKING',
    start_time: '07:15 PM',
    end_time: '08:00 PM',
    session_type: 'networking',
    active: true,
  },
];

export const PRESENTATION_DECK_SLOTS = [
  {
    slot_id: 'panel-1',
    short_label: 'Panel 1',
    session_type: 'panel',
    session_label: 'PANEL',
    title: 'Panel Discussion 1',
    description: 'Add panel details for the first presentation panel slide.',
  },
  {
    slot_id: 'kahoot-1',
    short_label: 'Kahoot 1',
    session_type: 'kahoot',
    session_label: 'KAHOOT',
    title: 'Kahoot Session 1',
    description: 'Add details for the first interactive kahoot slide.',
  },
  {
    slot_id: 'panel-2',
    short_label: 'Panel 2',
    session_type: 'panel',
    session_label: 'PANEL',
    title: 'Panel Discussion 2',
    description: 'Add panel details for the second presentation panel slide.',
  },
  {
    slot_id: 'kahoot-2',
    short_label: 'Kahoot 2',
    session_type: 'kahoot',
    session_label: 'KAHOOT',
    title: 'Kahoot Session 2',
    description: 'Add details for the second interactive kahoot slide.',
  },
  {
    slot_id: 'networking',
    short_label: 'Networking',
    session_type: 'networking',
    session_label: 'NETWORKING',
    title: 'Networking Session',
    description: 'Add details for the final networking slide.',
  },
];

const createDefaultPresentationPanelists = (slotId) =>
  Array.from({ length: 3 }, (_unused, index) => ({
    id: `${slotId}-panelist-${index + 1}`,
    name: `Panelist ${index + 1}`,
    role: '',
    company: '',
    bio: '',
    active: true,
  }));

const createDefaultPresentationSteps = (slotId) =>
  Array.from({ length: 3 }, (_unused, index) => ({
    id: `${slotId}-step-${index + 1}`,
    title: `Step ${index + 1}`,
    description: '',
    image_url: '',
    active: true,
  }));

const createDefaultPresentationSlide = (slot, index) => ({
  id: `presentation-slide-${slot.slot_id}`,
  slot_id: slot.slot_id,
  order: index + 1,
  title: slot.title,
  description: slot.description,
  speaker: '',
  company: '',
  session_label: slot.session_label,
  start_time: '',
  end_time: '',
  session_type: slot.session_type,
  presentation_hide_description: false,
  presentation_panelist_font_scale: 120,
  panelists: slot.session_type === 'panel' ? createDefaultPresentationPanelists(slot.slot_id) : [],
  presentation_steps:
    slot.session_type === 'kahoot' || slot.session_type === 'interactive'
      ? createDefaultPresentationSteps(slot.slot_id)
      : [],
  active: true,
});

export const DEFAULT_PRESENTATION_SLIDES = PRESENTATION_DECK_SLOTS.map((slot, index) =>
  createDefaultPresentationSlide(slot, index)
);

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
  presentationSlides: DEFAULT_PRESENTATION_SLIDES,
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

const normalizePresentationLogoScale = (value) => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return 100;
  return Math.min(240, Math.max(50, Math.round(scale)));
};

const normalizePresentationLogoSpacingPx = (value) => {
  const spacing = Number(value);
  if (!Number.isFinite(spacing)) return 28;
  return Math.min(240, Math.max(0, Math.round(spacing)));
};

const normalizePresentationPanelistFontScale = (value) => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return 120;
  return Math.min(220, Math.max(80, Math.round(scale)));
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
        presentation_logo_scale: 100,
        presentation_logo_spacing_left_px: 28,
        presentation_logo_spacing_right_px: 28,
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
      presentation_logo_scale: normalizePresentationLogoScale(
        row.presentation_logo_scale ?? row.presentationLogoScale
      ),
      presentation_logo_spacing_left_px: normalizePresentationLogoSpacingPx(
        row.presentation_logo_spacing_left_px ?? row.presentationLogoSpacingLeftPx
      ),
      presentation_logo_spacing_right_px: normalizePresentationLogoSpacingPx(
        row.presentation_logo_spacing_right_px ?? row.presentationLogoSpacingRightPx
      ),
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

const normalizeAgendaPanelists = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((row) => {
      const source = row && typeof row === 'object' ? row : {};

      return {
        id: source.id || createId('panelist'),
        name: String(source.name || source.speaker || '').trim(),
        role: String(source.role || source.title || '').trim(),
        company: String(source.company || source.organization || '').trim(),
        bio: String(source.bio || source.description || '').trim(),
        active: source.active ?? true,
      };
    })
    .filter((row) => row.active !== false && (row.name || row.role || row.company || row.bio));
};

const normalizePresentationSteps = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((row) => {
      const source = row && typeof row === 'object' ? row : {};

      return {
        id: source.id || createId('presentation-step'),
        title: String(source.title || source.label || ''),
        description: String(source.description || source.text || ''),
        image_url: String(source.image_url ?? source.imageUrl ?? ''),
        active: source.active ?? true,
      };
    })
    .filter(
      (row) =>
        row.active !== false &&
        (row.title.trim() || row.description.trim() || row.image_url.trim())
    );
};

const normalizeAgendaItem = (row, index) => ({
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
  panelists: normalizeAgendaPanelists(row.panelists),
  active: row.active ?? true,
});

const normalizeAgendaItems = (value) => {
  if (!Array.isArray(value)) {
    return DEFAULT_AGENDA_ITEMS.map((row, index) => normalizeAgendaItem(row, index));
  }

  return value.map((row, index) => normalizeAgendaItem(row, index));
};

const normalizePresentationSlideSlotId = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (['panel-1', 'panel1', 'panel_1', 'slide-panel-1'].includes(normalized)) return 'panel-1';
  if (['kahoot-1', 'kahoot1', 'kahoot_1', 'interactive-1', 'interactive1'].includes(normalized)) {
    return 'kahoot-1';
  }
  if (['panel-2', 'panel2', 'panel_2', 'slide-panel-2'].includes(normalized)) return 'panel-2';
  if (['kahoot-2', 'kahoot2', 'kahoot_2', 'interactive-2', 'interactive2'].includes(normalized)) {
    return 'kahoot-2';
  }
  if (['networking', 'network', 'mixer', 'slide-networking'].includes(normalized)) return 'networking';
  return null;
};

const buildPresentationLegacySearchText = (item) =>
  [
    item?.session_label,
    item?.title,
    item?.description,
    item?.speaker,
    item?.company,
    item?.session_type,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .join(' ');

const hasPresentationLegacyKeyword = (item, keywords) =>
  keywords.some((keyword) =>
    buildPresentationLegacySearchText(item).includes(String(keyword).toLowerCase())
  );

const getLegacyPresentationSessionType = (item) =>
  String(item?.session_type || '').trim().toLowerCase();

const isLegacyPanelPresentationAgendaItem = (item) => {
  const sessionType = getLegacyPresentationSessionType(item);
  if (sessionType) return sessionType === 'panel';
  return hasPresentationLegacyKeyword(item, ['panel']);
};

const isLegacyInteractivePresentationAgendaItem = (item) => {
  const sessionType = getLegacyPresentationSessionType(item);
  if (sessionType) return ['interactive', 'kahoot', 'workshop'].includes(sessionType);
  return hasPresentationLegacyKeyword(item, ['interactive', 'kahoot', 'quiz', 'game']);
};

const isLegacyNetworkingPresentationAgendaItem = (item) => {
  const sessionType = getLegacyPresentationSessionType(item);
  if (sessionType) return sessionType === 'networking';
  return hasPresentationLegacyKeyword(item, ['network', 'networking', 'mixer']);
};

const normalizePresentationSlideItem = (row, index, slot) => ({
  id: row.id || createId('presentation-slide'),
  slot_id: slot.slot_id,
  order: Number.isFinite(row.order) ? row.order : index + 1,
  title: String(row.title || slot.title || ''),
  description: String(row.description || slot.description || ''),
  speaker: String(row.speaker || ''),
  company: String(row.company || ''),
  session_label: String(row.session_label || slot.session_label || ''),
  start_time: String(row.start_time || ''),
  end_time: String(row.end_time || ''),
  session_type: String(row.session_type || slot.session_type || 'panel'),
  presentation_hide_description: Boolean(
    row.presentation_hide_description ?? row.presentationHideDescription ?? false
  ),
  presentation_panelist_font_scale: normalizePresentationPanelistFontScale(
    row.presentation_panelist_font_scale ?? row.presentationPanelistFontScale
  ),
  panelists: normalizeAgendaPanelists(row.panelists),
  presentation_steps: (() => {
    const normalizedSteps = normalizePresentationSteps(
      row.presentation_steps ?? row.presentationSteps
    );
    if (normalizedSteps.length) return normalizedSteps;
    if (slot.session_type === 'kahoot' || slot.session_type === 'interactive') {
      return createDefaultPresentationSteps(slot.slot_id);
    }
    return [];
  })(),
  active: row.active ?? true,
});

const buildLegacyPresentationSlidesFromAgenda = (agendaItems) => {
  const orderedAgendaItems = (Array.isArray(agendaItems) ? agendaItems : [])
    .filter((item) => item?.active !== false)
    .sort((a, b) => (a?.order || 0) - (b?.order || 0));
  const panelItems = orderedAgendaItems.filter((item) => isLegacyPanelPresentationAgendaItem(item));
  const interactiveItems = orderedAgendaItems.filter((item) =>
    isLegacyInteractivePresentationAgendaItem(item)
  );
  const networkingItem =
    orderedAgendaItems.find((item) => isLegacyNetworkingPresentationAgendaItem(item)) || null;
  const legacyBySlot = new Map([
    ['panel-1', panelItems[0] || null],
    ['kahoot-1', interactiveItems[0] || null],
    ['panel-2', panelItems[1] || null],
    ['kahoot-2', interactiveItems[1] || null],
    ['networking', networkingItem],
  ]);

  return PRESENTATION_DECK_SLOTS.map((slot, index) =>
    normalizePresentationSlideItem(
      legacyBySlot.get(slot.slot_id) || createDefaultPresentationSlide(slot, index),
      index,
      slot
    )
  );
};

const normalizePresentationSlides = (value, legacyAgendaItems = []) => {
  if (!Array.isArray(value) || !value.length) {
    return buildLegacyPresentationSlidesFromAgenda(legacyAgendaItems);
  }

  const rowBySlot = new Map();
  value.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;
    const sourceSlotId =
      normalizePresentationSlideSlotId(
        row.slot_id ?? row.slotId ?? row.slide_key ?? row.slideKey ?? row.id
      ) || PRESENTATION_DECK_SLOTS[index]?.slot_id;
    if (!sourceSlotId || rowBySlot.has(sourceSlotId)) return;
    rowBySlot.set(sourceSlotId, row);
  });

  if (!rowBySlot.size) {
    return buildLegacyPresentationSlidesFromAgenda(legacyAgendaItems);
  }

  return PRESENTATION_DECK_SLOTS.map((slot, index) =>
    normalizePresentationSlideItem(
      rowBySlot.get(slot.slot_id) || createDefaultPresentationSlide(slot, index),
      index,
      slot
    )
  );
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

  const rawAgendaItems = source.agendaItems ?? source.AgendaItem;
  const normalizedAgendaItems = normalizeAgendaItems(rawAgendaItems);
  const normalizedPresentationSlides = normalizePresentationSlides(
    source.presentationSlides ??
      source.presentation_slides ??
      source.PresentationSlides ??
      source.PresentationSlide,
    Array.isArray(rawAgendaItems) ? rawAgendaItems : normalizedAgendaItems
  );

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
      hide_organizations_section: normalizeBooleanField(
        source.organizationsSection?.hide_organizations_section ??
          source.organizationsSection?.hideOrganizationsSection,
        DEFAULT_ORGANIZATIONS_SECTION_CONFIG.hide_organizations_section
      ),
    },
    organizations: normalizeOrganizations(source.organizations ?? source.companies),
    agendaItems: normalizedAgendaItems,
    presentationSlides: normalizedPresentationSlides,
    adminUpdates: normalizeAdminUpdates(source.adminUpdates ?? source.AdminUpdate),
    operations: normalizeOperationsConfig(source.operations),
  };
};
