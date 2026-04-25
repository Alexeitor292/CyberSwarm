import React, { useCallback, useEffect, useState } from 'react';
import ParticleField from '../components/cyberswarm/ParticleField';
import HUDOverlay from '../components/cyberswarm/HUDOverlay';
import AdminDashboardButton from '../components/cyberswarm/AdminDashboardButton';
import Hero from '../components/cyberswarm/Hero';
import SponsorsShowcase from '../components/cyberswarm/SponsorsShowcase';
import SponsorInterestForm from '../components/cyberswarm/SponsorInterestForm';
import CompanyLogos from '../components/cyberswarm/CompanyLogo';
import AgendaTimeline from '../components/cyberswarm/AgendaTimeline';
import AdminUpdatesSection from '../components/cyberswarm/AdminUpdatesSection';
import EventInfo from '../components/cyberswarm/EventInfo';
import RegistrationForm from '../components/cyberswarm/RegistrationForm';
import Footer from '../components/cyberswarm/Footer';
import { useSiteContent } from '../hooks/use-site-content';

export default function Home() {
  const { data, isLoading } = useSiteContent();
  const isEventOver = data?.eventConfig?.event_is_over === true;
  const [isSponsorFormOpen, setIsSponsorFormOpen] = useState(
    () => typeof window !== 'undefined' && window.location.hash === '#sponsor-interest'
  );

  /** @type {(event: import('react').MouseEvent<HTMLAnchorElement>) => void} */
  const handleSkipToMain = useCallback((event) => {
    event.preventDefault();

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    if (window.location.hash !== '#main-content') {
      window.history.replaceState(null, '', '#main-content');
    }

    mainContent.focus({ preventScroll: true });
    mainContent.scrollIntoView({ block: 'start' });
  }, []);

  const openSponsorForm = useCallback(() => {
    if (isEventOver) return;
    setIsSponsorFormOpen(true);
  }, [isEventOver]);

  const closeSponsorForm = useCallback(() => {
    setIsSponsorFormOpen(false);
    if (window.location.hash === '#sponsor-interest') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleHashChange = () => {
      if (isEventOver) return;
      if (window.location.hash === '#sponsor-interest') {
        setIsSponsorFormOpen(true);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isEventOver]);

  useEffect(() => {
    if (!isEventOver || !isSponsorFormOpen || typeof window === 'undefined') return;

    setIsSponsorFormOpen(false);
    if (window.location.hash === '#sponsor-interest') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [isEventOver, isSponsorFormOpen]);

  useEffect(() => {
    if (!isSponsorFormOpen || typeof window === 'undefined') return undefined;

    const frame = window.requestAnimationFrame(() => {
      if (window.location.hash !== '#sponsor-interest') {
        window.history.replaceState(null, '', '#sponsor-interest');
      }

      document.getElementById('sponsor-interest')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isSponsorFormOpen]);

  if (isLoading && !data) {
    return (
      <div className="relative min-h-screen bg-background overflow-x-hidden">
        <ParticleField />
        <HUDOverlay />
        <AdminDashboardButton />

        <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="glass rounded-2xl px-8 py-10 text-center max-w-md w-full">
            <p className="font-mono text-xs tracking-[0.3em] text-primary/85 uppercase mb-4">
              Loading Event Intel
            </p>
            <div className="flex items-center justify-center mb-4" role="status">
              <div
                className="w-8 h-8 border-4 border-primary/50 border-t-primary rounded-full animate-spin"
                aria-hidden="true"
              />
              <span className="sr-only">Loading the latest event details</span>
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              Syncing the latest event details before the public page appears.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <a
        href="#main-content"
        onClick={handleSkipToMain}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to main content
      </a>

      {/* Background */}
      <ParticleField />

      {/* HUD */}
      <HUDOverlay />
      <AdminDashboardButton />

      {/* Content */}
      <main id="main-content" tabIndex={-1}>
        <Hero showCountdown={!isEventOver} showCta={!isEventOver} />
        <SponsorsShowcase showCta={!isEventOver} onBecomeSponsorClick={openSponsorForm} />
        {!isEventOver && isSponsorFormOpen ? <SponsorInterestForm onClose={closeSponsorForm} /> : null}
        <CompanyLogos />
        <AgendaTimeline />
        <AdminUpdatesSection />
        <EventInfo />
        {!isEventOver ? <RegistrationForm /> : null}
      </main>
      {!isEventOver ? <Footer /> : null}
    </div>
  );
}
