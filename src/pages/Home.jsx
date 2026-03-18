import React from 'react';
import ParticleField from '../components/cyberswarm/ParticleField';
import HUDOverlay from '../components/cyberswarm/HUDOverlay';
import NavMenu from '../components/cyberswarm/NavMenu';
import AdminDashboardButton from '../components/cyberswarm/AdminDashboardButton';
import Hero from '../components/cyberswarm/Hero';
import CompanyLogos from '../components/cyberswarm/CompanyLogo';
import AgendaTimeline from '../components/cyberswarm/AgendaTimeline';
import AdminUpdatesSection from '../components/cyberswarm/AdminUpdatesSection';
import EventInfo from '../components/cyberswarm/EventInfo';
import RegistrationForm from '../components/cyberswarm/RegistrationForm';
import AdminTicker from '../components/cyberswarm/AdminTicker';
import Footer from '../components/cyberswarm/Footer';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to main content
      </a>

      {/* Background */}
      <ParticleField />

      {/* HUD */}
      <HUDOverlay />
      <NavMenu />
      <AdminDashboardButton />

      {/* Content */}
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <CompanyLogos />
        <AgendaTimeline />
        <AdminUpdatesSection />
        <EventInfo />
        <RegistrationForm />
      </main>
      <Footer />

      {/* Bottom ticker */}
      <AdminTicker />

      {/* Bottom spacing for ticker */}
      <div className="h-14" aria-hidden="true" />
    </div>
  );
}
