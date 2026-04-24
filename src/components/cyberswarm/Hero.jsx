import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useSiteContent } from '@/hooks/use-site-content';

const parseTimeFromEventWindow = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const firstPart = raw.split('-')[0].trim();
  const match = firstPart.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  const hoursRaw = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = String(match[3] || '').toUpperCase();

  if (Number.isNaN(hoursRaw) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem === 'AM' || meridiem === 'PM') {
    if (hoursRaw < 1 || hoursRaw > 12) return null;
    let hours = hoursRaw % 12;
    if (meridiem === 'PM') hours += 12;
    return { hours, minutes };
  }

  if (hoursRaw < 0 || hoursRaw > 23) return null;
  return { hours: hoursRaw, minutes };
};

const clampPresentationMarqueeLogoScale = (value) => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return 100;
  return Math.min(240, Math.max(50, Math.round(scale)));
};

const clampPresentationMarqueeDuration = (value) => {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return 85;
  return Math.min(240, Math.max(20, Math.round(seconds)));
};

const clampPresentationMarqueeLogoSpacing = (value) => {
  const spacing = Number(value);
  if (!Number.isFinite(spacing)) return 28;
  return Math.min(240, Math.max(0, Math.round(spacing)));
};

const PRESENTATION_MARQUEE_BAND_HEIGHT_PX = 128;
const PRESENTATION_MARQUEE_BASE_LOGO_HEIGHT_PX = 96;
const PRESENTATION_MARQUEE_BASE_LOGO_MAX_WIDTH_PX = 420;
const PRESENTATION_MARQUEE_BASE_FALLBACK_FONT_SIZE_PX = 36;

const resolveCountdownDate = (eventConfig, hero) => {
  const eventDate = String(eventConfig?.event_date || '').trim();
  if (eventDate) {
    const parsedTime = parseTimeFromEventWindow(eventConfig?.event_time) || { hours: 9, minutes: 0 };
    const hh = String(parsedTime.hours).padStart(2, '0');
    const mm = String(parsedTime.minutes).padStart(2, '0');
    const fromEventConfig = new Date(`${eventDate}T${hh}:${mm}:00`);
    if (!Number.isNaN(fromEventConfig.getTime())) return fromEventConfig;
  }

  const fallback = new Date(hero?.countdown_target || '2026-04-15T09:00:00');
  return Number.isNaN(fallback.getTime()) ? new Date('2026-04-15T09:00:00') : fallback;
};

/**
 * @param {{
 *   content?: import('@/data/siteData').DEFAULT_SITE_CONTENT | undefined,
 *   editor?: any,
 *   showCountdown?: boolean,
 *   showSubtitle?: boolean,
 *   showCta?: boolean,
 *   showSponsorMarquee?: boolean,
 *   showAgendaJump?: boolean,
 * }} props
 */
export default function Hero({
  content,
  editor,
  showCountdown = true,
  showSubtitle = true,
  showCta = true,
  showSponsorMarquee = false,
  showAgendaJump = true,
} = {}) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const { data: siteData } = useSiteContent();
  const data = content || siteData;
  const hero = data?.hero || {};
  const eventConfig = data?.eventConfig || {};
  const prefersReducedMotion = useReducedMotion();
  const presentationMarqueeDuration = clampPresentationMarqueeDuration(
    hero?.presentation_marquee_duration_seconds
  );
  const marqueeViewportRef = useRef(null);
  const marqueeLoopRef = useRef(null);
  const [marqueeLoopWidth, setMarqueeLoopWidth] = useState(0);
  const [marqueeViewportWidth, setMarqueeViewportWidth] = useState(0);
  const [marqueeImagesReady, setMarqueeImagesReady] = useState(false);
  const sponsorMarqueeItems = useMemo(() => {
    const rows = Array.isArray(data?.sponsors) ? data.sponsors : [];
    return rows
      .map((item, index) => ({ ...item, __index: index }))
      .filter((item) => item.active !== false && (item.logo_url || item.name))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [data?.sponsors]);
  const isEditorPreview = Boolean(editor);
  const handleJumpToAgenda = useCallback((event) => {
    event.preventDefault();

    const agendaSection = document.getElementById('agenda');
    if (!agendaSection) return;

    if (window.location.hash !== '#agenda') {
      window.history.replaceState(null, '', '#agenda');
    }

    agendaSection.focus({ preventScroll: true });
    agendaSection.scrollIntoView({ block: 'start' });
  }, []);
  const countdownTarget = resolveCountdownDate(eventConfig, hero);
  const countdownTargetLabel = countdownTarget.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  useEffect(() => {
    if (!showCountdown) return undefined;

    const eventDate = resolveCountdownDate(eventConfig, hero);

    const tick = () => {
      const now = new Date();
      const diff = eventDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [eventConfig.event_date, eventConfig.event_time, hero.countdown_target, showCountdown]);

  useEffect(() => {
    if (!showSponsorMarquee || !sponsorMarqueeItems.length) {
      setMarqueeLoopWidth(0);
      setMarqueeViewportWidth(0);
      setMarqueeImagesReady(false);
      return undefined;
    }

    const loopNode = marqueeLoopRef.current;
    const viewportNode = marqueeViewportRef.current;
    if (!loopNode || !viewportNode) return undefined;

    const images = Array.from(loopNode.querySelectorAll('img'));
    const allImagesLoaded = () =>
      images.every((image) => image.complete && image.naturalWidth > 0);

    setMarqueeImagesReady(images.length === 0 ? true : allImagesLoaded());

    let rafId = 0;
    const measure = () => {
      const loopWidth = loopNode.getBoundingClientRect().width;
      const viewportWidth = viewportNode.getBoundingClientRect().width;

      if (loopWidth > 0) {
        setMarqueeLoopWidth((prev) => (Math.abs(prev - loopWidth) < 0.5 ? prev : loopWidth));
      }
      if (viewportWidth > 0) {
        setMarqueeViewportWidth((prev) =>
          Math.abs(prev - viewportWidth) < 0.5 ? prev : viewportWidth
        );
      }
    };
    const scheduleMeasure = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    };

    measure();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });
      resizeObserver.observe(loopNode);
      resizeObserver.observe(viewportNode);
    }

    const handleImageLoad = () => {
      scheduleMeasure();
      if (allImagesLoaded()) {
        setMarqueeImagesReady(true);
      }
    };
    images.forEach((image) => {
      if (!image.complete) {
        image.addEventListener('load', handleImageLoad);
        image.addEventListener('error', handleImageLoad);
      }
    });

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      images.forEach((image) => {
        image.removeEventListener('load', handleImageLoad);
        image.removeEventListener('error', handleImageLoad);
      });
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [showSponsorMarquee, sponsorMarqueeItems]);

  const countdownItems = [
    { label: 'Days', value: countdown.days },
    { label: 'Hours', value: countdown.hours },
    { label: 'Minutes', value: countdown.mins },
    { label: 'Seconds', value: countdown.secs },
  ];
  const marqueeCopyCount = useMemo(() => {
    if (isEditorPreview) return 1;
    if (marqueeLoopWidth <= 0 || marqueeViewportWidth <= 0) return 2;
    return Math.max(2, Math.ceil(marqueeViewportWidth / marqueeLoopWidth) + 2);
  }, [isEditorPreview, marqueeLoopWidth, marqueeViewportWidth]);
  const marqueeCanAnimate =
    !isEditorPreview &&
    !prefersReducedMotion &&
    sponsorMarqueeItems.length > 0 &&
    marqueeLoopWidth > 0 &&
    marqueeImagesReady;
  const renderSponsorMarqueeItem = (sponsor, keyPrefix = 'marquee') => {
    const name = String(sponsor?.name || 'Sponsor').trim() || 'Sponsor';
    const logoUrl = String(sponsor?.logo_url || '').trim();
    const presentationLogoScale = clampPresentationMarqueeLogoScale(
      sponsor?.presentation_logo_scale
    );
    const logoHeightPx = Math.round(
      (PRESENTATION_MARQUEE_BASE_LOGO_HEIGHT_PX * presentationLogoScale) / 100
    );
    const logoMaxWidthPx = Math.round(
      (PRESENTATION_MARQUEE_BASE_LOGO_MAX_WIDTH_PX * presentationLogoScale) / 100
    );
    const fallbackFontSizePx = Math.round(
      (PRESENTATION_MARQUEE_BASE_FALLBACK_FONT_SIZE_PX * presentationLogoScale) / 100
    );
    const logoLeftSpacingPx = clampPresentationMarqueeLogoSpacing(
      sponsor?.presentation_logo_spacing_left_px
    );
    const logoRightSpacingPx = clampPresentationMarqueeLogoSpacing(
      sponsor?.presentation_logo_spacing_right_px
    );
    const key = `${keyPrefix}-${sponsor?.id || sponsor?.__index || name}`;

    return (
      <li
        key={key}
        className="h-full shrink-0 overflow-hidden"
        style={{
          paddingLeft: `${logoLeftSpacingPx}px`,
          paddingRight: `${logoRightSpacingPx}px`,
        }}
      >
        <div className="flex h-full items-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="block w-auto max-w-none object-contain opacity-95"
              style={{
                height: `${logoHeightPx}px`,
                maxWidth: `${logoMaxWidthPx}px`,
                filter:
                  'drop-shadow(0 0 6px rgba(0,0,0,0.2)) drop-shadow(0 0 1px rgba(0,0,0,0.25))',
              }}
              loading="eager"
              decoding="async"
            />
          ) : (
            <span
              className="font-heading uppercase tracking-[0.16em] text-slate-900/85"
              style={{
                fontSize: `${fallbackFontSizePx}px`,
                lineHeight: 1,
                textShadow: '0 0 6px rgba(0,0,0,0.2)',
              }}
            >
              {name}
            </span>
          )}
        </div>
      </li>
    );
  };
  const marqueeTrack = (
    <>
      <ul ref={marqueeLoopRef} className="flex h-full w-max items-center gap-0 px-8">
        {sponsorMarqueeItems.map((sponsor, index) =>
          renderSponsorMarqueeItem(sponsor, `loop-a-${index}`)
        )}
      </ul>
      {Array.from({ length: marqueeCopyCount - 1 }, (_unused, copyIndex) => (
        <ul
          key={`marquee-copy-${copyIndex}`}
          aria-hidden="true"
          className="flex h-full w-max items-center gap-0 px-8"
        >
          {sponsorMarqueeItems.map((sponsor, index) =>
            renderSponsorMarqueeItem(sponsor, `loop-${copyIndex + 1}-${index}`)
          )}
        </ul>
      ))}
    </>
  );

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div
        className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative z-10 w-full max-w-5xl text-center"
      >
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? {} : { opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.8 }}
          className="font-mono text-xs tracking-[0.3em] text-primary/85 mb-6 uppercase"
        >
          {editor?.text
            ? editor.text({
                value: hero.pretitle,
                fallback: 'Sacramento State University Presents',
                onChange: (value) => editor.setField('hero', 'pretitle', value),
                ariaLabel: 'Hero pretitle',
              })
            : hero.pretitle || 'Sacramento State University Presents'}
        </motion.p>

        <h1 id="hero-title" className="font-heading font-bold leading-none mb-4">
          <motion.span
            className="block text-6xl sm:text-8xl md:text-9xl text-foreground"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5, duration: 1 }}
          >
            {editor?.text
              ? editor.text({
                  value: hero.title_line_1,
                  fallback: 'CYBER',
                  onChange: (value) => editor.setField('hero', 'title_line_1', value),
                  ariaLabel: 'Hero title line 1',
                })
              : hero.title_line_1 || 'CYBER'}
          </motion.span>
          <motion.span
            className={`block text-6xl sm:text-8xl md:text-9xl ${showSponsorMarquee ? '' : 'glow-cyan text-primary'}`.trim()}
            style={
              showSponsorMarquee
                ? {
                    color: '#00E5FF',
                    textShadow:
                      '0 0 17px rgba(0,229,255,0.44), 0 0 34px rgba(0,229,255,0.18)',
                  }
                : undefined
            }
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.7, duration: 1 }}
          >
            {editor?.text
              ? editor.text({
                  value: hero.title_line_2,
                  fallback: 'SWARM',
                  onChange: (value) => editor.setField('hero', 'title_line_2', value),
                  ariaLabel: 'Hero title line 2',
                })
              : hero.title_line_2 || 'SWARM'}
          </motion.span>
        </h1>

        {showSubtitle ? (
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? {} : { opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 1.1, duration: 0.8 }}
            className="font-mono text-sm md:text-base text-muted-foreground max-w-xl mx-auto mt-6 leading-relaxed"
          >
            {editor?.text
              ? editor.text({
                  as: 'span',
                  value: hero.subtitle,
                  fallback:
                    'Cybersecurity Panel & Networking Event - Where collective defense meets collective intelligence.',
                  onChange: (value) => editor.setField('hero', 'subtitle', value),
                  multiline: true,
                  ariaLabel: 'Hero subtitle',
                })
              : hero.subtitle ||
                'Cybersecurity Panel & Networking Event - Where collective defense meets collective intelligence.'}
          </motion.p>
        ) : null}

        {showSponsorMarquee && sponsorMarqueeItems.length ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 1.1, duration: 0.8 }}
            className="mx-auto mt-10 w-full max-w-5xl"
            aria-label="Featured sponsor logos"
          >
            <div
              ref={marqueeViewportRef}
              className="relative isolate w-full overflow-hidden rounded-full border border-primary/30 bg-[rgba(237,239,242,0.93)] shadow-[0_0_32px_hsl(var(--primary)/0.1)]"
              style={{
                height: `${PRESENTATION_MARQUEE_BAND_HEIGHT_PX}px`,
                clipPath: 'inset(0 round 9999px)',
                contain: 'paint',
              }}
            >
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[rgba(237,239,242,0.93)] to-transparent"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[rgba(237,239,242,0.93)] to-transparent"
                aria-hidden="true"
              />
              {isEditorPreview ? (
                <div className="flex h-full w-max will-change-auto">{marqueeTrack}</div>
              ) : (
                <motion.div
                  className="flex h-full w-max will-change-transform"
                  animate={marqueeCanAnimate ? { x: [0, -marqueeLoopWidth] } : { x: 0 }}
                  transition={
                    marqueeCanAnimate
                      ? { duration: presentationMarqueeDuration, ease: 'linear', repeat: Infinity }
                      : { duration: 0 }
                  }
                >
                  {marqueeTrack}
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : null}

        {showCountdown ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 1.4, duration: 0.8 }}
            className="flex justify-center gap-6 md:gap-10 mt-12"
            aria-labelledby="countdown-heading"
          >
            <p id="countdown-heading" className="sr-only">
              Countdown to the event on {countdownTargetLabel}
            </p>
            <dl className="flex justify-center gap-6 md:gap-10">
              {countdownItems.map((item) => (
                <div key={item.label} className="text-center">
                  <dd className="font-heading text-3xl md:text-5xl font-bold text-foreground tabular-nums">
                    {String(item.value).padStart(2, '0')}
                  </dd>
                  <dt className="font-mono text-xs text-primary/85 tracking-widest mt-1 uppercase">
                    {item.label}
                  </dt>
                </div>
              ))}
            </dl>
          </motion.div>
        ) : null}

        {showCta ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? {} : { opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 1.8, duration: 0.8 }}
            className="mt-14"
          >
            <a
              href="#register"
              className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-background/35 px-8 py-3 text-primary font-mono text-sm tracking-widest uppercase transition-all duration-300 hover:border-primary/85 hover:bg-primary/12"
            >
              {editor?.text
                ? editor.text({
                    value: hero.cta_label,
                    fallback: 'Join the Swarm',
                    onChange: (value) => editor.setField('hero', 'cta_label', value),
                    ariaLabel: 'Hero CTA label',
                  })
                : hero.cta_label || 'Join the Swarm'}
            </a>
          </motion.div>
        ) : null}
      </motion.div>

      {showAgendaJump ? (
        <motion.a
          href="#agenda"
          onClick={handleJumpToAgenda}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
          animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: Infinity }}
          aria-label="Jump to the agenda section"
        >
          <ChevronDown className="w-5 h-5 text-primary/65" aria-hidden="true" />
        </motion.a>
      ) : null}
    </section>
  );
}
