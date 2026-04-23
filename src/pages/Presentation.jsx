import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ParticleField from '../components/cyberswarm/ParticleField';
import HUDOverlay from '../components/cyberswarm/HUDOverlay';
import Hero from '../components/cyberswarm/Hero';
import SponsorsShowcase from '../components/cyberswarm/SponsorsShowcase';
import CompanyLogos from '../components/cyberswarm/CompanyLogo';
import AgendaTimeline from '../components/cyberswarm/AgendaTimeline';
import AdminUpdatesSection from '../components/cyberswarm/AdminUpdatesSection';
import EventInfo from '../components/cyberswarm/EventInfo';
import RegistrationForm from '../components/cyberswarm/RegistrationForm';
import Footer from '../components/cyberswarm/Footer';
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

export default function Presentation() {
  const { data, isLoading } = useSiteContent();
  const scrollContainerRef = useRef(null);
  const slideNodesRef = useRef([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const slides = useMemo(
    () => [
      {
        id: 'slide-intro',
        label: 'Intro',
        content: (
          <Hero
            showCountdown={false}
            showSubtitle={false}
            showCta={false}
            showSponsorMarquee
          />
        ),
      },
      { id: 'slide-sponsors', label: 'Sponsors', content: <SponsorsShowcase /> },
      { id: 'slide-organizations', label: 'Organizations', content: <CompanyLogos /> },
      { id: 'slide-agenda', label: 'Agenda', content: <AgendaTimeline /> },
      { id: 'slide-updates', label: 'Broadcast', content: <AdminUpdatesSection /> },
      { id: 'slide-info', label: 'Event Intel', content: <EventInfo /> },
      {
        id: 'slide-register',
        label: 'Registration',
        content: (
          <>
            <RegistrationForm />
            <Footer />
          </>
        ),
      },
    ],
    []
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
      <div className="relative min-h-screen bg-background overflow-x-hidden">
        <ParticleField reactToMouse={false} />
        <HUDOverlay />

        <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="glass rounded-2xl px-8 py-10 text-center max-w-md w-full">
            <p className="font-mono text-xs tracking-[0.3em] text-primary/85 uppercase mb-4">
              Loading Presentation
            </p>
            <div className="flex items-center justify-center mb-4" role="status">
              <div
                className="w-8 h-8 border-4 border-primary/50 border-t-primary rounded-full animate-spin"
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
    <div className="relative h-screen bg-background overflow-hidden">
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
        <div className="pointer-events-auto glass rounded-2xl border border-primary/20 px-3 py-3 w-44">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-primary/80">
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
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
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
        className="relative z-10 h-screen overflow-y-auto snap-y snap-proximity scroll-smooth"
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
