import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/client';

const ADMIN_USER_KEY = 'cyberswarm_admin_user';
const APP_USER_KEY = 'cyberswarm_user';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_SCOPE =
  'openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

let googleScriptPromise = null;

const getStoredAdminUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

const clearStoredAdminUser = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_USER_KEY);
  window.localStorage.removeItem(APP_USER_KEY);
};

const saveStoredAdminUser = (user) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(APP_USER_KEY, JSON.stringify({ ...user, role: 'admin' }));
};

const ensureGoogleScript = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Google Sign-In is only available in the browser.');
  }

  if (window['google']?.accounts?.oauth2) return;

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);

      const finish = () => {
        if (window['google']?.accounts?.oauth2) {
          resolve();
        } else {
          reject(new Error('Google Sign-In is not available.'));
        }
      };

      if (existing) {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('Failed to load Google Sign-In script.')),
          { once: true }
        );
        setTimeout(finish, 0);
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = finish;
      script.onerror = () => reject(new Error('Failed to load Google Sign-In script.'));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
};

const requestAccessToken = async (googleClientId, prompt = '') => {
  await ensureGoogleScript();

  return new Promise((resolve, reject) => {
    const google = window['google'];
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Sign-In is not available.'));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: GOOGLE_SCOPE,
      callback: (tokenResponse) => {
        if (tokenResponse?.error) {
          reject(new Error(tokenResponse.error));
          return;
        }

        if (!tokenResponse?.access_token) {
          reject(new Error('No access token was returned.'));
          return;
        }

        resolve(tokenResponse.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
};

export default function AdminDashboardButton() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(getStoredAdminUser);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const sync = () => setAdminUser(getStoredAdminUser());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const goToAdminDashboard = async () => {
    if (!googleClientId) {
      navigate('/admin');
      return;
    }

    setValidating(true);
    setError('');

    try {
      let accessToken = '';

      try {
        accessToken = await requestAccessToken(googleClientId, '');
      } catch (_error) {
        // Fallback prompt if silent refresh is not allowed by the browser/session.
        accessToken = await requestAccessToken(googleClientId, 'consent');
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

      saveStoredAdminUser(user);
      setAdminUser(user);
      navigate('/admin');
    } catch (err) {
      clearStoredAdminUser();
      appClient.auth.clearAccessToken();
      setAdminUser(null);
      setError(
        err instanceof Error && err.message
          ? `Session validation failed: ${err.message}`
          : 'Session validation failed. Please sign in again at /admin.'
      );
    } finally {
      setValidating(false);
    }
  };

  if (!adminUser) return null;

  return (
    <>
      <button
        type="button"
        onClick={goToAdminDashboard}
        disabled={validating}
        className="fixed top-5 right-5 z-50 flex h-10 items-center gap-2 border border-primary/60 bg-background/85 px-3 text-primary backdrop-blur-sm transition-colors hover:border-primary/85 hover:bg-background/95 disabled:opacity-60"
        title={`Continue as ${adminUser.email}`}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="font-mono text-[11px] tracking-[0.12em] uppercase hidden md:inline">
          {validating ? 'Validating...' : 'Admin Dashboard'}
        </span>
        <span className="font-mono text-[11px] tracking-[0.12em] uppercase md:hidden">
          {validating ? 'Checking' : 'Admin'}
        </span>
      </button>

      {error ? (
        <p className="fixed top-16 right-4 z-50 max-w-xs rounded border border-accent/75 bg-background/92 px-3 py-2 font-mono text-[11px] text-accent">
          {error}
        </p>
      ) : null}
    </>
  );
}
