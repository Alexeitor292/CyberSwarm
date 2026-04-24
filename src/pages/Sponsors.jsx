import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import ParticleField from '@/components/cyberswarm/ParticleField';
import { useSiteContent } from '@/hooks/use-site-content';

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

const PRESENTATION_MARQUEE_BASE_LOGO_HEIGHT_PX = 190;
const PRESENTATION_MARQUEE_BASE_LOGO_MAX_WIDTH_PX = 620;
const PRESENTATION_MARQUEE_BASE_FALLBACK_FONT_SIZE_PX = 62;

export default function Sponsors() {
  const { data } = useSiteContent();
  const prefersReducedMotion = useReducedMotion();
  const marqueeViewportRef = useRef(null);
  const marqueeLoopRef = useRef(null);
  const [marqueeLoopWidth, setMarqueeLoopWidth] = useState(0);
  const [marqueeViewportWidth, setMarqueeViewportWidth] = useState(0);
  const [marqueeImagesReady, setMarqueeImagesReady] = useState(false);

  const sponsors = useMemo(() => {
    const rows = Array.isArray(data?.sponsors) ? data.sponsors : [];
    return rows
      .map((item, index) => ({ ...item, __index: index }))
      .filter((item) => item.active !== false && (item.logo_url || item.name))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [data?.sponsors]);

  const presentationMarqueeDuration = clampPresentationMarqueeDuration(
    data?.hero?.presentation_marquee_duration_seconds
  );

  useEffect(() => {
    if (!sponsors.length) {
      setMarqueeLoopWidth(0);
      setMarqueeViewportWidth(0);
      setMarqueeImagesReady(false);
      return undefined;
    }

    const loopNode = marqueeLoopRef.current;
    const viewportNode = marqueeViewportRef.current;
    if (!loopNode || !viewportNode) return undefined;

    const images = Array.from(loopNode.querySelectorAll('img'));
    const allImagesLoaded = () => images.every((image) => image.complete && image.naturalWidth > 0);
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
  }, [sponsors]);

  const marqueeCopyCount = useMemo(() => {
    if (marqueeLoopWidth <= 0 || marqueeViewportWidth <= 0) return 2;
    return Math.max(2, Math.ceil(marqueeViewportWidth / marqueeLoopWidth) + 2);
  }, [marqueeLoopWidth, marqueeViewportWidth]);

  const marqueeCanAnimate =
    !prefersReducedMotion &&
    sponsors.length > 0 &&
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
                  'drop-shadow(0 0 8px rgba(0,0,0,0.22)) drop-shadow(0 0 2px rgba(0,0,0,0.3))',
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
                textShadow: '0 0 8px rgba(0,0,0,0.2)',
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
      <ul ref={marqueeLoopRef} className="flex h-full w-max items-center gap-0 px-12">
        {sponsors.map((sponsor, index) => renderSponsorMarqueeItem(sponsor, `loop-a-${index}`))}
      </ul>
      {Array.from({ length: marqueeCopyCount - 1 }, (_unused, copyIndex) => (
        <ul
          key={`marquee-copy-${copyIndex}`}
          aria-hidden="true"
          className="flex h-full w-max items-center gap-0 px-12"
        >
          {sponsors.map((sponsor, index) =>
            renderSponsorMarqueeItem(sponsor, `loop-${copyIndex + 1}-${index}`)
          )}
        </ul>
      ))}
    </>
  );

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <ParticleField reactToMouse={false} />

      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(0,229,255,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(255,87,87,0.12), transparent 32%)',
        }}
      />

      <main className="relative z-10 flex h-full items-center px-5 py-6 sm:px-8 lg:px-12" aria-label="CyberSwarm sponsors display">
        {sponsors.length ? (
          <section className="w-full rounded-[2.8rem] border border-primary/25 bg-[linear-gradient(180deg,rgba(8,10,18,0.9),rgba(10,11,20,0.84))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.34)] sm:p-6 lg:p-8">
            <div
              ref={marqueeViewportRef}
              className="relative isolate w-full overflow-hidden rounded-[2rem] border border-primary/30 bg-[rgba(237,239,242,0.94)]"
              style={{
                height: 'min(44vh, 380px)',
                clipPath: 'inset(0 round 2rem)',
                contain: 'paint',
              }}
            >
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[rgba(237,239,242,0.94)] to-transparent sm:w-28"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[rgba(237,239,242,0.94)] to-transparent sm:w-28"
                aria-hidden="true"
              />

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
            </div>
          </section>
        ) : (
          <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-primary/20 bg-background/65 px-8 py-14 text-center shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/80">Sponsors Display</p>
            <p className="mt-4 font-heading text-3xl text-foreground sm:text-4xl">
              Add active sponsors to show logos here
            </p>
          </div>
        )}
      </main>
    </div>
  );
}