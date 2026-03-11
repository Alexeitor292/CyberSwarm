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
      {/* Background */}
      <ParticleField />

      {/* HUD */}
      <HUDOverlay />
      <NavMenu />
      <AdminDashboardButton />

      {/* Content */}
      <Hero />
      <CompanyLogos />
      <AgendaTimeline />
      <AdminUpdatesSection />
      <EventInfo />
      <RegistrationForm />
      <Footer />

      {/* Bottom ticker */}
      <AdminTicker />

      {/* Bottom spacing for ticker */}
      <div className="h-10" />
    </div>
  );
}
