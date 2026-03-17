import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSiteContent } from '@/hooks/use-site-content';

const FORM_THEME_STORAGE_KEY = 'cyberswarm_form_theme';
const FORM_THEMES = {
  dark: 'dark',
  light: 'light',
};

const getStoredTheme = () => {
  if (typeof window === 'undefined') return FORM_THEMES.dark;
  const saved = window.localStorage.getItem(FORM_THEME_STORAGE_KEY);
  return saved === FORM_THEMES.light ? FORM_THEMES.light : FORM_THEMES.dark;
};

export default function RegistrationForm() {
  const { data } = useSiteContent();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTheme, setFormTheme] = useState(getStoredTheme);

  const registration = data?.registration || {};
  const config = data?.eventConfig || {};
  const formUrl = config.google_form_embed_url || '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FORM_THEME_STORAGE_KEY, formTheme);
  }, [formTheme]);

  const iframeStyle = useMemo(() => {
    const base = {
      minHeight: '680px',
      background: '#070b12',
      transition: 'filter 180ms ease',
    };

    if (formTheme === FORM_THEMES.dark) {
      return {
        ...base,
        filter:
          'invert(0.92) hue-rotate(180deg) saturate(0.82) contrast(0.95) brightness(0.86)',
      };
    }

    return base;
  }, [formTheme]);

  return (
    <section id="register" className="relative z-10 py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2
            className="font-heading text-5xl sm:text-7xl md:text-8xl font-bold text-transparent leading-none"
            style={{ WebkitTextStroke: '1px hsl(var(--primary) / 0.6)' }}
          >
            {registration.heading_top || 'JOIN THE'}
          </h2>
          <h2 className="font-heading text-5xl sm:text-7xl md:text-8xl font-bold glow-cyan text-primary leading-none mt-2">
            {registration.heading_bottom || 'SWARM'}
          </h2>
          <p className="font-mono text-sm text-muted-foreground/85 mt-6 max-w-md mx-auto">
            {registration.description ||
              'Register now to secure your spot at the premier cybersecurity event at Sacramento State.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="glass rounded-lg overflow-hidden"
        >
          {formUrl ? (
            <>
              <div className="px-4 sm:px-6 py-4 border-b border-primary/10 bg-background/40 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:justify-between">
                <button
                  type="button"
                  onClick={() => setIsFormOpen((prev) => !prev)}
                  className="px-4 py-2 rounded border border-primary/35 text-primary hover:bg-primary/10 transition font-mono text-xs tracking-widest uppercase"
                >
                  {isFormOpen ? 'Hide Form' : 'Fill Out The Form'}
                </button>

                <div className="flex items-center gap-2">
                  <label htmlFor="form-theme-select" className="font-mono text-xs text-muted-foreground/80 uppercase tracking-widest">
                    Theme
                  </label>
                  <select
                    id="form-theme-select"
                    value={formTheme}
                    onChange={(e) => setFormTheme(e.target.value === FORM_THEMES.light ? FORM_THEMES.light : FORM_THEMES.dark)}
                    className="bg-background/70 border border-primary/20 rounded px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
                  >
                    <option value={FORM_THEMES.dark}>Dark</option>
                    <option value={FORM_THEMES.light}>Light</option>
                  </select>
                </div>
              </div>

              {isFormOpen ? (
                <iframe
                  src={formUrl}
                  width="100%"
                  height="860"
                  frameBorder="0"
                  marginHeight={0}
                  marginWidth={0}
                  title="Registration Form"
                  className="w-full"
                  style={iframeStyle}
                  loading="lazy"
                >
                  Loading...
                </iframe>
              ) : (
                <div className="p-10 text-center">
                  <p className="font-mono text-sm text-muted-foreground/85">
                    Click{' '}
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(true)}
                      className="text-primary font-semibold underline underline-offset-4 decoration-primary/60 hover:text-primary/90 transition-colors"
                    >
                      Fill Out The Form
                    </button>{' '}
                    to open it.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 border border-primary/20 rounded-lg flex items-center justify-center mx-auto mb-6">
                <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
              </div>
              <p className="font-mono text-sm text-foreground/75">
                {registration.placeholder_title || '[ REGISTRATION FORM WILL BE EMBEDDED HERE ]'}
              </p>
              <p className="font-mono text-xs text-muted-foreground/70 mt-2">
                {registration.placeholder_note || 'Admin: Add your Google Form URL in Event Config'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
