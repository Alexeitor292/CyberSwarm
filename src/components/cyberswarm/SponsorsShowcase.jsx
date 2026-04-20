import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSiteContent } from '@/hooks/use-site-content';
import { normalizeExternalUrl } from '@/lib/form-operations';
import SponsorLogoViewport, {
  clampSponsorLogoOffset,
  clampSponsorLogoScale,
} from '@/components/cyberswarm/SponsorLogoViewport';

/**
 * @typedef {Object} Sponsor
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [logo_url]
 * @property {string} [website_url]
 * @property {string} [highlight]
 * @property {'transparent' | 'soft' | 'light' | 'dark' | 'color'} [logo_background]
 * @property {string} [logo_background_color]
 * @property {number} [logo_scale]
 * @property {number} [logo_offset_x]
 * @property {number} [logo_offset_y]
 * @property {boolean} [vip]
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
  const vipSponsors = sponsors.filter((item) => item.vip === true);
  const regularSponsors = sponsors.filter((item) => item.vip !== true);
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
  /**
   * @param {Sponsor} sponsor
   * @param {number} index
   * @param {{ isVip?: boolean, delayIndex?: number }} [options]
   */
  const renderSponsorCard = (sponsor, index, options = {}) => {
    const isVip = options.isVip === true;
    const delayIndex =
      typeof options.delayIndex === 'number' && Number.isFinite(options.delayIndex)
        ? options.delayIndex
        : index;
    const websiteUrl = normalizeExternalUrl(sponsor.website_url);
    const sponsorHost = getSponsorHost(sponsor.website_url);
    const badgeLabel = sponsor.highlight || (isVip ? 'VIP Sponsor' : 'Featured Partner');
    const logoScale = clampSponsorLogoScale(sponsor.logo_scale ?? 110);
    const logoOffsetX = clampSponsorLogoOffset(sponsor.logo_offset_x ?? 0);
    const logoOffsetY = clampSponsorLogoOffset(sponsor.logo_offset_y ?? 0);
    const cardClasses = isVip
      ? 'group relative flex h-full min-h-[17.5rem] flex-col overflow-hidden rounded-[1.6rem] border border-accent/30 bg-[linear-gradient(180deg,hsl(var(--background)/0.38),hsl(var(--card)/0.9))] p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_22px_68px_hsl(var(--accent)/0.2)]'
      : 'group relative flex h-full min-h-[17rem] flex-col overflow-hidden rounded-[1.6rem] border border-primary/20 bg-[linear-gradient(180deg,hsl(var(--background)/0.3),hsl(var(--card)/0.88))] p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.14)]';
    const badgeClasses = isVip
      ? 'rounded-full border border-accent/35 bg-accent/10 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-accent'
      : 'rounded-full border border-primary/25 bg-primary/8 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-primary/80';
    const iconClasses = isVip
      ? 'flex h-10 w-10 items-center justify-center rounded-full border border-accent/35 bg-accent/12 text-accent transition duration-300 group-hover:translate-x-1 group-hover:bg-accent group-hover:text-accent-foreground'
      : 'flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground';
    const titleClasses = isVip
      ? 'font-heading text-[2rem] uppercase leading-tight text-foreground'
      : 'font-heading text-[1.85rem] uppercase leading-tight text-foreground';
    const logoViewportClasses = isVip
      ? 'mt-4 mx-auto w-full max-w-[26rem]'
      : 'mt-4';
    const content = (
      <>
        <div
          className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${
            isVip ? 'via-accent/60' : 'via-primary/55'
          } to-transparent`}
          aria-hidden="true"
        />
        <div className="flex items-center justify-between gap-3">
          <span className={badgeClasses}>
            {editor?.text
              ? editor.text({
                  value: sponsor.highlight,
                  fallback: isVip ? 'VIP Sponsor' : 'Featured Partner',
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

        <SponsorLogoViewport
          containerClassName={logoViewportClasses}
          aspectRatio={isVip ? '4 / 3' : '16 / 10'}
          logoUrl={sponsor.logo_url}
          logoAlt={`${sponsor.name} logo`}
          logoBackground={sponsor.logo_background}
          logoBackgroundColor={sponsor.logo_background_color}
          logoScale={logoScale}
          logoOffsetX={logoOffsetX}
          logoOffsetY={logoOffsetY}
          fallback={
            <span className="font-heading text-4xl uppercase tracking-[0.16em] text-slate-900">
              {getFallbackMark(sponsor.name)}
            </span>
          }
        />

        <div className="mt-4 flex flex-1 flex-col justify-between">
          <div>
            <h3 className={titleClasses}>
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
            <span className={iconClasses} aria-hidden="true">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </>
    );

    return (
      <motion.li
        key={sponsor.id || `${sponsor.name || 'sponsor'}-${sponsor.__index ?? index}`}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
        whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { delay: delayIndex * 0.08, duration: 0.45, ease: 'easeOut' }
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

            {vipSponsors.length ? (
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-accent">
                    VIP Sponsors
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    Front-of-stage partners
                  </span>
                </div>
                <ul className="grid gap-4 xl:grid-cols-2">
                  {vipSponsors.map((sponsor, index) =>
                    renderSponsorCard(sponsor, index, {
                      isVip: true,
                      delayIndex: index,
                    })
                  )}
                </ul>
              </div>
            ) : null}

            {regularSponsors.length ? (
              <ul
                className={`${vipSponsors.length ? 'mt-4' : 'mt-6'} grid gap-4 lg:grid-cols-2 xl:grid-cols-3`}
              >
                {regularSponsors.map((sponsor, index) =>
                  renderSponsorCard(sponsor, index, {
                    delayIndex: index + vipSponsors.length,
                  })
                )}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
