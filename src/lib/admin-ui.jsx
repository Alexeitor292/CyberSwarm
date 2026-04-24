// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Globe2,
  Handshake,
  Inbox,
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Upload,
  X,
  Sparkles,
  Users,
} from 'lucide-react';
import { appClient } from '@/api/client';
import Hero from '@/components/cyberswarm/Hero';
import ParticleField from '@/components/cyberswarm/ParticleField';
import HUDOverlay from '@/components/cyberswarm/HUDOverlay';
import SponsorsShowcase from '@/components/cyberswarm/SponsorsShowcase';
import CompanyLogos from '@/components/cyberswarm/CompanyLogo';
import AgendaTimeline from '@/components/cyberswarm/AgendaTimeline';
import AdminUpdatesSection from '@/components/cyberswarm/AdminUpdatesSection';
import EventInfo from '@/components/cyberswarm/EventInfo';
import RegistrationForm from '@/components/cyberswarm/RegistrationForm';
import Footer from '@/components/cyberswarm/Footer';
import Presentation from '@/pages/Presentation';
import SponsorLogoViewport, {
  clampSponsorLogoOffset,
  clampSponsorLogoScale,
  getSponsorLogoBackgroundMode,
} from '@/components/cyberswarm/SponsorLogoViewport';
import { useSiteContent } from '@/hooks/use-site-content';
import {
  buildGoogleMapsDirectionsUrl,
  normalizeGoogleMapsDirectionsUrl,
  normalizeGoogleMapsEmbedUrl,
  normalizeGoogleMapsPlaceId,
  normalizeGoogleMapsPlaceUrl,
} from '@/lib/google-maps';
import {
  buildAttendeeRecords,
  buildRecipientList,
  exportRowsToCsv,
  filterRecords,
  formatFeedDate,
  getUniqueStatuses,
  normalizeExternalUrl,
} from '@/lib/form-operations';

const ADMIN_USER_KEY = 'cyberswarm_admin_user';
const APP_USER_KEY = 'cyberswarm_user';
const SPONSOR_LEADS_REVIEWED_KEY = 'cyberswarm_sponsor_leads_reviewed_keys';

const fieldClasses =
  'w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80';
const outlineButtonClasses =
  'inline-flex items-center justify-center rounded-xl border border-primary/25 bg-background/30 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/45 hover:bg-primary/10 hover:text-foreground disabled:opacity-50';
const primaryButtonClasses =
  'inline-flex items-center justify-center rounded-xl border border-primary/45 bg-primary/12 px-3 py-2 text-sm text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50';
const dangerButtonClasses =
  'inline-flex items-center justify-center rounded-xl border border-accent/45 bg-accent/10 px-3 py-2 text-sm text-accent transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50';
const panelShellClasses = 'glass rounded-[1.75rem] p-5 sm:p-6 xl:p-7';
const compactPanelShellClasses = 'glass rounded-[1.75rem] px-6 py-5 sm:px-7 sm:py-6';
const panelSurfaceClasses = 'rounded-[1.35rem] border border-primary/15 bg-background/35 p-4';
const itemCardClasses = `${panelSurfaceClasses} space-y-3`;
const sponsorLogoUploadAccept = '.png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
const sponsorLogoUploadMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);
const sponsorLogoUploadMimeByExtension = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};
const sponsorLogoUploadMaxBytes = 5 * 1024 * 1024;
const sponsorLogoBackgroundDefaultColor = '#ffffff';

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const parseAdminEmails = (raw) =>
  String(raw || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const normalizeEmailAddress = (value) => String(value || '').trim().toLowerCase();

const isLikelyEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailAddress(value));

const dedupeEmailList = (values) => [...new Set((Array.isArray(values) ? values : []).map(normalizeEmailAddress).filter(isLikelyEmail))];

const loadStoredAdminUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

const loadSponsorLeadReviewedKeys = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SPONSOR_LEADS_REVIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item || '')).filter(Boolean);
  } catch (_error) {
    return [];
  }
};

const getSponsorLeadReviewKey = (lead) => {
  if (!lead || typeof lead !== 'object') return '';
  return String(
    lead.id ||
      lead.sortTimestamp ||
      [lead.email || '', lead.company || '', lead.name || '', lead.submittedAt || ''].join('|')
  );
};

const formatEventDateLabel = (value) => {
  if (!value) return 'Date not set';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCalendarRange = (event) => {
  const start = event?.startAt ? new Date(event.startAt) : null;
  const end = event?.endAt ? new Date(event.endAt) : null;
  if (!start || Number.isNaN(start.getTime())) return 'Time not set';

  const dateLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!end || Number.isNaN(end.getTime())) return `${dateLabel} at ${startTime}`;

  const endTime = end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateLabel}, ${startTime} - ${endTime}`;
};

const buildGoogleCalendarEmbedUrlFromId = (calendarId, timezone) => {
  const id = String(calendarId || '').trim().toLowerCase();
  if (!id || !id.includes('@')) return '';
  const tz = String(timezone || '').trim() || 'America/Los_Angeles';
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(id)}&ctz=${encodeURIComponent(tz)}&showTitle=0&showPrint=0&showTz=0&showTabs=0&showCalendars=0`;
};

const buildGoogleCalendarOverlayEmbedUrl = (calendarIds, timezone) => {
  const ids = (Array.isArray(calendarIds) ? calendarIds : [])
    .map((item) => String(item || '').trim().toLowerCase())
    .filter((item) => item.includes('@'));
  if (!ids.length) return '';
  const uniqueIds = [...new Set(ids)];
  const tz = String(timezone || '').trim() || 'America/Los_Angeles';
  const srcParams = uniqueIds.map((id) => `src=${encodeURIComponent(id)}`).join('&');
  return `https://calendar.google.com/calendar/embed?${srcParams}&ctz=${encodeURIComponent(tz)}&showTitle=0&showPrint=0&showTz=0&showTabs=0&showCalendars=0`;
};

const getPageIdFromPath = (pathname) => {
  const value = String(pathname || '')
    .replace(/^\/admin\/?/i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
  return value || 'overview';
};

const downloadTextFile = (filename, content, type = 'text/plain;charset=utf-8') => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const copyText = async (value) => {
  if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (_error) {
    return false;
  }
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result;
      if (!base64) {
        reject(new Error('Could not read the selected file.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });

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

  return sponsorLogoBackgroundDefaultColor;
};

const clampPresentationLogoScale = (value) => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return 100;
  return Math.min(240, Math.max(50, Math.round(scale)));
};

const clampPresentationMarqueeDuration = (value) => {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return 85;
  return Math.min(240, Math.max(20, Math.round(seconds)));
};

const clampPresentationLogoSpacingPx = (value) => {
  const spacing = Number(value);
  if (!Number.isFinite(spacing)) return 28;
  return Math.min(240, Math.max(0, Math.round(spacing)));
};

const clampPresentationPanelistFontScale = (value) => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return 120;
  return Math.min(220, Math.max(80, Math.round(scale)));
};

const buildPresentationAgendaSearchText = (item) =>
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

const hasPresentationAgendaKeyword = (item, keywords) =>
  keywords.some((keyword) =>
    buildPresentationAgendaSearchText(item).includes(String(keyword).toLowerCase())
  );

const isPresentationPanelAgendaItem = (item) =>
  hasPresentationAgendaKeyword(item, ['panel']) || item?.session_type === 'panel';

const isPresentationInteractiveAgendaItem = (item) =>
  hasPresentationAgendaKeyword(item, ['interactive', 'kahoot', 'quiz', 'game']) ||
  item?.session_type === 'interactive' ||
  item?.session_type === 'kahoot';

const isPresentationNetworkingAgendaItem = (item) =>
  hasPresentationAgendaKeyword(item, ['network', 'networking', 'mixer']) ||
  item?.session_type === 'networking';

const collectCustomColorFrameDowngrades = (beforeContent, afterContent) => {
  const beforeSponsors = Array.isArray(beforeContent?.sponsors) ? beforeContent.sponsors : [];
  const afterSponsors = Array.isArray(afterContent?.sponsors) ? afterContent.sponsors : [];
  if (!beforeSponsors.length || !afterSponsors.length) return [];

  const afterById = new Map(
    afterSponsors
      .map((sponsor, index) => [String(sponsor?.id || '').trim() || `index:${index}`, sponsor])
      .filter(([key]) => Boolean(key))
  );

  return beforeSponsors
    .map((beforeSponsor, index) => {
      const beforeMode = String(beforeSponsor?.logo_background || '')
        .trim()
        .toLowerCase();
      if (beforeMode !== 'color') return null;

      const beforeKey = String(beforeSponsor?.id || '').trim() || `index:${index}`;
      const afterSponsor = afterById.get(beforeKey) || afterSponsors[index];
      if (!afterSponsor) return null;

      const afterMode = String(afterSponsor?.logo_background || '')
        .trim()
        .toLowerCase();
      if (afterMode === 'color') return null;

      return String(beforeSponsor?.name || `Sponsor #${index + 1}`);
    })
    .filter(Boolean);
};

function Section({ id = undefined, eyebrow, title, description = '', action = null, children, className = '' }) {
  return (
    <section id={id} className={`${panelShellClasses} scroll-mt-24 space-y-5 ${className}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-primary/70">
              {eyebrow}
            </p>
          ) : null}
          <div>
            <h2 className="font-heading text-2xl text-foreground sm:text-[2rem]">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-3xl font-mono text-xs leading-6 text-muted-foreground/80 sm:text-sm">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({ icon, label, value, hint }) {
  const Icon = icon;

  return (
    <div className={`${panelSurfaceClasses} min-w-0 overflow-hidden`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
            {label}
          </p>
          <p className="mt-3 break-words font-heading text-2xl leading-tight text-foreground sm:text-3xl">
            {value}
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint ? (
        <p className="mt-3 break-words font-mono text-xs leading-5 text-muted-foreground/70">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SidebarItem({ to, icon, title, description, badge, active }) {
  const Icon = icon;

  return (
    <NavLink
      to={to}
      className={`block w-full min-w-0 overflow-hidden rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? 'border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_rgba(0,240,255,0.08)]'
          : 'border-transparent bg-background/25 text-muted-foreground hover:border-primary/20 hover:bg-background/40 hover:text-foreground'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`mt-0.5 rounded-xl border p-2 ${
            active
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-primary/10 bg-background/40 text-muted-foreground'
          } shrink-0`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <p className="min-w-0 break-words font-heading text-base leading-tight">{title}</p>
            {badge ? (
              <span className="shrink-0 rounded-full border border-primary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 break-words font-mono text-[11px] leading-5 text-muted-foreground/70">
            {description}
          </p>
        </div>
      </div>
    </NavLink>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-primary/20 bg-background/25 px-6 py-10 text-center">
      <p className="font-heading text-2xl text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-3 max-w-2xl font-mono text-sm leading-6 text-muted-foreground/75">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FeedConnectionCard({ title, url, rowCount, format, fetchedAt, error }) {
  const connected = Boolean(url || fetchedAt || rowCount > 0);
  const host = useMemo(() => {
    const normalized = normalizeExternalUrl(url);
    if (!normalized) return '';
    try {
      return new URL(normalized).hostname.replace(/^www\./i, '');
    } catch (_error) {
      return '';
    }
  }, [url]);

  return (
    <div className={panelSurfaceClasses}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
            {title}
          </p>
          <p className="mt-3 font-heading text-2xl text-foreground">
            {connected ? `${rowCount} rows` : 'Not connected'}
          </p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
          <Inbox className="h-5 w-5" />
        </div>
      </div>
      {error ? (
        <p className="mt-3 font-mono text-xs leading-6 text-accent">{error}</p>
      ) : (
        <p className="mt-3 font-mono text-xs leading-6 text-muted-foreground/70">
          {connected
            ? `${host || 'Connected source'}${format ? ` • ${format.toUpperCase()}` : ''}${
                fetchedAt ? ` • ${formatFeedDate(fetchedAt)}` : ''
              }`
            : 'Paste a published Google Sheets URL or configure dynamic shared-drive sync to connect this feed.'}
        </p>
      )}
    </div>
  );
}

function DataTable({ columns, rows, emptyTitle, emptyDescription }) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-primary/15 bg-background/35">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-primary/10">
          <thead className="bg-background/45">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {rows.map((row, rowIndex) => (
              <tr key={row.id || row.email || row.name || row.__row || rowIndex} className="group/row align-top">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 text-sm text-foreground">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminUI() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading } = useSiteContent();

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [navSearch, setNavSearch] = useState('');
  const [siteBuilderBlock, setSiteBuilderBlock] = useState('hero');
  const [eventBuilderBlock, setEventBuilderBlock] = useState('details');

  const [authUser, setAuthUser] = useState(loadStoredAdminUser());
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const tokenClientRef = useRef(null);

  const [sponsorLeadSearch, setSponsorLeadSearch] = useState('');
  const [sponsorCardSearch, setSponsorCardSearch] = useState('');
  const [sponsorMailboxView, setSponsorMailboxView] = useState('cards');
  const [calendarEventScope, setCalendarEventScope] = useState('mine');
  const [selectedSponsorIndex, setSelectedSponsorIndex] = useState(0);
  const [selectedPresentationSponsorIndex, setSelectedPresentationSponsorIndex] = useState(0);
  const [presentationPreviewSlideIndex, setPresentationPreviewSlideIndex] = useState(0);
  const [selectedSponsorLeadIndex, setSelectedSponsorLeadIndex] = useState(0);
  const [sponsorLogoUploading, setSponsorLogoUploading] = useState(false);
  const [pendingSponsorLeadDeleteId, setPendingSponsorLeadDeleteId] = useState('');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState('all');
  const [selectedAttendeeEmails, setSelectedAttendeeEmails] = useState([]);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageStatusFilter, setMessageStatusFilter] = useState('all');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [mailingRecipientType, setMailingRecipientType] = useState('attendees'); // 'attendees', 'sponsors', 'sponsor-interest', 'custom'
  const [mailingTo, setMailingTo] = useState([]);
  const [mailingCc, setMailingCc] = useState([]);
  const [mailingBcc, setMailingBcc] = useState([]);
  const [mailingToInput, setMailingToInput] = useState('');
  const [mailingCcInput, setMailingCcInput] = useState('');
  const [mailingBccInput, setMailingBccInput] = useState('');
  const [mailingSubject, setMailingSubject] = useState('');
  const [mailingHtml, setMailingHtml] = useState('');
  const [mailingText, setMailingText] = useState('');
  const [mailingDeliveryMode, setMailingDeliveryMode] = useState('shared');
  const [mailingSending, setMailingSending] = useState(false);
  const [mailingStatus, setMailingStatus] = useState('');
  const [reviewedSponsorLeadKeys, setReviewedSponsorLeadKeys] = useState(loadSponsorLeadReviewedKeys());
  const [browserAlertPermission, setBrowserAlertPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default'
  );
  const alertBootstrappedRef = useRef(false);
  const sponsorLogoFileInputRef = useRef(null);
  const sponsorLogoDragRef = useRef({
    active: false,
    pointerId: -1,
    sponsorIndex: -1,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const adminEmails = useMemo(() => parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS), []);
  const routePageId = getPageIdFromPath(location.pathname);
  const currentPageId =
    routePageId === 'event' || routePageId === 'updates'
        ? 'site'
        : routePageId;

  const normalizedMapEmbedUrl = normalizeGoogleMapsEmbedUrl(draft?.eventConfig?.google_maps_embed_url);
  const normalizedPlaceUrl = normalizeGoogleMapsPlaceUrl(draft?.eventConfig?.google_maps_place_url);
  const normalizedPlaceId = normalizeGoogleMapsPlaceId(draft?.eventConfig?.google_maps_place_id);
  const normalizedDirectionsUrl = normalizeGoogleMapsDirectionsUrl(draft?.eventConfig?.google_maps_directions_url);
  const placeIdDirectionsPreview = normalizedPlaceId
    ? buildGoogleMapsDirectionsUrl(
        [
          draft?.eventConfig?.venue_name_line_1 || draft?.eventConfig?.venue_name || '',
          draft?.eventConfig?.venue_name_line_2 || '',
          draft?.eventConfig?.venue_address || '',
        ]
          .filter(Boolean)
          .join(', '),
        normalizedPlaceId
      )
    : '';

  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (routePageId === 'updates') {
      setSiteBuilderBlock('updates');
    }
  }, [routePageId]);

  useEffect(() => {
    if (!data) return;
    if (!draft || !isDirty) {
      setDraft(data);
      setJsonText(JSON.stringify(data, null, 2));
      setJsonError('');
    }
  }, [data, draft, isDirty]);

  useEffect(() => {
    if (!draft) return;
    setComposeSubject((current) =>
      current || `${draft.operations?.messaging_subject_prefix || 'CyberSwarm'} Update`
    );
    setComposeBody((current) =>
      current ||
      ['Hello,', '', 'We are reaching out with an update about CyberSwarm.', '', 'Best,', 'CyberSwarm Team'].join(
        '\n'
      )
    );
  }, [draft]);

  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined') return;

    const setupGoogle = () => {
      const google = window['google'];
      if (!google?.accounts?.oauth2) return;

      tokenClientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope:
          'openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setAuthError(tokenResponse.error);
            setAuthBusy(false);
            return;
          }

          try {
            const accessToken = tokenResponse.access_token || '';
            if (!accessToken) {
              throw new Error('No Google access token was returned.');
            }

            appClient.auth.setAccessToken(accessToken);
            const session = await appClient.admin.getSession();
            const profile = session?.user || {};
            const email = String(profile.email || '').toLowerCase();

            if (!email) {
              throw new Error('Google login succeeded, but no email was returned.');
            }

            const user = {
              name: profile.name || email,
              email,
              picture: profile.picture || '',
              authSource: profile.authSource || 'server',
              organizerGroupEmail: profile.organizerGroupEmail || '',
              lastLoginAt: new Date().toISOString(),
            };

            window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
            window.localStorage.setItem(APP_USER_KEY, JSON.stringify({ ...user, role: 'admin' }));
            setAuthUser(user);
            setAuthError('');
          } catch (error) {
            appClient.auth.clearAccessToken();
            setAuthError(
              error instanceof Error && error.message
                ? error.message
                : 'Could not validate Google admin access.'
            );
          } finally {
            setAuthBusy(false);
          }
        },
      });

      setGoogleReady(true);
    };

    if (window['google']?.accounts?.oauth2) {
      setupGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = setupGoogle;
    script.onerror = () => setAuthError('Failed to load Google Sign-In script.');
    document.head.appendChild(script);
  }, [googleClientId]);

  const updateDraft = (updater) => {
    setDraft((prev) => {
      const current = prev || data;
      if (!current) return prev;
      const next = typeof updater === 'function' ? updater(current) : updater;
      setJsonText(JSON.stringify(next, null, 2));
      return next;
    });
    setIsDirty(true);
    setSaveMessage('');
    setJsonError('');
  };

  const setField = (section, key, value) => {
    updateDraft((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const setListItemField = (listKey, index, key, value) => {
    updateDraft((prev) => {
      const list = Array.isArray(prev[listKey]) ? [...prev[listKey]] : [];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, [listKey]: list };
    });
  };

  const setSponsorLogoFrame = (index, updates = {}) => {
    if (!Number.isInteger(index) || index < 0) return;

    updateDraft((prev) => {
      const sponsors = Array.isArray(prev.sponsors) ? [...prev.sponsors] : [];
      const current = sponsors[index];
      if (!current) return prev;

      const nextScale =
        Object.prototype.hasOwnProperty.call(updates, 'scale')
          ? clampSponsorLogoScale(updates.scale)
          : clampSponsorLogoScale(current.logo_scale);
      const nextOffsetX =
        Object.prototype.hasOwnProperty.call(updates, 'offsetX')
          ? clampSponsorLogoOffset(updates.offsetX)
          : clampSponsorLogoOffset(current.logo_offset_x);
      const nextOffsetY =
        Object.prototype.hasOwnProperty.call(updates, 'offsetY')
          ? clampSponsorLogoOffset(updates.offsetY)
          : clampSponsorLogoOffset(current.logo_offset_y);

      if (
        nextScale === clampSponsorLogoScale(current.logo_scale) &&
        nextOffsetX === clampSponsorLogoOffset(current.logo_offset_x) &&
        nextOffsetY === clampSponsorLogoOffset(current.logo_offset_y)
      ) {
        return prev;
      }

      sponsors[index] = {
        ...current,
        logo_scale: nextScale,
        logo_offset_x: nextOffsetX,
        logo_offset_y: nextOffsetY,
      };

      return { ...prev, sponsors };
    });
  };

  const setPresentationLogoScale = (index, value) => {
    if (!Number.isInteger(index) || index < 0) return;

    updateDraft((prev) => {
      const sponsors = Array.isArray(prev.sponsors) ? [...prev.sponsors] : [];
      const current = sponsors[index];
      if (!current) return prev;

      const nextScale = clampPresentationLogoScale(value);
      const currentScale = clampPresentationLogoScale(current.presentation_logo_scale);
      if (nextScale === currentScale) return prev;

      sponsors[index] = {
        ...current,
        presentation_logo_scale: nextScale,
      };

      return { ...prev, sponsors };
    });
  };

  const setPresentationLogoSpacing = (index, side, value) => {
    if (!Number.isInteger(index) || index < 0) return;
    if (side !== 'left' && side !== 'right') return;

    updateDraft((prev) => {
      const sponsors = Array.isArray(prev.sponsors) ? [...prev.sponsors] : [];
      const current = sponsors[index];
      if (!current) return prev;

      const nextSpacing = clampPresentationLogoSpacingPx(value);
      const currentSpacing = clampPresentationLogoSpacingPx(
        side === 'left'
          ? current.presentation_logo_spacing_left_px
          : current.presentation_logo_spacing_right_px
      );
      if (nextSpacing === currentSpacing) return prev;

      sponsors[index] = {
        ...current,
        ...(side === 'left'
          ? { presentation_logo_spacing_left_px: nextSpacing }
          : { presentation_logo_spacing_right_px: nextSpacing }),
      };

      return { ...prev, sponsors };
    });
  };

  const uploadSponsorLogoFile = async (event) => {
    const selectedFile = event.target?.files?.[0];
    if (event.target) {
      event.target.value = '';
    }

    if (!selectedFile || !Number.isInteger(selectedSponsorIndex) || selectedSponsorIndex < 0) return;

    const fileType = String(selectedFile.type || '').toLowerCase();
    const lowerName = String(selectedFile.name || '').toLowerCase();
    const extensionMatch = lowerName.match(/\.([a-z0-9]+)$/i);
    const extension = extensionMatch?.[1] || '';
    const extensionAllowed = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension);
    const resolvedMimeType = sponsorLogoUploadMimeTypes.has(fileType)
      ? fileType
      : sponsorLogoUploadMimeByExtension[extension] || '';
    if (!sponsorLogoUploadMimeTypes.has(fileType) && !extensionAllowed) {
      setSaveMessage('Unsupported logo file type. Use PNG, JPG, WEBP, GIF, or SVG.');
      return;
    }

    if (selectedFile.size > sponsorLogoUploadMaxBytes) {
      setSaveMessage('Logo upload is too large. Maximum size is 5 MB.');
      return;
    }

    setSponsorLogoUploading(true);
    setSaveMessage('Uploading logo...');

    try {
      const base64Payload = await fileToBase64(selectedFile);
      const result = await appClient.admin.uploadSponsorLogo({
        fileName: selectedFile.name,
        mimeType: resolvedMimeType,
        dataBase64: base64Payload,
      });
      const uploadedUrl = String(result?.url || '').trim();
      if (!uploadedUrl) {
        throw new Error('Upload completed but no URL was returned.');
      }

      setListItemField('sponsors', selectedSponsorIndex, 'logo_url', uploadedUrl);
      setSaveMessage('Logo uploaded. Click Save Changes to publish.');
    } catch (error) {
      setSaveMessage(
        error instanceof Error && error.message
          ? `Logo upload failed: ${error.message}`
          : 'Logo upload failed.'
      );
    } finally {
      setSponsorLogoUploading(false);
    }
  };

  const beginSponsorLogoDrag = (event, sponsorIndex, startOffsetX, startOffsetY) => {
    if (!Number.isInteger(sponsorIndex) || sponsorIndex < 0) return;
    event.preventDefault();

    sponsorLogoDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      sponsorIndex,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: clampSponsorLogoOffset(startOffsetX),
      startOffsetY: clampSponsorLogoOffset(startOffsetY),
    };

    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const moveSponsorLogoDrag = (event) => {
    const dragState = sponsorLogoDragRef.current;
    if (!dragState.active || dragState.pointerId !== event.pointerId) return;

    const width = Math.max(event.currentTarget?.clientWidth || 1, 1);
    const height = Math.max(event.currentTarget?.clientHeight || 1, 1);
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const nextOffsetX = clampSponsorLogoOffset(dragState.startOffsetX + (deltaX / width) * 140);
    const nextOffsetY = clampSponsorLogoOffset(dragState.startOffsetY + (deltaY / height) * 140);

    setSponsorLogoFrame(dragState.sponsorIndex, {
      offsetX: nextOffsetX,
      offsetY: nextOffsetY,
    });
  };

  const endSponsorLogoDrag = (event) => {
    const dragState = sponsorLogoDragRef.current;
    if (dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget?.releasePointerCapture) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (_error) {
        // ignore release errors if pointer capture is already cleared
      }
    }

    sponsorLogoDragRef.current = {
      active: false,
      pointerId: -1,
      sponsorIndex: -1,
      startX: 0,
      startY: 0,
      startOffsetX: 0,
      startOffsetY: 0,
    };
  };

  const removeListItem = (listKey, index) => {
    updateDraft((prev) => ({
      ...prev,
      [listKey]: (Array.isArray(prev[listKey]) ? prev[listKey] : []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const syncSponsorCtaField = (key, value) => {
    updateDraft((prev) => ({
      ...prev,
      operations: {
        ...prev.operations,
        [key]: value,
      },
      sponsorsSection: {
        ...prev.sponsorsSection,
        ...(key === 'sponsor_cta_label' ? { cta_label: value } : {}),
      },
    }));
  };

  const invalidateContentQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['site-content'] }),
      queryClient.invalidateQueries({ queryKey: ['event-config'] }),
      queryClient.invalidateQueries({ queryKey: ['agenda'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-updates'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-updates-section'] }),
    ]);
  };

  const saveAll = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await appClient.content.save(draft);
      const colorFrameDowngrades = collectCustomColorFrameDowngrades(draft, saved);
      if (colorFrameDowngrades.length) {
        setDraft(draft);
        setJsonText(JSON.stringify(draft, null, 2));
        setIsDirty(true);
        setSaveMessage(
          'Custom color frame was downgraded by the API response. Restart/update the API server and save again.'
        );
        return;
      }

      queryClient.setQueryData(['site-content'], saved);
      setDraft(saved);
      setJsonText(JSON.stringify(saved, null, 2));
      setIsDirty(false);
      setSaveMessage(`Saved ${new Date().toLocaleTimeString()}`);
      await invalidateContentQueries();
    } catch (error) {
      setSaveMessage(
        error instanceof Error && error.message
          ? `Save failed: ${error.message}`
          : 'Save failed. Please sign in again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    setSaving(true);
    try {
      const reset = await appClient.content.reset();
      queryClient.setQueryData(['site-content'], reset);
      setDraft(reset);
      setJsonText(JSON.stringify(reset, null, 2));
      setIsDirty(false);
      setSaveMessage('Reset to defaults.');
      await invalidateContentQueries();
    } catch (error) {
      setSaveMessage(
        error instanceof Error && error.message
          ? `Reset failed: ${error.message}`
          : 'Reset failed. Please sign in again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const exportJson = () => {
    if (!draft) return;
    downloadTextFile(
      `cyberswarm-content-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(draft, null, 2),
      'application/json;charset=utf-8'
    );
  };

  const loadJsonIntoEditor = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setDraft(parsed);
      setIsDirty(true);
      setJsonError('');
      setSaveMessage('JSON loaded. Click Save Changes to publish.');
    } catch (_error) {
      setJsonError('Invalid JSON.');
    }
  };

  const refreshFeedQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-sponsor-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-integrations-status'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] }),
    ]);
    setSaveMessage('Operations data refreshed.');
  };

  const signInWithGoogle = () => {
    if (!googleReady || !tokenClientRef.current) {
      setAuthError('Google Sign-In is not ready yet.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    tokenClientRef.current.requestAccessToken({ prompt: 'consent select_account' });
  };

  const signOut = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ADMIN_USER_KEY);
    window.localStorage.removeItem(APP_USER_KEY);
    appClient.auth.clearAccessToken();
    setAuthUser(null);
    navigate('/admin', { replace: true });
  };

  const normalizedAttendeeFeedUrl = normalizeExternalUrl(draft?.operations?.attendee_feed_url);
  const sponsorCtaLabel =
    String(draft?.operations?.sponsor_cta_label || draft?.sponsorsSection?.cta_label || '').trim() ||
    'Become a Sponsor';

  const sponsorRequestsQuery = useQuery({
    queryKey: ['admin-sponsor-requests'],
    queryFn: () => appClient.admin.listSponsorRequests(),
    enabled: Boolean(authUser),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  const attendeeFeedQuery = useQuery({
    queryKey: ['admin-feed', 'attendee', normalizedAttendeeFeedUrl || 'dynamic-drive'],
    queryFn: () => appClient.admin.fetchFeed(normalizedAttendeeFeedUrl, { source: 'attendee' }),
    enabled: Boolean(authUser),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const integrationStatusQuery = useQuery({
    queryKey: ['admin-integrations-status'],
    queryFn: () => appClient.admin.getIntegrationStatus(),
    enabled: Boolean(authUser),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const calendarEventsQuery = useQuery({
    queryKey: ['admin-calendar-events'],
    queryFn: () => appClient.admin.listCalendarEvents(),
    enabled: Boolean(authUser),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const authQueryErrorMessage = useMemo(() => {
    const messages = [
      sponsorRequestsQuery.error,
      attendeeFeedQuery.error,
      integrationStatusQuery.error,
      calendarEventsQuery.error,
    ]
      .map((error) => (error instanceof Error ? error.message : String(error || '')))
      .filter(Boolean)
      .join(' | ')
      .toLowerCase();

    return messages;
  }, [
    attendeeFeedQuery.error,
    calendarEventsQuery.error,
    integrationStatusQuery.error,
    sponsorRequestsQuery.error,
  ]);

  useEffect(() => {
    if (!authUser || !authQueryErrorMessage) return;
    const tokenExpired =
      authQueryErrorMessage.includes('invalid or expired google token') ||
      authQueryErrorMessage.includes('admin session expired');
    if (!tokenExpired) return;

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_USER_KEY);
      window.localStorage.removeItem(APP_USER_KEY);
    }
    appClient.auth.clearAccessToken();
    setAuthError('Your Google admin session expired. Please sign in again.');
    setAuthUser(null);
  }, [authQueryErrorMessage, authUser]);

  const sponsorLeads = useMemo(
    () => (Array.isArray(sponsorRequestsQuery.data?.rows) ? sponsorRequestsQuery.data.rows : []),
    [sponsorRequestsQuery.data?.rows]
  );
  const attendees = useMemo(
    () => buildAttendeeRecords(attendeeFeedQuery.data?.rows || [], draft?.operations || {}),
    [attendeeFeedQuery.data?.rows, draft?.operations]
  );
  const attendeeRawRows = useMemo(
    () => (Array.isArray(attendeeFeedQuery.data?.rows) ? attendeeFeedQuery.data.rows : []),
    [attendeeFeedQuery.data?.rows]
  );

  const filteredSponsorLeads = useMemo(
    () => filterRecords(sponsorLeads, sponsorLeadSearch),
    [sponsorLeadSearch, sponsorLeads]
  );
  useEffect(() => {
    const sponsorCount = Array.isArray(draft?.sponsors) ? draft.sponsors.length : 0;
    if (!sponsorCount) {
      if (selectedSponsorIndex !== 0) setSelectedSponsorIndex(0);
      return;
    }
    if (selectedSponsorIndex > sponsorCount - 1) {
      setSelectedSponsorIndex(sponsorCount - 1);
    }
  }, [draft?.sponsors, selectedSponsorIndex]);

  useEffect(() => {
    if (!filteredSponsorLeads.length) {
      if (selectedSponsorLeadIndex !== 0) setSelectedSponsorLeadIndex(0);
      return;
    }
    if (selectedSponsorLeadIndex > filteredSponsorLeads.length - 1) {
      setSelectedSponsorLeadIndex(filteredSponsorLeads.length - 1);
    }
  }, [filteredSponsorLeads, selectedSponsorLeadIndex]);

  useEffect(() => {
    setPendingSponsorLeadDeleteId('');
  }, [selectedSponsorLeadIndex, sponsorMailboxView, sponsorLeadSearch]);

  const attendeeStatuses = useMemo(() => getUniqueStatuses(attendees), [attendees]);
  const filteredAttendees = useMemo(() => {
    const searched = filterRecords(attendees, attendeeSearch);
    if (attendeeStatusFilter === 'all') return searched;
    return searched.filter(
      (record) => String(record.status || '').toLowerCase() === attendeeStatusFilter.toLowerCase()
    );
  }, [attendeeSearch, attendeeStatusFilter, attendees]);
  const filteredAttendeeEmails = useMemo(
    () => dedupeEmailList(filteredAttendees.map((record) => record.email)),
    [filteredAttendees]
  );
  const selectedFilteredAttendeeCount = useMemo(
    () => filteredAttendeeEmails.filter((email) => selectedAttendeeEmails.includes(email)).length,
    [filteredAttendeeEmails, selectedAttendeeEmails]
  );
  const allFilteredAttendeesSelected = Boolean(
    filteredAttendeeEmails.length && selectedFilteredAttendeeCount === filteredAttendeeEmails.length
  );
  useEffect(() => {
    const validAttendeeEmails = new Set(dedupeEmailList(attendees.map((attendee) => attendee.email)));
    setSelectedAttendeeEmails((prev) => prev.filter((email) => validAttendeeEmails.has(email)));
  }, [attendees]);
  const toggleAttendeeSelection = (email) => {
    const normalized = normalizeEmailAddress(email);
    if (!isLikelyEmail(normalized)) return;
    setSelectedAttendeeEmails((prev) =>
      prev.includes(normalized) ? prev.filter((item) => item !== normalized) : [...prev, normalized]
    );
  };
  const toggleAllFilteredAttendees = () => {
    setSelectedAttendeeEmails((prev) => {
      const filteredSet = new Set(filteredAttendeeEmails);
      const currentlyAllSelected = filteredAttendeeEmails.every((email) => prev.includes(email));
      if (currentlyAllSelected) {
        return prev.filter((email) => !filteredSet.has(email));
      }
      return dedupeEmailList([...prev, ...filteredAttendeeEmails]);
    });
  };
  const openAttendeeMailing = (recipients) => {
    const normalizedRecipients = dedupeEmailList(recipients);
    if (!normalizedRecipients.length) {
      setSaveMessage('No valid attendee email addresses are available for this action.');
      return;
    }
    openInternalMailingComposer({
      recipients: normalizedRecipients,
      subject: `${draft?.operations?.messaging_subject_prefix || 'CyberSwarm'} Update`,
      recipientType: 'custom',
    });
  };
  const recipientList = useMemo(
    () =>
      buildRecipientList(attendees, {
        status: messageStatusFilter,
        search: messageSearch,
      }),
    [attendees, messageSearch, messageStatusFilter]
  );
  const calendarEvents = useMemo(
    () => (Array.isArray(calendarEventsQuery.data?.rows) ? calendarEventsQuery.data.rows : []),
    [calendarEventsQuery.data?.rows]
  );
  const userCalendarEvents = useMemo(
    () => (Array.isArray(calendarEventsQuery.data?.userRows) ? calendarEventsQuery.data.userRows : []),
    [calendarEventsQuery.data?.userRows]
  );
  const organizerCalendarEvents = useMemo(
    () => (Array.isArray(calendarEventsQuery.data?.organizerRows) ? calendarEventsQuery.data.organizerRows : calendarEvents),
    [calendarEvents, calendarEventsQuery.data?.organizerRows]
  );
  const organizerCalendarIds = useMemo(
    () => (Array.isArray(calendarEventsQuery.data?.organizerEmails) ? calendarEventsQuery.data.organizerEmails : []),
    [calendarEventsQuery.data?.organizerEmails]
  );
  const integrationStatus = integrationStatusQuery.data || {};
  const googleWorkspaceStatus = integrationStatus.googleWorkspace || {};
  const googleWorkspaceScopes = googleWorkspaceStatus.scopes || {};
  const hasGoogleWorkspaceApi = Boolean(googleWorkspaceStatus.configured);
  const googleWorkspaceScopeCount = Number(googleWorkspaceStatus.scopeCount || 0);

  const activeSponsorCount = draft?.sponsors?.filter((item) => item.active !== false && item.name)?.length || 0;
  const presentationSponsorEntries = useMemo(
    () =>
      (Array.isArray(draft?.sponsors) ? draft.sponsors : [])
        .map((sponsor, index) => ({ sponsor, index }))
        .filter(({ sponsor }) => sponsor.active !== false && (sponsor.logo_url || sponsor.name))
        .sort((left, right) => (left.sponsor.order || 0) - (right.sponsor.order || 0)),
    [draft?.sponsors]
  );

  useEffect(() => {
    if (!presentationSponsorEntries.length) {
      if (selectedPresentationSponsorIndex !== 0) setSelectedPresentationSponsorIndex(0);
      return;
    }
    if (selectedPresentationSponsorIndex > presentationSponsorEntries.length - 1) {
      setSelectedPresentationSponsorIndex(presentationSponsorEntries.length - 1);
    }
  }, [presentationSponsorEntries, selectedPresentationSponsorIndex]);

  const mailingContactDirectory = useMemo(() => {
    const contacts = [];

    attendees.forEach((attendee) => {
      const email = normalizeEmailAddress(attendee?.email || '');
      if (!isLikelyEmail(email)) return;
      contacts.push({
        email,
        name: String(attendee?.name || attendee?.fullName || '').trim(),
        company: String(attendee?.company || attendee?.organization || '').trim(),
        sourceType: 'attendee',
        sourceLabel: 'Attendee',
      });
    });

    const sponsors = Array.isArray(draft?.sponsors) ? draft.sponsors : [];
    sponsors.forEach((sponsor) => {
      const email = normalizeEmailAddress(sponsor?.email || sponsor?.contact_email || sponsor?.contactEmail || '');
      if (!isLikelyEmail(email)) return;
      contacts.push({
        email,
        name: String(sponsor?.name || sponsor?.title || '').trim(),
        company: String(sponsor?.name || sponsor?.title || '').trim(),
        sourceType: 'sponsor-published',
        sourceLabel: 'Published Sponsor',
      });
    });

    sponsorLeads.forEach((lead) => {
      const email = normalizeEmailAddress(lead?.email || '');
      if (!isLikelyEmail(email)) return;
      contacts.push({
        email,
        name: String(lead?.name || lead?.contactName || '').trim(),
        company: String(lead?.company || lead?.organizationName || '').trim(),
        sourceType: 'sponsor-interest',
        sourceLabel: 'Sponsor Interest',
      });
    });

    return contacts;
  }, [attendees, draft?.sponsors, sponsorLeads]);

  const mailingAudienceCounts = useMemo(() => {
    const attendeesSet = new Set();
    const sponsorsSet = new Set();
    const sponsorInterestSet = new Set();

    mailingContactDirectory.forEach((contact) => {
      if (contact.sourceType === 'attendee') attendeesSet.add(contact.email);
      if (contact.sourceType === 'sponsor-published') sponsorsSet.add(contact.email);
      if (contact.sourceType === 'sponsor-interest') sponsorInterestSet.add(contact.email);
    });

    return {
      attendees: attendeesSet.size,
      sponsors: sponsorsSet.size,
      sponsorInterest: sponsorInterestSet.size,
    };
  }, [mailingContactDirectory]);

  const mailingAutocompleteOptions = useMemo(() => {
    const byEmail = new Map();
    mailingContactDirectory.forEach((contact) => {
      const existing = byEmail.get(contact.email);
      if (!existing) {
        byEmail.set(contact.email, {
          email: contact.email,
          name: contact.name,
          company: contact.company,
          sources: new Set([contact.sourceLabel]),
        });
        return;
      }

      if (!existing.name && contact.name) existing.name = contact.name;
      if (!existing.company && contact.company) existing.company = contact.company;
      existing.sources.add(contact.sourceLabel);
    });

    return [...byEmail.values()]
      .map((item) => ({
        ...item,
        sourceText: [...item.sources].join(', '),
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  }, [mailingContactDirectory]);
  const activeOrganizationCount =
    draft?.organizations?.filter((item) => item.active !== false && item.name)?.length || 0;
  const activeAgendaCount = draft?.agendaItems?.filter((item) => item.active !== false)?.length || 0;
  const hasRegistrationEmbed = Boolean(String(draft?.eventConfig?.google_form_embed_url || '').trim());
  const hasSponsorForm = Boolean(sponsorCtaLabel);
  const resolvedAttendeeFeedUrl = normalizeExternalUrl(
    normalizedAttendeeFeedUrl || attendeeFeedQuery.data?.sourceUrl || ''
  );
  const hasAttendeeFeed = Boolean(
    resolvedAttendeeFeedUrl || attendeeFeedQuery.data?.fetchedAt || attendeeFeedQuery.data?.driveSource
  );
  const organizerGroupEmail = String(
    integrationStatus.workspace?.organizerGroupEmail || authUser?.organizerGroupEmail || ''
  ).trim();
  const hasAdminRestriction = Boolean(
    integrationStatus.workspace?.adminAccessRestricted || adminEmails.length > 0 || authUser?.authSource === 'organizer-group'
  );
  const organizerGroupGuardStatus = organizerGroupEmail
    ? integrationStatus.workspace?.organizerGroupAuthConfigured || authUser?.authSource === 'organizer-group'
      ? 'Group Ready'
      : 'Needs API'
    : hasAdminRestriction
      ? 'Allowlist'
      : 'Open';
  const hasCalendarFeed = Boolean(integrationStatus.calendar?.configured);
  const hasSmtpServer = Boolean(integrationStatus.email?.smtpConfigured);
  const calendarPublicUrl = normalizeExternalUrl(
    draft?.operations?.calendar_public_url || integrationStatus.calendar?.publicUrl || ''
  );
  const calendarEmbedUrl = normalizeExternalUrl(draft?.operations?.calendar_embed_url || '');
  const calendarId = String(
    draft?.operations?.calendar_id ||
      integrationStatus.calendar?.calendarId ||
      organizerGroupEmail ||
      integrationStatus.workspace?.groupEmail ||
      ''
  ).trim().toLowerCase();
  const calendarTimezone =
    typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles'
      : 'America/Los_Angeles';
  const autoCalendarEmbedUrl = normalizeExternalUrl(
    buildGoogleCalendarEmbedUrlFromId(calendarId, calendarTimezone)
  );
  const dynamicCalendarOverlayIds = organizerCalendarIds.length
    ? organizerCalendarIds
    : authUser?.email
      ? [authUser.email]
      : [];
  const autoCalendarOverlayEmbedUrl = normalizeExternalUrl(
    buildGoogleCalendarOverlayEmbedUrl(dynamicCalendarOverlayIds, calendarTimezone)
  );
  const effectiveCalendarEmbedUrl = calendarEmbedUrl || autoCalendarEmbedUrl;
  const operationalCalendarEmbedUrl = autoCalendarOverlayEmbedUrl || effectiveCalendarEmbedUrl;
  const teamInboxUrl = normalizeExternalUrl(
    draft?.operations?.messaging_team_inbox_url || integrationStatus.email?.inboxUrl || ''
  );
  const workspaceDomain = String(
    draft?.operations?.workspace_domain || integrationStatus.workspace?.domain || 'cyberswarmsac.com'
  ).trim();
  const workspaceAdminConsoleUrl = normalizeExternalUrl(
    draft?.operations?.workspace_admin_console_url ||
      integrationStatus.workspace?.adminConsoleUrl ||
      'https://admin.google.com/'
  );
  const workspaceDriveFolderUrl = normalizeExternalUrl(
    draft?.operations?.workspace_drive_folder_url || integrationStatus.workspace?.driveFolderUrl || ''
  );
  const workspaceSharedDriveUrl = normalizeExternalUrl(
    draft?.operations?.workspace_shared_drive_url || integrationStatus.workspace?.sharedDriveUrl || ''
  );
  const workspaceGroupEmail = String(
    draft?.operations?.workspace_group_email || integrationStatus.workspace?.groupEmail || 'team@cyberswarmsac.com'
  ).trim();
  const enabledGoogleWidgetIds = Array.isArray(draft?.operations?.enabled_google_widgets)
    ? draft.operations.enabled_google_widgets.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const isGoogleWidgetEnabled = (widgetId) => enabledGoogleWidgetIds.includes(widgetId);
  const reviewedSponsorLeadKeySet = useMemo(
    () => new Set(reviewedSponsorLeadKeys),
    [reviewedSponsorLeadKeys]
  );
  const latestSponsorLeadAt = sponsorLeads[0]?.sortTimestamp || 0;
  const newSponsorLeadCount = sponsorLeads.filter((lead) => {
    const key = getSponsorLeadReviewKey(lead);
    return key ? !reviewedSponsorLeadKeySet.has(key) : true;
  }).length;
  const firstUnreviewedSponsorLead = sponsorLeads.find((lead) => {
    const key = getSponsorLeadReviewKey(lead);
    return key ? !reviewedSponsorLeadKeySet.has(key) : true;
  }) || null;

  /**
   * @param {string} targetId
   * @param {string} title
   */
  const openIntegrationWidget = (targetId, title) => {
    setSaveMessage(`${title} selected. Use the highlighted setup area below, then Save Changes.`);

    if (typeof window === 'undefined') return;

    const nextHash = `#${encodeURIComponent(targetId)}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    }

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const addGoogleWidget = (widget) => {
    if (!isGoogleWidgetEnabled(widget.id)) {
      updateDraft((prev) => ({
        ...prev,
        operations: {
          ...prev.operations,
          enabled_google_widgets: [
            ...(Array.isArray(prev.operations?.enabled_google_widgets)
              ? prev.operations.enabled_google_widgets
              : []),
            widget.id,
          ],
        },
      }));
    }

    openIntegrationWidget(widget.targetId, widget.title);
  };

  const openOverviewGoogleWidget = (widget) => {
    setSaveMessage(`${widget.title} selected from Overview.`);
    navigate(`/admin/integrations#${widget.targetId}`);
  };

  const googleIntegrationWidgets = useMemo(
    () => [
      {
        id: 'workspace',
        title: 'Google Workspace',
        label: workspaceDomain || 'cyberswarmsac.com',
        description: 'Centralize the admin console, Drive handoff, shared drive, and team group for CyberSwarm operations.',
        icon: ShieldCheck,
        enabled: isGoogleWidgetEnabled('workspace'),
        connected: Boolean(workspaceDomain || workspaceAdminConsoleUrl || workspaceDriveFolderUrl || workspaceGroupEmail),
        status: workspaceDomain || 'Available',
        targetId: 'integration-workspace-hub',
        docsUrl: 'https://support.google.com/a/',
        primaryUrl: workspaceDriveFolderUrl || workspaceSharedDriveUrl || workspaceAdminConsoleUrl,
      },
      {
        id: 'forms',
        title: 'Google Forms',
        label: 'Registration embed',
        description: 'Embed the attendee registration form directly on the public CyberSwarm page.',
        icon: Globe2,
        enabled: isGoogleWidgetEnabled('forms'),
        connected: hasRegistrationEmbed,
        status: hasRegistrationEmbed ? 'Connected' : isGoogleWidgetEnabled('forms') ? 'Added' : 'Available',
        targetId: 'integration-website-forms',
        docsUrl: 'https://support.google.com/docs/answer/2839588',
        primaryUrl: '',
      },
      {
        id: 'sheets',
        title: 'Google Sheets Feed',
        label: 'Response roster',
        description: 'Use the Google Forms response sheet as the attendee roster and messaging source.',
        icon: Building2,
        enabled: isGoogleWidgetEnabled('sheets'),
        connected: hasAttendeeFeed,
        status: hasAttendeeFeed ? `${attendees.length} rows` : isGoogleWidgetEnabled('sheets') ? 'Added' : 'Available',
        targetId: 'integration-attendee-feed',
        docsUrl: 'https://support.google.com/docs/answer/183965',
        primaryUrl: normalizedAttendeeFeedUrl,
      },
      {
        id: 'calendar',
        title: 'Google Calendar',
        label: 'Team schedule',
        description: 'Link or embed a coordinator calendar and optionally read private feed events server-side.',
        icon: CalendarDays,
        enabled: isGoogleWidgetEnabled('calendar'),
        connected: Boolean(calendarPublicUrl || effectiveCalendarEmbedUrl || hasCalendarFeed),
        status: hasCalendarFeed
          ? `${calendarEvents.length} events`
          : calendarPublicUrl || effectiveCalendarEmbedUrl
            ? 'Linked'
            : isGoogleWidgetEnabled('calendar')
              ? 'Added'
              : 'Available',
        targetId: 'integration-calendar',
        docsUrl: 'https://support.google.com/calendar/answer/41207',
        primaryUrl: calendarPublicUrl || effectiveCalendarEmbedUrl,
      },
      {
        id: 'maps',
        title: 'Google Maps',
        label: 'Venue map',
        description: 'Embed the venue map, place link, and directions handoff used by the public Event Intel block.',
        icon: Link2,
        enabled: isGoogleWidgetEnabled('maps'),
        connected: Boolean(normalizedMapEmbedUrl || normalizedPlaceUrl || normalizedDirectionsUrl),
        status: normalizedMapEmbedUrl
          ? 'Embedded'
          : normalizedPlaceUrl || normalizedDirectionsUrl
            ? 'Linked'
            : isGoogleWidgetEnabled('maps')
              ? 'Added'
              : 'Available',
        targetId: 'integration-google-maps',
        docsUrl: 'https://developers.google.com/maps/documentation/embed',
        primaryUrl: normalizedPlaceUrl || placeIdDirectionsPreview || normalizedDirectionsUrl,
      },
      {
        id: 'apps-script',
        title: 'Apps Script JSON',
        label: 'Custom endpoint',
        description: 'Use a small Google Apps Script web app when CSV is not enough for response data.',
        icon: Code2,
        enabled: isGoogleWidgetEnabled('apps-script'),
        connected: normalizedAttendeeFeedUrl.includes('script.google.com'),
        status: normalizedAttendeeFeedUrl.includes('script.google.com')
          ? 'Connected'
          : isGoogleWidgetEnabled('apps-script')
            ? 'Added'
            : 'Supported',
        targetId: 'integration-attendee-feed',
        docsUrl: 'https://developers.google.com/apps-script/guides/web',
        primaryUrl: normalizedAttendeeFeedUrl.includes('script.google.com') ? normalizedAttendeeFeedUrl : '',
      },
      {
        id: 'gmail',
        title: 'Gmail / SMTP',
        label: 'Message delivery',
        description: 'Connect server-side SMTP settings for attendee announcements and team inbox handoff.',
        icon: Mail,
        enabled: isGoogleWidgetEnabled('gmail'),
        connected: hasSmtpServer || Boolean(teamInboxUrl),
        status: hasSmtpServer
          ? 'Ready'
          : teamInboxUrl
            ? 'Inbox linked'
            : isGoogleWidgetEnabled('gmail')
              ? 'Added'
              : 'Available',
        targetId: 'integration-mail',
        docsUrl: 'https://support.google.com/a/answer/176600',
        primaryUrl: teamInboxUrl,
      },
    ],
    [
      attendees.length,
      effectiveCalendarEmbedUrl,
      calendarEvents.length,
      calendarPublicUrl,
      enabledGoogleWidgetIds,
      hasAttendeeFeed,
      hasCalendarFeed,
      hasRegistrationEmbed,
      hasSmtpServer,
      normalizedAttendeeFeedUrl,
      normalizedDirectionsUrl,
      normalizedMapEmbedUrl,
      normalizedPlaceUrl,
      placeIdDirectionsPreview,
      teamInboxUrl,
      workspaceAdminConsoleUrl,
      workspaceDomain,
      workspaceDriveFolderUrl,
      workspaceGroupEmail,
      workspaceSharedDriveUrl,
    ]
  );
  const overviewGoogleIntegrationWidgets = useMemo(
    () => googleIntegrationWidgets.filter((widget) => widget.enabled || widget.connected),
    [googleIntegrationWidgets]
  );
  const activeIntegrationTarget = decodeURIComponent(String(location.hash || '').replace(/^#/, ''));
  const integrationNavigationItems = useMemo(
    () => [
      {
        targetId: 'integration-widget-library',
        title: '1. Add Widgets',
        status: `${googleIntegrationWidgets.filter((widget) => widget.enabled || widget.connected).length} selected`,
      },
      {
        targetId: 'integration-workspace-hub',
        title: '2. Workspace Hub',
        status: hasGoogleWorkspaceApi ? 'Credential ready' : 'Needs env setup',
      },
      {
        targetId: 'integration-website-forms',
        title: '3. Website Forms',
        status: hasRegistrationEmbed ? 'Connected' : 'Needs embed URL',
      },
      {
        targetId: 'integration-google-maps',
        title: '4. Venue Maps',
        status: normalizedMapEmbedUrl ? 'Connected' : 'Needs map iframe',
      },
      {
        targetId: 'integration-calendar',
        title: '5. Calendar',
        status: hasCalendarFeed ? 'Feed connected' : calendarPublicUrl || effectiveCalendarEmbedUrl ? 'Linked' : 'Needs source',
      },
      {
        targetId: 'integration-mail',
        title: '6. Mail & SMTP',
        status: hasSmtpServer ? 'SMTP ready' : teamInboxUrl ? 'Inbox linked' : 'Needs sender',
      },
      {
        targetId: 'integration-attendee-feed',
        title: '7. Response Feed',
        status: hasAttendeeFeed ? `${attendees.length} rows` : 'Needs feed URL',
      },
      {
        targetId: 'integration-sponsor-requests',
        title: '8. Sponsor Inbox',
        status: `${sponsorLeads.length} stored`,
      },
    ],
    [
      attendees.length,
      effectiveCalendarEmbedUrl,
      calendarPublicUrl,
      googleIntegrationWidgets,
      hasAttendeeFeed,
      hasCalendarFeed,
      hasGoogleWorkspaceApi,
      hasRegistrationEmbed,
      hasSmtpServer,
      normalizedMapEmbedUrl,
      sponsorLeads.length,
      teamInboxUrl,
    ]
  );

  useEffect(() => {
    const knownPages = new Set(['overview', 'site', 'presentation', 'event', 'calendar', 'sponsors', 'attendees', 'messaging', 'mailing', 'integrations', 'json']);
    if (currentPageId && !knownPages.has(currentPageId)) {
      navigate('/admin/overview', { replace: true });
    }
  }, [currentPageId, navigate]);

  useEffect(() => {
    if (currentPageId !== 'integrations' || !location.hash || typeof window === 'undefined') return;

    const targetId = decodeURIComponent(location.hash.slice(1));
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [currentPageId, location.hash]);

  useEffect(() => {
    if (browserAlertPermission !== 'granted' || !newSponsorLeadCount || !latestSponsorLeadAt) {
      return;
    }

    if (!alertBootstrappedRef.current) {
      alertBootstrappedRef.current = true;
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const notification = new window.Notification('CyberSwarm sponsor interest', {
      body:
        newSponsorLeadCount === 1
          ? '1 new sponsor inquiry is waiting in the dashboard.'
          : `${newSponsorLeadCount} new sponsor inquiries are waiting in the dashboard.`,
    });

    return () => notification.close();
  }, [browserAlertPermission, latestSponsorLeadAt, newSponsorLeadCount]);

  const requestBrowserAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setSaveMessage('Browser alerts are not supported in this browser.');
      return;
    }

    const permission = await window.Notification.requestPermission();
    setBrowserAlertPermission(permission);
    setSaveMessage(
      permission === 'granted'
        ? 'Browser alerts enabled for sponsor inquiries.'
        : 'Browser alerts were not enabled.'
    );
  };

  const markSponsorLeadReviewed = (lead) => {
    const leadKey = getSponsorLeadReviewKey(lead);
    if (!leadKey) {
      setSaveMessage('Could not mark this inquiry as reviewed.');
      return;
    }

    setReviewedSponsorLeadKeys((prev) => {
      if (prev.includes(leadKey)) {
        setSaveMessage('This sponsor inquiry is already reviewed.');
        return prev;
      }

      const next = [...prev, leadKey];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SPONSOR_LEADS_REVIEWED_KEY, JSON.stringify(next));
      }
      setSaveMessage('Selected sponsor inquiry marked as reviewed.');
      return next;
    });
  };

  const deleteSponsorLead = async (lead, options = {}) => {
    const requestId = String(lead?.id || '').trim();
    if (!requestId) {
      if (!options.silent) {
        setSaveMessage('This sponsor inquiry cannot be deleted because it has no id.');
      }
      setPendingSponsorLeadDeleteId('');
      return;
    }

    try {
      await appClient.admin.deleteSponsorRequest(requestId);
      setPendingSponsorLeadDeleteId('');
      if (!options.silent) {
        setSaveMessage('Sponsor inquiry deleted.');
      }
      setSelectedSponsorLeadIndex(0);
      await queryClient.invalidateQueries({ queryKey: ['admin-sponsor-requests'] });
    } catch (error) {
      if (!options.silent) {
        setSaveMessage(
          error instanceof Error && error.message
            ? `Could not delete sponsor inquiry: ${error.message}`
            : 'Could not delete sponsor inquiry.'
        );
      }
      throw error;
    }
  };

  const approveSponsorLead = async (lead) => {
    if (!lead) return;

    const nextSponsor = {
      id: createId('sponsor'),
      name: String(lead.company || lead.organizationName || lead.name || '').trim(),
      logo_url: '',
      website_url: String(lead.website || '').trim(),
      highlight: '',
      contact_name: String(lead.name || lead.contactName || '').trim(),
      email: String(lead.email || '').trim(),
      phone: String(lead.phone || '').trim(),
      support_amount: String(lead.supportAmount || '').trim(),
      interest_notes: String(lead.message || '').trim(),
      bring_swag: Boolean(lead.bringSwag),
      venue_branding: Boolean(lead.venueBranding),
      vip: false,
      logo_background: 'transparent',
      logo_background_color: sponsorLogoBackgroundDefaultColor,
      logo_scale: 110,
      presentation_logo_scale: 100,
      presentation_logo_spacing_left_px: 28,
      presentation_logo_spacing_right_px: 28,
      logo_offset_x: 0,
      logo_offset_y: 0,
      order: (Array.isArray(draft?.sponsors) ? draft.sponsors.length : 0) + 1,
      active: false,
    };

    const nextDraft = {
      ...draft,
      sponsors: [...(Array.isArray(draft?.sponsors) ? draft.sponsors : []), nextSponsor],
    };

    try {
      const saved = await appClient.content.save(nextDraft);
      queryClient.setQueryData(['site-content'], saved);
      setDraft(saved);
      setJsonText(JSON.stringify(saved, null, 2));
      setIsDirty(false);
      setJsonError('');
      await invalidateContentQueries();
      await deleteSponsorLead(lead, { silent: true });
      setSponsorMailboxView('cards');
      setSelectedSponsorIndex((Array.isArray(saved?.sponsors) ? saved.sponsors.length : 1) - 1);
      setSaveMessage('Sponsor interest approved. A hidden sponsor card draft was created; publish it when ready.');
    } catch (error) {
      setSaveMessage(
        error instanceof Error && error.message
          ? `Could not approve sponsor inquiry: ${error.message}`
          : 'Could not approve sponsor inquiry.'
      );
    }
  };

  const copyRecipients = async () => {
    const emails = recipientList.map((item) => item.email).filter(Boolean).join(', ');
    const didCopy = await copyText(emails);
    setSaveMessage(didCopy ? 'Recipient email list copied.' : 'Could not copy recipient email list.');
  };

  const copyMessageDraft = async () => {
    const subject = composeSubject.trim();
    const replyTo = String(draft?.operations?.messaging_reply_to || '').trim();
    const draftText = [`Subject: ${subject || 'CyberSwarm Update'}`, replyTo ? `Reply-To: ${replyTo}` : '', '', composeBody.trim()]
      .filter(Boolean)
      .join('\n');
    const didCopy = await copyText(draftText);
    setSaveMessage(didCopy ? 'Message draft copied.' : 'Could not copy message draft.');
  };

  const exportRecipients = () => {
    if (!recipientList.length) return;
    const csv = exportRowsToCsv(
      recipientList.map((item) => ({
        name: item.name,
        email: item.email,
        company: item.company,
        role: item.role,
        status: item.status,
        submittedAt: item.submittedAt,
      }))
    );
    downloadTextFile(
      `cyberswarm-recipients-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
    setSaveMessage('Recipient CSV exported.');
  };

  const openInternalMailingComposer = ({
    recipients = [],
    subject = '',
    html = '',
    text = '',
    recipientType = 'custom',
  }) => {
    const nextRecipients = dedupeEmailList(recipients);
    setMailingRecipientType(recipientType);
    setMailingTo(nextRecipients);
    setMailingCc([]);
    setMailingBcc([]);
    setMailingToInput('');
    setMailingCcInput('');
    setMailingBccInput('');
    if (subject) setMailingSubject(subject);
    if (html) setMailingHtml(html);
    if (text) setMailingText(text);
    setMailingStatus('');
    navigate('/admin/mailing');
  };

  const openMailDraft = async () => {
    if (typeof window === 'undefined') return;

    const recipients = recipientList.map((item) => item.email).filter(Boolean).join(',');
    const query = new URLSearchParams();
    const subject = composeSubject.trim() || 'CyberSwarm Update';
    const replyTo = String(draft?.operations?.messaging_reply_to || '').trim();
    const body = composeBody.trim();

    query.set('subject', subject);
    query.set('body', replyTo ? `${body}\n\nReply-To: ${replyTo}` : body);

    if (recipients.length <= 1400) {
      query.set('bcc', recipients);
    } else {
      const didCopy = await copyText(recipients);
      setSaveMessage(
        didCopy
          ? 'Recipient list copied because it is too long for a mailto draft.'
          : 'Recipient list is too long for a mailto draft. Export or copy the emails instead.'
      );
    }

    window.location.href = `mailto:?${query.toString()}`;
  };

  const sendServerEmail = async () => {
    const recipients = recipientList.map((item) => item.email).filter(Boolean);
    if (!recipients.length) {
      setSaveMessage('No recipients match the current messaging filters.');
      return;
    }

    setEmailSending(true);
    setSaveMessage('');
    try {
      const result = await appClient.admin.sendEmail({
        recipients,
        subject: composeSubject.trim() || 'CyberSwarm Update',
        body: composeBody.trim(),
        replyTo: draft?.operations?.messaging_reply_to || integrationStatus.email?.replyTo || '',
        fromName: draft?.operations?.messaging_from_name || integrationStatus.email?.fromName || '',
      });
      setSaveMessage(`Email sent to ${result.accepted || recipients.length} recipients.`);
    } catch (error) {
      setSaveMessage(
        error instanceof Error && error.message
          ? `Email send failed: ${error.message}`
          : 'Email send failed.'
      );
    } finally {
      setEmailSending(false);
    }
  };

  const pageItems = useMemo(
    () => {
      const items = [
        { id: 'overview', title: 'Overview', description: 'Readiness, feed health, and latest event activity.', icon: LayoutDashboard },
        { id: 'site', title: 'Page Builder', description: 'Visual homepage, event, map, agenda, and content editor.', icon: Sparkles },
        {
          id: 'presentation',
          title: 'Presentation',
          description: 'Projector slide intro editor with per-logo marquee sizing.',
          icon: Eye,
          badge: presentationSponsorEntries.length ? String(presentationSponsorEntries.length) : '',
        },
        {
          id: 'sponsors',
          title: 'Sponsors',
          description: 'Sponsor spotlight cards and incoming sponsor inquiries.',
          icon: Handshake,
          badge: newSponsorLeadCount ? String(newSponsorLeadCount) : activeSponsorCount ? String(activeSponsorCount) : '',
        },
        {
          id: 'attendees',
          title: 'Attendees',
          description: 'Attendee roster, response records, and response health.',
          icon: Users,
          badge: attendees.length ? String(attendees.length) : '',
        },
      ];

      if (isGoogleWidgetEnabled('calendar') || hasCalendarFeed || Boolean(effectiveCalendarEmbedUrl || calendarPublicUrl)) {
        items.push({
          id: 'calendar',
          title: 'Calendar',
          description: 'Live Google Calendar and upcoming organizer events.',
          icon: CalendarDays,
          badge: calendarEvents.length ? String(calendarEvents.length) : '',
        });
      }

      if (isGoogleWidgetEnabled('gmail') || hasSmtpServer || Boolean(teamInboxUrl)) {
        items.push({
          id: 'messaging',
          title: 'Messaging',
          description: 'Mail delivery defaults, SMTP, and inbox handoff.',
          icon: Mail,
          badge: hasSmtpServer ? 'Ready' : teamInboxUrl ? 'Inbox' : '',
        });
      }

      items.push({
        id: 'mailing',
        title: 'Mailing',
        description: 'Send emails to guests and sponsors with rich formatting.',
        icon: Send,
        badge: hasSmtpServer ? 'Ready' : '',
      });

      items.push(
        { id: 'integrations', title: 'Integrations', description: 'Google widget library, feeds, calendar, maps, and messaging.', icon: Link2 },
        { id: 'json', title: 'Raw JSON', description: 'Advanced schema editing and export.', icon: Code2 }
      );

      return items;
    },
    [
      activeSponsorCount,
      attendees.length,
      calendarEvents.length,
      calendarPublicUrl,
      effectiveCalendarEmbedUrl,
      hasCalendarFeed,
      hasSmtpServer,
      newSponsorLeadCount,
      teamInboxUrl,
      isGoogleWidgetEnabled,
      presentationSponsorEntries.length,
    ]
  );

  const filteredPageItems = useMemo(() => {
    const query = navSearch.trim().toLowerCase();
    if (!query) return pageItems;
    return pageItems.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query));
  }, [navSearch, pageItems]);

  const activePageMeta = pageItems.find((item) => item.id === currentPageId) || pageItems[0];
  const ActivePageIcon = activePageMeta.icon;

  const sponsorLeadColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Organization',
        render: (row) => (
          <div>
            <p className="font-heading text-base text-foreground">{row.company || 'Unnamed organization'}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground/70">
              {row.name || 'No contact name provided'}
              {row.phone ? ` • ${row.phone}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'email',
        label: 'Contact',
        render: (row) =>
          row.email ? (
            <div className="space-y-1">
              <a href={`mailto:${row.email}`} className="font-mono text-xs text-primary hover:text-foreground">
                {row.email}
              </a>
              {row.website ? (
                <a
                  href={normalizeExternalUrl(row.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-mono text-xs text-muted-foreground/80 hover:text-foreground"
                >
                  {row.website}
                </a>
              ) : null}
            </div>
          ) : (
            <span className="font-mono text-xs text-muted-foreground/70">No email</span>
          ),
      },
      {
        key: 'supportAmount',
        label: 'Support',
        render: (row) => (
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary/85">
              {row.supportAmount || 'Not provided'}
            </p>
            <p className="mt-2 font-mono text-xs leading-6 text-muted-foreground/85">
              {row.message || 'No additional notes'}
            </p>
          </div>
        ),
      },
      {
        key: 'activation',
        label: 'Extras',
        render: (row) => (
          <p className="font-mono text-xs leading-6 text-muted-foreground/85">
            {[row.bringSwag ? 'Bringing swag' : '', row.venueBranding ? 'Venue branding' : '']
              .filter(Boolean)
              .join(' • ') || 'No extras selected'}
          </p>
        ),
      },
      {
        key: 'submittedAt',
        label: 'Submitted',
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground/80">
            {formatFeedDate(row.submittedAt) || row.submittedAt || 'Unknown'}
          </span>
        ),
      },
    ],
    []
  );

  const attendeeColumns = useMemo(
    () => [
      {
        key: 'select',
        label: (
          <input
            type="checkbox"
            checked={allFilteredAttendeesSelected}
            onChange={toggleAllFilteredAttendees}
            aria-label="Select all filtered attendees"
          />
        ),
        render: (row) => {
          const email = normalizeEmailAddress(row.email);
          if (!isLikelyEmail(email)) return null;
          return (
            <input
              type="checkbox"
              checked={selectedAttendeeEmails.includes(email)}
              onChange={() => toggleAttendeeSelection(email)}
              aria-label={`Select ${row.name || row.email || 'attendee'}`}
            />
          );
        },
      },
      {
        key: 'name',
        label: 'Attendee',
        render: (row) => (
          <div>
            <p className="font-heading text-base text-foreground">{row.name || 'Unnamed attendee'}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground/70">
              {[row.company, row.role].filter(Boolean).join(' • ') || 'No role or company provided'}
            </p>
          </div>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        render: (row) =>
          row.email ? (
            <a href={`mailto:${row.email}`} className="font-mono text-xs text-primary hover:text-foreground">
              {row.email}
            </a>
          ) : (
            <span className="font-mono text-xs text-muted-foreground/70">No email</span>
          ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground/80">{row.status || 'n/a'}</span>,
      },
      {
        key: 'submittedAt',
        label: 'Submitted',
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground/80">
            {formatFeedDate(row.submittedAt) || row.submittedAt || 'Unknown'}
          </span>
        ),
      },
      {
        key: 'actions',
        label: '',
        render: (row) =>
          row.email ? (
            <button
              type="button"
              onClick={() => openAttendeeMailing([row.email])}
              className={`${outlineButtonClasses} opacity-0 transition group-hover/row:opacity-100 focus:opacity-100`}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </button>
          ) : null,
      },
    ],
    [allFilteredAttendeesSelected, openAttendeeMailing, selectedAttendeeEmails]
  );
  const attendeeRawColumns = useMemo(() => {
    const headers = Array.isArray(attendeeFeedQuery.data?.headers) ? attendeeFeedQuery.data.headers : [];
    return headers.slice(0, 8).map((header) => ({
      key: header,
      label: header,
      render: (row) => (
        <span className="font-mono text-xs leading-6 text-muted-foreground/85">
          {String(row?.[header] ?? '') || 'n/a'}
        </span>
      ),
    }));
  }, [attendeeFeedQuery.data?.headers]);

  const inlineEditor = {
    /**
     * @param {{ as?: React.ElementType, value?: unknown, fallback?: string, onChange?: (value: string) => void, className?: string, multiline?: boolean, ariaLabel?: string }} options
     */
    text({ as: Component = 'span', value, fallback = '', onChange, className = '', multiline = false, ariaLabel }) {
      const currentValue = String(value || '');
      const displayValue = currentValue || fallback;

      return (
        <Component
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={ariaLabel || 'Editable page text'}
          spellCheck
          className={`${className} cursor-text rounded-sm outline-none transition focus:bg-primary/10 focus:ring-2 focus:ring-primary/55`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onBlur={(event) => {
            const nextValue = String(event.currentTarget.textContent || '').trim();
            if (nextValue !== displayValue && typeof onChange === 'function') {
              onChange(nextValue);
            }
          }}
          onKeyDown={(event) => {
            if (!multiline && event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          onPaste={(event) => {
            const plainText = event.clipboardData.getData('text/plain');
            if (!plainText) return;
            event.preventDefault();
            document.execCommand('insertText', false, plainText);
          }}
        >
          {displayValue}
        </Component>
      );
    },
    setField,
    setListItemField,
  };

  const renderSiteCanvasPreview = () => {
    const selectBlock = (blockId) => {
      setSiteBuilderBlock(blockId);
      setSaveMessage(`Selected ${blockId.replace(/-/g, ' ')} on the live canvas.`);
    };

    const PreviewBlock = ({ blockId, label, children }) => (
      <div className="group/preview relative" onClickCapture={() => setSiteBuilderBlock(blockId)}>
        <button
          type="button"
          onClick={() => selectBlock(blockId)}
          className={`absolute left-5 top-5 z-[60] rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.24em] opacity-90 shadow-[0_0_24px_hsl(var(--primary)/0.12)] transition group-hover/preview:opacity-100 ${
            siteBuilderBlock === blockId
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-primary/35 bg-background/80 text-primary hover:bg-primary hover:text-primary-foreground'
          }`}
        >
          Edit {label}
        </button>
        <div
          className={`pointer-events-none absolute inset-0 z-[50] border-2 transition ${
            siteBuilderBlock === blockId
              ? 'border-primary/65 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]'
              : 'border-transparent group-hover/preview:border-primary/30'
          }`}
          aria-hidden="true"
        />
        {children}
      </div>
    );

    return (
      <div className="overflow-hidden rounded-[1.5rem] border border-primary/20 bg-background shadow-[0_24px_80px_hsl(var(--primary)/0.08)]">
        <div className="flex items-center justify-between border-b border-primary/10 bg-background/45 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
            Live Website Canvas - Click Text To Edit
          </p>
        </div>

        <div className="h-[760px] overflow-auto bg-background">
          <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
            <ParticleField preview />
            <HUDOverlay preview />
            <PreviewBlock blockId="hero" label="Hero">
              <Hero content={draft} editor={inlineEditor} />
            </PreviewBlock>
            <PreviewBlock blockId="sponsors" label="Sponsors">
              <SponsorsShowcase content={draft} editor={inlineEditor} onBecomeSponsorClick={() => setSiteBuilderBlock('sponsors')} />
            </PreviewBlock>
            <PreviewBlock blockId="organizations" label="Organizations">
              <CompanyLogos content={draft} editor={inlineEditor} />
            </PreviewBlock>
            <PreviewBlock blockId="agenda" label="Agenda">
              <AgendaTimeline content={draft} editor={inlineEditor} />
            </PreviewBlock>
            <PreviewBlock blockId="updates" label="Announcements">
              <AdminUpdatesSection content={draft} editor={inlineEditor} />
            </PreviewBlock>
            <PreviewBlock blockId="event-details" label="Event Intel">
              <EventInfo content={draft} editor={inlineEditor} />
            </PreviewBlock>
            <PreviewBlock blockId="registration" label="Registration">
              <RegistrationForm content={draft} editor={inlineEditor} />
            </PreviewBlock>
            <PreviewBlock blockId="footer" label="Footer">
              <Footer content={draft} editor={inlineEditor} />
            </PreviewBlock>
          </div>
        </div>
      </div>
    );
  };

  const renderEventCanvasPreview = () => {
    const visibleAgenda = (draft.agendaItems || [])
      .filter((item) => item.active !== false)
      .sort((left, right) => (left.order || 0) - (right.order || 0));

    return (
      <div className="overflow-hidden rounded-[1.5rem] border border-primary/20 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_34%),hsl(var(--background)/0.9)] shadow-[0_24px_80px_hsl(var(--primary)/0.08)]">
        <div className="flex items-center justify-between border-b border-primary/10 bg-background/45 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
            Live Event Preview
          </p>
        </div>

        <div className="max-h-[720px] space-y-4 overflow-y-auto p-5">
          <div className="rounded-[1.35rem] border border-primary/20 bg-background/45 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/75">
              Event Intel
            </p>
            <h3 className="mt-4 font-heading text-4xl text-foreground">
              {formatEventDateLabel(draft.eventConfig?.event_date)}
            </h3>
            <p className="mt-2 font-mono text-sm text-muted-foreground/85">
              {draft.eventConfig?.event_time || 'Event time not set'}
            </p>
            <div className="mt-5 rounded-xl border border-primary/15 bg-background/35 p-4">
              <p className="font-heading text-2xl text-foreground">
                {draft.eventConfig?.venue_name_line_1 || draft.eventConfig?.venue_name || 'Venue Name'}
              </p>
              {draft.eventConfig?.venue_name_line_2 ? (
                <p className="mt-1 font-mono text-xs text-primary/80">{draft.eventConfig.venue_name_line_2}</p>
              ) : null}
              <p className="mt-3 font-mono text-xs leading-6 text-muted-foreground/75">
                {draft.eventConfig?.venue_address || 'Venue address'}
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-primary/20 bg-background/30 p-4 font-mono text-xs text-muted-foreground/75">
              {normalizedMapEmbedUrl ? 'Google Maps embed connected' : 'Map embed preview will appear after a URL is added'}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-primary/20 bg-background/35 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/75">Schedule</p>
                <h3 className="mt-2 font-heading text-3xl text-foreground">The Agenda</h3>
              </div>
              <span className="rounded-full border border-primary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                {visibleAgenda.length} blocks
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {visibleAgenda.length ? visibleAgenda.slice(0, 6).map((item) => (
                <div key={item.id || item.title} className="rounded-xl border border-primary/15 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-heading text-xl text-foreground">{item.title || 'Untitled agenda item'}</p>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-primary/75">
                      {item.start_time || 'Time'}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs leading-6 text-muted-foreground/75">
                    {[item.speaker, item.company].filter(Boolean).join(' - ') || item.description || 'Agenda detail preview'}
                  </p>
                </div>
              )) : (
                <p className="font-mono text-xs leading-6 text-muted-foreground/75">No agenda blocks yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOverviewPage = () => (
    <div className="space-y-6">
      <Section
        eyebrow="Overview"
        title="Publishing Snapshot"
        description="Check public readiness, feed health, and the newest event activity without bouncing between admin pages."
        action={
          <button type="button" onClick={refreshFeedQueries} className={outlineButtonClasses}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Feeds
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Handshake} label="Active Sponsors" value={String(activeSponsorCount)} hint="Sponsor cards visible on the public site." />
          <StatCard icon={Users} label="Attendee Responses" value={String(attendees.length)} hint="Rows currently pulled from the attendee feed." />
          <StatCard icon={Inbox} label="Sponsor Leads" value={String(sponsorLeads.length)} hint="Private sponsor requests currently stored for admins." />
          <StatCard
            icon={ShieldCheck}
            label="Admin Guard"
            value={organizerGroupGuardStatus}
            hint={
              organizerGroupEmail
                ? `Organizers group: ${organizerGroupEmail}`
                : hasAdminRestriction
                  ? 'Email allowlist is active.'
                  : 'No admin access restriction is set yet.'
            }
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">Event Snapshot</p>
            <p className="mt-3 font-heading text-2xl text-foreground">{formatEventDateLabel(draft?.eventConfig?.event_date)}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground/70">{draft?.eventConfig?.event_time || 'Time not set yet'}</p>
            <p className="mt-4 font-mono text-xs leading-6 text-muted-foreground/70">
              {draft?.eventConfig?.venue_name_line_1 || draft?.eventConfig?.venue_name || 'Venue not set'}
              {draft?.eventConfig?.venue_address ? `, ${draft.eventConfig.venue_address}` : ''}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
                {hasRegistrationEmbed ? 'Registration Ready' : 'Registration Needs Setup'}
              </span>
              <span className="rounded-full border border-primary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
                {hasSponsorForm ? 'Sponsor Intake Ready' : 'Sponsor Intake Label Missing'}
              </span>
              <span className="rounded-full border border-primary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
                {normalizedMapEmbedUrl ? 'Map Ready' : 'Map Needs Review'}
              </span>
              <span className="rounded-full border border-primary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
                {activeAgendaCount ? `${activeAgendaCount} Agenda Items` : 'Agenda Empty'}
              </span>
            </div>
          </div>

          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">Operations Health</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-3">
                <span className="font-mono text-xs text-muted-foreground/75">Sponsor request inbox</span>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground">
                  {`${sponsorLeads.length} stored`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-3">
                <span className="font-mono text-xs text-muted-foreground/75">Attendee feed</span>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground">
                  {hasAttendeeFeed ? 'Connected' : 'Needs env'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-3">
                <span className="font-mono text-xs text-muted-foreground/75">Calendar feed</span>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground">
                  {hasCalendarFeed ? 'Connected' : 'Needs env'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-3">
                <span className="font-mono text-xs text-muted-foreground/75">SMTP delivery</span>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground">
                  {hasSmtpServer ? 'Ready' : 'Needs env'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-3">
                <span className="font-mono text-xs text-muted-foreground/75">Browser alerts</span>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground">
                  {browserAlertPermission === 'granted' ? 'Enabled' : 'Off'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs text-muted-foreground/75">Latest sponsor inquiry</span>
                <span className="font-mono text-xs text-foreground">
                  {latestSponsorLeadAt ? formatFeedDate(latestSponsorLeadAt) : 'None yet'}
                </span>
              </div>
            </div>
            <p className="mt-4 font-mono text-xs leading-6 text-muted-foreground/70">
              {organizerGroupEmail
                ? `Admin access is tied to ${organizerGroupEmail}.`
                : adminEmails.length
                  ? `Allowed admins: ${adminEmails.slice(0, 3).join(', ')}${adminEmails.length > 3 ? ` +${adminEmails.length - 3} more` : ''}`
                  : 'No admin access restriction is set in the environment yet.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
              Sponsor Request Inbox
            </p>
            <p className="mt-3 font-heading text-2xl text-foreground">
              {sponsorLeads.length ? `${sponsorLeads.length} requests` : 'No requests yet'}
            </p>
            <p className="mt-3 font-mono text-xs leading-6 text-muted-foreground/70">
              {latestSponsorLeadAt
                ? `Newest request arrived ${formatFeedDate(latestSponsorLeadAt)}.`
                : 'Sponsor requests submitted on the website will appear here for admins only.'}
            </p>
          </div>
          <FeedConnectionCard title="Attendee Feed" url={resolvedAttendeeFeedUrl} rowCount={attendees.length} format={attendeeFeedQuery.data?.format} fetchedAt={attendeeFeedQuery.data?.fetchedAt} error={attendeeFeedQuery.error?.message} />
        </div>
      </Section>

      <Section
        eyebrow="Google Workspace"
        title="Added Google Widgets"
        description="Widgets you add from Integrations appear here so Overview becomes the operational launchpad."
        action={<Link to="/admin/integrations" className={outlineButtonClasses}><Link2 className="mr-2 h-4 w-4" />Open Library</Link>}
      >
        {overviewGoogleIntegrationWidgets.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overviewGoogleIntegrationWidgets.map((widget) => {
              const WidgetIcon = widget.icon;
              return (
                <div key={widget.id} className="relative overflow-hidden rounded-[1.35rem] border border-primary/15 bg-background/35 p-5">
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                      <WidgetIcon className="h-5 w-5" />
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${
                        widget.connected
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-accent/35 bg-accent/10 text-accent'
                      }`}
                    >
                      {widget.connected ? 'Connected' : 'Needs setup'}
                    </span>
                  </div>
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.26em] text-primary/70">
                    {widget.label}
                  </p>
                  <h3 className="mt-2 font-heading text-2xl text-foreground">{widget.title}</h3>
                  <p className="mt-3 font-mono text-xs leading-6 text-muted-foreground/75">
                    {widget.description}
                  </p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
                    {widget.status}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openOverviewGoogleWidget(widget)}
                      className={primaryButtonClasses}
                    >
                      Configure
                    </button>
                    {widget.primaryUrl ? (
                      <a href={widget.primaryUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No Google widgets added yet"
            description="Open Integrations, add the Google Workspace widgets you want, and they will show up here."
          />
        )}
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section eyebrow="Latest Sponsor Interest" title="Lead Inbox Preview" description="Quick look at the newest sponsor requests submitted through the website intake form.">
          <DataTable columns={sponsorLeadColumns} rows={filteredSponsorLeads.slice(0, 5)} emptyTitle="No sponsor inquiries yet" emptyDescription="When a company submits the sponsor request form on the website, the request will appear here and in the Sponsors page." />
        </Section>
        <Section eyebrow="Latest Registrations" title="Attendee Preview" description="Recent attendee responses flowing in from your registration response feed.">
          <DataTable columns={attendeeColumns} rows={filteredAttendees.slice(0, 5)} emptyTitle="No attendee responses yet" emptyDescription="Connect the attendee response feed to start surfacing your roster here." />
        </Section>
      </div>
    </div>
  );

  const renderSitePage = () => {
    const siteBlocks = [
      { id: 'hero', title: 'Hero', description: 'Main title, subtitle, countdown, and CTA.', icon: Sparkles },
      { id: 'sponsors', title: 'Sponsor Section', description: 'Premium sponsor copy and button preview.', icon: Handshake },
      { id: 'organizations', title: 'Organizations', description: 'Industry guest strip and labels.', icon: Building2 },
      { id: 'agenda', title: 'Agenda', description: 'Sessions, breaks, and workshop blocks.', icon: LayoutDashboard },
      { id: 'event-details', title: 'Event Intel', description: 'Date, time, venue, map, and directions.', icon: CalendarDays },
      { id: 'updates', title: 'Announcements', description: 'Public alerts and live homepage notices.', icon: BellRing },
      { id: 'registration', title: 'Registration', description: 'Copy around the Google Form embed.', icon: Users },
      { id: 'footer', title: 'Footer', description: 'Support, accessibility, and ownership copy.', icon: Globe2 },
    ];
    const activeBlock = siteBlocks.find((block) => block.id === siteBuilderBlock) || siteBlocks[0];
    const ActiveSiteBlockIcon = activeBlock.icon;
    const addPageComponent = (type) => {
      const componentLabel = {
        sponsor: 'sponsor card',
        organization: 'organization logo',
        agenda: 'agenda session',
        announcement: 'announcement',
      }[type] || 'component';

      updateDraft((prev) => {
        if (type === 'sponsor') {
          return {
            ...prev,
            sponsors: [
              ...(prev.sponsors || []),
              {
                id: createId('sponsor'),
                name: 'New Sponsor',
                logo_url: '',
                website_url: '',
                highlight: 'Sponsors',
                contact_name: '',
                email: '',
                phone: '',
                support_amount: '',
                interest_notes: '',
                bring_swag: false,
                venue_branding: false,
                vip: false,
                logo_background: 'transparent',
                logo_background_color: sponsorLogoBackgroundDefaultColor,
                logo_scale: 110,
                presentation_logo_scale: 100,
                presentation_logo_spacing_left_px: 28,
                presentation_logo_spacing_right_px: 28,
                logo_offset_x: 0,
                logo_offset_y: 0,
                order: (prev.sponsors || []).length + 1,
                active: true,
              },
            ],
          };
        }

        if (type === 'organization') {
          return {
            ...prev,
            organizations: [
              ...(prev.organizations || []),
              {
                id: createId('org'),
                name: 'New Organization',
                order: (prev.organizations || []).length + 1,
                active: true,
              },
            ],
          };
        }

        if (type === 'agenda') {
          return {
            ...prev,
            agendaItems: [
              ...(prev.agendaItems || []),
              {
                id: createId('agenda'),
                order: (prev.agendaItems || []).length + 1,
                title: 'New Agenda Session',
                description: 'Add the session details here.',
                speaker: '',
                company: '',
                session_label: 'SESSION',
                start_time: '',
                end_time: '',
                session_type: 'panel',
                presentation_hide_description: false,
                presentation_panelist_font_scale: 120,
                active: true,
              },
            ],
          };
        }

        if (type === 'announcement') {
          return {
            ...prev,
            adminUpdates: [
              ...(prev.adminUpdates || []),
              {
                id: createId('update'),
                message: 'New homepage announcement.',
                priority: 'normal',
                active: true,
                created_date: new Date().toISOString(),
              },
            ],
          };
        }

        return prev;
      });

      setSiteBuilderBlock(
        type === 'announcement'
          ? 'updates'
          : type === 'organization'
            ? 'organizations'
            : type === 'sponsor'
              ? 'sponsors'
              : type
      );
      setSaveMessage(`Added a new ${componentLabel}. Edit it directly on the canvas or open Block Tools.`);
    };
    const addComponentOptions = [
      {
        type: 'agenda',
        title: 'Agenda Session',
        description: 'Add a new schedule card to The Agenda.',
        icon: LayoutDashboard,
      },
      {
        type: 'announcement',
        title: 'Announcement',
        description: 'Add a new public homepage alert.',
        icon: BellRing,
      },
      {
        type: 'organization',
        title: 'Organization Logo',
        description: 'Add a name to the participating organizations strip.',
        icon: Building2,
      },
      {
        type: 'sponsor',
        title: 'Sponsor Card',
        description: 'Create a new premium sponsor card.',
        icon: Handshake,
      },
    ];

    const renderInspector = () => {
      switch (activeBlock.id) {
        case 'sponsors':
          return (
            <div className="space-y-3">
              <input className={fieldClasses} value={draft.sponsorsSection?.eyebrow || ''} onChange={(event) => setField('sponsorsSection', 'eyebrow', event.target.value)} placeholder="Eyebrow label" />
              <input className={fieldClasses} value={draft.sponsorsSection?.heading || ''} onChange={(event) => setField('sponsorsSection', 'heading', event.target.value)} placeholder="Section heading" />
              <textarea className={`${fieldClasses} min-h-28`} value={draft.sponsorsSection?.description || ''} onChange={(event) => setField('sponsorsSection', 'description', event.target.value)} placeholder="Section description" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={fieldClasses}
                  value={draft.sponsorsSection?.sponsor_link_label || ''}
                  onChange={(event) =>
                    setField('sponsorsSection', 'sponsor_link_label', event.target.value)
                  }
                  placeholder="Label when website exists (e.g. Visit Website)"
                />
                <input
                  className={fieldClasses}
                  value={draft.sponsorsSection?.sponsor_profile_label || ''}
                  onChange={(event) =>
                    setField('sponsorsSection', 'sponsor_profile_label', event.target.value)
                  }
                  placeholder="Label when no website (e.g. Profile)"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={fieldClasses}
                  value={draft.sponsorsSection?.vip_group_label || ''}
                  onChange={(event) =>
                    setField('sponsorsSection', 'vip_group_label', event.target.value)
                  }
                  placeholder="Powered-by group label"
                />
                <input
                  className={fieldClasses}
                  value={draft.sponsorsSection?.vip_group_subtitle || ''}
                  onChange={(event) =>
                    setField('sponsorsSection', 'vip_group_subtitle', event.target.value)
                  }
                  placeholder="Powered-by subtitle label"
                />
                <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-primary/15 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={draft.sponsorsSection?.hide_vip_group_subtitle === true}
                    onChange={(event) =>
                      setField(
                        'sponsorsSection',
                        'hide_vip_group_subtitle',
                        event.target.checked
                      )
                    }
                  />
                  Hide powered-by subtitle on public page
                </label>
              </div>
              <div className={itemCardClasses}>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Sponsor Button</p>
                <p className="font-heading text-xl text-foreground">{sponsorCtaLabel}</p>
                <p className="font-mono text-xs leading-6 text-muted-foreground/75">
                  Edit this label from Integrations. Sponsor cards are managed from Sponsors.
                </p>
              </div>
            </div>
          );
        case 'organizations':
          return (
            <div className="space-y-3">
              <input className={fieldClasses} value={draft.organizationsSection?.heading || ''} onChange={(event) => setField('organizationsSection', 'heading', event.target.value)} placeholder="Section heading" />
              <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={draft.organizationsSection?.hide_organizations_section === true}
                  onChange={(event) =>
                    setField('organizationsSection', 'hide_organizations_section', event.target.checked)
                  }
                />
                Hide Industry Guests section on public page
              </label>
              <button type="button" onClick={() => updateDraft((prev) => ({ ...prev, organizations: [...(prev.organizations || []), { id: createId('org'), name: '', order: (prev.organizations || []).length + 1, active: true }] }))} className={outlineButtonClasses}>Add Organization Block</button>
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {draft.organizations?.length ? draft.organizations.map((organization, index) => (
                  <div key={organization.id || index} className={itemCardClasses}>
                    <input className={fieldClasses} value={organization.name || ''} onChange={(event) => setListItemField('organizations', index, 'name', event.target.value)} placeholder="Organization name" />
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input type="number" min="1" className={fieldClasses} value={organization.order ?? index + 1} onChange={(event) => setListItemField('organizations', index, 'order', Number(event.target.value))} placeholder="Order" />
                      <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={organization.active !== false} onChange={(event) => setListItemField('organizations', index, 'active', event.target.checked)} />
                        Active
                      </label>
                    </div>
                    <button type="button" onClick={() => removeListItem('organizations', index)} className={dangerButtonClasses}>Remove</button>
                  </div>
                )) : <EmptyState title="No organizations yet" description="Add a block to populate the industry guest strip." />}
              </div>
            </div>
          );
        case 'agenda':
          return (
            <div className="space-y-3">
              <button type="button" onClick={() => updateDraft((prev) => ({ ...prev, agendaItems: [...(prev.agendaItems || []), { id: createId('agenda'), order: (prev.agendaItems || []).length + 1, title: '', description: '', speaker: '', company: '', session_label: '', start_time: '', end_time: '', session_type: 'panel', presentation_hide_description: false, presentation_panelist_font_scale: 120, active: true }] }))} className={outlineButtonClasses}>Add Agenda Block</button>
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {draft.agendaItems?.length ? draft.agendaItems.map((item, index) => (
                  <div key={item.id || index} className={itemCardClasses}>
                    <div className="grid gap-3 sm:grid-cols-[90px_minmax(0,1fr)]">
                      <input type="number" min="1" className={fieldClasses} value={item.order ?? index + 1} onChange={(event) => setListItemField('agendaItems', index, 'order', Number(event.target.value))} placeholder="Order" />
                      <input className={fieldClasses} value={item.title || ''} onChange={(event) => setListItemField('agendaItems', index, 'title', event.target.value)} placeholder="Session title" />
                    </div>
                    <textarea className={`${fieldClasses} min-h-20`} value={item.description || ''} onChange={(event) => setListItemField('agendaItems', index, 'description', event.target.value)} placeholder="Description" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className={fieldClasses} value={item.speaker || ''} onChange={(event) => setListItemField('agendaItems', index, 'speaker', event.target.value)} placeholder="Speaker" />
                      <input className={fieldClasses} value={item.company || ''} onChange={(event) => setListItemField('agendaItems', index, 'company', event.target.value)} placeholder="Company" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input className={fieldClasses} value={item.start_time || ''} onChange={(event) => setListItemField('agendaItems', index, 'start_time', event.target.value)} placeholder="Start time" />
                      <input className={fieldClasses} value={item.end_time || ''} onChange={(event) => setListItemField('agendaItems', index, 'end_time', event.target.value)} placeholder="End time" />
                      <select className={fieldClasses} value={item.session_type || 'panel'} onChange={(event) => setListItemField('agendaItems', index, 'session_type', event.target.value)}>
                        <option value="keynote">keynote</option>
                        <option value="panel">panel</option>
                        <option value="workshop">workshop</option>
                        <option value="networking">networking</option>
                      </select>
                    </div>
                    <input className={fieldClasses} value={item.session_label || ''} onChange={(event) => setListItemField('agendaItems', index, 'session_label', event.target.value)} placeholder="Optional label" />
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={item.active !== false} onChange={(event) => setListItemField('agendaItems', index, 'active', event.target.checked)} />
                        Active
                      </label>
                      <button type="button" onClick={() => removeListItem('agendaItems', index)} className={dangerButtonClasses}>Remove</button>
                    </div>
                  </div>
                )) : <EmptyState title="No agenda blocks yet" description="Add the first agenda block to start shaping the public schedule." />}
              </div>
            </div>
          );
        case 'event-details':
          return (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="date" className={fieldClasses} value={draft.eventConfig?.event_date || ''} onChange={(event) => setField('eventConfig', 'event_date', event.target.value)} />
                <input className={fieldClasses} value={draft.eventConfig?.event_time || ''} onChange={(event) => setField('eventConfig', 'event_time', event.target.value)} placeholder="Event time" />
              </div>
              <input className={fieldClasses} value={draft.eventConfig?.venue_name_line_1 || draft.eventConfig?.venue_name || ''} onChange={(event) => updateDraft((prev) => ({ ...prev, eventConfig: { ...prev.eventConfig, venue_name_line_1: event.target.value, venue_name: event.target.value } }))} placeholder="Venue title line 1" />
              <input className={fieldClasses} value={draft.eventConfig?.venue_name_line_2 || ''} onChange={(event) => setField('eventConfig', 'venue_name_line_2', event.target.value)} placeholder="Venue title line 2" />
              <input className={fieldClasses} value={draft.eventConfig?.venue_address || ''} onChange={(event) => setField('eventConfig', 'venue_address', event.target.value)} placeholder="Venue address" />
              <div className="border-t border-primary/10 pt-3">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Map And Directions</p>
                <textarea className={`${fieldClasses} min-h-24 font-mono text-xs`} value={draft.eventConfig?.google_maps_embed_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_embed_url', event.target.value)} placeholder="Google Maps iframe HTML or iframe src URL" />
                <input className={fieldClasses} value={draft.eventConfig?.google_maps_place_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_place_url', event.target.value)} placeholder="Google Maps place link" />
                <input className={fieldClasses} value={draft.eventConfig?.google_maps_place_id || ''} onChange={(event) => setField('eventConfig', 'google_maps_place_id', event.target.value)} placeholder="Optional Google Place ID" />
                <input className={fieldClasses} value={draft.eventConfig?.google_maps_directions_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_directions_url', event.target.value)} placeholder="Optional directions URL" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {normalizedPlaceUrl ? <a href={normalizedPlaceUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><ExternalLink className="mr-2 h-4 w-4" />Preview Venue</a> : null}
                {placeIdDirectionsPreview || normalizedDirectionsUrl ? <a href={placeIdDirectionsPreview || normalizedDirectionsUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><ExternalLink className="mr-2 h-4 w-4" />Preview Directions</a> : null}
              </div>
            </div>
          );
        case 'updates':
          return (
            <div className="space-y-3">
              <button type="button" onClick={() => updateDraft((prev) => ({ ...prev, adminUpdates: [...(prev.adminUpdates || []), { id: createId('update'), message: '', priority: 'normal', active: true, created_date: new Date().toISOString() }] }))} className={outlineButtonClasses}>Add Announcement Block</button>
              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {draft.adminUpdates?.length ? draft.adminUpdates.map((item, index) => (
                  <div key={item.id || index} className={itemCardClasses}>
                    <textarea className={`${fieldClasses} min-h-20`} value={item.message || ''} onChange={(event) => setListItemField('adminUpdates', index, 'message', event.target.value)} placeholder="Announcement message" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select className={fieldClasses} value={item.priority || 'normal'} onChange={(event) => setListItemField('adminUpdates', index, 'priority', event.target.value)}>
                        <option value="normal">normal</option>
                        <option value="urgent">urgent</option>
                      </select>
                      <input type="datetime-local" className={fieldClasses} value={toDateTimeLocal(item.created_date)} onChange={(event) => setListItemField('adminUpdates', index, 'created_date', fromDateTimeLocal(event.target.value))} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={item.active !== false} onChange={(event) => setListItemField('adminUpdates', index, 'active', event.target.checked)} />
                        Active
                      </label>
                      <button type="button" onClick={() => removeListItem('adminUpdates', index)} className={dangerButtonClasses}>Remove</button>
                    </div>
                  </div>
                )) : <EmptyState title="No announcements yet" description="Add a public announcement block to show on the homepage." />}
              </div>
            </div>
          );
        case 'registration':
          return (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={fieldClasses} value={draft.registration?.heading_top || ''} onChange={(event) => setField('registration', 'heading_top', event.target.value)} placeholder="Heading top" />
                <input className={fieldClasses} value={draft.registration?.heading_bottom || ''} onChange={(event) => setField('registration', 'heading_bottom', event.target.value)} placeholder="Heading bottom" />
              </div>
              <textarea className={`${fieldClasses} min-h-28`} value={draft.registration?.description || ''} onChange={(event) => setField('registration', 'description', event.target.value)} placeholder="Registration description" />
              <input className={fieldClasses} value={draft.registration?.placeholder_title || ''} onChange={(event) => setField('registration', 'placeholder_title', event.target.value)} placeholder="Placeholder title" />
              <input className={fieldClasses} value={draft.registration?.placeholder_note || ''} onChange={(event) => setField('registration', 'placeholder_note', event.target.value)} placeholder="Placeholder note" />
              <p className="font-mono text-xs leading-6 text-muted-foreground/75">
                Connect the actual Google Form embed from Integrations.
              </p>
            </div>
          );
        case 'footer':
          return (
            <div className="space-y-3">
              <input className={fieldClasses} value={draft.footer?.brand_name || ''} onChange={(event) => setField('footer', 'brand_name', event.target.value)} placeholder="Brand name" />
              <input className={fieldClasses} value={draft.footer?.copyright_template || ''} onChange={(event) => setField('footer', 'copyright_template', event.target.value)} placeholder="Copyright template (use {year})" />
              <input className={fieldClasses} value={draft.footer?.organization_text || ''} onChange={(event) => setField('footer', 'organization_text', event.target.value)} placeholder="Organization text" />
              <input className={fieldClasses} value={draft.footer?.accessibility_help_text || ''} onChange={(event) => setField('footer', 'accessibility_help_text', event.target.value)} placeholder="Accessibility help text" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={fieldClasses} value={draft.footer?.accessibility_email || ''} onChange={(event) => setField('footer', 'accessibility_email', event.target.value)} placeholder="Accessibility email" />
                <input className={fieldClasses} value={draft.footer?.accessibility_phone || ''} onChange={(event) => setField('footer', 'accessibility_phone', event.target.value)} placeholder="Accessibility phone" />
              </div>
            </div>
          );
        case 'hero':
        default:
          return (
            <div className="space-y-3">
              <input className={fieldClasses} value={draft.hero?.pretitle || ''} onChange={(event) => setField('hero', 'pretitle', event.target.value)} placeholder="Pretitle" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={fieldClasses} value={draft.hero?.title_line_1 || ''} onChange={(event) => setField('hero', 'title_line_1', event.target.value)} placeholder="Title line 1" />
                <input className={fieldClasses} value={draft.hero?.title_line_2 || ''} onChange={(event) => setField('hero', 'title_line_2', event.target.value)} placeholder="Title line 2" />
              </div>
              <textarea className={`${fieldClasses} min-h-28`} value={draft.hero?.subtitle || ''} onChange={(event) => setField('hero', 'subtitle', event.target.value)} placeholder="Subtitle" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={fieldClasses} value={draft.hero?.countdown_target || ''} onChange={(event) => setField('hero', 'countdown_target', event.target.value)} placeholder="Countdown target" />
                <input className={fieldClasses} value={draft.hero?.cta_label || ''} onChange={(event) => setField('hero', 'cta_label', event.target.value)} placeholder="Primary CTA label" />
              </div>
            </div>
          );
      }
    };

    return (
      <div className="space-y-6">
        <Section eyebrow="Page Builder" title="Homepage Canvas" description="Click the real text on the website canvas to edit it directly. Use Block Tools only when you need to add, remove, reorder, or configure structured content.">
          <div className="min-w-0 space-y-4">
            <div className="flex justify-end">
              <details className="group/add relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] text-primary shadow-[0_0_28px_hsl(var(--primary)/0.08)] transition hover:bg-primary hover:text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  Add Component
                </summary>
                <div className="absolute right-0 z-[80] mt-3 w-[min(24rem,calc(100vw-3rem))] overflow-hidden rounded-[1.35rem] border border-primary/25 bg-background/95 p-2 shadow-[0_24px_80px_hsl(var(--background)/0.88)] backdrop-blur">
                  {addComponentOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => addPageComponent(option.type)}
                        className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-primary/10"
                      >
                        <span className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                          <OptionIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-heading text-lg text-foreground">{option.title}</span>
                          <span className="mt-1 block font-mono text-[11px] leading-5 text-muted-foreground/75">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>

            {renderSiteCanvasPreview()}

            <details className={`${itemCardClasses} group/tools`} open={false}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    <ActiveSiteBlockIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">Block Tools</p>
                    <h3 className="font-heading text-2xl text-foreground">{activeBlock.title}</h3>
                  </div>
                </div>
                <span className="rounded-full border border-primary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition group-open/tools:text-primary">
                  Add / reorder
                </span>
              </summary>
              <p className="mt-3 font-mono text-xs leading-6 text-muted-foreground/70">
                Use these controls only for structured changes. For copy edits, click the text directly in the canvas above.
              </p>
              <div className="mt-4">
                {renderInspector()}
              </div>
            </details>
          </div>
        </Section>
      </div>
    );
  };

  const renderPresentationPage = () => {
    const selectedPresentationEntry =
      presentationSponsorEntries[selectedPresentationSponsorIndex] || null;
    const selectedPresentationSponsor = selectedPresentationEntry?.sponsor || null;
    const selectedPresentationSponsorDataIndex = selectedPresentationEntry?.index ?? -1;
    const selectedPresentationLogoScale = clampPresentationLogoScale(
      selectedPresentationSponsor?.presentation_logo_scale
    );
    const selectedPresentationLogoLeftSpacing = clampPresentationLogoSpacingPx(
      selectedPresentationSponsor?.presentation_logo_spacing_left_px
    );
    const selectedPresentationLogoRightSpacing = clampPresentationLogoSpacingPx(
      selectedPresentationSponsor?.presentation_logo_spacing_right_px
    );
    const selectedPresentationLogoHeight = Math.round((96 * selectedPresentationLogoScale) / 100);
    const selectedPresentationLogoMaxWidth = Math.round((420 * selectedPresentationLogoScale) / 100);
    const presentationMarqueeDurationSeconds = clampPresentationMarqueeDuration(
      draft?.hero?.presentation_marquee_duration_seconds
    );

    const updateSelectedPresentationScale = (value) => {
      if (selectedPresentationSponsorDataIndex < 0) return;
      setPresentationLogoScale(selectedPresentationSponsorDataIndex, value);
    };
    const updateSelectedPresentationLeftSpacing = (value) => {
      if (selectedPresentationSponsorDataIndex < 0) return;
      setPresentationLogoSpacing(selectedPresentationSponsorDataIndex, 'left', value);
    };
    const updateSelectedPresentationRightSpacing = (value) => {
      if (selectedPresentationSponsorDataIndex < 0) return;
      setPresentationLogoSpacing(selectedPresentationSponsorDataIndex, 'right', value);
    };
    const updatePresentationMarqueeDuration = (value) => {
      setField(
        'hero',
        'presentation_marquee_duration_seconds',
        clampPresentationMarqueeDuration(value)
      );
    };

    const orderedPresentationAgendaItems = (draft?.agendaItems || [])
      .map((item, index) => ({ ...item, __index: index }))
      .filter((item) => item.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const panelPresentationItems = orderedPresentationAgendaItems.filter((item) =>
      isPresentationPanelAgendaItem(item)
    );
    const kahootPresentationItems = orderedPresentationAgendaItems.filter((item) =>
      isPresentationInteractiveAgendaItem(item)
    );
    const networkingPresentationItem =
      orderedPresentationAgendaItems.find((item) => isPresentationNetworkingAgendaItem(item)) || null;

    const presentationToolSlides = [
      {
        id: 'intro',
        title: 'Intro & Marquee',
        shortLabel: 'Intro',
        type: 'intro',
        agendaItem: null,
      },
      {
        id: 'panel-1',
        title: 'Panel 1',
        shortLabel: 'Panel 1',
        type: 'agenda',
        agendaItem: panelPresentationItems[0] || null,
      },
      {
        id: 'kahoot-1',
        title: 'Kahoot 1',
        shortLabel: 'Kahoot 1',
        type: 'agenda',
        agendaItem: kahootPresentationItems[0] || null,
      },
      {
        id: 'panel-2',
        title: 'Panel 2',
        shortLabel: 'Panel 2',
        type: 'agenda',
        agendaItem: panelPresentationItems[1] || null,
      },
      {
        id: 'kahoot-2',
        title: 'Kahoot 2',
        shortLabel: 'Kahoot 2',
        type: 'agenda',
        agendaItem: kahootPresentationItems[1] || null,
      },
      {
        id: 'networking',
        title: 'Networking',
        shortLabel: 'Networking',
        type: 'agenda',
        agendaItem: networkingPresentationItem,
      },
    ];

    const clampedPresentationSlideIndex = Math.max(
      0,
      Math.min(presentationPreviewSlideIndex, presentationToolSlides.length - 1)
    );
    const activePresentationToolSlide =
      presentationToolSlides[clampedPresentationSlideIndex] || presentationToolSlides[0];
    const activePresentationAgendaItem = activePresentationToolSlide?.agendaItem || null;
    const activePresentationAgendaDataIndex = Number.isInteger(activePresentationAgendaItem?.__index)
      ? activePresentationAgendaItem.__index
      : -1;

    const setActivePresentationAgendaField = (key, value) => {
      if (activePresentationAgendaDataIndex < 0) return;
      setListItemField('agendaItems', activePresentationAgendaDataIndex, key, value);
    };

    const ActivePresentationToolIcon =
      activePresentationToolSlide?.type === 'intro' ? Eye : LayoutDashboard;
    const isPanelPresentationToolSlide =
      activePresentationToolSlide?.id === 'panel-1' ||
      activePresentationToolSlide?.id === 'panel-2';
    const buildPresentationToolPanelists = () => {
      const sourceRows = Array.isArray(activePresentationAgendaItem?.panelists)
        ? activePresentationAgendaItem.panelists.filter((row) => row?.active !== false)
        : [];

      return Array.from({ length: 3 }, (_unused, index) => {
        const source = sourceRows[index] && typeof sourceRows[index] === 'object' ? sourceRows[index] : {};
        return {
          id: String(source.id || `presentation-panelist-${activePresentationAgendaDataIndex}-${index + 1}`),
          name: String(source.name || ''),
          role: String(source.role || ''),
          company: String(source.company || ''),
          bio: String(source.bio || ''),
          active: true,
        };
      });
    };
    const editablePresentationPanelists = buildPresentationToolPanelists();
    const setPresentationPanelistField = (panelistIndex, key, value) => {
      if (activePresentationAgendaDataIndex < 0) return;
      if (!Number.isInteger(panelistIndex) || panelistIndex < 0 || panelistIndex > 2) return;

      const nextPanelists = buildPresentationToolPanelists();
      nextPanelists[panelistIndex] = {
        ...nextPanelists[panelistIndex],
        [key]: value,
        active: true,
      };
      setListItemField('agendaItems', activePresentationAgendaDataIndex, 'panelists', nextPanelists);
    };

    const renderIntroControls = () => (
      <div className="space-y-4">
        <div className="space-y-3">
          <input
            className={fieldClasses}
            value={draft.hero?.pretitle || ''}
            onChange={(event) => setField('hero', 'pretitle', event.target.value)}
            placeholder="Pretitle"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={fieldClasses}
              value={draft.hero?.title_line_1 || ''}
              onChange={(event) => setField('hero', 'title_line_1', event.target.value)}
              placeholder="Title line 1"
            />
            <input
              className={fieldClasses}
              value={draft.hero?.title_line_2 || ''}
              onChange={(event) => setField('hero', 'title_line_2', event.target.value)}
              placeholder="Title line 2"
            />
          </div>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              Marquee Loop Duration ({presentationMarqueeDurationSeconds}s)
            </span>
            <input
              type="range"
              min="20"
              max="240"
              step="1"
              className="w-full accent-primary"
              value={presentationMarqueeDurationSeconds}
              onChange={(event) => updatePresentationMarqueeDuration(Number(event.target.value))}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="20"
                max="240"
                className={`${fieldClasses} w-32`}
                value={presentationMarqueeDurationSeconds}
                onChange={(event) => updatePresentationMarqueeDuration(Number(event.target.value))}
              />
              <span className="font-mono text-[11px] text-muted-foreground/75">Lower is faster.</span>
            </div>
          </label>
        </div>

        <div className="rounded-xl border border-primary/15 bg-background/35 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              Marquee Sponsors
            </p>
            <span className="rounded-full border border-primary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
              {presentationSponsorEntries.length}
            </span>
          </div>

          {presentationSponsorEntries.length ? (
            <>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {presentationSponsorEntries.map(({ sponsor, index }, listIndex) => {
                  const isActive = listIndex === selectedPresentationSponsorIndex;
                  const scale = clampPresentationLogoScale(sponsor?.presentation_logo_scale);
                  const leftSpacing = clampPresentationLogoSpacingPx(
                    sponsor?.presentation_logo_spacing_left_px
                  );
                  const rightSpacing = clampPresentationLogoSpacingPx(
                    sponsor?.presentation_logo_spacing_right_px
                  );

                  return (
                    <button
                      key={sponsor.id || `presentation-sponsor-${index}`}
                      type="button"
                      onClick={() => setSelectedPresentationSponsorIndex(listIndex)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                        isActive
                          ? 'border-primary/45 bg-primary/12 text-foreground'
                          : 'border-primary/15 bg-background/35 text-muted-foreground hover:border-primary/30 hover:bg-background/55 hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-heading text-base text-foreground">
                          {sponsor.name || 'Unnamed sponsor'}
                        </p>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
                          {scale}% | L{leftSpacing}/R{rightSpacing}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedPresentationSponsor ? (
                <div className="mt-4 space-y-3">
                  <div className="h-32 overflow-hidden rounded-full border border-primary/30 bg-[rgba(237,239,242,0.93)] px-4">
                    <div className="flex h-full items-center justify-center overflow-hidden">
                      <div
                        className="flex h-full shrink-0 items-center"
                        style={{
                          paddingLeft: `${selectedPresentationLogoLeftSpacing}px`,
                          paddingRight: `${selectedPresentationLogoRightSpacing}px`,
                        }}
                      >
                        {selectedPresentationSponsor.logo_url ? (
                          <img
                            src={selectedPresentationSponsor.logo_url}
                            alt={`${selectedPresentationSponsor.name || 'Sponsor'} logo preview`}
                            className="w-auto object-contain opacity-95"
                            style={{
                              height: `${selectedPresentationLogoHeight}px`,
                              maxWidth: `${selectedPresentationLogoMaxWidth}px`,
                              filter:
                                'drop-shadow(0 0 6px rgba(0,0,0,0.2)) drop-shadow(0 0 1px rgba(0,0,0,0.25))',
                            }}
                          />
                        ) : (
                          <p
                            className="font-heading uppercase tracking-[0.16em] text-slate-900/85"
                            style={{
                              fontSize: `${Math.round((36 * selectedPresentationLogoScale) / 100)}px`,
                              lineHeight: 1,
                              textShadow: '0 0 6px rgba(0,0,0,0.2)',
                            }}
                          >
                            {selectedPresentationSponsor.name || 'Sponsor'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <label className="block space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                      Presentation Logo Size ({selectedPresentationLogoScale}%)
                    </span>
                    <input
                      type="range"
                      min="50"
                      max="240"
                      step="1"
                      className="w-full accent-primary"
                      value={selectedPresentationLogoScale}
                      onChange={(event) =>
                        updateSelectedPresentationScale(Number(event.target.value))
                      }
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="50"
                      max="240"
                      className={`${fieldClasses} w-32`}
                      value={selectedPresentationLogoScale}
                      onChange={(event) =>
                        updateSelectedPresentationScale(Number(event.target.value))
                      }
                    />
                    <button
                      type="button"
                      className={outlineButtonClasses}
                      onClick={() => updateSelectedPresentationScale(100)}
                    >
                      Reset To 100%
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                        Left Space ({selectedPresentationLogoLeftSpacing}px)
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="240"
                        step="1"
                        className="w-full accent-primary"
                        value={selectedPresentationLogoLeftSpacing}
                        onChange={(event) =>
                          updateSelectedPresentationLeftSpacing(Number(event.target.value))
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        max="240"
                        className={fieldClasses}
                        value={selectedPresentationLogoLeftSpacing}
                        onChange={(event) =>
                          updateSelectedPresentationLeftSpacing(Number(event.target.value))
                        }
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                        Right Space ({selectedPresentationLogoRightSpacing}px)
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="240"
                        step="1"
                        className="w-full accent-primary"
                        value={selectedPresentationLogoRightSpacing}
                        onChange={(event) =>
                          updateSelectedPresentationRightSpacing(Number(event.target.value))
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        max="240"
                        className={fieldClasses}
                        value={selectedPresentationLogoRightSpacing}
                        onChange={(event) =>
                          updateSelectedPresentationRightSpacing(Number(event.target.value))
                        }
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className={outlineButtonClasses}
                    onClick={() => {
                      updateSelectedPresentationLeftSpacing(28);
                      updateSelectedPresentationRightSpacing(28);
                    }}
                  >
                    Reset Spacing To 28px
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No active marquee logos"
              description="Publish sponsor cards with a name or logo URL to manage their presentation marquee size."
            />
          )}
        </div>
      </div>
    );

    const renderAgendaSlideControls = () => {
      if (!activePresentationAgendaItem) {
        return (
          <EmptyState
            title={`No ${activePresentationToolSlide.shortLabel.toLowerCase()} agenda item`}
            description="This presentation page maps to active agenda blocks. Add or activate a matching agenda item to edit it here."
          />
        );
      }
      const hideSessionDescription = Boolean(activePresentationAgendaItem.presentation_hide_description);
      const panelCardTextScale = clampPresentationPanelistFontScale(
        activePresentationAgendaItem.presentation_panelist_font_scale
      );

      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={fieldClasses}
              value={activePresentationAgendaItem.session_label || ''}
              onChange={(event) => setActivePresentationAgendaField('session_label', event.target.value)}
              placeholder="Session label"
            />
            <select
              className={fieldClasses}
              value={activePresentationAgendaItem.session_type || 'panel'}
              onChange={(event) => setActivePresentationAgendaField('session_type', event.target.value)}
            >
              <option value="panel">panel</option>
              <option value="interactive">interactive</option>
              <option value="kahoot">kahoot</option>
              <option value="networking">networking</option>
              <option value="workshop">workshop</option>
              <option value="keynote">keynote</option>
              <option value="break">break</option>
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/35 px-3 py-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={hideSessionDescription}
              onChange={(event) =>
                setActivePresentationAgendaField(
                  'presentation_hide_description',
                  event.target.checked
                )
              }
            />
            Hide session description on this slide
          </label>

          <input
            className={fieldClasses}
            value={activePresentationAgendaItem.title || ''}
            onChange={(event) => setActivePresentationAgendaField('title', event.target.value)}
            placeholder="Session title"
          />

          <textarea
            className={`${fieldClasses} min-h-28`}
            value={activePresentationAgendaItem.description || ''}
            onChange={(event) => setActivePresentationAgendaField('description', event.target.value)}
            placeholder="Session description"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={fieldClasses}
              value={activePresentationAgendaItem.speaker || ''}
              onChange={(event) => setActivePresentationAgendaField('speaker', event.target.value)}
              placeholder="Speaker"
            />
            <input
              className={fieldClasses}
              value={activePresentationAgendaItem.company || ''}
              onChange={(event) => setActivePresentationAgendaField('company', event.target.value)}
              placeholder="Company"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={fieldClasses}
              value={activePresentationAgendaItem.start_time || ''}
              onChange={(event) => setActivePresentationAgendaField('start_time', event.target.value)}
              placeholder="Start time"
            />
            <input
              className={fieldClasses}
              value={activePresentationAgendaItem.end_time || ''}
              onChange={(event) => setActivePresentationAgendaField('end_time', event.target.value)}
              placeholder="End time"
            />
          </div>

          {isPanelPresentationToolSlide ? (
            <div className="space-y-3 rounded-xl border border-primary/15 bg-background/35 p-3">
              <label className="block space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  Panel Card Text Size ({panelCardTextScale}%)
                </span>
                <input
                  type="range"
                  min="80"
                  max="220"
                  step="1"
                  className="w-full accent-primary"
                  value={panelCardTextScale}
                  onChange={(event) =>
                    setActivePresentationAgendaField(
                      'presentation_panelist_font_scale',
                      clampPresentationPanelistFontScale(Number(event.target.value))
                    )
                  }
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="80"
                    max="220"
                    className={`${fieldClasses} w-32`}
                    value={panelCardTextScale}
                    onChange={(event) =>
                      setActivePresentationAgendaField(
                        'presentation_panelist_font_scale',
                        clampPresentationPanelistFontScale(Number(event.target.value))
                      )
                    }
                  />
                  <button
                    type="button"
                    className={outlineButtonClasses}
                    onClick={() =>
                      setActivePresentationAgendaField('presentation_panelist_font_scale', 120)
                    }
                  >
                    Reset To 120%
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  Panel Columns
                </p>
                <span className="rounded-full border border-primary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
                  3
                </span>
              </div>

              <div className="grid gap-3 xl:grid-cols-3">
                {editablePresentationPanelists.map((panelist, panelistIndex) => (
                  <div
                    key={panelist.id || `panel-column-${panelistIndex}`}
                    className="space-y-2 rounded-xl border border-primary/15 bg-background/45 p-3"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/75">
                      Column {panelistIndex + 1}
                    </p>
                    <input
                      className={fieldClasses}
                      value={panelist.name}
                      onChange={(event) =>
                        setPresentationPanelistField(panelistIndex, 'name', event.target.value)
                      }
                      placeholder={`Panelist ${panelistIndex + 1} name`}
                    />
                    <input
                      className={fieldClasses}
                      value={panelist.role}
                      onChange={(event) =>
                        setPresentationPanelistField(panelistIndex, 'role', event.target.value)
                      }
                      placeholder="Role"
                    />
                    <input
                      className={fieldClasses}
                      value={panelist.company}
                      onChange={(event) =>
                        setPresentationPanelistField(panelistIndex, 'company', event.target.value)
                      }
                      placeholder="Company"
                    />
                    <textarea
                      className={`${fieldClasses} min-h-20`}
                      value={panelist.bio}
                      onChange={(event) =>
                        setPresentationPanelistField(panelistIndex, 'bio', event.target.value)
                      }
                      placeholder="Bio"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <p className="font-mono text-xs leading-6 text-muted-foreground/75">
            These fields map directly to the matching agenda block used by this presentation page.
          </p>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <Section
          eyebrow="Presentation Builder"
          title="Projector Deck Canvas"
          description="Edit the fixed 6-slide /presentation deck: Intro, Panel 1, Kahoot 1, Panel 2, Kahoot 2, Networking."
        >
          <div className="min-w-0 space-y-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-primary/20 bg-background shadow-[0_24px_80px_hsl(var(--primary)/0.08)]">
                <div className="flex items-center justify-between border-b border-primary/10 bg-background/45 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                    Live Presentation Intro - Click Text To Edit
                  </p>
                </div>

                <div className="h-[760px] overflow-hidden bg-background">
                  <Presentation
                    content={draft}
                    editor={inlineEditor}
                    preview
                    requestedSlideIndex={presentationPreviewSlideIndex}
                    onActiveSlideChange={setPresentationPreviewSlideIndex}
                  />
                </div>
              </div>

              <div className={itemCardClasses}>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary/75">
                  Presentation Notes
                </p>
                <p className="font-mono text-xs leading-6 text-muted-foreground/75">
                  This tab previews a fixed 6-slide deck. Panel/Kahoot/Networking slides are sourced from active agenda
                  items in this order: first panel, first kahoot, second panel, second kahoot, first networking.
                </p>
              </div>

              <details className={`${itemCardClasses} group/tools`} open={false}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                      <ActivePresentationToolIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">
                        Slide Tools
                      </p>
                      <h3 className="font-heading text-2xl text-foreground">
                        {activePresentationToolSlide.title}
                      </h3>
                    </div>
                  </div>
                  <span className="rounded-full border border-primary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition group-open/tools:text-primary">
                    Show / Hide
                  </span>
                </summary>
                <p className="mt-3 font-mono text-xs leading-6 text-muted-foreground/70">
                  Click a presentation page below. The controls switch automatically to match the selected page.
                </p>

                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {presentationToolSlides.map((slide, index) => {
                      const isActive = index === clampedPresentationSlideIndex;
                      return (
                        <button
                          key={slide.id}
                          type="button"
                          onClick={() => setPresentationPreviewSlideIndex(index)}
                          className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
                            isActive
                              ? 'border-primary/45 bg-primary/12 text-primary'
                              : 'border-primary/20 bg-background/30 text-muted-foreground hover:border-primary/35 hover:text-foreground'
                          }`}
                        >
                          {String(index + 1).padStart(2, '0')} {slide.shortLabel}
                        </button>
                      );
                    })}
                  </div>

                  {activePresentationToolSlide.type === 'intro'
                    ? renderIntroControls()
                    : renderAgendaSlideControls()}
                </div>
              </details>
          </div>
        </Section>
      </div>
    );
  };

  const renderEventPage = () => {
    const eventBlocks = [
      { id: 'details', title: 'Event Details', description: 'Date, time, venue, and address.', icon: CalendarDays },
      { id: 'map', title: 'Map Widget', description: 'Google Maps embed and directions.', icon: Link2 },
      { id: 'agenda', title: 'Agenda Blocks', description: 'Sessions, breaks, and workshops.', icon: LayoutDashboard },
    ];
    const activeBlock = eventBlocks.find((block) => block.id === eventBuilderBlock) || eventBlocks[0];
    const ActiveEventBlockIcon = activeBlock.icon;

    const renderInspector = () => {
      switch (activeBlock.id) {
        case 'map':
          return (
            <div className="space-y-3">
              <textarea className={`${fieldClasses} min-h-28 font-mono text-xs`} value={draft.eventConfig?.google_maps_embed_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_embed_url', event.target.value)} placeholder="Paste the Google Maps iframe HTML or iframe src URL" />
              <input className={fieldClasses} value={draft.eventConfig?.google_maps_place_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_place_url', event.target.value)} placeholder="Google Maps place link" />
              <input className={fieldClasses} value={draft.eventConfig?.google_maps_place_id || ''} onChange={(event) => setField('eventConfig', 'google_maps_place_id', event.target.value)} placeholder="Optional Google Place ID" />
              <input className={fieldClasses} value={draft.eventConfig?.google_maps_directions_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_directions_url', event.target.value)} placeholder="Optional directions URL" />
              <div className="grid gap-3 sm:grid-cols-2">
                {normalizedPlaceUrl ? <a href={normalizedPlaceUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><ExternalLink className="mr-2 h-4 w-4" />Preview Venue</a> : null}
                {placeIdDirectionsPreview || normalizedDirectionsUrl ? <a href={placeIdDirectionsPreview || normalizedDirectionsUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><ExternalLink className="mr-2 h-4 w-4" />Preview Directions</a> : null}
              </div>
              {normalizedMapEmbedUrl ? (
                <div className="overflow-hidden rounded-xl border border-primary/15 bg-background/40">
                  <iframe src={normalizedMapEmbedUrl} title="Admin preview of embedded map" className="w-full" style={{ border: 0, minHeight: '220px' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
              ) : (
                <p className="font-mono text-xs leading-6 text-muted-foreground/75">Paste a valid Google Maps embed iframe to preview the venue map.</p>
              )}
            </div>
          );
        case 'agenda':
          return (
            <div className="space-y-3">
              <button type="button" onClick={() => updateDraft((prev) => ({ ...prev, agendaItems: [...(prev.agendaItems || []), { id: createId('agenda'), order: (prev.agendaItems || []).length + 1, title: '', description: '', speaker: '', company: '', session_label: '', start_time: '', end_time: '', session_type: 'panel', presentation_hide_description: false, presentation_panelist_font_scale: 120, active: true }] }))} className={outlineButtonClasses}>Add Agenda Block</button>
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {draft.agendaItems?.length ? draft.agendaItems.map((item, index) => (
                  <div key={item.id || index} className={itemCardClasses}>
                    <div className="grid gap-3 sm:grid-cols-[90px_minmax(0,1fr)]">
                      <input type="number" min="1" className={fieldClasses} value={item.order ?? index + 1} onChange={(event) => setListItemField('agendaItems', index, 'order', Number(event.target.value))} placeholder="Order" />
                      <input className={fieldClasses} value={item.title || ''} onChange={(event) => setListItemField('agendaItems', index, 'title', event.target.value)} placeholder="Session title" />
                    </div>
                    <textarea className={`${fieldClasses} min-h-20`} value={item.description || ''} onChange={(event) => setListItemField('agendaItems', index, 'description', event.target.value)} placeholder="Description" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className={fieldClasses} value={item.speaker || ''} onChange={(event) => setListItemField('agendaItems', index, 'speaker', event.target.value)} placeholder="Speaker" />
                      <input className={fieldClasses} value={item.company || ''} onChange={(event) => setListItemField('agendaItems', index, 'company', event.target.value)} placeholder="Company" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input className={fieldClasses} value={item.start_time || ''} onChange={(event) => setListItemField('agendaItems', index, 'start_time', event.target.value)} placeholder="Start time" />
                      <input className={fieldClasses} value={item.end_time || ''} onChange={(event) => setListItemField('agendaItems', index, 'end_time', event.target.value)} placeholder="End time" />
                      <select className={fieldClasses} value={item.session_type || 'panel'} onChange={(event) => setListItemField('agendaItems', index, 'session_type', event.target.value)}>
                        <option value="keynote">keynote</option>
                        <option value="panel">panel</option>
                        <option value="workshop">workshop</option>
                        <option value="networking">networking</option>
                      </select>
                    </div>
                    <input className={fieldClasses} value={item.session_label || ''} onChange={(event) => setListItemField('agendaItems', index, 'session_label', event.target.value)} placeholder="Optional label" />
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={item.active !== false} onChange={(event) => setListItemField('agendaItems', index, 'active', event.target.checked)} />
                        Active
                      </label>
                      <button type="button" onClick={() => removeListItem('agendaItems', index)} className={dangerButtonClasses}>Remove</button>
                    </div>
                  </div>
                )) : <EmptyState title="No agenda blocks yet" description="Add the first agenda block to start shaping the public schedule." />}
              </div>
            </div>
          );
        case 'details':
        default:
          return (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="date" className={fieldClasses} value={draft.eventConfig?.event_date || ''} onChange={(event) => setField('eventConfig', 'event_date', event.target.value)} />
                <input className={fieldClasses} value={draft.eventConfig?.event_time || ''} onChange={(event) => setField('eventConfig', 'event_time', event.target.value)} placeholder="Event time" />
              </div>
              <input className={fieldClasses} value={draft.eventConfig?.venue_name_line_1 || draft.eventConfig?.venue_name || ''} onChange={(event) => updateDraft((prev) => ({ ...prev, eventConfig: { ...prev.eventConfig, venue_name_line_1: event.target.value, venue_name: event.target.value } }))} placeholder="Venue title line 1" />
              <input className={fieldClasses} value={draft.eventConfig?.venue_name_line_2 || ''} onChange={(event) => setField('eventConfig', 'venue_name_line_2', event.target.value)} placeholder="Venue title line 2" />
              <input className={fieldClasses} value={draft.eventConfig?.venue_address || ''} onChange={(event) => setField('eventConfig', 'venue_address', event.target.value)} placeholder="Venue address" />
            </div>
          );
      }
    };

    return (
      <div className="space-y-6">
        <Section eyebrow="Event Builder" title="Event Ops Canvas" description="Tune venue details and agenda blocks from a live event preview instead of a long settings page.">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]">
            {renderEventCanvasPreview()}

            <div className={`${itemCardClasses} self-start`}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                  <ActiveEventBlockIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">Inspector</p>
                  <h3 className="font-heading text-2xl text-foreground">{activeBlock.title}</h3>
                </div>
              </div>
              {renderInspector()}
            </div>
          </div>
        </Section>
      </div>
    );
  };

  const renderCalendarPage = () => (
    <div className="space-y-6">
      <Section
        eyebrow="Calendar"
        title={draft.operations?.calendar_label || 'CyberSwarm Calendar'}
        description="Operational calendar workspace. Widget configuration stays in Integrations."
        action={<button type="button" onClick={refreshFeedQueries} className={outlineButtonClasses}><RefreshCw className="mr-2 h-4 w-4" />Refresh Calendar</button>}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={CalendarDays} label="Calendar Source" value={calendarEventsQuery.data?.source === 'google-calendar-api' ? 'Google API' : hasCalendarFeed ? 'ICS Feed' : 'Not Connected'} hint={integrationStatus.calendar?.sourceHost || 'Configure calendar in Integrations.'} />
          <StatCard icon={CalendarDays} label="My Events" value={String(userCalendarEvents.length)} hint="Upcoming events for your signed-in account." />
          <StatCard icon={Users} label="Organizer Events" value={String(organizerCalendarEvents.length)} hint="Upcoming events across organizer calendars." />
          <StatCard icon={CalendarDays} label="Event Date" value={formatEventDateLabel(draft.eventConfig?.event_date)} hint={draft.eventConfig?.event_time || 'Time not set yet.'} />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Section eyebrow="Live Calendar" title="Organizer Calendar" description="Mirrors Google Calendar. Change calendar configuration in Integrations.">
          {operationalCalendarEmbedUrl ? (
            <div className="overflow-hidden rounded-xl border border-primary/15 bg-background/40">
              <iframe
                src={operationalCalendarEmbedUrl}
                title="CyberSwarm calendar"
                className="h-[760px] w-full"
                loading="lazy"
              />
            </div>
          ) : (
            <EmptyState title="Calendar sync not ready" description="Organizer group calendar sync is still initializing. Ensure Google Workspace calendar + group scopes are enabled in Integrations." />
          )}
        </Section>

        <Section eyebrow="Upcoming" title="Event Streams" description="Switch between your events and all organizer events.">
          <div className="inline-flex w-full rounded-xl border border-primary/20 bg-background/40 p-1">
            <button
              type="button"
              onClick={() => setCalendarEventScope('mine')}
              className={`flex-1 rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                calendarEventScope === 'mine'
                  ? 'bg-primary/20 text-foreground'
                  : 'text-muted-foreground/80 hover:text-foreground'
              }`}
            >
              My Events
            </button>
            <button
              type="button"
              onClick={() => setCalendarEventScope('organizers')}
              className={`flex-1 rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                calendarEventScope === 'organizers'
                  ? 'bg-primary/20 text-foreground'
                  : 'text-muted-foreground/80 hover:text-foreground'
              }`}
            >
              Organizers
            </button>
          </div>

          {calendarEventsQuery.isLoading ? (
            <p className="font-mono text-xs leading-6 text-muted-foreground/75">Loading calendar events...</p>
          ) : null}
          {calendarEventsQuery.error ? (
            <p className="font-mono text-xs leading-6 text-accent">
              {calendarEventsQuery.error.message || 'Calendar feed could not be loaded.'}
            </p>
          ) : null}
          {calendarEventsQuery.data?.warning ? (
            <p className="font-mono text-xs leading-6 text-accent">{calendarEventsQuery.data.warning}</p>
          ) : null}

          <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
            {(calendarEventScope === 'mine' ? userCalendarEvents : organizerCalendarEvents).length ? (
              (calendarEventScope === 'mine' ? userCalendarEvents : organizerCalendarEvents)
                .slice(0, 24)
                .map((event) => (
                  <div key={`${event.id || event.startAt}-${event.ownerEmail || 'calendar'}`} className={itemCardClasses}>
                    <div className="flex flex-col gap-2">
                      <p className="font-heading text-lg text-foreground">{event.title || 'Untitled event'}</p>
                      <p className="font-mono text-xs text-primary/85">{formatCalendarRange(event)}</p>
                      <p className="font-mono text-[11px] text-muted-foreground/70">
                        {calendarEventScope === 'organizers'
                          ? `Organizer: ${event.ownerEmail || event.organizerEmail || 'Unknown'}`
                          : `Account: ${event.ownerEmail || authUser?.email || 'Unknown'}`}
                      </p>
                    </div>
                    {event.url ? (
                      <a href={event.url} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}>
                        <ExternalLink className="mr-2 h-4 w-4" />Open
                      </a>
                    ) : null}
                  </div>
                ))
            ) : (
              <EmptyState
                title={calendarEventScope === 'mine' ? 'No upcoming personal events' : 'No organizer events loaded'}
                description={calendarEventScope === 'mine'
                  ? 'Your next Google Calendar events will appear here when available.'
                  : 'Organizer group events will appear here after sync.'}
              />
            )}
          </div>
        </Section>
      </div>
    </div>
  );

  const renderSponsorsPage = () => {
    const sponsors = Array.isArray(draft.sponsors) ? draft.sponsors : [];
    const sponsorCardEntries = sponsors
      .map((sponsor, index) => ({ sponsor, index }))
      .filter(({ sponsor }) => {
        if (!sponsorCardSearch.trim()) return true;
        const query = sponsorCardSearch.trim().toLowerCase();
        return `${sponsor.name || ''} ${sponsor.highlight || ''} ${sponsor.website_url || ''} ${
          sponsor.vip ? 'vip' : ''
        }`
          .toLowerCase()
          .includes(query);
      });
    const selectedSponsor = sponsors[selectedSponsorIndex] || null;
    const selectedSponsorLogoScale = clampSponsorLogoScale(selectedSponsor?.logo_scale ?? 110);
    const selectedSponsorLogoOffsetX = clampSponsorLogoOffset(selectedSponsor?.logo_offset_x ?? 0);
    const selectedSponsorLogoOffsetY = clampSponsorLogoOffset(selectedSponsor?.logo_offset_y ?? 0);
    const selectedSponsorLogoBackgroundMode = getSponsorLogoBackgroundMode(
      selectedSponsor?.logo_background
    );
    const selectedSponsorLogoBackgroundColor = normalizeSponsorLogoBackgroundColor(
      selectedSponsor?.logo_background_color
    );
    const selectedLead = filteredSponsorLeads[selectedSponsorLeadIndex] || null;
    const selectedLeadReviewed = selectedLead
      ? reviewedSponsorLeadKeySet.has(getSponsorLeadReviewKey(selectedLead))
      : false;
    const isCardsView = sponsorMailboxView === 'cards';
    const activeSearchValue = isCardsView ? sponsorCardSearch : sponsorLeadSearch;
    const activeMailboxCount = isCardsView ? sponsorCardEntries.length : filteredSponsorLeads.length;

    return (
      <div className="space-y-6">
        <Section
          eyebrow="Sponsor Ops"
          title="Sponsor Management"
          description="One shared workspace with inbox-style navigation: Published Sponsor Cards and Sponsor Interest Inbox."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Handshake} label="Active Cards" value={String(activeSponsorCount)} hint="Sponsor cards currently visible on the public site." />
            <StatCard icon={Globe2} label="Public Intake" value={hasSponsorForm ? 'Ready' : 'Needs Label'} hint="The sponsor button now opens the private website intake form." />
            <StatCard icon={Inbox} label="Lead Inbox" value={String(sponsorLeads.length)} hint="Sponsor inquiries currently available in admin." />
            <StatCard icon={BellRing} label="New Since Review" value={String(newSponsorLeadCount)} hint="Unread sponsor inquiries based on the mapped timestamp field." />
          </div>
          <div className="overflow-hidden rounded-[1.35rem] border border-primary/15 bg-background/35">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">
                Sponsor Inbox Workspace
              </p>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                {isCardsView ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextIndex = sponsors.length;
                      updateDraft((prev) => ({
                        ...prev,
                        sponsors: [
                          ...(prev.sponsors || []),
                          {
                            id: createId('sponsor'),
                            name: '',
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
                            logo_background_color: sponsorLogoBackgroundDefaultColor,
                            logo_scale: 110,
                            presentation_logo_scale: 100,
                            presentation_logo_spacing_left_px: 28,
                            presentation_logo_spacing_right_px: 28,
                            logo_offset_x: 0,
                            logo_offset_y: 0,
                            order: (prev.sponsors || []).length + 1,
                            active: true,
                          },
                        ],
                      }));
                      setSelectedSponsorIndex(nextIndex);
                    }}
                    className={`${primaryButtonClasses} shrink-0`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Compose Sponsor Card
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void approveSponsorLead(selectedLead)}
                      disabled={!selectedLead}
                      className={`${primaryButtonClasses} shrink-0`}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Approve to Card
                    </button>
                    <button
                      type="button"
                      onClick={() => markSponsorLeadReviewed(selectedLead)}
                      disabled={!selectedLead || selectedLeadReviewed}
                      className={`${outlineButtonClasses} shrink-0`}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {selectedLeadReviewed ? 'Reviewed' : 'Mark Reviewed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedLead) return;
                        const requestId = String(selectedLead.id || '').trim();
                        if (!requestId) {
                          setSaveMessage('This sponsor inquiry cannot be deleted because it has no id.');
                          return;
                        }

                        if (pendingSponsorLeadDeleteId === requestId) {
                          void deleteSponsorLead(selectedLead);
                          return;
                        }

                        setPendingSponsorLeadDeleteId(requestId);
                        setSaveMessage('Click Delete Again to confirm removal of this sponsor inquiry.');
                      }}
                      disabled={!selectedLead}
                      className={`${pendingSponsorLeadDeleteId && selectedLead && pendingSponsorLeadDeleteId === String(selectedLead.id || '').trim() ? dangerButtonClasses : outlineButtonClasses} shrink-0`}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {pendingSponsorLeadDeleteId && selectedLead && pendingSponsorLeadDeleteId === String(selectedLead.id || '').trim() ? 'Confirm Delete' : 'Delete'}
                    </button>
                    {pendingSponsorLeadDeleteId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingSponsorLeadDeleteId('');
                          setSaveMessage('Sponsor inquiry deletion cancelled.');
                        }}
                        className={`${outlineButtonClasses} shrink-0`}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </>
                )}
                <div className="relative min-w-0 flex-1 sm:w-[min(26rem,100%)]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/45 py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary/45 focus:bg-background/75"
                    value={activeSearchValue}
                    onChange={(event) => {
                      if (isCardsView) {
                        setSponsorCardSearch(event.target.value);
                      } else {
                        setSponsorLeadSearch(event.target.value);
                      }
                    }}
                    placeholder={isCardsView ? 'Search published sponsor cards' : 'Search sponsor inquiries'}
                  />
                </div>
                {!isCardsView && sponsorLeadSearch.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSponsorLeadSearch('')}
                    className={`${outlineButtonClasses} shrink-0`}
                  >
                    Clear Search
                  </button>
                ) : null}
                {!isCardsView ? (
                  <button
                    type="button"
                    onClick={refreshFeedQueries}
                    className={`${outlineButtonClasses} shrink-0`}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Inbox
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[240px_340px_minmax(0,1fr)]">
              <aside className="border-b border-primary/10 bg-background/30 p-3 xl:border-b-0 xl:border-r">
                <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
                  Folders
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSponsorMailboxView('cards')}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      isCardsView
                        ? 'border-primary/40 bg-primary/12 text-foreground'
                        : 'border-primary/15 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-heading text-base">Published Cards</span>
                      <span className="rounded-full border border-primary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
                        {sponsorCardEntries.length}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">Manage public card UI</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSponsorMailboxView('interest')}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      !isCardsView
                        ? 'border-primary/40 bg-primary/12 text-foreground'
                        : 'border-primary/15 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-heading text-base">Sponsor Interest</span>
                      <span className="rounded-full border border-primary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
                        {filteredSponsorLeads.length}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">Review inbound inquiries</p>
                  </button>
                </div>
              </aside>

              <div className="border-b border-primary/10 bg-background/20 xl:border-b-0 xl:border-r">
                <div className="flex items-center justify-between border-b border-primary/10 px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
                    {isCardsView ? 'Published Sponsor Cards' : 'Sponsor Interest Inbox'}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/75">
                    {activeMailboxCount} items
                  </span>
                </div>

                <div className="max-h-[720px] space-y-2 overflow-y-auto p-3">
                  {isCardsView ? (
                    sponsorCardEntries.length ? (
                      sponsorCardEntries.map(({ sponsor, index }) => {
                        const isActive = selectedSponsorIndex === index;
                        return (
                          <button
                            key={sponsor.id || index}
                            type="button"
                            onClick={() => setSelectedSponsorIndex(index)}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                              isActive
                                ? 'border-primary/45 bg-primary/12 text-foreground'
                                : 'border-primary/15 bg-background/35 text-muted-foreground hover:border-primary/30 hover:bg-background/55 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-heading text-lg leading-tight text-foreground">{sponsor.name || 'Unnamed sponsor'}</p>
                              <div className="flex items-center gap-2">
                                {sponsor.vip ? (
                                  <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                                    VIP
                                  </span>
                                ) : null}
                                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
                                  sponsor.active !== false
                                    ? 'border-primary/25 text-primary/85'
                                    : 'border-muted-foreground/20 text-muted-foreground/70'
                                }`}>
                                  {sponsor.active !== false ? 'Published' : 'Hidden'}
                                </span>
                                <span className="rounded-full border border-primary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/85">
                                  #{sponsor.order ?? index + 1}
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/75">
                              {sponsor.highlight || 'No highlight label'}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <EmptyState title="No matching sponsor cards" description="Try a different search or compose a new sponsor card." />
                    )
                  ) : filteredSponsorLeads.length ? (
                    filteredSponsorLeads.map((lead, index) => {
                      const isActive = selectedSponsorLeadIndex === index;
                      return (
                        <button
                          key={lead.id || `${lead.email || 'lead'}-${index}`}
                          type="button"
                          onClick={() => setSelectedSponsorLeadIndex(index)}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                            isActive
                              ? 'border-primary/45 bg-primary/12 text-foreground'
                              : 'border-primary/15 bg-background/35 text-muted-foreground hover:border-primary/30 hover:bg-background/55 hover:text-foreground'
                          }`}
                        >
                          <p className="font-heading text-lg leading-tight text-foreground">
                            {lead.company || lead.name || 'Unnamed inquiry'}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground/75">{lead.email || 'No email provided'}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80">
                              {formatFeedDate(lead.submittedAt) || 'Unknown time'}
                            </p>
                            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
                              reviewedSponsorLeadKeySet.has(getSponsorLeadReviewKey(lead))
                                ? 'border-primary/25 text-primary/75'
                                : 'border-accent/35 text-accent'
                            }`}>
                              {reviewedSponsorLeadKeySet.has(getSponsorLeadReviewKey(lead)) ? 'Reviewed' : 'New'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : sponsorLeads.length ? (
                    <EmptyState title="No search matches" description="No inquiries match the current search. Clear search to see all sponsor inquiries." />
                  ) : (
                    <EmptyState title="No sponsor inquiries" description="Incoming website sponsor requests will appear here for admin review." />
                  )}
                </div>
              </div>

              <div className="p-4">
                {isCardsView ? (
                  selectedSponsor ? (
                    <div className={itemCardClasses}>
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">Card Detail Editor</p>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
                        <input className={fieldClasses} value={selectedSponsor.name || ''} onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'name', event.target.value)} placeholder="Sponsor name" />
                        <input className={fieldClasses} value={selectedSponsor.highlight || ''} onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'highlight', event.target.value)} placeholder="Highlight label" />
                        <button type="button" onClick={() => removeListItem('sponsors', selectedSponsorIndex)} className={dangerButtonClasses}>Delete Card</button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <input className={fieldClasses} value={selectedSponsor.logo_url || ''} onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'logo_url', event.target.value)} placeholder="Logo image URL" />
                        <input className={fieldClasses} value={selectedSponsor.website_url || ''} onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'website_url', event.target.value)} placeholder="Sponsor website URL" />
                        <div className="flex items-center">
                          <input
                            ref={sponsorLogoFileInputRef}
                            type="file"
                            accept={sponsorLogoUploadAccept}
                            className="hidden"
                            onChange={uploadSponsorLogoFile}
                          />
                          <button
                            type="button"
                            className={outlineButtonClasses}
                            disabled={sponsorLogoUploading}
                            onClick={() => sponsorLogoFileInputRef.current?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {sponsorLogoUploading ? 'Uploading...' : 'Upload Logo'}
                          </button>
                        </div>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground/70">
                        Upload supports PNG, JPG/JPEG, WEBP, GIF, and SVG up to 5 MB.
                      </p>
                      <div className="rounded-xl border border-primary/15 bg-background/35 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">Private Contact Data (Internal Only)</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground/75">
                          Stored for admin and mailing workflows only. Not rendered on the public sponsor showcase.
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <input
                            className={fieldClasses}
                            value={selectedSponsor.contact_name || ''}
                            onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'contact_name', event.target.value)}
                            placeholder="Contact name"
                          />
                          <input
                            className={fieldClasses}
                            value={selectedSponsor.email || ''}
                            onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'email', event.target.value)}
                            placeholder="Contact email"
                          />
                          <input
                            className={fieldClasses}
                            value={selectedSponsor.phone || ''}
                            onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'phone', event.target.value)}
                            placeholder="Contact phone"
                          />
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <input
                            className={fieldClasses}
                            value={selectedSponsor.support_amount || ''}
                            onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'support_amount', event.target.value)}
                            placeholder="Support amount"
                          />
                          <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={selectedSponsor.bring_swag === true}
                              onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'bring_swag', event.target.checked)}
                            />
                            Brings swag
                          </label>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                          <textarea
                            className={`${fieldClasses} min-h-[92px]`}
                            value={selectedSponsor.interest_notes || ''}
                            onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'interest_notes', event.target.value)}
                            placeholder="Internal notes from sponsor conversations"
                          />
                          <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={selectedSponsor.venue_branding === true}
                              onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'venue_branding', event.target.checked)}
                            />
                            Venue branding
                          </label>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <select
                          className={fieldClasses}
                          value={selectedSponsor.logo_background || 'transparent'}
                          onChange={(event) => {
                            const nextMode = event.target.value;
                            setListItemField('sponsors', selectedSponsorIndex, 'logo_background', nextMode);
                            if (nextMode === 'color' && !selectedSponsor.logo_background_color) {
                              setListItemField(
                                'sponsors',
                                selectedSponsorIndex,
                                'logo_background_color',
                                sponsorLogoBackgroundDefaultColor
                              );
                            }
                          }}
                        >
                          <option value="transparent">transparent frame</option>
                          <option value="soft">soft glow frame</option>
                          <option value="light">light card frame</option>
                          <option value="dark">dark card frame</option>
                          <option value="color">custom color frame</option>
                        </select>
                        <input type="number" min="1" className={fieldClasses} value={selectedSponsor.order ?? selectedSponsorIndex + 1} onChange={(event) => setListItemField('sponsors', selectedSponsorIndex, 'order', Number(event.target.value))} placeholder="Order" />
                        <button
                          type="button"
                          onClick={() => setListItemField('sponsors', selectedSponsorIndex, 'active', !(selectedSponsor.active !== false))}
                          className={selectedSponsor.active !== false ? dangerButtonClasses : primaryButtonClasses}
                        >
                          {selectedSponsor.active !== false ? 'Hide Card' : 'Publish Card'}
                        </button>
                      </div>
                      {selectedSponsorLogoBackgroundMode === 'color' ? (
                        <div className="grid gap-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
                          <input
                            type="color"
                            className="h-10 w-full cursor-pointer rounded-xl border border-primary/20 bg-background/55 p-1"
                            value={selectedSponsorLogoBackgroundColor}
                            onChange={(event) =>
                              setListItemField(
                                'sponsors',
                                selectedSponsorIndex,
                                'logo_background_color',
                                normalizeSponsorLogoBackgroundColor(event.target.value)
                              )
                            }
                            aria-label="Custom logo frame color"
                          />
                          <input
                            className={fieldClasses}
                            value={selectedSponsorLogoBackgroundColor}
                            onChange={(event) =>
                              setListItemField(
                                'sponsors',
                                selectedSponsorIndex,
                                'logo_background_color',
                                normalizeSponsorLogoBackgroundColor(event.target.value)
                              )
                            }
                            placeholder="#ffffff"
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setListItemField('sponsors', selectedSponsorIndex, 'vip', !(selectedSponsor.vip === true))
                          }
                          className={selectedSponsor.vip === true ? primaryButtonClasses : outlineButtonClasses}
                        >
                          {selectedSponsor.vip === true ? 'Powered By' : 'Mark as Powered By'}
                        </button>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-background/35 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                          Logo Framing
                        </p>
                        <p className="mt-1 font-mono text-[11px] leading-5 text-muted-foreground/75">
                          Drag the image to reposition. Use the slider or mouse wheel over the frame to zoom.
                        </p>
                        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]">
                          <div className="relative mx-auto w-full max-w-[20rem] lg:mx-0">
                            <SponsorLogoViewport
                              containerClassName={selectedSponsor.logo_url ? 'cursor-grab active:cursor-grabbing' : ''}
                              logoUrl={selectedSponsor.logo_url}
                              logoAlt={`${selectedSponsor.name || 'Sponsor'} logo preview`}
                              logoBackground={selectedSponsorLogoBackgroundMode}
                              logoBackgroundColor={selectedSponsorLogoBackgroundColor}
                              logoScale={selectedSponsorLogoScale}
                              logoOffsetX={selectedSponsorLogoOffsetX}
                              logoOffsetY={selectedSponsorLogoOffsetY}
                              fallback={
                                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
                                  Add Logo URL
                                </p>
                              }
                              onPointerDown={(event) =>
                                selectedSponsor.logo_url
                                  ? beginSponsorLogoDrag(
                                      event,
                                      selectedSponsorIndex,
                                      selectedSponsorLogoOffsetX,
                                      selectedSponsorLogoOffsetY
                                    )
                                  : undefined
                              }
                              onPointerMove={(event) =>
                                selectedSponsor.logo_url ? moveSponsorLogoDrag(event) : undefined
                              }
                              onPointerUp={endSponsorLogoDrag}
                              onPointerCancel={endSponsorLogoDrag}
                              onWheel={(event) => {
                                if (!selectedSponsor.logo_url) return;
                                event.preventDefault();
                                const delta = event.deltaY < 0 ? 4 : -4;
                                setSponsorLogoFrame(selectedSponsorIndex, {
                                  scale: selectedSponsorLogoScale + delta,
                                });
                              }}
                            />
                            <div className="pointer-events-none absolute bottom-2 left-2 rounded-full border border-primary/20 bg-background/65 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
                              Drag to Position
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="block space-y-1">
                              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                                Zoom ({selectedSponsorLogoScale}%)
                              </span>
                              <input
                                type="range"
                                min="60"
                                max="400"
                                step="1"
                                className="w-full accent-primary"
                                value={selectedSponsorLogoScale}
                                onChange={(event) =>
                                  setSponsorLogoFrame(selectedSponsorIndex, {
                                    scale: Number(event.target.value),
                                  })
                                }
                              />
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block space-y-1">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                                  X Offset ({selectedSponsorLogoOffsetX}%)
                                </span>
                                <input
                                  type="range"
                                  min="-100"
                                  max="100"
                                  step="1"
                                  className="w-full accent-primary"
                                  value={selectedSponsorLogoOffsetX}
                                  onChange={(event) =>
                                    setSponsorLogoFrame(selectedSponsorIndex, {
                                      offsetX: Number(event.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label className="block space-y-1">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                                  Y Offset ({selectedSponsorLogoOffsetY}%)
                                </span>
                                <input
                                  type="range"
                                  min="-100"
                                  max="100"
                                  step="1"
                                  className="w-full accent-primary"
                                  value={selectedSponsorLogoOffsetY}
                                  onChange={(event) =>
                                    setSponsorLogoFrame(selectedSponsorIndex, {
                                      offsetY: Number(event.target.value),
                                    })
                                  }
                                />
                              </label>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={outlineButtonClasses}
                                onClick={() =>
                                  setSponsorLogoFrame(selectedSponsorIndex, {
                                    scale: 110,
                                    offsetX: 0,
                                    offsetY: 0,
                                  })
                                }
                              >
                                Reset Framing
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="font-mono text-xs leading-6 text-muted-foreground/75">
                        {selectedSponsor.active !== false
                          ? 'This sponsor card is currently published on the public site.'
                          : 'This sponsor card is hidden from the public site until you publish it.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openInternalMailingComposer({
                              recipients: [selectedSponsor.email],
                              subject: `CyberSwarm Sponsor Follow-up${selectedSponsor.name ? ` - ${selectedSponsor.name}` : ''}`,
                              recipientType: 'custom',
                            })
                          }
                          className={primaryButtonClasses}
                          disabled={!selectedSponsor.email}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Reply by Email
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState title="Select a sponsor card" description="Choose a card from the list to edit UI attributes." />
                  )
                ) : selectedLead ? (
                  <div className={itemCardClasses}>
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">Inquiry Detail</p>
                    <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-background/35 px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                        Review Status
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
                        selectedLeadReviewed
                          ? 'border-primary/25 text-primary/75'
                          : 'border-accent/35 text-accent'
                      }`}>
                        {selectedLeadReviewed ? 'Reviewed' : 'New'}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-primary/15 bg-background/35 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">Organization</p>
                        <p className="mt-2 font-heading text-2xl text-foreground">{selectedLead.company || 'Not provided'}</p>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-background/35 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">Submitted</p>
                        <p className="mt-2 font-mono text-xs text-foreground">{formatFeedDate(selectedLead.submittedAt) || selectedLead.submittedAt || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-primary/15 bg-background/35 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">Contact</p>
                        <p className="mt-2 font-mono text-xs text-foreground">{selectedLead.name || 'Not provided'}</p>
                        <p className="mt-1 font-mono text-xs text-foreground">{selectedLead.email || 'No email'}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground/80">{selectedLead.phone || 'No phone'}</p>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-background/35 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">Support</p>
                        <p className="mt-2 font-mono text-xs text-foreground">{selectedLead.supportAmount || 'Not provided'}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground/80">
                          {[selectedLead.bringSwag ? 'Bringing swag' : '', selectedLead.venueBranding ? 'Venue branding requested' : '']
                            .filter(Boolean)
                            .join(' • ') || 'No extras selected'}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-primary/15 bg-background/35 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">Notes</p>
                      <p className="mt-2 font-mono text-xs leading-6 text-foreground/90">{selectedLead.message || 'No additional notes were included.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void approveSponsorLead(selectedLead)}
                        className={primaryButtonClasses}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Approve to Card
                      </button>
                      {selectedLead.email ? (
                        <button
                          type="button"
                          onClick={() =>
                            openInternalMailingComposer({
                              recipients: [selectedLead.email],
                              subject: `CyberSwarm Sponsor Interest Follow-up${selectedLead.company ? ` - ${selectedLead.company}` : ''}`,
                              recipientType: 'sponsor-interest',
                            })
                          }
                          className={primaryButtonClasses}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Reply by Email
                        </button>
                      ) : null}
                      {selectedLead.website ? (
                        <a href={normalizeExternalUrl(selectedLead.website)} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Website
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Select an inquiry" description="Choose any sponsor inquiry from the list to view details." />
                )}
              </div>
            </div>
          </div>
        </Section>
      </div>
    );
  };

  const renderAttendeesPage = () => (
    <div className="space-y-6">
      <Section eyebrow="Roster Status" title="Attendee Operations" description="Work with registration responses after the attendee feed is connected in Integrations." action={<button type="button" onClick={refreshFeedQueries} className={outlineButtonClasses}><RefreshCw className="mr-2 h-4 w-4" />Refresh</button>}>
        <div className="grid gap-4 lg:grid-cols-3">
          <FeedConnectionCard title="Feed Status" url={resolvedAttendeeFeedUrl} rowCount={attendees.length} format={attendeeFeedQuery.data?.format} fetchedAt={attendeeFeedQuery.data?.fetchedAt} error={attendeeFeedQuery.error?.message} />
          <StatCard icon={Users} label="Unique Recipients" value={String(buildRecipientList(attendees).length)} hint="Unique attendee emails available for outreach." />
          <StatCard icon={Mail} label="Status Values" value={String(attendeeStatuses.length)} hint="Distinct statuses detected from your mapped status field." />
        </div>
        <p className="font-mono text-xs leading-6 text-muted-foreground/75">
          Feed URLs, field mapping, and messaging defaults now live in Integrations so this page can stay focused on the roster itself.
        </p>
      </Section>

      <Section eyebrow="Roster" title="Attendee Responses" description="Search the response feed, filter by status, and prep your messaging audience." action={<div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" /><input className="w-full rounded-2xl border border-primary/15 bg-background/40 py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary/50 focus:bg-background/70" value={attendeeSearch} onChange={(event) => setAttendeeSearch(event.target.value)} placeholder="Search attendees" /></div><select className={`${fieldClasses} min-w-[180px]`} value={attendeeStatusFilter} onChange={(event) => setAttendeeStatusFilter(event.target.value)}><option value="all">All statuses</option>{attendeeStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>{selectedAttendeeEmails.length ? <button type="button" onClick={() => openAttendeeMailing(selectedAttendeeEmails)} className={outlineButtonClasses}><Mail className="mr-2 h-4 w-4" />Email {selectedAttendeeEmails.length} Selected</button> : null}</div>}>
        <DataTable columns={attendeeColumns} rows={filteredAttendees} emptyTitle="No attendee responses yet" emptyDescription="Connect the attendee response feed to turn Google Form submissions into a searchable roster." />
      </Section>

      <Section eyebrow="Google Sheets" title="Raw Response Feed" description="Review the incoming response rows with the original sheet column headers.">
        <DataTable columns={attendeeRawColumns} rows={attendeeRawRows} emptyTitle="No sheet rows loaded" emptyDescription="Connect the attendee response feed in Integrations to load the Google Sheets response data." />
      </Section>
    </div>
  );

  const renderIntegrationsPage = () => (
    <div className="space-y-6">
      <section className={`${compactPanelShellClasses} space-y-4`}>
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-primary/70">Navigation Flow</p>
          <h2 className="font-heading text-2xl text-foreground sm:text-[2rem]">Integrations Setup Path</h2>
          <p className="max-w-3xl font-mono text-xs leading-6 text-muted-foreground/80 sm:text-sm">
            Follow this order to configure Google integrations without jumping around. Each step links directly to its section below.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {integrationNavigationItems.map((item) => {
            const isActive = activeIntegrationTarget === item.targetId;
            return (
              <button
                key={item.targetId}
                type="button"
                onClick={() => openIntegrationWidget(item.targetId, item.title)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  isActive
                    ? 'border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_rgba(0,240,255,0.08)]'
                    : 'border-primary/15 bg-background/25 text-muted-foreground hover:border-primary/35 hover:bg-background/45 hover:text-foreground'
                }`}
              >
                <p className="font-heading text-base leading-tight">{item.title}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80">
                  {item.status}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <Section
        id="integration-widget-library"
        eyebrow="Add-On Library"
        title="Google Widget Library"
        description="Pick a Google building block, add it to CyberSwarm, and jump straight to the settings it needs."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {googleIntegrationWidgets.map((widget) => {
            const WidgetIcon = widget.icon;
            return (
              <div
                key={widget.id}
                className="group relative overflow-hidden rounded-[1.35rem] border border-primary/15 bg-background/35 p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:bg-background/55"
              >
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    <WidgetIcon className="h-5 w-5" />
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${
                      widget.connected
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-muted-foreground/20 bg-background/40 text-muted-foreground/80'
                    }`}
                  >
                    {widget.status}
                  </span>
                </div>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.26em] text-primary/70">
                  {widget.label}
                </p>
                <h3 className="mt-2 font-heading text-2xl text-foreground">{widget.title}</h3>
                <p className="mt-3 min-h-[4.5rem] font-mono text-xs leading-6 text-muted-foreground/75">
                  {widget.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addGoogleWidget(widget)}
                    className={widget.enabled || widget.connected ? outlineButtonClasses : primaryButtonClasses}
                  >
                    {widget.enabled || widget.connected ? 'Configure' : 'Add Widget'}
                  </button>
                  <a
                    href={widget.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={outlineButtonClasses}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Docs
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="integration-workspace-hub"
        eyebrow="Google Workspace"
        title={`${workspaceDomain || 'CyberSwarm'} Workspace Hub`}
        description="Keep one server-side Google Workspace credential for admin auth and Google app APIs, while the dashboard stores the non-secret links and resource handoffs."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <input
            className={fieldClasses}
            value={draft.operations?.workspace_domain || ''}
            onChange={(event) => setField('operations', 'workspace_domain', event.target.value)}
            placeholder="Workspace domain, ex: cyberswarmsac.com"
          />
          <input
            className={fieldClasses}
            value={draft.operations?.workspace_group_email || ''}
            onChange={(event) => setField('operations', 'workspace_group_email', event.target.value)}
            placeholder="Team Google Group email, ex: team@cyberswarmsac.com"
          />
          <input
            className={fieldClasses}
            value={draft.operations?.workspace_admin_console_url || ''}
            onChange={(event) => setField('operations', 'workspace_admin_console_url', event.target.value)}
            placeholder="Google Admin console URL"
          />
          <input
            className={fieldClasses}
            value={draft.operations?.workspace_drive_folder_url || ''}
            onChange={(event) => setField('operations', 'workspace_drive_folder_url', event.target.value)}
            placeholder="Primary Drive folder URL"
          />
          <input
            className={fieldClasses}
            value={draft.operations?.workspace_shared_drive_url || ''}
            onChange={(event) => setField('operations', 'workspace_shared_drive_url', event.target.value)}
            placeholder="Shared Drive URL"
          />
          <input
            className={fieldClasses}
            value={draft.operations?.messaging_team_inbox_url || ''}
            onChange={(event) => setField('operations', 'messaging_team_inbox_url', event.target.value)}
            placeholder="Team inbox URL"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard
            icon={ShieldCheck}
            label="Workspace Domain"
            value={workspaceDomain || 'Not set'}
            hint={workspaceDomain ? 'Google Workspace identity boundary.' : 'Add the Google Workspace domain.'}
          />
          <StatCard
            icon={Link2}
            label="Workspace API"
            value={hasGoogleWorkspaceApi ? 'One Credential' : 'Needs Env'}
            hint={
              hasGoogleWorkspaceApi
                ? `${googleWorkspaceScopeCount} Google app scopes configured.`
                : 'Set the service account credential and delegated admin once.'
            }
          />
          <StatCard
            icon={Users}
            label="Organizer Access"
            value={organizerGroupGuardStatus}
            hint={organizerGroupEmail || 'Set GOOGLE_WORKSPACE_ORGANIZER_GROUP_EMAIL on the API.'}
          />
          <StatCard
            icon={Globe2}
            label="Admin Console"
            value={workspaceAdminConsoleUrl ? 'Linked' : 'Needs link'}
            hint="Google Workspace admin handoff."
          />
          <StatCard
            icon={Building2}
            label="Drive Workspace"
            value={workspaceDriveFolderUrl || workspaceSharedDriveUrl ? 'Linked' : 'Needs link'}
            hint="Docs, images, runbooks, and event files."
          />
          <StatCard
            icon={Mail}
            label="Team Group"
            value={workspaceGroupEmail ? 'Ready' : 'Not set'}
            hint={workspaceGroupEmail || 'Add a Google Group email for team routing.'}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {workspaceAdminConsoleUrl ? (
            <a href={workspaceAdminConsoleUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Admin Console
            </a>
          ) : null}
          {workspaceDriveFolderUrl ? (
            <a href={workspaceDriveFolderUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Drive Folder
            </a>
          ) : null}
          {workspaceSharedDriveUrl ? (
            <a href={workspaceSharedDriveUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Shared Drive
            </a>
          ) : null}
          {workspaceGroupEmail ? (
            <a href={`mailto:${workspaceGroupEmail}`} className={outlineButtonClasses}>
              <Mail className="mr-2 h-4 w-4" />
              Email Group
            </a>
          ) : null}
        </div>
        <div className={`${itemCardClasses} gap-3`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/70">Single Credential Model</p>
          <p className="font-mono text-xs leading-6 text-muted-foreground/75">
            The API uses one delegated Google Workspace service account for Google app access. Calendar, Gmail,
            Forms, Drive, and organizer-group checks can share that credential; the dashboard only needs to store
            the specific calendar, form, folder, or group you want each widget to use.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ['Groups', googleWorkspaceScopes.groupMembership],
              ['Calendar', googleWorkspaceScopes.calendarReadonly],
              ['Gmail', googleWorkspaceScopes.gmailSend],
              ['Forms', googleWorkspaceScopes.formsResponsesReadonly],
              ['Drive', googleWorkspaceScopes.driveReadonly],
            ].map(([label, enabled]) => (
              <span
                key={label}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${
                  enabled
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-muted-foreground/20 bg-background/40 text-muted-foreground/70'
                }`}
              >
                {label}: {enabled ? 'scope on' : 'scope off'}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section id="integration-website-forms" eyebrow="Public Intake" title="Website Forms" description="These settings control the website sponsor request CTA and the attendee registration embed.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <input className={fieldClasses} value={draft.operations?.sponsor_cta_label || draft.sponsorsSection?.cta_label || ''} onChange={(event) => syncSponsorCtaField('sponsor_cta_label', event.target.value)} placeholder="Public sponsor CTA label" />
          <div className={`${itemCardClasses} justify-center`}>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Sponsor Intake Routing</p>
            <p className="font-mono text-xs leading-6 text-muted-foreground/75">
              No external sponsor form URL is needed. The CTA now scrolls visitors to the built-in sponsor request section on the public site.
            </p>
          </div>
        </div>
        <input className={fieldClasses} value={draft.eventConfig?.google_form_embed_url || ''} onChange={(event) => setField('eventConfig', 'google_form_embed_url', event.target.value)} placeholder="Registration Google Form embed URL" />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Sponsor CTA</p>
            <p className="font-heading text-2xl text-foreground">{hasSponsorForm ? 'Live on site' : 'Needs label'}</p>
            <p className="font-mono text-xs leading-6 text-muted-foreground/75">
              {sponsorCtaLabel}
            </p>
            <p className="font-mono text-xs leading-6 text-muted-foreground/75">
              Clicking the CTA takes visitors to the private sponsor request form built into the homepage.
            </p>
          </div>
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Registration Embed</p>
            <p className="font-heading text-2xl text-foreground">{hasRegistrationEmbed ? 'Connected' : 'Needs setup'}</p>
            <p className="font-mono text-xs leading-6 text-muted-foreground/75">
              Paste the Google Form embed URL used by the public registration block. The copy around it is managed in Site Content.
            </p>
          </div>
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Quick Reminder</p>
            <p className="font-mono text-xs leading-6 text-muted-foreground/75">
              If you are using a full iframe snippet from Google Forms, paste the embed URL or iframe source value so the public registration block can normalize it cleanly.
            </p>
          </div>
        </div>
      </Section>

      <Section id="integration-google-maps" eyebrow="Google Maps" title="Venue Map Widget" description="Manage the venue map, place link, and directions handoff from the same integration workspace.">
        <textarea className={`${fieldClasses} min-h-28 font-mono text-xs`} value={draft.eventConfig?.google_maps_embed_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_embed_url', event.target.value)} placeholder="Paste the Google Maps iframe HTML or iframe src URL" />
        <div className="grid gap-3 lg:grid-cols-3">
          <input className={fieldClasses} value={draft.eventConfig?.google_maps_place_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_place_url', event.target.value)} placeholder="Google Maps place link" />
          <input className={fieldClasses} value={draft.eventConfig?.google_maps_place_id || ''} onChange={(event) => setField('eventConfig', 'google_maps_place_id', event.target.value)} placeholder="Optional Google Place ID" />
          <input className={fieldClasses} value={draft.eventConfig?.google_maps_directions_url || ''} onChange={(event) => setField('eventConfig', 'google_maps_directions_url', event.target.value)} placeholder="Optional explicit Google Maps directions URL" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Map Embed</p>
            <p className="font-heading text-2xl text-foreground">{normalizedMapEmbedUrl ? 'Ready' : 'Needs iframe'}</p>
            <p className="font-mono text-xs leading-6 text-muted-foreground/75">
              The normalized map embed powers the public venue map.
            </p>
          </div>
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Venue Link</p>
            {normalizedPlaceUrl ? <a href={normalizedPlaceUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><ExternalLink className="mr-2 h-4 w-4" />Preview Venue</a> : <p className="font-mono text-xs leading-6 text-muted-foreground/75">Add a public Google Maps place link for admins and visitors.</p>}
          </div>
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Directions</p>
            {placeIdDirectionsPreview || normalizedDirectionsUrl ? <a href={placeIdDirectionsPreview || normalizedDirectionsUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><ExternalLink className="mr-2 h-4 w-4" />Preview Directions</a> : <p className="font-mono text-xs leading-6 text-muted-foreground/75">Add a Place ID or directions URL for a cleaner travel handoff.</p>}
          </div>
        </div>
      </Section>

      <Section id="integration-calendar" eyebrow="Google Calendar" title="Calendar Integration" description="Link or embed the team coordinator calendar and optionally read private feed events server-side via the Workspace service account.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={CalendarDays}
            label="Calendar Access"
            value={hasCalendarFeed ? 'Feed Connected' : googleWorkspaceScopes.calendarReadonly && hasGoogleWorkspaceApi ? 'API Ready' : 'Needs Source'}
            hint={integrationStatus.calendar?.sourceHost || 'Use Workspace API scopes plus a calendar link/id.'}
          />
          <StatCard icon={CalendarDays} label="Calendar Events" value={String(calendarEvents.length)} hint="Upcoming items from the feed." />
          <StatCard icon={ExternalLink} label="Public Link" value={calendarPublicUrl ? 'Set' : 'Not Set'} hint="Public calendar link for coordinators." />
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <input className={fieldClasses} value={draft.operations?.calendar_id || ''} onChange={(event) => setField('operations', 'calendar_id', event.target.value)} placeholder="Organizer calendar ID (ex: organizers@cyberswarmsac.com)" />
          <input className={fieldClasses} value={draft.operations?.calendar_label || ''} onChange={(event) => setField('operations', 'calendar_label', event.target.value)} placeholder="Calendar label" />
          <input className={fieldClasses} value={draft.operations?.calendar_public_url || ''} onChange={(event) => setField('operations', 'calendar_public_url', event.target.value)} placeholder="Google Calendar public link" />
          <input className={fieldClasses} value={draft.operations?.calendar_embed_url || ''} onChange={(event) => setField('operations', 'calendar_embed_url', event.target.value)} placeholder="Google Calendar embed URL" />
        </div>
        <div className="flex flex-wrap gap-2">
          {calendarPublicUrl ? <a href={calendarPublicUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><ExternalLink className="mr-2 h-4 w-4" />Open Calendar</a> : null}
        </div>
        <div className="space-y-4 rounded-2xl border border-primary/15 bg-background/30 p-3 sm:p-4">
          {effectiveCalendarEmbedUrl ? (
            <div className="overflow-hidden rounded-xl border border-primary/15 bg-background/40">
              <iframe
                src={effectiveCalendarEmbedUrl}
                title="CyberSwarm Google Calendar"
                className="h-[520px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <p className="font-mono text-xs leading-6 text-muted-foreground/75">
              Add an organizer calendar ID or embed URL above to render the live Google Calendar directly in this dashboard.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-primary/20 bg-background/40 p-1">
              <button
                type="button"
                onClick={() => setCalendarEventScope('mine')}
                className={`rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
                  calendarEventScope === 'mine'
                    ? 'bg-primary/20 text-foreground'
                    : 'text-muted-foreground/80 hover:text-foreground'
                }`}
              >
                My Upcoming Events
              </button>
              <button
                type="button"
                onClick={() => setCalendarEventScope('organizers')}
                className={`rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
                  calendarEventScope === 'organizers'
                    ? 'bg-primary/20 text-foreground'
                    : 'text-muted-foreground/80 hover:text-foreground'
                }`}
              >
                Organizer Events
              </button>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              {calendarEventsQuery.data?.source === 'google-calendar-api'
                ? 'Synced with Google Calendar API'
                : 'Using calendar feed fallback'}
            </p>
          </div>

          {calendarEventsQuery.data?.warning ? (
            <p className="font-mono text-xs leading-6 text-accent">
              {calendarEventsQuery.data.warning}
            </p>
          ) : null}

          <div className="space-y-2">
            {(calendarEventScope === 'mine' ? userCalendarEvents : organizerCalendarEvents).slice(0, 16).length ? (
              (calendarEventScope === 'mine' ? userCalendarEvents : organizerCalendarEvents)
                .slice(0, 16)
                .map((event) => (
                  <div key={`${event.id || event.startAt}-${event.ownerEmail || 'calendar'}`} className="rounded-xl border border-primary/15 bg-background/35 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-heading text-lg text-foreground">{event.title || 'Untitled event'}</p>
                        <p className="mt-1 font-mono text-xs text-primary/80">{formatCalendarRange(event)}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground/75">
                          {calendarEventScope === 'organizers'
                            ? `Organizer: ${event.ownerEmail || event.organizerEmail || 'Unknown'}`
                            : `Account: ${event.ownerEmail || authUser?.email || 'Unknown'}`}
                        </p>
                      </div>
                      {event.url ? (
                        <a href={event.url} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Event
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))
            ) : (
              <EmptyState
                title={calendarEventScope === 'mine' ? 'No upcoming events for your account' : 'No organizer events loaded'}
                description={calendarEventScope === 'mine'
                  ? 'If your calendar has events, check Google Workspace delegation and calendar scope settings.'
                  : 'Organizer events appear after the organizer group and calendar scope are configured.'}
              />
            )}
          </div>
        </div>
      </Section>

      <Section id="integration-mail" eyebrow="Gmail & SMTP" title="Mail Integration" description="Configure server-side mail delivery for attendee announcements. SMTP credentials and Gmail sender defaults live here — secrets stay in server env vars.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={Mail}
            label="Mail Access"
            value={hasSmtpServer ? 'SMTP Ready' : googleWorkspaceScopes.gmailSend && hasGoogleWorkspaceApi ? 'Gmail Scope Ready' : 'Needs Sender'}
            hint={hasSmtpServer ? integrationStatus.email?.smtpHost || 'SMTP' : 'Gmail send can reuse the Workspace credential when wired to a sender.'}
          />
          <StatCard icon={Inbox} label="Team Inbox" value={teamInboxUrl ? 'Linked' : 'Not Set'} hint="Inbox handoff link for coordinators." />
          <StatCard icon={Send} label="Sponsor Notify" value={googleWorkspaceScopes.gmailSend && hasGoogleWorkspaceApi ? 'Auto-send ready' : 'Needs gmail scope'} hint="New sponsor inquiries are automatically emailed to organizers@cyberswarmsac.com." />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <input className={fieldClasses} value={draft.operations?.messaging_from_name || ''} onChange={(event) => setField('operations', 'messaging_from_name', event.target.value)} placeholder="Sender display name" />
          <input className={fieldClasses} value={draft.operations?.messaging_reply_to || ''} onChange={(event) => setField('operations', 'messaging_reply_to', event.target.value)} placeholder="Reply-to email" />
          <input className={fieldClasses} value={draft.operations?.messaging_team_inbox_url || ''} onChange={(event) => setField('operations', 'messaging_team_inbox_url', event.target.value)} placeholder="Team inbox URL" />
        </div>
        <div className="flex flex-wrap gap-2">
          {teamInboxUrl ? <a href={teamInboxUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><Inbox className="mr-2 h-4 w-4" />Open Inbox</a> : null}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section id="integration-sponsor-requests" eyebrow="Sponsor Requests" title="Private Sponsor Inbox" description="Website sponsor requests are stored privately on the CyberSwarm server and surfaced only inside admin." action={<button type="button" onClick={refreshFeedQueries} className={outlineButtonClasses}><RefreshCw className="mr-2 h-4 w-4" />Refresh</button>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={itemCardClasses}>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">Storage Status</p>
              <p className="mt-3 font-heading text-2xl text-foreground">
                {sponsorLeads.length ? `${sponsorLeads.length} stored` : 'Ready for requests'}
              </p>
              <p className="font-mono text-xs leading-6 text-muted-foreground/70">
                Sponsor submissions from the website are saved privately and never exposed in the public site content payload.
              </p>
            </div>
            <div className={itemCardClasses}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">Notifications</p>
                  <p className="mt-3 font-heading text-2xl text-foreground">{newSponsorLeadCount ? `${newSponsorLeadCount} new` : 'Up to date'}</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                  <BellRing className="h-5 w-5" />
                </div>
              </div>
              <p className="font-mono text-xs leading-6 text-muted-foreground/70">
                Browser alerts can notify admins when fresh sponsor requests arrive while the dashboard is open.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markSponsorLeadReviewed(firstUnreviewedSponsorLead)}
                  disabled={!firstUnreviewedSponsorLead}
                  className={outlineButtonClasses}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {firstUnreviewedSponsorLead ? 'Mark Newest Unreviewed' : 'All Reviewed'}
                </button>
                <button type="button" onClick={requestBrowserAlerts} className={outlineButtonClasses}>
                  <BellRing className="mr-2 h-4 w-4" />
                  {browserAlertPermission === 'granted' ? 'Alerts Enabled' : 'Enable Alerts'}
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section id="integration-attendee-feed" eyebrow="Google Forms" title="Registration Response Sheet" description="Connect the Google Forms response sheet feed and map the fields admins use for roster filters and messaging.">
          <input className={fieldClasses} value={draft.operations?.attendee_feed_url || ''} onChange={(event) => setField('operations', 'attendee_feed_url', event.target.value)} placeholder="Attendee response feed URL" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input className={fieldClasses} value={draft.operations?.attendee_name_field || ''} onChange={(event) => setField('operations', 'attendee_name_field', event.target.value)} placeholder="Name column header (ex: Name)" />
            <input className={fieldClasses} value={draft.operations?.attendee_email_field || ''} onChange={(event) => setField('operations', 'attendee_email_field', event.target.value)} placeholder="Email column header (ex: Email Address)" />
            <input className={fieldClasses} value={draft.operations?.attendee_company_field || ''} onChange={(event) => setField('operations', 'attendee_company_field', event.target.value)} placeholder="Organization column header (ex: Org Name)" />
            <input className={fieldClasses} value={draft.operations?.attendee_role_field || ''} onChange={(event) => setField('operations', 'attendee_role_field', event.target.value)} placeholder="Role column header (ex: You are)" />
            <input className={fieldClasses} value={draft.operations?.attendee_status_field || ''} onChange={(event) => setField('operations', 'attendee_status_field', event.target.value)} placeholder="Status column header" />
            <input className={fieldClasses} value={draft.operations?.attendee_timestamp_field || ''} onChange={(event) => setField('operations', 'attendee_timestamp_field', event.target.value)} placeholder="Timestamp column header (ex: Timestamp)" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeedConnectionCard title="Feed Status" url={resolvedAttendeeFeedUrl} rowCount={attendees.length} format={attendeeFeedQuery.data?.format} fetchedAt={attendeeFeedQuery.data?.fetchedAt} error={attendeeFeedQuery.error?.message} />
            <div className={itemCardClasses}>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">Mapped Roster Signals</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-3">
                  <span className="font-mono text-xs text-muted-foreground/75">Unique recipients</span>
                  <span className="font-mono text-xs text-foreground">{buildRecipientList(attendees).length}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-3">
                  <span className="font-mono text-xs text-muted-foreground/75">Status values</span>
                  <span className="font-mono text-xs text-foreground">{attendeeStatuses.length}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs text-muted-foreground/75">Feed connection</span>
                  <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground">
                    {hasAttendeeFeed ? 'Connected' : 'Needs setup'}
                  </span>
                </div>
              </div>
              {attendeeFeedQuery.data?.headers?.length ? (
                <p className="font-mono text-xs leading-6 text-muted-foreground/70">
                  Columns: {attendeeFeedQuery.data.headers.slice(0, 8).join(', ')}
                  {attendeeFeedQuery.data.headers.length > 8 ? ` +${attendeeFeedQuery.data.headers.length - 8} more` : ''}
                </p>
              ) : null}
            </div>
          </div>
        </Section>
      </div>

      <Section id="integration-messaging" eyebrow="Messaging" title="Composer Defaults" description="These defaults seed the Messaging workspace but can still be changed for each draft.">
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={fieldClasses} value={draft.operations?.messaging_from_name || ''} onChange={(event) => setField('operations', 'messaging_from_name', event.target.value)} placeholder="Sender display name" />
          <input className={fieldClasses} value={draft.operations?.messaging_subject_prefix || ''} onChange={(event) => setField('operations', 'messaging_subject_prefix', event.target.value)} placeholder="Subject prefix" />
          <input className={fieldClasses} value={draft.operations?.messaging_reply_to || ''} onChange={(event) => setField('operations', 'messaging_reply_to', event.target.value)} placeholder="Reply-to email" />
        </div>
        <p className="font-mono text-xs leading-6 text-muted-foreground/75">
          {hasSmtpServer ? `Server SMTP is ready through ${integrationStatus.email?.smtpHost || 'the configured provider'}.` : 'SMTP sending needs server environment variables before direct delivery is enabled.'}
        </p>
      </Section>
    </div>
  );

  const renderMessagingPage = () => (
    <div className="space-y-6">
      <Section eyebrow="Audience" title="Attendee Messaging" description="Use the attendee response feed to build recipient lists, prep an announcement, and send through the configured mail provider.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Recipients" value={String(recipientList.length)} hint="Unique attendee emails matching the current filters." />
          <StatCard icon={Mail} label="All Attendees" value={String(attendees.length)} hint="Total mapped attendee rows in the feed." />
          <StatCard icon={Handshake} label="Sponsor Leads" value={String(sponsorLeads.length)} hint="Private sponsor inbox remains available separately." />
          <StatCard icon={CheckCircle2} label="Statuses" value={String(attendeeStatuses.length)} hint="Use statuses to target specific groups before outreach." />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Section eyebrow="Filters" title="Recipient Builder" description="Narrow the current audience before copying or exporting their emails.">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" /><input className="w-full rounded-2xl border border-primary/15 bg-background/40 py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary/50 focus:bg-background/70" value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search recipients" /></div>
            <select className={fieldClasses} value={messageStatusFilter} onChange={(event) => setMessageStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {attendeeStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className={itemCardClasses}>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Current Defaults</p>
            <div className="space-y-2">
              <p className="font-mono text-xs text-muted-foreground/75">
                Subject prefix: <span className="text-foreground">{draft.operations?.messaging_subject_prefix || 'CyberSwarm'}</span>
              </p>
              <p className="font-mono text-xs text-muted-foreground/75">
                Reply-to: <span className="text-foreground">{draft.operations?.messaging_reply_to || 'Not set'}</span>
              </p>
              <p className="font-mono text-xs text-muted-foreground/75">
                SMTP: <span className="text-foreground">{hasSmtpServer ? integrationStatus.email?.smtpHost || 'Ready' : 'Needs server env'}</span>
              </p>
              <p className="font-mono text-xs text-muted-foreground/75">
                Team inbox: <span className="text-foreground">{teamInboxUrl ? 'Linked' : 'Not set'}</span>
              </p>
            </div>
            {teamInboxUrl ? <a href={teamInboxUrl} target="_blank" rel="noopener noreferrer" className={outlineButtonClasses}><Inbox className="mr-2 h-4 w-4" />Open Inbox</a> : null}
            <p className="font-mono text-xs leading-6 text-muted-foreground/70">
              Update these defaults in Integrations when you want every new draft to start from a different base.
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-primary/15 bg-background/35 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">Recipient Preview</p>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-2">
              {recipientList.length ? recipientList.slice(0, 20).map((recipient) => (
                <div key={recipient.id} className="rounded-xl border border-primary/10 bg-background/40 px-3 py-2">
                  <p className="font-heading text-base text-foreground">{recipient.name || recipient.email}</p>
                  <p className="font-mono text-xs text-muted-foreground/75">{[recipient.email, recipient.status].filter(Boolean).join(' • ')}</p>
                </div>
              )) : <p className="font-mono text-xs leading-6 text-muted-foreground/70">No recipients match the current filters yet.</p>}
            </div>
          </div>
        </Section>

        <Section eyebrow="Draft" title="Message Composer" description="Compose the message here, then copy it, export the audience, open a local draft, or send through server SMTP." action={<div className="flex flex-wrap gap-2"><button type="button" onClick={copyRecipients} className={outlineButtonClasses}><Copy className="mr-2 h-4 w-4" />Copy Emails</button><button type="button" onClick={exportRecipients} className={outlineButtonClasses}><Download className="mr-2 h-4 w-4" />Export CSV</button></div>}>
          <input className={fieldClasses} value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} placeholder="Email subject" />
          <textarea className={`${fieldClasses} min-h-[220px]`} value={composeBody} onChange={(event) => setComposeBody(event.target.value)} placeholder="Write the message you want to send" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyMessageDraft} className={outlineButtonClasses}><Copy className="mr-2 h-4 w-4" />Copy Draft</button>
            <button type="button" onClick={openMailDraft} className={primaryButtonClasses}><Mail className="mr-2 h-4 w-4" />Open Mail Draft</button>
            <button type="button" onClick={sendServerEmail} disabled={!hasSmtpServer || !recipientList.length || emailSending} className={primaryButtonClasses}><Send className="mr-2 h-4 w-4" />{emailSending ? 'Sending...' : 'Send Via SMTP'}</button>
          </div>
          <p className="font-mono text-xs leading-6 text-muted-foreground/75">
            {hasSmtpServer
              ? `Server SMTP is ready through ${integrationStatus.email?.smtpHost || 'the configured provider'}.`
              : 'Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM on the API server before sending directly from admin.'}
          </p>
        </Section>
      </div>
    </div>
  );

  const sendMailingCampaign = async () => {
    if (!mailingSubject.trim()) {
      setMailingStatus('Subject is required');
      return;
    }

    if (!mailingHtml && !mailingText) {
      setMailingStatus('Email body is required');
      return;
    }

    if (mailingTo.length === 0) {
      setMailingStatus('At least one recipient is required');
      return;
    }

    setMailingSending(true);
    setMailingStatus('');

    try {
      const payload = {
        to: mailingTo,
        cc: mailingCc,
        bcc: mailingBcc,
        subject: mailingSubject,
        html: mailingHtml,
        text: mailingText,
        recipientType: mailingRecipientType === 'custom' ? 'manual' : mailingRecipientType,
        deliveryMode: mailingDeliveryMode,
      };

      const result = await appClient.admin.sendMailing(payload);

      setMailingStatus(
        `Email sent successfully to ${result.recipientCount} recipient${result.recipientCount !== 1 ? 's' : ''}!`
      );
      setMailingTo([]);
      setMailingCc([]);
      setMailingBcc([]);
      setMailingSubject('');
      setMailingHtml('');
      setMailingText('');
      setMailingDeliveryMode('shared');
    } catch (error) {
      setMailingStatus(`Error: ${error instanceof Error ? error.message : 'Failed to send email'}`);
    } finally {
      setMailingSending(false);
    }
  };

  const handleRecipientTypeChange = async (newType) => {
    setMailingRecipientType(newType);

    if (newType === 'attendees') {
      const attendeesEmails = [
        ...new Set(
          mailingContactDirectory
            .filter((item) => item.sourceType === 'attendee')
            .map((item) => item.email)
            .filter(isLikelyEmail)
        ),
      ];
      setMailingTo(attendeesEmails);
    } else if (newType === 'sponsors') {
      const sponsorEmails = [
        ...new Set(
          mailingContactDirectory
            .filter((item) => item.sourceType === 'sponsor-published')
            .map((item) => item.email)
            .filter(isLikelyEmail)
        ),
      ];
      setMailingTo(sponsorEmails);
    } else if (newType === 'sponsor-interest') {
      const sponsorInterestEmails = [
        ...new Set(
          mailingContactDirectory
            .filter((item) => item.sourceType === 'sponsor-interest')
            .map((item) => item.email)
            .filter(isLikelyEmail)
        ),
      ];
      setMailingTo(sponsorInterestEmails);
    } else if (newType === 'custom') {
      setMailingTo([]);
    }
  };

  const addRecipient = (setter, existingValues, rawEmail, clearInput) => {
    const email = normalizeEmailAddress(rawEmail);
    if (!isLikelyEmail(email) || existingValues.includes(email)) return;
    setter([...existingValues, email]);
    clearInput('');
    // Automatically switch to 'custom' recipient type when manually adding recipients
    if (mailingRecipientType !== 'custom') {
      setMailingRecipientType('custom');
    }
  };

  const removeRecipient = (email) => {
    setMailingTo(mailingTo.filter((e) => e !== email));
  };

  const renderMailingPage = () => (
    <div className="space-y-6">
      <Section eyebrow="Recipients" title="Mailing Audience" description="Select who you want to send this email to. You can choose attendees, published sponsors, sponsor interest contacts, or customize the recipient list.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => handleRecipientTypeChange('attendees')}
            className={`rounded-xl border-2 p-4 transition ${
              mailingRecipientType === 'attendees'
                ? 'border-primary bg-primary/10'
                : 'border-primary/20 bg-background/40 hover:border-primary/40'
            }`}
          >
            <Users className="mb-2 h-5 w-5 text-primary" />
            <p className="font-heading text-base text-foreground">All Attendees</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {mailingAudienceCounts.attendees} attendees
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleRecipientTypeChange('sponsors')}
            className={`rounded-xl border-2 p-4 transition ${
              mailingRecipientType === 'sponsors'
                ? 'border-primary bg-primary/10'
                : 'border-primary/20 bg-background/40 hover:border-primary/40'
            }`}
          >
            <Handshake className="mb-2 h-5 w-5 text-primary" />
            <p className="font-heading text-base text-foreground">Published Sponsors</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {mailingAudienceCounts.sponsors} recipient{mailingAudienceCounts.sponsors !== 1 ? 's' : ''}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleRecipientTypeChange('sponsor-interest')}
            className={`rounded-xl border-2 p-4 transition ${
              mailingRecipientType === 'sponsor-interest'
                ? 'border-primary bg-primary/10'
                : 'border-primary/20 bg-background/40 hover:border-primary/40'
            }`}
          >
            <Inbox className="mb-2 h-5 w-5 text-primary" />
            <p className="font-heading text-base text-foreground">Sponsor Interest</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {mailingAudienceCounts.sponsorInterest} recipient{mailingAudienceCounts.sponsorInterest !== 1 ? 's' : ''}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleRecipientTypeChange('custom')}
            className={`rounded-xl border-2 p-4 transition ${
              mailingRecipientType === 'custom'
                ? 'border-primary bg-primary/10'
                : 'border-primary/20 bg-background/40 hover:border-primary/40'
            }`}
          >
            <Mail className="mb-2 h-5 w-5 text-primary" />
            <p className="font-heading text-base text-foreground">Custom List</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {mailingTo.length} recipient{mailingTo.length !== 1 ? 's' : ''}
            </p>
          </button>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Section eyebrow="Recipients" title="Email Details" description="Configure the recipients and email headers for this campaign.">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-heading text-sm text-foreground">To</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  list="mailing-recipient-options"
                  className={fieldClasses}
                  placeholder="Add recipient email"
                  value={mailingToInput}
                  onChange={(e) => setMailingToInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addRecipient(setMailingTo, mailingTo, mailingToInput, setMailingToInput);
                    }
                  }}
                />
              </div>
              {mailingTo.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {mailingTo.map((email) => (
                    <div key={email} className="flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1">
                      <span className="font-mono text-xs text-primary">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(email)}
                        className="transition hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block font-heading text-sm text-foreground">CC</label>
              <input
                type="email"
                list="mailing-recipient-options"
                className={fieldClasses}
                placeholder="Add CC recipient email"
                value={mailingCcInput}
                onChange={(e) => setMailingCcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addRecipient(setMailingCc, mailingCc, mailingCcInput, setMailingCcInput);
                  }
                }}
              />
              {mailingCc.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {mailingCc.map((email) => (
                    <div key={email} className="flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1">
                      <span className="font-mono text-xs text-accent">{email}</span>
                      <button
                        type="button"
                        onClick={() => setMailingCc(mailingCc.filter((e) => e !== email))}
                        className="transition hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block font-heading text-sm text-foreground">BCC</label>
              <input
                type="email"
                list="mailing-recipient-options"
                className={fieldClasses}
                placeholder="Add BCC recipient email"
                value={mailingBccInput}
                onChange={(e) => setMailingBccInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addRecipient(setMailingBcc, mailingBcc, mailingBccInput, setMailingBccInput);
                  }
                }}
              />
              {mailingBcc.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {mailingBcc.map((email) => (
                    <div key={email} className="flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1">
                      <span className="font-mono text-xs text-accent">{email}</span>
                      <button
                        type="button"
                        onClick={() => setMailingBcc(mailingBcc.filter((e) => e !== email))}
                        className="transition hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section eyebrow="Composition" title="Email Content" description="Write your message using rich formatting like Gmail. HTML will be sent to recipients.">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-heading text-sm text-foreground">Recipient Visibility</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMailingDeliveryMode('shared')}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    mailingDeliveryMode === 'shared'
                      ? 'border-primary/45 bg-primary/10 text-foreground'
                      : 'border-primary/15 bg-background/35 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  <p className="font-heading text-base text-foreground">Shared Email</p>
                  <p className="mt-1 font-mono text-xs leading-5 text-muted-foreground/75">
                    Recipients can see the other addresses included on the message.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMailingDeliveryMode('private')}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    mailingDeliveryMode === 'private'
                      ? 'border-primary/45 bg-primary/10 text-foreground'
                      : 'border-primary/15 bg-background/35 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  <p className="font-heading text-base text-foreground">Private Copies</p>
                  <p className="mt-1 font-mono text-xs leading-5 text-muted-foreground/75">
                    Each recipient gets their own copy and only sees their own address.
                  </p>
                </button>
              </div>
              <p className="mt-2 font-mono text-xs leading-6 text-muted-foreground/70">
                {mailingDeliveryMode === 'private'
                  ? 'Private mode sends separate emails to each address in To, CC, and BCC.'
                  : 'Shared mode sends one message using the To, CC, and BCC fields as entered.'}
              </p>
            </div>

            <div>
              <label className="mb-2 block font-heading text-sm text-foreground">Subject</label>
              <input
                type="text"
                className={fieldClasses}
                value={mailingSubject}
                onChange={(e) => setMailingSubject(e.target.value)}
                placeholder="Email subject line"
              />
            </div>

            <div>
              <label className="mb-2 block font-heading text-sm text-foreground">Message Body (Rich Text)</label>
              <div className="rounded-xl border border-primary/15 bg-background/40 p-1">
                <ReactQuill
                  theme="snow"
                  value={mailingHtml}
                  onChange={setMailingHtml}
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'strike'],
                      ['blockquote', 'code-block'],
                      [{ header: 1 }, { header: 2 }],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['link', 'image'],
                      ['clean'],
                    ],
                  }}
                  formats={['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block', 'header', 'list', 'link', 'image']}
                  style={{ minHeight: '300px' }}
                />
              </div>
            </div>

            {mailingStatus && (
              <div className={`rounded-xl border px-4 py-3 ${String(mailingStatus).includes('success') || String(mailingStatus).includes('successfully') ? 'border-primary/30 bg-primary/10' : 'border-accent/30 bg-accent/10'}`}>
                <p className={`font-mono text-xs ${String(mailingStatus).includes('success') || String(mailingStatus).includes('successfully') ? 'text-primary' : 'text-accent'}`}>
                  {mailingStatus}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={sendMailingCampaign}
              disabled={mailingSending || mailingTo.length === 0 || !mailingSubject.trim() || (!mailingHtml && !mailingText)}
              className={`${String(mailingStatus).includes('success') || String(mailingStatus).includes('successfully') ? outlineButtonClasses : primaryButtonClasses} w-full`}
            >
              <Send className="mr-2 h-4 w-4" />
              {mailingSending ? 'Sending...' : `Send to ${mailingTo.length} recipient${mailingTo.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </Section>
      </div>

      <datalist id="mailing-recipient-options">
        {mailingAutocompleteOptions.map((option) => (
          <option
            key={option.email}
            value={option.email}
            label={[option.name, option.company, option.sourceText].filter(Boolean).join(' • ')}
          />
        ))}
      </datalist>
    </div>
  );

  const renderJsonPage = () => (
    <div className="space-y-6">
      <Section eyebrow="Advanced" title="Raw JSON Workspace" description="For schema-level changes, you can edit the full normalized site content directly here." action={<button type="button" onClick={loadJsonIntoEditor} className={outlineButtonClasses}><Link2 className="mr-2 h-4 w-4" />Load Into Draft</button>}>
        <textarea className="min-h-[540px] w-full rounded-2xl border border-primary/20 bg-background/65 p-4 font-mono text-xs leading-6 text-foreground outline-none transition focus:border-primary/55" value={jsonText} onChange={(event) => setJsonText(event.target.value)} spellCheck={false} />
        {jsonError ? <p className="font-mono text-xs text-accent">{jsonError}</p> : null}
      </Section>
    </div>
  );

  const renderPage = () => {
    if (isLoading || !draft) {
      return <div className={panelShellClasses}><p className="font-mono text-sm text-muted-foreground/70">Loading content...</p></div>;
    }

    switch (currentPageId) {
      case 'site':
        return renderSitePage();
      case 'presentation':
        return renderPresentationPage();
      case 'calendar':
        return renderCalendarPage();
      case 'sponsors':
        return renderSponsorsPage();
      case 'attendees':
        return renderAttendeesPage();
      case 'messaging':
        return renderMessagingPage();
      case 'mailing':
        return renderMailingPage();
      case 'integrations':
        return renderIntegrationsPage();
      case 'json':
        return renderJsonPage();
      case 'overview':
      default:
        return renderOverviewPage();
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-background px-6 py-16 text-foreground">
        <div className="glass mx-auto max-w-xl rounded-lg p-8 space-y-5">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-primary/50">// Admin Access</p>
            <h1 className="font-heading text-4xl text-foreground">CyberSwarm Admin</h1>
          </div>
          <p className="font-mono text-sm text-muted-foreground/80">Sign in with Google to manage the site. Only members of the configured Organizers Google Group can access this admin dashboard.</p>
          {!googleClientId ? <p className="font-mono text-xs text-accent/90">Missing <code>VITE_GOOGLE_CLIENT_ID</code>. Add it to your environment.</p> : null}
          <div className="flex items-center gap-3">
            <button type="button" onClick={signInWithGoogle} disabled={!googleClientId || authBusy} className="rounded border border-primary/40 px-4 py-2 text-primary transition hover:bg-primary/10 disabled:opacity-50">{authBusy ? 'Signing in...' : 'Sign in with Google'}</button>
            <Link to="/" className="font-mono text-xs text-muted-foreground transition hover:text-primary">Back to site</Link>
          </div>
          {authError ? <p className="font-mono text-xs text-accent">{authError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_28%),radial-gradient(circle_at_top_right,hsl(var(--accent)/0.08),transparent_32%),hsl(var(--background))] px-4 py-4 text-foreground sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1520px] lg:grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-6">
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="glass flex h-full flex-col rounded-[1.75rem] p-4 sm:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input className="w-full rounded-2xl border border-primary/15 bg-background/40 py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary/50 focus:bg-background/70" value={navSearch} onChange={(event) => setNavSearch(event.target.value)} placeholder="Search pages" />
            </div>

            <div className="mt-4 flex-1 space-y-2 overflow-x-hidden overflow-y-auto pr-1">
              {filteredPageItems.map((item) => <SidebarItem key={item.id} to={`/admin/${item.id}`} icon={item.icon} title={item.title} description={item.description} badge={item.badge} active={currentPageId === item.id} />)}
              {!filteredPageItems.length ? <div className="rounded-2xl border border-dashed border-primary/20 bg-background/20 p-4 text-center"><p className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground/70">No page match</p></div> : null}
            </div>
          </div>
        </aside>

        <div className="mt-6 min-w-0 space-y-6 lg:mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
            <div className={`${compactPanelShellClasses} relative min-h-[10.5rem] overflow-hidden xl:h-full`}>
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -right-8 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/75 to-transparent" />
                <div className="absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
              </div>
              <div className="relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-6">
                <div className="flex min-w-0 items-center justify-center">
                  <h2 className="text-center font-heading text-4xl leading-none text-foreground sm:text-5xl">
                    {activePageMeta.title}
                  </h2>
                </div>
                <div className="relative hidden h-20 w-20 shrink-0 items-center justify-center rounded-[1.65rem] border border-primary/20 bg-primary/10 text-primary shadow-[0_0_35px_hsl(var(--primary)/0.12)] sm:flex">
                  <div className="absolute inset-3 rounded-[1.1rem] border border-primary/12" />
                  <ActivePageIcon className="relative h-9 w-9" />
                </div>
              </div>
            </div>

            <div className={`${panelShellClasses} relative min-h-[10.5rem] overflow-hidden xl:h-full`}>
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-primary/8 blur-3xl" />
                <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
              </div>
              <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-heading text-lg text-primary">{(authUser.name || authUser.email || 'A').slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="truncate font-heading text-lg text-foreground">{authUser.name || 'Admin'}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground/70">{authUser.email}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/" className={outlineButtonClasses}><Eye className="mr-2 h-4 w-4" />View Site</Link>
                <button type="button" onClick={signOut} className={outlineButtonClasses}><LogOut className="mr-2 h-4 w-4" />Sign Out</button>
              </div>
              </div>
            </div>
          </div>

          <div className={panelShellClasses}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <button type="button" onClick={saveAll} disabled={saving || !isDirty} className={primaryButtonClasses}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={refreshFeedQueries} className={outlineButtonClasses}><RefreshCw className="mr-2 h-4 w-4" />Refresh Feeds</button>
              <button type="button" onClick={resetDefaults} disabled={saving} className={dangerButtonClasses}><RotateCcw className="mr-2 h-4 w-4" />Reset Defaults</button>
              <button type="button" onClick={exportJson} className={outlineButtonClasses}><Download className="mr-2 h-4 w-4" />Export JSON</button>
            </div>
            {saveMessage ? <p className="mt-3 font-mono text-xs text-muted-foreground/75">{saveMessage}</p> : null}
          </div>

          {renderPage()}
        </div>
      </div>
    </div>
  );
}
