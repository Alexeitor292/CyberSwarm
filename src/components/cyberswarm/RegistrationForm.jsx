import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useSiteContent } from '@/hooks/use-site-content';

const normalizeFormUrl = (value) => {
  const next = String(value || '').trim();
  if (!next) return '';

  try {
    const iframeSrcMatch = next.match(/src=(['"])(.*?)\1/i);
    const candidate = iframeSrcMatch?.[2] || next;
    return new URL(candidate).toString();
  } catch (_error) {
    return '';
  }
};

const buildDirectFormUrl = (value) => {
  const normalized = normalizeFormUrl(value);
  if (!normalized) return '';

  try {
    const url = new URL(normalized);

    if (url.hostname.toLowerCase().includes('docs.google.com')) {
      url.searchParams.delete('embedded');
    }

    return url.toString();
  } catch (_error) {
    return normalized;
  }
};

export default function RegistrationForm() {
  const { data } = useSiteContent();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const registration = data?.registration || {};
  const config = data?.eventConfig || {};
  const formUrl = useMemo(
    () => normalizeFormUrl(config.google_form_embed_url),
    [config.google_form_embed_url]
  );
  const directFormUrl = useMemo(
    () => buildDirectFormUrl(config.google_form_embed_url),
    [config.google_form_embed_url]
  );

  useEffect(() => {
    if (!formUrl) {
      setIsFormOpen(false);
    }
  }, [formUrl]);

  return (
    <section
      id="register"
      tabIndex={-1}
      className="relative z-10 py-24 px-6 scroll-mt-24"
      aria-labelledby="registration-heading"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2
            id="registration-heading"
            className="font-heading text-5xl sm:text-7xl md:text-8xl font-bold leading-none"
          >
            <span className="block text-foreground">
              {registration.heading_top || 'JOIN THE'}
            </span>
            <span className="block glow-cyan text-primary mt-2">
              {registration.heading_bottom || 'SWARM'}
            </span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground mt-6 max-w-md mx-auto">
            {registration.description ||
              'Register now to secure your spot at the premier cybersecurity event at Sacramento State.'}
          </p>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2, duration: 0.8 }}
          className="glass rounded-2xl overflow-hidden"
        >
          {formUrl ? (
            <>
              <div className="px-6 py-8 sm:px-8 sm:py-10">
                <div className="max-w-3xl mx-auto text-center">
                  <p className="font-mono text-xs text-primary/85 uppercase tracking-[0.26em]">
                    Registration Access
                  </p>
                  <h3 className="font-heading text-2xl sm:text-3xl text-foreground mt-4">
                    Choose the registration experience that works best for you.
                  </h3>
                  <p
                    id="registration-help"
                    className="font-mono text-sm text-muted-foreground max-w-2xl mx-auto mt-4 leading-relaxed"
                  >
                    Open the form in a new tab for the simplest experience, or preview the embedded
                    form right here on the page.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={directFormUrl || formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition font-mono text-xs tracking-widest uppercase"
                    >
                      Open Registration
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setIsFormOpen((prev) => !prev)}
                      aria-expanded={isFormOpen}
                      aria-controls="registration-form-panel"
                      className="rounded-md border border-primary/60 bg-background/35 px-5 py-3 text-primary transition font-mono text-xs tracking-widest uppercase hover:border-primary/85 hover:bg-primary/12"
                    >
                      {isFormOpen ? 'Hide Preview' : 'Preview Here'}
                    </button>
                  </div>

                  <p className="font-mono text-xs text-muted-foreground mt-4">
                    The new-tab option remains available if the embedded form is harder to use.
                  </p>
                </div>
              </div>

              <div id="registration-form-panel" hidden={!isFormOpen}>
                {isFormOpen ? (
                  <div className="border-t border-primary/45 bg-background/35 p-3 sm:p-4">
                    <iframe
                      src={formUrl}
                      width="100%"
                      height="860"
                      frameBorder="0"
                      marginHeight={0}
                      marginWidth={0}
                      title="CyberSwarm registration form"
                      className="w-full rounded-xl bg-white"
                      style={{ minHeight: '860px' }}
                      loading="lazy"
                      aria-describedby="registration-help"
                    >
                      Loading registration form...
                    </iframe>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <div
                className="w-16 h-16 border border-primary/50 rounded-lg flex items-center justify-center mx-auto mb-6"
                aria-hidden="true"
              >
                <div className="w-2 h-2 bg-primary/65 rounded-full animate-pulse motion-reduce:animate-none" />
              </div>
              <p className="font-heading text-2xl text-foreground">
                {registration.placeholder_title || 'Registration Form Coming Soon'}
              </p>
              <p className="font-mono text-sm text-muted-foreground mt-2">
                {registration.placeholder_note || 'Admin: Add your Google Form URL in Event Config'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
