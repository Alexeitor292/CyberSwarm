import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, Navigation } from 'lucide-react';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const toFiniteNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function EventInfo() {
  const { data: configs = [] } = useQuery({
    queryKey: ['event-config'],
    queryFn: () => appClient.entities.EventConfig.list('-created_date', 1),
  });

  const config = configs[0] || {};
  const venueNameLine1 = String(config.venue_name_line_1 || config.venue_name || 'Sacramento State University').trim();
  const venueNameLine2 = String(config.venue_name_line_2 || '').trim();
  const pinLat = toFiniteNumber(config.pin_latitude);
  const pinLng = toFiniteNumber(config.pin_longitude);
  const pinZoom = toFiniteNumber(config.pin_zoom, 15);
  const hasPin = pinLat !== null && pinLng !== null;
  const pinQuery = hasPin ? `${pinLat},${pinLng}` : '';
  const directionsDestination = hasPin
    ? pinQuery
    : config.venue_address || '6000 J St, Sacramento, CA 95819';

  const defaultMapUrl =
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3119.4!2d-121.4244!3d38.5616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x809ad0a3c3b1b8e7%3A0x1b0e3a3f2b0b0b0b!2sCalifornia%20State%20University%2C%20Sacramento!5e0!3m2!1sen!2sus!4v1700000000000';
  const mapEmbedUrl = hasPin
    ? `https://www.google.com/maps?q=${encodeURIComponent(pinQuery)}&z=${pinZoom}&output=embed`
    : config.google_maps_embed_url || defaultMapUrl;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsDestination)}`;

  return (
    <section id="info" className="relative z-10 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-primary/50 uppercase mb-3">// Location</p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground">Event Intel</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="glass rounded-lg p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded border border-primary/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground/75 uppercase tracking-widest mb-1">Date</p>
                  <p className="font-heading text-lg font-semibold text-foreground">
                    {config.event_date
                      ? format(new Date(`${config.event_date}T12:00:00`), 'MMMM d, yyyy')
                      : 'April 15, 2026'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded border border-primary/20 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground/75 uppercase tracking-widest mb-1">Time</p>
                  <p className="font-heading text-lg font-semibold text-foreground">
                    {config.event_time || '9:00 AM - 5:00 PM PST'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded border border-primary/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground/75 uppercase tracking-widest mb-1">Venue</p>
                  <p className="font-heading text-lg font-semibold text-foreground">{venueNameLine1}</p>
                  {venueNameLine2 ? (
                    <p className="font-heading text-base font-medium text-foreground/88">{venueNameLine2}</p>
                  ) : null}
                  <p className="font-mono text-sm text-muted-foreground mt-1">
                    {config.venue_address || '6000 J St, Sacramento, CA 95819'}
                  </p>
                </div>
              </div>

              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-xs text-primary/70 hover:text-primary transition-colors tracking-widest uppercase mt-2"
              >
                <Navigation className="w-3 h-3" />
                Get Directions
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative crop-marks"
          >
            <div className="glass rounded-lg overflow-hidden aspect-video md:aspect-auto md:h-full">
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '320px', filter: 'saturate(0.3) brightness(0.7) contrast(1.2)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Event Location"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
