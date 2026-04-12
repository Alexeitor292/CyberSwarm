import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSiteContent } from '@/hooks/use-site-content';
import { normalizeExternalUrl } from '@/lib/form-operations';

/**
 * @typedef {Object} Sponsor
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [logo_url]
 * @property {string} [website_url]
 * @property {string} [highlight]
 * @property {'transparent' | 'soft' | 'light' | 'dark'} [logo_background]
 * @property {number} [logo_scale]
 * @property {number} [order]
 * @property {boolean} [active]
 * @property {number} [__index]
 */

/**
 * @typedef {Object} SponsorsSectionContent
 * @property {string} [eyebrow]
 * @property {string} [heading]
 * @property {string} [description]
 * @property {string} [cta_label]
 * @property {string} [cta_url]
 */

/**
 * @param {string | undefined | null} value
 * @returns {string}
 */
const getSponsorHost = (value) => {
  const url = normalizeExternalUrl(value);
  if (!url) return '';

  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch (_error) {
    return '';
  }
};

/**
 * @param {string | undefined | null} name
 * @returns {string}
 */
const getFallbackMark = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 3);

/**
 * @param {'transparent' | 'soft' | 'light' | 'dark' | string | undefined} value
 * @returns {'transparent' | 'soft' | 'light' | 'dark'}
 */
const getLogoBackgroundMode = (value) => {
  if (value === 'soft' || value === 'light' || value === 'dark') return value;
  return 'transparent';
};

/**
 * @param {'transparent' | 'soft' | 'light' | 'dark'} mode
 * @returns {string}
 */
const getLogoFrameClasses = (mode) => {
  if (mode === 'light') {
    return 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,247,250,0.9))] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]';
  }

  if (mode === 'dark') {
    return 'border border-primary/15 bg-[linear-gradient(180deg,rgba(5,14,24,0.92),rgba(10,23,35,0.82))] shadow-[inset_0_1px_0_rgba(61,227,255,0.1)]';
  }

  if (mode === 'soft') {
    return 'border border-primary/12 bg-[radial-gradient(circle_at_top,rgba(61,227,255,0.12),rgba(255,255,255,0.03)_55%,rgba(255,255,255,0)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
  }

  return 'border border-primary/8 bg-transparent';
};

/**
 * @param {'transparent' | 'soft' | 'light' | 'dark'} mode
 * @returns {string}
 */
const getLogoImageClasses = (mode) => {
  if (mode === 'transparent') {
    return 'max-h-full max-w-full object-contain drop-shadow-[0_14px_24px_rgba(0,240,255,0.14)]';
  }

  if (mode === 'dark') {
    return 'max-h-full max-w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.32)]';
  }

  return 'max-h-full max-w-full object-contain drop-shadow-[0_12px_20px_rgba(15,23,42,0.18)]';
};

/**
 * @param {{ onBecomeSponsorClick?: (() => void) | undefined, content?: import('@/data/siteData').DEFAULT_SITE_CONTENT | undefined, editor?: any }} props
 */
export default function SponsorsShowcase({ onBecomeSponsorClick, content, editor } = {}) {
  const { data: siteData } = useSiteContent();
  const data = content || siteData;
  const prefersReducedMotion = useReducedMotion();
  const sponsorsSection = /** @type {SponsorsSectionContent} */ (data?.sponsorsSection || {});
  const operations = /** @type {{ sponsor_cta_label?: string } | undefined} */ (
    data?.operations
  );
  const ctaLabel = sponsorsSection.cta_label || operations?.sponsor_cta_label || '';
  const sponsorRows = /** @type {Sponsor[]} */ (Array.isArray(data?.sponsors) ? data.sponsors : []);
  const sponsors = /** @type {Sponsor[]} */ (
    sponsorRows
      .map((item, index) => ({ ...item, __index: index }))
      .filter((item) => item.active !== false && item.name)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  );
  /**
   * @param {'eyebrow' | 'heading' | 'description' | 'cta_label'} key
   * @returns {(value: string) => void}
   */
  const setSponsorsSectionField = (key) => (value) => {
    editor?.setField('sponsorsSection', key, value);
  };

  /**
   * @param {number | undefined} index
   * @param {'highlight' | 'name'} key
   * @returns {(value: string) => void}
   */
  const setSponsorField = (index, key) => (value) => {
    if (typeof index !== 'number') return;
    editor?.setListItemField('sponsors', index, key, value);
  };
  const stageMaxWidth = '72rem';
  const sponsorStageStyle = { width: '100%', maxWidth: stageMaxWidth };

  if (!sponsors.length) {
    if (!ctaLabel) return null;

    return (
      <section className="relative z-10 px-6 py-12 md:py-16" aria-labelledby="sponsors-heading">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/30 bg-[linear-gradient(135deg,hsl(var(--card)/0.9),hsl(230_24%_6%/0.96))] px-6 py-10 text-center shadow-[0_0_55px_hsl(var(--primary)/0.1)] sm:px-10">
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <p className="font-mono text-xs uppercase tracking-[0.38em] text-primary/80">
              {editor?.text
                ? editor.text({
                    value: sponsorsSection.eyebrow,
                    fallback: 'Featured Partners',
                    onChange: setSponsorsSectionField('eyebrow'),
                    ariaLabel: 'Sponsors eyebrow',
                  })
                : sponsorsSection.eyebrow || 'Featured Partners'}
            </p>
            <h2
              id="sponsors-heading"
              className="mx-auto mt-4 max-w-3xl font-heading text-4xl uppercase leading-none text-foreground sm:text-5xl"
            >
              {editor?.text
                ? editor.text({
                    value: sponsorsSection.heading,
                    fallback: 'Backed By Industry Leaders',
                    onChange: setSponsorsSectionField('heading'),
                    multiline: true,
                    ariaLabel: 'Sponsors heading',
                  })
                : sponsorsSection.heading || 'Backed By Industry Leaders'}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl font-mono text-sm leading-6 text-muted-foreground sm:text-base">
              {editor?.text
                ? editor.text({
                    as: 'span',
                    value: sponsorsSection.description,
                    fallback:
                      'Organizations helping make CyberSwarm possible through direct support, visibility, and community investment.',
                    onChange: setSponsorsSectionField('description'),
                    multiline: true,
                    ariaLabel: 'Sponsors description',
                  })
                : sponsorsSection.description ||
                  'Organizations helping make CyberSwarm possible through direct support, visibility, and community investment.'}
            </p>
            <button
              type="button"
              onClick={onBecomeSponsorClick}
              className="mt-8 inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-5 py-3 font-mono text-xs uppercase tracking-[0.28em] text-primary transition hover:bg-primary/16 hover:text-foreground"
            >
              {editor?.text
                ? editor.text({
                    value: ctaLabel,
                    fallback: 'Become a Sponsor',
                    onChange: setSponsorsSectionField('cta_label'),
                    ariaLabel: 'Sponsor CTA label',
                  })
                : ctaLabel}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-10 overflow-hidden px-6 py-12 md:py-16" aria-labelledby="sponsors-heading">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-72 -translate-y-1/2 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.16),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto" style={sponsorStageStyle}>
        <div className="relative overflow-hidden rounded-[2rem] border border-primary/35 bg-[linear-gradient(135deg,hsl(var(--card)/0.92),hsl(230_24%_6%/0.96))] shadow-[0_0_65px_hsl(var(--primary)/0.12)]">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-0 top-8 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          </div>

          <div className="relative px-5 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
              <div className="max-w-3xl">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.38em] text-primary/80 sm:text-[0.64rem]">
                  {editor?.text
                    ? editor.text({
                        value: sponsorsSection.eyebrow,
                        fallback: 'Featured Partners',
                        onChange: setSponsorsSectionField('eyebrow'),
                        ariaLabel: 'Sponsors eyebrow',
                      })
                    : sponsorsSection.eyebrow || 'Featured Partners'}
                </p>
                <h2
                  id="sponsors-heading"
                  className="mt-2 max-w-2xl font-heading text-4xl uppercase leading-none text-foreground lg:text-[3.2rem]"
                >
                  {editor?.text
                    ? editor.text({
                        value: sponsorsSection.heading,
                        fallback: 'Backed By Industry Leaders',
                        onChange: setSponsorsSectionField('heading'),
                        multiline: true,
                        ariaLabel: 'Sponsors heading',
                      })
                    : sponsorsSection.heading || 'Backed By Industry Leaders'}
                </h2>
                <p className="mt-3 max-w-2xl font-mono text-sm leading-[1.6] text-muted-foreground lg:text-base">
                  {editor?.text
                    ? editor.text({
                        as: 'span',
                        value: sponsorsSection.description,
                        fallback:
                          'Organizations helping make CyberSwarm possible through direct support, visibility, and community investment.',
                        onChange: setSponsorsSectionField('description'),
                        multiline: true,
                        ariaLabel: 'Sponsors description',
                      })
                    : sponsorsSection.description ||
                      'Organizations helping make CyberSwarm possible through direct support, visibility, and community investment.'}
                </p>
              </div>

              {ctaLabel ? (
                <button
                  type="button"
                  onClick={onBecomeSponsorClick}
                  className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-primary transition hover:bg-primary/16 hover:text-foreground"
                >
                  {editor?.text
                    ? editor.text({
                        value: ctaLabel,
                        fallback: 'Become a Sponsor',
                        onChange: setSponsorsSectionField('cta_label'),
                        ariaLabel: 'Sponsor CTA label',
                      })
                    : ctaLabel}
                </button>
              ) : null}
            </div>

            <ul className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {sponsors.map((sponsor, index) => {
                const websiteUrl = normalizeExternalUrl(sponsor.website_url);
                const sponsorHost = getSponsorHost(sponsor.website_url);
                const badgeLabel = sponsor.highlight || 'Featured Partner';
                const logoBackgroundMode = getLogoBackgroundMode(sponsor.logo_background);
                const logoScale = Math.min(140, Math.max(75, Number(sponsor.logo_scale ?? 110)));
                const cardClasses =
                  'group relative flex h-full min-h-[17rem] flex-col overflow-hidden rounded-[1.6rem] border border-primary/20 bg-[linear-gradient(180deg,hsl(var(--background)/0.3),hsl(var(--card)/0.88))] p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.14)]';
                const content = (
                  <>
                    <div
                      className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-primary/80">
                        {editor?.text
                          ? editor.text({
                              value: sponsor.highlight,
                              fallback: 'Featured Partner',
                              onChange: setSponsorField(sponsor.__index, 'highlight'),
                              ariaLabel: `${sponsor.name || 'Sponsor'} highlight`,
                            })
                          : badgeLabel}
                      </span>
                      {sponsorHost ? (
                        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                          {sponsorHost}
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`mt-4 flex min-h-36 items-center justify-center overflow-hidden rounded-[1.35rem] px-4 py-4 ${getLogoFrameClasses(
                        logoBackgroundMode
                      )}`}
                    >
                      {sponsor.logo_url ? (
                        <div className="flex h-full w-full items-center justify-center overflow-visible">
                          <img
                            src={sponsor.logo_url}
                            alt={`${sponsor.name} logo`}
                            className={getLogoImageClasses(logoBackgroundMode)}
                            style={{ transform: `scale(${logoScale / 100})` }}
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <span className="font-heading text-4xl uppercase tracking-[0.16em] text-slate-900">
                          {getFallbackMark(sponsor.name)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="font-heading text-[1.85rem] uppercase leading-tight text-foreground">
                          {editor?.text
                            ? editor.text({
                                value: sponsor.name,
                                fallback: 'Sponsor Name',
                                onChange: setSponsorField(sponsor.__index, 'name'),
                                multiline: true,
                                ariaLabel: `${sponsor.name || 'Sponsor'} name`,
                              })
                            : sponsor.name}
                        </h3>
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-4">
                        <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-muted-foreground/80">
                          {websiteUrl ? 'Visit Website' : 'Profile'}
                        </span>
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground"
                          aria-hidden="true"
                        >
                          <ArrowUpRight className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  </>
                );

                return (
                  <motion.li
                    key={sponsor.id || `${sponsor.name}-${index}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
                    whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { delay: index * 0.08, duration: 0.45, ease: 'easeOut' }
                    }
                    className="h-full"
                  >
                    {websiteUrl ? (
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cardClasses}
                        aria-label={`Visit ${sponsor.name}`}
                      >
                        {content}
                      </a>
                    ) : (
                      <div className={cardClasses}>{content}</div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
