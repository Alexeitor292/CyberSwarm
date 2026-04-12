import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Building2, Gift, Landmark, Send } from 'lucide-react';
import { appClient } from '@/api/client';
import { useSiteContent } from '@/hooks/use-site-content';

const initialFormState = {
  organizationName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  supportAmount: '',
  bringSwag: false,
  venueBranding: false,
  message: '',
};

/**
 * @param {{ onClose?: (() => void) | undefined }} props
 */
export default function SponsorInterestForm({ onClose }) {
  const prefersReducedMotion = useReducedMotion();
  const { data } = useSiteContent();
  const [form, setForm] = useState(initialFormState);
  const [supportLevelChoice, setSupportLevelChoice] = useState('');
  const [supportLevelCustom, setSupportLevelCustom] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const ctaLabel = useMemo(
    () =>
      String(data?.operations?.sponsor_cta_label || data?.sponsorsSection?.cta_label || '').trim() ||
      'Become a Sponsor',
    [data?.operations?.sponsor_cta_label, data?.sponsorsSection?.cta_label]
  );

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const resolvedSupportAmount =
      supportLevelChoice === 'custom' ? supportLevelCustom.trim() : supportLevelChoice.trim();

    if (!form.organizationName.trim()) {
      setErrorMessage('Please share your organization name.');
      return;
    }

    if (!form.contactName.trim()) {
      setErrorMessage('Please share a contact name.');
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage('Please share a contact email.');
      return;
    }

    if (!resolvedSupportAmount) {
      setErrorMessage('Please tell us how your organization can support CyberSwarm.');
      return;
    }

    setIsSubmitting(true);

    try {
      await appClient.sponsorRequests.submit({
        ...form,
        supportAmount: resolvedSupportAmount,
      });
      setForm(initialFormState);
      setSupportLevelChoice('');
      setSupportLevelCustom('');
      setSuccessMessage('Sponsor request received. We will follow up soon.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : 'Could not submit the sponsor request right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="sponsor-interest"
      className="relative z-10 scroll-mt-24 px-6 py-20 md:py-24"
      aria-labelledby="sponsor-interest-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.55, ease: 'easeOut' }}
            className="glass overflow-hidden rounded-[2rem] border border-primary/25 p-7 sm:p-8"
          >
            <p className="font-mono text-xs uppercase tracking-[0.36em] text-primary/80">
              Sponsor Intake
            </p>
            <h2
              id="sponsor-interest-heading"
              className="mt-5 font-heading text-4xl uppercase leading-none text-foreground sm:text-5xl"
            >
              Bring Your Brand Into The Swarm
            </h2>
            <p className="mt-5 max-w-xl font-mono text-sm leading-7 text-muted-foreground">
              Tell us how your organization wants to show up. Share your support level, any swag or
              venue branding plans, and how we should follow up.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-[1.35rem] border border-primary/15 bg-background/35 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-xl text-foreground">Organization Visibility</p>
                    <p className="mt-1 font-mono text-xs leading-6 text-muted-foreground/75">
                      Share who you are, where to reach you, and how you want your organization
                      represented.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-primary/15 bg-background/35 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-xl text-foreground">Swag And Presence</p>
                    <p className="mt-1 font-mono text-xs leading-6 text-muted-foreground/75">
                      Let us know if you plan to bring giveaways, banners, booth elements, or other
                      branded materials for the venue.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-primary/15 bg-background/35 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-xl text-foreground">Support Level</p>
                    <p className="mt-1 font-mono text-xs leading-6 text-muted-foreground/75">
                      You can share a dollar amount, in-kind contribution, or a quick note about the
                      kind of support you have in mind.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { delay: 0.08, duration: 0.55, ease: 'easeOut' }
            }
            className="glass overflow-hidden rounded-[2rem] border border-primary/25 p-7 sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-primary/80">
                  {ctaLabel}
                </p>
                <p className="mt-3 font-heading text-3xl text-foreground">
                  Request Sponsorship
                </p>
              </div>
              <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary sm:flex">
                <Send className="h-5 w-5" />
              </div>
            </div>

            {onClose ? (
              <div className="mb-6 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full border border-primary/25 bg-background/55 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground transition hover:border-primary/45 hover:text-foreground"
                >
                  Close
                </button>
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75">
                    Organization Name
                  </span>
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80"
                    value={form.organizationName}
                    onChange={(event) => setField('organizationName', event.target.value)}
                    placeholder="Your organization name"
                    autoComplete="organization"
                  />
                </label>

                <label className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75">
                    Contact Name
                  </span>
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80"
                    value={form.contactName}
                    onChange={(event) => setField('contactName', event.target.value)}
                    placeholder="Who should we follow up with?"
                    autoComplete="name"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75">
                    Work Email
                  </span>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80"
                    value={form.email}
                    onChange={(event) => setField('email', event.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                  />
                </label>

                <label className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75">
                    Phone
                  </span>
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80"
                    value={form.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    placeholder="Optional"
                    autoComplete="tel"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75">
                    Support Level
                  </span>
                  <select
                    className="w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80"
                    value={supportLevelChoice}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSupportLevelChoice(next);
                      if (next !== 'custom') {
                        setSupportLevelCustom('');
                      }
                    }}
                  >
                    <option value="">Select support amount</option>
                    <option value="$500">$500</option>
                    <option value="$1,000">$1,000</option>
                    <option value="$1,500">$1,500</option>
                    <option value="$2,000">$2,000</option>
                    <option value="$2,500">$2,500</option>
                    <option value="$3,000">$3,000</option>
                    <option value="$3,500">$3,500</option>
                    <option value="$4,000">$4,000</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75">
                    Website
                  </span>
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80"
                    value={form.website}
                    onChange={(event) => setField('website', event.target.value)}
                    placeholder="Optional"
                    autoComplete="url"
                  />
                </label>
              </div>

              {supportLevelChoice === 'custom' ? (
                <label className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75">
                    Custom Support Amount
                  </span>
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80"
                    value={supportLevelCustom}
                    onChange={(event) => setSupportLevelCustom(event.target.value)}
                    placeholder="Enter custom amount or sponsorship details"
                  />
                </label>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-start gap-3 rounded-[1.2rem] border border-primary/15 bg-background/35 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={form.bringSwag}
                    onChange={(event) => setField('bringSwag', event.target.checked)}
                    className="mt-1 h-4 w-4 accent-cyan-400"
                  />
                  <span>
                    <span className="block font-heading text-lg text-foreground">
                      Bringing Swag
                    </span>
                    <span className="mt-1 block font-mono text-xs leading-6 text-muted-foreground/75">
                      We can bring giveaways, handouts, or other sponsor materials for attendees.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-[1.2rem] border border-primary/15 bg-background/35 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={form.venueBranding}
                    onChange={(event) => setField('venueBranding', event.target.checked)}
                    className="mt-1 h-4 w-4 accent-cyan-400"
                  />
                  <span>
                    <span className="block font-heading text-lg text-foreground">
                      Venue Branding
                    </span>
                    <span className="mt-1 block font-mono text-xs leading-6 text-muted-foreground/75">
                      We can bring banners, signage, booth visuals, or other company branding.
                    </span>
                  </span>
                </label>
              </div>

              <label className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/75">
                  Notes
                </span>
                <textarea
                  className="min-h-[140px] w-full rounded-xl border border-primary/20 bg-background/55 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-background/80"
                  value={form.message}
                  onChange={(event) => setField('message', event.target.value)}
                  placeholder="Anything else you want the CyberSwarm team to know about sponsorship, branding, timing, or support."
                />
              </label>

              {errorMessage ? (
                <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 font-mono text-xs leading-6 text-accent">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 font-mono text-xs leading-6 text-primary">
                  {successMessage}
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full border border-primary/45 bg-primary/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.28em] text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
