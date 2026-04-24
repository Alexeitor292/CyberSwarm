import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import ParticleField from '../components/cyberswarm/ParticleField';
import HUDOverlay from '../components/cyberswarm/HUDOverlay';
import Hero from '../components/cyberswarm/Hero';
import { PRESENTATION_DECK_SLOTS } from '../data/siteData';
import { useSiteContent } from '../hooks/use-site-content';

const PRESENTATION_CURSOR_IDLE_TIMEOUT_MS = 2500;
const PRESENTATION_CURSOR_NAV_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'c',
  'C',
]);

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
  [item?.session_label, item?.title, item?.description, item?.speaker, item?.company, item?.session_type]
    .map((value) => asText(value).toLowerCase())
    .join(' ');

const hasKeyword = (item, keywords) =>
  keywords.some((keyword) => buildSearchText(item).includes(String(keyword).toLowerCase()));

const isPanelItem = (item) => hasKeyword(item, ['panel']) || item?.session_type === 'panel';
const normalizePresentationSlotId = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (['panel-1', 'panel1', 'panel_1', 'slide-panel-1'].includes(normalized)) return 'panel-1';
  if (['kahoot-1', 'kahoot1', 'kahoot_1', 'interactive-1', 'interactive1'].includes(normalized)) {
    return 'kahoot-1';
  }
  if (['panel-2', 'panel2', 'panel_2', 'slide-panel-2'].includes(normalized)) return 'panel-2';
  if (['kahoot-2', 'kahoot2', 'kahoot_2', 'interactive-2', 'interactive2'].includes(normalized)) {
    return 'kahoot-2';
  }
  if (['networking', 'network', 'mixer', 'slide-networking'].includes(normalized)) return 'networking';
  return null;
};
const PRESENTATION_SLOT_MAP = new Map(
  PRESENTATION_DECK_SLOTS.map((slot) => [slot.slot_id, slot])
);
const clampPresentationPanelistFontScale = (value) => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return 120;
  return Math.min(220, Math.max(80, Math.round(scale)));
};

const formatTimeRange = (item) =>
  [asText(item?.start_time), asText(item?.end_time)].filter(Boolean).join(' - ');

const formatSpeakerLine = (item) =>
  [asText(item?.speaker), asText(item?.company)].filter(Boolean).join(' | ');

const splitPanelField = (value) =>
  String(value || '')
    .split(/\r?\n|[|,;]/)
    .map((entry) => entry.trim())
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

  if (structuredPanelists.length) return structuredPanelists;

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
    company: companies[index] || (companies.length === 1 ? companies[0] : ''),
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

function PanelistCard({ panelist, fontScale = 120 }) {
  const resolvedScale = clampPresentationPanelistFontScale(fontScale);
  const nameFontSizeRem = (1.9 * resolvedScale) / 100;
  const roleFontSizeRem = (1.06 * resolvedScale) / 100;
  const companyFontSizeRem = (0.72 * resolvedScale) / 100;
  const bioFontSizeRem = (0.98 * resolvedScale) / 100;

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

      <h3
        className="mt-6 font-heading leading-[1.02] text-foreground"
        style={{ fontSize: `${nameFontSizeRem}rem` }}
      >
        {panelist.name || 'Panelist'}
      </h3>

      {panelist.role ? (
        <p
          className="mt-4 font-heading leading-snug text-foreground/90"
          style={{ fontSize: `${roleFontSizeRem}rem` }}
        >
          {panelist.role}
        </p>
      ) : null}

      {panelist.company ? (
        <p
          className="mt-2 font-mono uppercase tracking-[0.2em] text-primary/82"
          style={{ fontSize: `${companyFontSizeRem}rem` }}
        >
          {panelist.company}
        </p>
      ) : null}

      {panelist.bio ? (
        <p
          className="mt-5 font-heading leading-7 text-foreground/78"
          style={{ fontSize: `${bioFontSizeRem}rem` }}
        >
          {panelist.bio}
        </p>
      ) : null}
    </article>
  );
}

function IntroSlide({ data, editor }) {
  return (
    <div className="relative min-h-screen">
      <Hero
        content={data}
        editor={editor}
        showCountdown={false}
        showSubtitle={false}
        showCta={false}
        showSponsorMarquee
        showAgendaJump={false}
      />
      <HUDOverlay preview />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>
    </div>
  );
}

function StageSlide({ item, editor, listKey = 'presentationSlides' }) {
  const stageLabel = asText(item?.session_label);
  const title = asText(item?.title);
  const description = asText(item?.description);
  const hideSessionDescription = Boolean(item?.presentation_hide_description);
  const showSessionDescription = !hideSessionDescription;
  const timeRange = formatTimeRange(item);
  const speakerLine = formatSpeakerLine(item);
  const showPanelists = isPanelItem(item);
  const panelists = showPanelists ? getPanelists(item) : [];
  const panelistFontScale = clampPresentationPanelistFontScale(
    item?.presentation_panelist_font_scale
  );
  const useSplitHeader = showPanelists && showSessionDescription && Boolean(description);
  const panelGridColumnsClassName = 'md:grid-cols-2 lg:grid-cols-3';

  const agendaItemIndex = Number.isInteger(item?.__index) ? item.__index : -1;
  const canEditAgendaItem =
    agendaItemIndex >= 0 && editor && typeof editor.setListItemField === 'function';
  const setAgendaField = (key, value) => {
    if (!canEditAgendaItem) return;
    editor.setListItemField(listKey, agendaItemIndex, key, value);
  };

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
        <div className="glass flex h-full w-full flex-col rounded-[2.25rem] border border-primary/22 bg-[linear-gradient(180deg,rgba(8,10,18,0.92),rgba(10,11,20,0.88))] px-7 py-7 shadow-[0_30px_120px_rgba(0,0,0,0.32)] sm:px-8 sm:py-8 xl:px-10 xl:py-9">
          <div className="flex h-full min-w-0 flex-col">
            <div className="flex flex-wrap gap-3">
              {stageLabel || canEditAgendaItem ? (
                <MetaPill accent>
                  {canEditAgendaItem
                    ? editor.text({
                        as: 'span',
                        value: item?.session_label,
                        fallback: 'SESSION',
                        onChange: (value) => setAgendaField('session_label', value),
                        ariaLabel: 'Presentation session label',
                      })
                    : stageLabel}
                </MetaPill>
              ) : null}

              {timeRange || canEditAgendaItem ? (
                <MetaPill>
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {canEditAgendaItem ? (
                    <span className="inline-flex items-center gap-1">
                      {editor.text({
                        as: 'span',
                        value: item?.start_time,
                        fallback: 'Start',
                        onChange: (value) => setAgendaField('start_time', value),
                        ariaLabel: 'Presentation start time',
                      })}
                      <span className="text-foreground/65">-</span>
                      {editor.text({
                        as: 'span',
                        value: item?.end_time,
                        fallback: 'End',
                        onChange: (value) => setAgendaField('end_time', value),
                        ariaLabel: 'Presentation end time',
                      })}
                    </span>
                  ) : (
                    timeRange
                  )}
                </MetaPill>
              ) : null}
            </div>

            {useSplitHeader ? (
              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,0.9fr)] xl:items-start">
                <div className="min-w-0">
                  <h2 className="max-w-none font-heading text-[3rem] font-semibold leading-[0.94] text-foreground sm:text-[4rem] xl:text-[4.9rem]">
                    {canEditAgendaItem
                      ? editor.text({
                          as: 'span',
                          value: item?.title,
                          fallback: 'Session title',
                          onChange: (value) => setAgendaField('title', value),
                          ariaLabel: 'Presentation session title',
                        })
                      : title}
                  </h2>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-6 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
                  <p className="font-heading text-[1.18rem] leading-[1.48] text-foreground/86 xl:text-[1.36rem]">
                    {canEditAgendaItem
                      ? editor.text({
                          as: 'span',
                          value: item?.description,
                          fallback: 'Session description',
                          onChange: (value) => setAgendaField('description', value),
                          multiline: true,
                          ariaLabel: 'Presentation session description',
                        })
                      : description}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mt-6 max-w-none font-heading text-[3rem] font-semibold leading-[0.94] text-foreground sm:text-[4.2rem] xl:text-[5rem]">
                  {canEditAgendaItem
                    ? editor.text({
                        as: 'span',
                        value: item?.title,
                        fallback: 'Session title',
                        onChange: (value) => setAgendaField('title', value),
                        ariaLabel: 'Presentation session title',
                      })
                    : title}
                </h2>

                {!showPanelists && (speakerLine || canEditAgendaItem) ? (
                  <p className="mt-6 inline-flex max-w-fit items-center rounded-full border border-primary/20 bg-primary/8 px-5 py-2 font-heading text-lg text-primary/92 shadow-[0_0_30px_rgba(0,229,255,0.08)] sm:text-xl">
                    {canEditAgendaItem ? (
                      <>
                        {editor.text({
                          as: 'span',
                          value: item?.speaker,
                          fallback: 'Speaker',
                          onChange: (value) => setAgendaField('speaker', value),
                          ariaLabel: 'Presentation speaker',
                        })}
                        <span className="mx-2 text-primary/60">|</span>
                        {editor.text({
                          as: 'span',
                          value: item?.company,
                          fallback: 'Company',
                          onChange: (value) => setAgendaField('company', value),
                          ariaLabel: 'Presentation company',
                        })}
                      </>
                    ) : (
                      speakerLine
                    )}
                  </p>
                ) : null}

                {showSessionDescription && (description || canEditAgendaItem) ? (
                  <div className="mt-8 max-w-[72rem] rounded-[1.6rem] border border-white/10 bg-white/[0.03] px-6 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
                    <p className="font-heading text-[1.35rem] leading-[1.45] text-foreground/88 sm:text-[1.55rem] xl:text-[1.85rem]">
                      {canEditAgendaItem
                        ? editor.text({
                            as: 'span',
                            value: item?.description,
                            fallback: 'Session description',
                            onChange: (value) => setAgendaField('description', value),
                            multiline: true,
                            ariaLabel: 'Presentation session description',
                          })
                        : description}
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {panelists.length ? (
              <div className="mt-8 flex-1">
                <div className={`grid h-full auto-rows-fr gap-5 xl:gap-6 ${panelGridColumnsClassName}`}>
                  {panelists.map((panelist) => (
                    <PanelistCard
                      key={panelist.id}
                      panelist={panelist}
                      fontScale={panelistFontScale}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * @param {{
 *   content?: import('../data/siteData').DEFAULT_SITE_CONTENT | undefined,
 *   editor?: any,
 *   preview?: boolean,
 *   requestedSlideIndex?: number | undefined,
 *   onActiveSlideChange?: ((index: number, slide: any) => void) | undefined,
 * }} props
 */
export default function Presentation({
  content,
  editor,
  preview = false,
  requestedSlideIndex = undefined,
  onActiveSlideChange = undefined,
} = {}) {
  const { data: siteData, isLoading } = useSiteContent();
  const data = content || siteData;
  const scrollContainerRef = useRef(null);
  const slideNodesRef = useRef([]);
  const activeSlideIndexRef = useRef(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isCursorHidden, setIsCursorHidden] = useState(false);
  const [showSlideControls, setShowSlideControls] = useState(false);

  const activePresentationSlides = useMemo(
    () =>
      (data?.presentationSlides || [])
        .map((item, index) => ({ ...item, __index: index }))
        .filter((item) => item.active !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [data?.presentationSlides]
  );

  const presentationSlidesBySlot = useMemo(
    () => {
      const next = new Map();
      activePresentationSlides.forEach((item) => {
        const slotId =
          normalizePresentationSlotId(item?.slot_id ?? item?.slotId) ||
          normalizePresentationSlotId(item?.id);
        if (!slotId || next.has(slotId)) return;
        next.set(slotId, item);
      });
      return next;
    },
    [activePresentationSlides]
  );

  const createFallbackSlide = useCallback(
    (slotId) => {
      const slot = PRESENTATION_SLOT_MAP.get(slotId);
      const sessionType = slot?.session_type || 'panel';

      return {
        id: `fallback-${slotId || sessionType}`,
        slot_id: slotId || 'panel-1',
        session_type: sessionType,
        session_label: slot?.session_label || 'SESSION',
        title: slot?.title || 'Session title',
        description:
          slot?.description || 'Add presentation slide details in Admin > Presentation Builder.',
        speaker: '',
        company: '',
        start_time: '',
        end_time: '',
        active: true,
        presentation_hide_description: false,
        presentation_panelist_font_scale: 120,
        panelists:
          sessionType === 'panel'
            ? [
                { id: `${slotId}-fallback-1`, name: 'Panelist 1', role: '', company: '', bio: '' },
                { id: `${slotId}-fallback-2`, name: 'Panelist 2', role: '', company: '', bio: '' },
                { id: `${slotId}-fallback-3`, name: 'Panelist 3', role: '', company: '', bio: '' },
              ]
            : [],
      };
    },
    []
  );

  const panelSlide1 = presentationSlidesBySlot.get('panel-1') || createFallbackSlide('panel-1');
  const panelSlide2 = presentationSlidesBySlot.get('panel-2') || createFallbackSlide('panel-2');
  const kahootSlide1 = presentationSlidesBySlot.get('kahoot-1') || createFallbackSlide('kahoot-1');
  const kahootSlide2 = presentationSlidesBySlot.get('kahoot-2') || createFallbackSlide('kahoot-2');
  const networkingSlide =
    presentationSlidesBySlot.get('networking') || createFallbackSlide('networking');

  const slides = useMemo(
    () => [
      {
        id: 'slide-intro',
        label: 'Intro',
        content: <IntroSlide data={data} editor={editor} />,
      },
      {
        id: `slide-panel-1-${panelSlide1.id || 'slot'}`,
        label: 'Panel 1',
        content: <StageSlide item={panelSlide1} editor={editor} listKey="presentationSlides" />,
      },
      {
        id: `slide-kahoot-1-${kahootSlide1.id || 'slot'}`,
        label: 'Kahoot 1',
        content: <StageSlide item={kahootSlide1} editor={editor} listKey="presentationSlides" />,
      },
      {
        id: `slide-panel-2-${panelSlide2.id || 'slot'}`,
        label: 'Panel 2',
        content: <StageSlide item={panelSlide2} editor={editor} listKey="presentationSlides" />,
      },
      {
        id: `slide-kahoot-2-${kahootSlide2.id || 'slot'}`,
        label: 'Kahoot 2',
        content: <StageSlide item={kahootSlide2} editor={editor} listKey="presentationSlides" />,
      },
      {
        id: `slide-networking-${networkingSlide.id || 'slot'}`,
        label: 'Networking',
        content: <StageSlide item={networkingSlide} editor={editor} listKey="presentationSlides" />,
      },
    ],
    [
      data,
      editor,
      panelSlide1,
      kahootSlide1,
      panelSlide2,
      kahootSlide2,
      networkingSlide,
    ]
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

  useEffect(() => {
    if (typeof onActiveSlideChange !== 'function') return;
    onActiveSlideChange(activeSlideIndex, slides[activeSlideIndex] || null);
  }, [activeSlideIndex, onActiveSlideChange, slides]);

  useEffect(() => {
    activeSlideIndexRef.current = activeSlideIndex;
  }, [activeSlideIndex]);

  useEffect(() => {
    if (!preview) return;
    if (!Number.isInteger(requestedSlideIndex)) return;
    const clampedIndex = Math.max(0, Math.min(requestedSlideIndex, slides.length - 1));
    if (clampedIndex === activeSlideIndexRef.current) return;
    goToSlide(clampedIndex);
  }, [goToSlide, preview, requestedSlideIndex, slides.length]);

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
    if (preview || typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isInteractiveElement(event.target)) return;

      if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        setShowSlideControls((prev) => !prev);
        return;
      }

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
  }, [activeSlideIndex, goToSlide, preview, slides.length]);

  useEffect(() => {
    if (preview || typeof window === 'undefined') return undefined;

    let idleTimeoutId = null;

    const clearIdleTimeout = () => {
      if (idleTimeoutId !== null) {
        window.clearTimeout(idleTimeoutId);
        idleTimeoutId = null;
      }
    };

    const scheduleIdleHide = () => {
      clearIdleTimeout();
      idleTimeoutId = window.setTimeout(() => {
        setIsCursorHidden((prev) => (prev ? prev : true));
      }, PRESENTATION_CURSOR_IDLE_TIMEOUT_MS);
    };

    const revealCursorAndScheduleHide = () => {
      setIsCursorHidden((prev) => (prev ? false : prev));
      scheduleIdleHide();
    };
    const handleKeyboardActivity = (event) => {
      if (PRESENTATION_CURSOR_NAV_KEYS.has(event.key)) {
        scheduleIdleHide();
        return;
      }
      revealCursorAndScheduleHide();
    };

    revealCursorAndScheduleHide();

    window.addEventListener('pointermove', revealCursorAndScheduleHide, { passive: true });
    window.addEventListener('pointerdown', revealCursorAndScheduleHide, { passive: true });
    window.addEventListener('wheel', revealCursorAndScheduleHide, { passive: true });
    window.addEventListener('touchstart', revealCursorAndScheduleHide, { passive: true });
    window.addEventListener('keydown', handleKeyboardActivity);

    return () => {
      clearIdleTimeout();
      window.removeEventListener('pointermove', revealCursorAndScheduleHide);
      window.removeEventListener('pointerdown', revealCursorAndScheduleHide);
      window.removeEventListener('wheel', revealCursorAndScheduleHide);
      window.removeEventListener('touchstart', revealCursorAndScheduleHide);
      window.removeEventListener('keydown', handleKeyboardActivity);
    };
  }, [preview]);

  if (!content && isLoading && !data) {
    return (
      <div className={`relative overflow-x-hidden bg-background ${preview ? 'h-full' : 'min-h-screen'}`}>
        <ParticleField preview={preview} reactToMouse={false} />
        <HUDOverlay preview={preview} />

        <main className={`relative z-10 flex items-center justify-center px-6 ${preview ? 'h-full' : 'min-h-screen'}`}>
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
    <div
      className={`relative overflow-hidden bg-background ${preview ? 'h-full' : 'h-screen'} ${!preview && isCursorHidden ? 'cursor-none' : ''}`}
    >
      {!preview ? (
        <a
          href="#presentation-main"
          onClick={handleSkipToSlides}
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
        >
          Skip to presentation slides
        </a>
      ) : null}

      <ParticleField preview={preview} reactToMouse={false} />

      {!preview && showSlideControls ? (
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
              Use Arrow keys, Page Up/Down, Home, End, or C.
            </p>
          </div>
        </aside>
      ) : null}

      <main
        id="presentation-main"
        ref={scrollContainerRef}
        tabIndex={-1}
        className={`presentation-scroll-hidden relative z-10 snap-y snap-proximity overflow-x-hidden overflow-y-auto scroll-smooth ${preview ? 'h-full' : 'h-screen'}`}
        aria-label="CyberSwarm presentation"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            id={slide.id}
            ref={setSlideNode(index)}
            className={preview ? 'snap-start min-h-full' : 'snap-start min-h-screen'}
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
