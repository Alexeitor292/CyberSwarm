import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import ParticleField from '../components/cyberswarm/ParticleField';
import HUDOverlay from '../components/cyberswarm/HUDOverlay';
import Hero from '../components/cyberswarm/Hero';
import { useSiteContent } from '../hooks/use-site-content';

const isInteractiveElement = (target) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    tag === 'button' ||
    tag === 'a'
  );
};

const asText = (value) => String(value || '').trim();

const buildSearchText = (item) =>
  [item?.session_label, item?.title, item?.session_type]
    .map((value) => asText(value).toLowerCase())
    .join(' ');

const hasKeyword = (item, keywords) =>
  keywords.some((keyword) => buildSearchText(item).includes(String(keyword).toLowerCase()));

const isPanelItem = (item) => hasKeyword(item, ['panel']) || item?.session_type === 'panel';

const isInteractiveItem = (item) => hasKeyword(item, ['interactive', 'kahoot']);

const formatTimeRange = (item) =>
  [asText(item?.start_time), asText(item?.end_time)].filter(Boolean).join(' - ');

const formatSpeakerLine = (item) =>
  [asText(item?.speaker), asText(item?.company)].filter(Boolean).join(' | ');

const splitPanelField = (value) =>
  String(value || '')
    .split(/\r?\n|[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean);

const getPanelists = (item) => {
  const structuredPanelists = Array.isArray(item?.panelists)
    ? item.panelists
        .map((panelist) => ({
          id: panelist?.id || '',
          name: asText(panelist?.name),
          role: asText(panelist?.role),
          company: asText(panelist?.company),
          bio: asText(panelist?.bio),
        }))
        .filter((panelist) => panelist.name || panelist.role || panelist.company || panelist.bio)
    : [];

  if (structuredPanelists.length) {
    return structuredPanelists;
  }

  const speakerNames = splitPanelField(item?.speaker);
  const companies = splitPanelField(item?.company);
  const total = Math.max(speakerNames.length, companies.length);
  const firstSpeaker = speakerNames[0]?.toLowerCase() || '';

  if (!total) return [];

  if (total === 1 && ['panelists', 'industry panel', 'community speakers'].includes(firstSpeaker)) {
    return Array.from({ length: 3 }, (_unused, index) => ({
      id: `fallback-panelist-${item?.id || 'generic'}-${index}`,
      name: `Panelist ${index + 1}`,
      role: companies[0] || 'Industry Representative',
      company: '',
      bio: '',
    }));
  }

  return Array.from({ length: total }, (_unused, index) => ({
    id: `fallback-panelist-${item?.id || index}-${index}`,
    name: speakerNames[index] || speakerNames[0] || 'Panelist',
    role: '',
    company:
      companies[index] ||
      (companies.length === 1 ? companies[0] : ''),
    bio: '',
  }));
};

function MetaPill({ children, accent = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] shadow-[0_0_24px_rgba(0,0,0,0.14)] ${
        accent
          ? 'border-primary/45 bg-primary/12 text-primary'
          : 'border-white/10 bg-background/40 text-foreground/78'
      }`}
    >
      {children}
    </span>
  );
}

function PanelistCard({ panelist }) {
  return (
    <article className="relative flex h-full min-h-[236px] flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,29,0.98),rgba(12,13,22,0.92))] px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] ring-1 ring-primary/10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-primary to-primary/10" aria-hidden="true" />

      <h3 className="mt-6 font-heading text-[1.9rem] leading-[1.02] text-foreground xl:text-[2.05rem]">
        {panelist.name || 'Panelist'}
      </h3>

      {panelist.role ? (
        <p className="mt-4 font-heading text-[1.06rem] leading-snug text-foreground/90 xl:text-[1.14rem]">
          {panelist.role}
        </p>
      ) : null}

      {panelist.company ? (
        <p className="mt-2 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-primary/82">
          {panelist.company}
        </p>
      ) : null}

      {panelist.bio ? (
        <p className="mt-5 font-heading text-[0.98rem] leading-7 text-foreground/78 xl:text-[1.02rem]">
          {panelist.bio}
        </p>
      ) : null}
    </article>
  );
}

function IntroSlide({ data }) {
  return (
    <div className="relative min-h-screen">
      <Hero
        content={data}
        showCountdown={false}
        showCta={false}
        showSponsorMarquee
        showAgendaJump={false}
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>
    </div>
  );
}

function StageSlide({ item }) {
  const speakerLine = formatSpeakerLine(item);
  const timeRange = formatTimeRange(item);
  const stageLabel = asText(item?.session_label);
  const title = asText(item?.title);
  const description = asText(item?.description);
  const showPanelists = isPanelItem(item);
  const panelists = showPanelists ? getPanelists(item) : [];
  const useSplitHeader = showPanelists && Boolean(description);
  const panelGridColumnsClassName =
    panelists.length >= 3
      ? 'md:grid-cols-2 lg:grid-cols-3'
      : panelists.length === 2
        ? 'md:grid-cols-2'
        : 'md:grid-cols-1';

  return (
    <section className="relative h-screen px-4 py-4 sm:px-5 sm:py-5 xl:px-6 xl:py-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(0,229,255,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(255,87,87,0.12), transparent 28%)',
        }}
      />

      <div className="relative mx-auto flex h-full w-full max-w-[1680px] items-center">
        <div className="glass crop-marks flex h-full w-full flex-col rounded-[2.25rem] border border-primary/22 bg-[linear-gradient(180deg,rgba(8,10,18,0.92),rgba(10,11,20,0.88))] px-7 py-7 shadow-[0_30px_120px_rgba(0,0,0,0.32)] sm:px-8 sm:py-8 xl:px-10 xl:py-9">
          <div className="flex h-full min-w-0 flex-col">
            <div className="flex flex-wrap gap-3">
              {stageLabel ? <MetaPill accent>{stageLabel}</MetaPill> : null}
              {timeRange ? (
                <MetaPill>
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {timeRange}
                </MetaPill>
              ) : null}
            </div>

            {useSplitHeader ? (
              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,0.9fr)] xl:items-start">
                <div className="min-w-0">
                  <h2 className="max-w-none font-heading text-[3rem] font-semibold leading-[0.94] text-foreground sm:text-[4rem] xl:text-[4.9rem]">
                    {title}
                  </h2>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-6 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
                  <p className="font-heading text-[1.18rem] leading-[1.48] text-foreground/86 xl:text-[1.36rem]">
                    {description}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mt-6 max-w-none font-heading text-[3rem] font-semibold leading-[0.94] text-foreground sm:text-[4.2rem] xl:text-[5rem]">
                  {title}
                </h2>

                {!showPanelists && speakerLine ? (
                  <p className="mt-6 inline-flex max-w-fit rounded-full border border-primary/20 bg-primary/8 px-5 py-2 font-heading text-lg text-primary/92 shadow-[0_0_30px_rgba(0,229,255,0.08)] sm:text-xl">
                    {speakerLine}
                  </p>
                ) : null}

                {description ? (
                  <div className="mt-8 max-w-[72rem] rounded-[1.6rem] border border-white/10 bg-white/[0.03] px-6 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
                    <p className="font-heading text-[1.35rem] leading-[1.45] text-foreground/88 sm:text-[1.55rem] xl:text-[1.85rem]">
                      {description}
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {panelists.length ? (
              <div className="mt-8 flex-1">
                <div className={`grid h-full auto-rows-fr gap-5 xl:gap-6 ${panelGridColumnsClassName}`}>
                  {panelists.map((panelist) => {
                    return (
                      <PanelistCard
                        key={panelist.id}
                        panelist={panelist}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Presentation() {
  const { data, isLoading } = useSiteContent();
  const scrollContainerRef = useRef(null);
  const slideNodesRef = useRef([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const activeAgendaItems = useMemo(
    () =>
      (data?.agendaItems || [])
        .map((item, index) => ({ ...item, __index: index }))
        .filter((item) => item.active !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [data?.agendaItems]
  );

  const focusSlides = useMemo(() => {
    let panelCount = 0;
    let kahootCount = 0;

    return activeAgendaItems
      .filter((item) => isPanelItem(item) || isInteractiveItem(item))
      .map((item) => {
        if (isInteractiveItem(item)) {
          kahootCount += 1;
          return {
            ...item,
            slideLabel: `Kahoot ${kahootCount}`,
            interactive: true,
          };
        }

        panelCount += 1;
        return {
          ...item,
          slideLabel: `Panel ${panelCount}`,
          interactive: false,
        };
      });
  }, [activeAgendaItems]);

  const slides = useMemo(
    () => [
      {
        id: 'slide-intro',
        label: 'Keynote',
        content: <IntroSlide data={data} />,
      },
      ...focusSlides.map((item) => ({
        id: `slide-${item.slideLabel.toLowerCase().replace(/\s+/g, '-')}-${item.id}`,
        label: item.slideLabel,
        content: (
          <StageSlide
            item={item}
          />
        ),
      })),
    ],
    [data, focusSlides]
  );

  const setSlideNode = useCallback(
    (index) => (node) => {
      slideNodesRef.current[index] = node;
    },
    []
  );

  const goToSlide = useCallback(
    (index) => {
      if (!slideNodesRef.current.length) return;
      const clampedIndex = Math.max(0, Math.min(index, slides.length - 1));
      const node = slideNodesRef.current[clampedIndex];
      if (!node) return;
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [slides.length]
  );

  /** @type {(event: import('react').MouseEvent<HTMLAnchorElement>) => void} */
  const handleSkipToSlides = useCallback((event) => {
    event.preventDefault();
    const main = scrollContainerRef.current;
    if (!main) return;
    main.focus({ preventScroll: true });
    main.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        let winner = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!winner || entry.intersectionRatio > winner.intersectionRatio) {
            winner = entry;
          }
        }

        if (!winner) return;

        const index = slideNodesRef.current.findIndex((node) => node === winner.target);
        if (index >= 0) {
          setActiveSlideIndex(index);
        }
      },
      {
        root,
        threshold: [0.2, 0.45, 0.7],
      }
    );

    slideNodesRef.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [slides.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isInteractiveElement(event.target)) return;

      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        goToSlide(activeSlideIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        goToSlide(activeSlideIndex - 1);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        goToSlide(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        goToSlide(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlideIndex, goToSlide, slides.length]);

  if (isLoading && !data) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-background">
        <ParticleField reactToMouse={false} />
        <HUDOverlay />

        <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="glass w-full max-w-md rounded-2xl px-8 py-10 text-center">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-primary/85">
              Loading Presentation
            </p>
            <div className="mb-4 flex items-center justify-center" role="status">
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-primary/50 border-t-primary"
                aria-hidden="true"
              />
              <span className="sr-only">Loading presentation slides</span>
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              Syncing the latest event details before launching slide mode.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <a
        href="#presentation-main"
        onClick={handleSkipToSlides}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to presentation slides
      </a>

      <ParticleField reactToMouse={false} />
      <HUDOverlay />

      <aside className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
        <div className="pointer-events-auto glass w-48 rounded-2xl border border-primary/20 px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
            Presentation
          </p>
          <p className="mt-1 font-heading text-sm text-foreground">Slide Controls</p>
          <ul className="mt-3 space-y-1.5">
            {slides.map((slide, index) => {
              const isActive = index === activeSlideIndex;
              return (
                <li key={slide.id}>
                  <button
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={`w-full rounded-md border px-2 py-1.5 text-left transition ${
                      isActive
                        ? 'border-primary/45 bg-primary/12 text-foreground'
                        : 'border-primary/15 bg-background/20 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    }`}
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={`Go to ${slide.label} slide`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="ml-2 font-heading text-xs">{slide.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 font-mono text-[10px] leading-4 text-muted-foreground/80">
            Use Arrow keys, Page Up/Down, Home, or End.
          </p>
        </div>
      </aside>

      <main
        id="presentation-main"
        ref={scrollContainerRef}
        tabIndex={-1}
        className="relative z-10 h-screen snap-y snap-proximity overflow-y-auto scroll-smooth"
        aria-label="CyberSwarm presentation"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            id={slide.id}
            ref={setSlideNode(index)}
            className="snap-start min-h-screen"
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${slides.length}: ${slide.label}`}
          >
            {slide.content}
          </div>
        ))}
      </main>
    </div>
  );
}
