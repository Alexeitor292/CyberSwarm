import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin, Calendar, Clock, Navigation } from 'lucide-react';
import { useSiteContent } from '@/hooks/use-site-content';
import { format } from 'date-fns';
import {
  DEFAULT_DIRECTIONS_URL,
  DEFAULT_DIRECTIONS_DESTINATION,
  DEFAULT_MAP_EMBED_URL,
  DEFAULT_PLACE_URL,
  DEFAULT_VENUE_ADDRESS,
  DEFAULT_VENUE_NAME,
  buildGoogleMapsDirectionsUrl,
  buildDirectionsUrlFromEmbedUrl,
  buildPlaceUrlFromEmbedUrl,
  directionsUrlHasPlaceId,
  normalizeGoogleMapsDirectionsUrl,
  normalizeGoogleMapsEmbedUrl,
  normalizeGoogleMapsPlaceId,
  normalizeGoogleMapsPlaceUrl,
} from '@/lib/google-maps';

export default function EventInfo() {
  const { data } = useSiteContent();
  const prefersReducedMotion = useReducedMotion();
  const config = data?.eventConfig || {};
  const venueNameLine1 = String(config.venue_name_line_1 || config.venue_name || DEFAULT_VENUE_NAME).trim();
  const venueNameLine2 = String(config.venue_name_line_2 || '').trim();
  const venueAddress = String(config.venue_address || DEFAULT_VENUE_ADDRESS).trim();
  const venueQuery =
    [venueNameLine1, venueNameLine2, venueAddress].filter(Boolean).join(', ') || DEFAULT_DIRECTIONS_DESTINATION;
  const mapEmbedUrl = normalizeGoogleMapsEmbedUrl(config.google_maps_embed_url) || DEFAULT_MAP_EMBED_URL;
  const explicitPlaceId = normalizeGoogleMapsPlaceId(config.google_maps_place_id);
  const explicitPlaceUrl = normalizeGoogleMapsPlaceUrl(config.google_maps_place_url);
  const explicitDirectionsUrl = normalizeGoogleMapsDirectionsUrl(config.google_maps_directions_url);
  const derivedPlaceUrl =
    buildPlaceUrlFromEmbedUrl(mapEmbedUrl, venueAddress, venueQuery, explicitPlaceId) || DEFAULT_PLACE_URL;
  const derivedDirectionsUrl =
    buildDirectionsUrlFromEmbedUrl(mapEmbedUrl, venueAddress, venueQuery, explicitPlaceId) || DEFAULT_DIRECTIONS_URL;
  const mapLink = (() => {
    if (explicitPlaceId) {
      return {
        href: buildGoogleMapsDirectionsUrl(venueQuery, explicitPlaceId) || derivedDirectionsUrl,
        label: 'Get Directions',
      };
    }

    if (explicitDirectionsUrl && directionsUrlHasPlaceId(explicitDirectionsUrl)) {
      return {
        href: explicitDirectionsUrl,
        label: 'Get Directions',
      };
    }

    if (explicitPlaceUrl) {
      return {
        href: explicitPlaceUrl,
        label: 'Open in Google Maps',
      };
    }

    if (derivedPlaceUrl) {
      return {
        href: derivedPlaceUrl,
        label: 'Open in Google Maps',
      };
    }

    if (explicitDirectionsUrl) {
      return {
        href: explicitDirectionsUrl,
        label: 'Get Directions',
      };
    }

    return {
      href: derivedDirectionsUrl,
      label: 'Get Directions',
    };
  })();
  const eventDate = config.event_date ? new Date(`${config.event_date}T12:00:00`) : new Date('2026-04-15T12:00:00');
  const eventDateLabel = Number.isNaN(eventDate.getTime())
    ? 'April 15, 2026'
    : format(eventDate, 'MMMM d, yyyy');
  const eventDateIso = Number.isNaN(eventDate.getTime()) ? '2026-04-15' : eventDate.toISOString();
  const venueTitle = [venueNameLine1, venueNameLine2].filter(Boolean).join(', ');

  return (
    <section
      id="info"
      tabIndex={-1}
      className="relative z-10 py-24 px-6 scroll-mt-24"
      aria-labelledby="event-info-heading"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-primary/85 uppercase mb-3">// Location</p>
          <h2 id="event-info-heading" className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            Event Intel
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6 }}
            className="space-y-4"
          >
            <div className="glass rounded-lg p-6 space-y-6" id="event-location-details">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded border border-primary/50 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Date</p>
                  <time dateTime={eventDateIso} className="font-heading text-lg font-semibold text-foreground">
                    {eventDateLabel}
                  </time>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded border border-primary/50 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Time</p>
                  <p className="font-heading text-lg font-semibold text-foreground">
                    {config.event_time || '9:00 AM - 5:00 PM PST'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded border border-primary/50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Venue</p>
                  <p className="font-heading text-lg font-semibold text-foreground">{venueNameLine1}</p>
                  {venueNameLine2 ? (
                    <p className="font-heading text-base font-medium text-foreground">{venueNameLine2}</p>
                  ) : null}
                  <p className="font-mono text-sm text-muted-foreground mt-1">
                    {venueAddress}
                  </p>
                </div>
              </div>

              <a
                href={mapLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-xs text-primary underline underline-offset-4 hover:text-foreground transition-colors tracking-widest uppercase mt-2"
              >
                <Navigation className="w-3 h-3" aria-hidden="true" />
                {mapLink.label}
                <span className="sr-only">, opens in a new tab</span>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2, duration: 0.6 }}
            className="relative crop-marks"
          >
            <div className="glass rounded-lg overflow-hidden aspect-video md:aspect-auto md:h-full">
              <p id="event-map-note" className="sr-only">
                Interactive map for {venueTitle || DEFAULT_VENUE_NAME}. Use the Google Maps link if the embedded
                map is difficult to use.
              </p>
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '320px', filter: 'saturate(0.3) brightness(0.7) contrast(1.2)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map for ${venueTitle || DEFAULT_VENUE_NAME}`}
                aria-describedby="event-location-details event-map-note"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
