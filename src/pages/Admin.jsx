import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/client';
import { useSiteContent } from '@/hooks/use-site-content';
import AdminMapPinPicker from '@/components/cyberswarm/AdminMapPinPicker';

const ADMIN_USER_KEY = 'cyberswarm_admin_user';
const APP_USER_KEY = 'cyberswarm_user';

const fieldClasses =
  'w-full bg-background/60 border border-primary/20 rounded px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60';

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

const toFiniteNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const loadStoredAdminUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

function Section({ title, children }) {
  return (
    <section className="glass rounded-lg p-6 space-y-4">
      <h2 className="font-heading text-2xl text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default function Admin() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSiteContent();

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  const [authUser, setAuthUser] = useState(loadStoredAdminUser());
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const tokenClientRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const adminEmails = useMemo(() => parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS), []);

  useEffect(() => {
    if (!data) return;
    if (!draft || !isDirty) {
      setDraft(data);
      setJsonText(JSON.stringify(data, null, 2));
      setJsonError('');
    }
  }, [data, draft, isDirty]);

  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined') return;

    const setupGoogle = () => {
      const google = window['google'];
      if (!google?.accounts?.oauth2) return;

      tokenClientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setAuthError(tokenResponse.error);
            setAuthBusy(false);
            return;
          }

          try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            const profile = await response.json();
            const email = String(profile.email || '').toLowerCase();

            if (!email) {
              setAuthError('Google login succeeded, but no email was returned.');
              setAuthBusy(false);
              return;
            }

            if (adminEmails.length > 0 && !adminEmails.includes(email)) {
              setAuthError(`Access denied for ${email}.`);
              setAuthBusy(false);
              return;
            }

            const user = {
              name: profile.name || email,
              email,
              picture: profile.picture || '',
              lastLoginAt: new Date().toISOString(),
            };

            window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
            window.localStorage.setItem(APP_USER_KEY, JSON.stringify({ ...user, role: 'admin' }));
            appClient.auth.setAccessToken(tokenResponse.access_token || '');
            setAuthUser(user);
            setAuthError('');
          } catch (_error) {
            setAuthError('Could not load Google profile data.');
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
  }, [adminEmails, googleClientId]);

  const updateDraft = (updater) => {
    setDraft((prev) => {
      const current = prev || data;
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

  const setEventNumberField = (key, value, fallback) => {
    const next = String(value || '').trim();
    if (!next) {
      setField('eventConfig', key, fallback);
      return;
    }

    const parsed = Number(next);
    if (Number.isFinite(parsed)) {
      const normalized =
        key === 'pin_zoom'
          ? Math.min(20, Math.max(3, Math.round(parsed)))
          : parsed;
      setField('eventConfig', key, normalized);
    }
  };

  const setEventPin = (lat, lng) => {
    updateDraft((prev) => ({
      ...prev,
      eventConfig: {
        ...prev.eventConfig,
        pin_latitude: Number(lat.toFixed(6)),
        pin_longitude: Number(lng.toFixed(6)),
      },
    }));
  };

  const setListItemField = (listKey, index, key, value) => {
    updateDraft((prev) => {
      const list = [...prev[listKey]];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, [listKey]: list };
    });
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
    if (!draft || typeof window === 'undefined') return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberswarm-content-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-16">
        <div className="max-w-xl mx-auto glass rounded-lg p-8 space-y-5">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-primary/50 uppercase mb-3">// Admin Access</p>
            <h1 className="font-heading text-4xl text-foreground">CyberSwarm CMS</h1>
          </div>
          <p className="font-mono text-sm text-muted-foreground/80">
            Sign in with Google to manage homepage content at <code>/admin</code>.
          </p>
          {!googleClientId && (
            <p className="font-mono text-xs text-accent/90">
              Missing <code>VITE_GOOGLE_CLIENT_ID</code>. Add it to your environment.
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={!googleClientId || authBusy}
              className="px-4 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 transition disabled:opacity-50"
            >
              {authBusy ? 'Signing in...' : 'Sign in with Google'}
            </button>
            <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-primary transition">
              Back to site
            </Link>
          </div>
          {authError ? <p className="font-mono text-xs text-accent">{authError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="glass rounded-lg p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          <div className="flex-1">
            <p className="font-mono text-xs tracking-[0.3em] text-primary/50 uppercase mb-2">// CyberSwarm Admin</p>
            <h1 className="font-heading text-3xl">Content Dashboard</h1>
            <p className="font-mono text-xs text-muted-foreground/70 mt-1">Signed in as {authUser.email}</p>
            {saveMessage ? <p className="font-mono text-xs text-primary/80 mt-2">{saveMessage}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveAll}
              disabled={saving || !isDirty}
              className="px-3 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={resetDefaults}
              disabled={saving}
              className="px-3 py-2 rounded border border-accent/40 text-accent hover:bg-accent/10 transition disabled:opacity-50"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="px-3 py-2 rounded border border-primary/30 text-muted-foreground hover:text-primary transition"
            >
              Export JSON
            </button>
            <Link
              to="/"
              className="px-3 py-2 rounded border border-primary/30 text-muted-foreground hover:text-primary transition"
            >
              View Site
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="px-3 py-2 rounded border border-primary/30 text-muted-foreground hover:text-primary transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {isLoading || !draft ? (
          <div className="glass rounded-lg p-6">
            <p className="font-mono text-sm text-muted-foreground/70">Loading content...</p>
          </div>
        ) : (
          <div className="grid xl:grid-cols-2 gap-6">
            <Section title="Hero">
              <input className={fieldClasses} value={draft.hero.pretitle || ''} onChange={(e) => setField('hero', 'pretitle', e.target.value)} placeholder="Pretitle" />
              <div className="grid sm:grid-cols-2 gap-3">
                <input className={fieldClasses} value={draft.hero.title_line_1 || ''} onChange={(e) => setField('hero', 'title_line_1', e.target.value)} placeholder="Title line 1" />
                <input className={fieldClasses} value={draft.hero.title_line_2 || ''} onChange={(e) => setField('hero', 'title_line_2', e.target.value)} placeholder="Title line 2" />
              </div>
              <textarea className={`${fieldClasses} min-h-20`} value={draft.hero.subtitle || ''} onChange={(e) => setField('hero', 'subtitle', e.target.value)} placeholder="Subtitle" />
              <input className={fieldClasses} value={draft.hero.countdown_target || ''} onChange={(e) => setField('hero', 'countdown_target', e.target.value)} placeholder="Fallback countdown target (used if Event Date is empty)" />
              <input className={fieldClasses} value={draft.hero.cta_label || ''} onChange={(e) => setField('hero', 'cta_label', e.target.value)} placeholder="CTA label" />
            </Section>

            <Section title="Event Config">
              <div className="grid sm:grid-cols-2 gap-3">
                <input type="date" className={fieldClasses} value={draft.eventConfig.event_date || ''} onChange={(e) => setField('eventConfig', 'event_date', e.target.value)} />
                <input className={fieldClasses} value={draft.eventConfig.event_time || ''} onChange={(e) => setField('eventConfig', 'event_time', e.target.value)} placeholder="Event time" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className={fieldClasses}
                  value={draft.eventConfig.venue_name_line_1 || draft.eventConfig.venue_name || ''}
                  onChange={(e) =>
                    updateDraft((prev) => ({
                      ...prev,
                      eventConfig: {
                        ...prev.eventConfig,
                        venue_name_line_1: e.target.value,
                        venue_name: e.target.value,
                      },
                    }))
                  }
                  placeholder="Venue title line 1"
                />
                <input
                  className={fieldClasses}
                  value={draft.eventConfig.venue_name_line_2 || ''}
                  onChange={(e) => setField('eventConfig', 'venue_name_line_2', e.target.value)}
                  placeholder="Venue title line 2 (optional)"
                />
              </div>
              <input className={fieldClasses} value={draft.eventConfig.venue_address || ''} onChange={(e) => setField('eventConfig', 'venue_address', e.target.value)} placeholder="Venue address" />
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="number"
                  step="any"
                  className={fieldClasses}
                  value={draft.eventConfig.pin_latitude ?? ''}
                  onChange={(e) => setEventNumberField('pin_latitude', e.target.value, 38.5616)}
                  placeholder="Pin latitude"
                />
                <input
                  type="number"
                  step="any"
                  className={fieldClasses}
                  value={draft.eventConfig.pin_longitude ?? ''}
                  onChange={(e) => setEventNumberField('pin_longitude', e.target.value, -121.4244)}
                  placeholder="Pin longitude"
                />
                <input
                  type="number"
                  min="3"
                  max="20"
                  className={fieldClasses}
                  value={draft.eventConfig.pin_zoom ?? 15}
                  onChange={(e) =>
                    setEventNumberField(
                      'pin_zoom',
                      e.target.value,
                      15
                    )
                  }
                  placeholder="Map zoom"
                />
              </div>
              <AdminMapPinPicker
                latitude={toFiniteNumber(draft.eventConfig.pin_latitude, 38.5616)}
                longitude={toFiniteNumber(draft.eventConfig.pin_longitude, -121.4244)}
                zoom={toFiniteNumber(draft.eventConfig.pin_zoom, 15)}
                onPinChange={setEventPin}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateDraft((prev) => ({
                      ...prev,
                      eventConfig: {
                        ...prev.eventConfig,
                        pin_latitude: 38.5616,
                        pin_longitude: -121.4244,
                        pin_zoom: 15,
                      },
                    }))
                  }
                  className="px-3 py-2 rounded border border-primary/30 text-muted-foreground hover:text-primary transition"
                >
                  Reset Pin to Sac State
                </button>
                <p className="font-mono text-xs text-muted-foreground/70">
                  Frontend map and "Get Directions" will use this pin location.
                </p>
              </div>
              <input className={fieldClasses} value={draft.eventConfig.google_maps_embed_url || ''} onChange={(e) => setField('eventConfig', 'google_maps_embed_url', e.target.value)} placeholder="Fallback Google Maps embed URL" />
              <input className={fieldClasses} value={draft.eventConfig.google_form_embed_url || ''} onChange={(e) => setField('eventConfig', 'google_form_embed_url', e.target.value)} placeholder="Google Form embed URL" />
            </Section>

            <Section title="Registration Section">
              <div className="grid sm:grid-cols-2 gap-3">
                <input className={fieldClasses} value={draft.registration.heading_top || ''} onChange={(e) => setField('registration', 'heading_top', e.target.value)} placeholder="Heading top" />
                <input className={fieldClasses} value={draft.registration.heading_bottom || ''} onChange={(e) => setField('registration', 'heading_bottom', e.target.value)} placeholder="Heading bottom" />
              </div>
              <textarea className={`${fieldClasses} min-h-20`} value={draft.registration.description || ''} onChange={(e) => setField('registration', 'description', e.target.value)} placeholder="Description" />
              <input className={fieldClasses} value={draft.registration.placeholder_title || ''} onChange={(e) => setField('registration', 'placeholder_title', e.target.value)} placeholder="Placeholder title" />
              <input className={fieldClasses} value={draft.registration.placeholder_note || ''} onChange={(e) => setField('registration', 'placeholder_note', e.target.value)} placeholder="Placeholder note" />
            </Section>

            <Section title="Footer">
              <input className={fieldClasses} value={draft.footer.brand_name || ''} onChange={(e) => setField('footer', 'brand_name', e.target.value)} placeholder="Brand name" />
              <input className={fieldClasses} value={draft.footer.copyright_template || ''} onChange={(e) => setField('footer', 'copyright_template', e.target.value)} placeholder="Copyright template (use {year})" />
              <input className={fieldClasses} value={draft.footer.organization_text || ''} onChange={(e) => setField('footer', 'organization_text', e.target.value)} placeholder="Organization text" />
            </Section>

            <Section title="Organizations">
              <input
                className={fieldClasses}
                value={draft.organizationsSection?.heading || ''}
                onChange={(e) => setField('organizationsSection', 'heading', e.target.value)}
                placeholder="Section heading (e.g., Participating Organizations)"
              />
              <div className="space-y-3">
                {draft.organizations.map((org, index) => (
                  <div key={org.id || index} className="flex items-center gap-2">
                    <input className={fieldClasses} value={org.name || ''} onChange={(e) => setListItemField('organizations', index, 'name', e.target.value)} placeholder="Organization name" />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-24 bg-background/60 border border-primary/20 rounded px-2 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                      value={org.order ?? index + 1}
                      onChange={(e) =>
                        setListItemField(
                          'organizations',
                          index,
                          'order',
                          Math.max(1, Number(e.target.value) || index + 1)
                        )
                      }
                      placeholder="Order"
                    />
                    <label className="font-mono text-xs text-muted-foreground/80 flex items-center gap-1">
                      <input type="checkbox" checked={org.active !== false} onChange={(e) => setListItemField('organizations', index, 'active', e.target.checked)} />
                      Active
                    </label>
                    <button type="button" onClick={() => updateDraft((prev) => ({ ...prev, organizations: prev.organizations.filter((_, i) => i !== index) }))} className="px-2 py-1 border border-accent/40 rounded text-accent">Remove</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => updateDraft((prev) => ({ ...prev, organizations: [...prev.organizations, { id: createId('org'), name: '', active: true, order: prev.organizations.length + 1 }] }))} className="px-3 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 transition">Add Organization</button>
            </Section>

            <Section title="Agenda">
              <div className="space-y-3">
                {draft.agendaItems.map((item, index) => (
                  <div key={item.id || index} className="border border-primary/15 rounded p-3 space-y-2">
                    <input
                      className={fieldClasses}
                      value={item.title || ''}
                      onChange={(e) => setListItemField('agendaItems', index, 'title', e.target.value)}
                      placeholder="Title"
                    />
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input
                        className={fieldClasses}
                        value={item.speaker || ''}
                        onChange={(e) => setListItemField('agendaItems', index, 'speaker', e.target.value)}
                        placeholder="Speaker"
                      />
                      <input
                        className={fieldClasses}
                        value={item.company || ''}
                        onChange={(e) => setListItemField('agendaItems', index, 'company', e.target.value)}
                        placeholder="Company / Organization"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input
                        className={fieldClasses}
                        value={item.start_time || ''}
                        onChange={(e) => setListItemField('agendaItems', index, 'start_time', e.target.value)}
                        placeholder="Start time"
                      />
                      <input
                        className={fieldClasses}
                        value={item.end_time || ''}
                        onChange={(e) => setListItemField('agendaItems', index, 'end_time', e.target.value)}
                        placeholder="End time"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <select
                        className={fieldClasses}
                        value={item.session_type || 'panel'}
                        onChange={(e) => setListItemField('agendaItems', index, 'session_type', e.target.value)}
                      >
                        <option value="panel">panel</option>
                        <option value="keynote">keynote</option>
                        <option value="networking">networking</option>
                        <option value="workshop">workshop</option>
                        <option value="break">break</option>
                      </select>
                      <input
                        className={fieldClasses}
                        value={item.session_label || ''}
                        onChange={(e) => setListItemField('agendaItems', index, 'session_label', e.target.value)}
                        placeholder="Custom label (optional)"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className={fieldClasses}
                        value={item.order ?? index + 1}
                        onChange={(e) =>
                          setListItemField(
                            'agendaItems',
                            index,
                            'order',
                            Math.max(1, Number(e.target.value) || index + 1)
                          )
                        }
                        placeholder="Display order"
                      />
                    </div>
                    <textarea
                      className={`${fieldClasses} min-h-16`}
                      value={item.description || ''}
                      onChange={(e) => setListItemField('agendaItems', index, 'description', e.target.value)}
                      placeholder="Description"
                    />
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-xs text-muted-foreground/80 flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={item.active !== false}
                          onChange={(e) => setListItemField('agendaItems', index, 'active', e.target.checked)}
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft((prev) => ({
                            ...prev,
                            agendaItems: prev.agendaItems.filter((_, i) => i !== index),
                          }))
                        }
                        className="px-2 py-1 border border-accent/40 rounded text-accent"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  updateDraft((prev) => ({
                    ...prev,
                    agendaItems: [
                      ...prev.agendaItems,
                      {
                        id: createId('agenda'),
                        order: prev.agendaItems.length + 1,
                        title: '',
                        description: '',
                        speaker: '',
                        company: '',
                        session_label: '',
                        start_time: '',
                        end_time: '',
                        session_type: 'panel',
                        active: true,
                      },
                    ],
                  }))
                }
                className="px-3 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 transition"
              >
                Add Agenda Item
              </button>
            </Section>

            <Section title="Admin Updates + Ticker">
              <div className="space-y-3">
                {draft.adminUpdates.map((item, index) => (
                  <div key={item.id || index} className="border border-primary/15 rounded p-3 space-y-2">
                    <textarea
                      className={`${fieldClasses} min-h-16`}
                      value={item.message || ''}
                      onChange={(e) => setListItemField('adminUpdates', index, 'message', e.target.value)}
                      placeholder="Ticker/update message"
                    />
                    <div className="grid sm:grid-cols-2 gap-2">
                      <select
                        className={fieldClasses}
                        value={item.priority || 'normal'}
                        onChange={(e) => setListItemField('adminUpdates', index, 'priority', e.target.value)}
                      >
                        <option value="normal">normal</option>
                        <option value="urgent">urgent</option>
                      </select>
                      <input
                        type="datetime-local"
                        className={fieldClasses}
                        value={toDateTimeLocal(item.created_date)}
                        onChange={(e) =>
                          setListItemField(
                            'adminUpdates',
                            index,
                            'created_date',
                            fromDateTimeLocal(e.target.value) || item.created_date
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-xs text-muted-foreground/80 flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={item.active !== false}
                          onChange={(e) => setListItemField('adminUpdates', index, 'active', e.target.checked)}
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft((prev) => ({
                            ...prev,
                            adminUpdates: prev.adminUpdates.filter((_, i) => i !== index),
                          }))
                        }
                        className="px-2 py-1 border border-accent/40 rounded text-accent"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  updateDraft((prev) => ({
                    ...prev,
                    adminUpdates: [
                      ...prev.adminUpdates,
                      {
                        id: createId('update'),
                        message: '',
                        priority: 'normal',
                        active: true,
                        created_date: new Date().toISOString(),
                      },
                    ],
                  }))
                }
                className="px-3 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 transition"
              >
                Add Update
              </button>
            </Section>

            <Section title="Raw JSON">
              <textarea className={`${fieldClasses} min-h-80 font-mono text-xs`} value={jsonText} onChange={(e) => { setJsonText(e.target.value); setJsonError(''); }} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={loadJsonIntoEditor} className="px-3 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 transition">Load JSON Into Editor</button>
              </div>
              {jsonError ? <p className="font-mono text-xs text-accent">{jsonError}</p> : null}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
