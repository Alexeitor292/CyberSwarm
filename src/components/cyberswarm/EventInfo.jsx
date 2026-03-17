import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, Navigation } from 'lucide-react';
import { useSiteContent } from '@/hooks/use-site-content';
import { format } from 'date-fns';

const DEFAULT_VENUE_NAME = 'Sacramento State University';
const DEFAULT_VENUE_ADDRESS = '6000 J St, Sacramento, CA 95819';
const DEFAULT_MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3119.4!2d-121.4244!3d38.5616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x809ad0a3c3b1b8e7%3A0x1b0e3a3f2b0b0b0b!2sCalifornia%20State%20University%2C%20Sacramento!5e0!3m2!1sen!2sus!4v1700000000000';

const toFiniteNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toMapDisplayMode = (value) => (value === 'iframe' ? 'iframe' : 'pin');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeEmbedUrl = (value) => {
  const next = String(value || '').trim();
  if (!next) return '';

  try {
    const iframeSrcMatch = next.match(/src=(['"])(.*?)\1/i);
    const candidate = iframeSrcMatch?.[2] || next;
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const isGoogleHost =
      host === 'google.com' ||
      host === 'www.google.com' ||
      host === 'maps.google.com';

    if (!isGoogleHost) return url.toString();

    return url.pathname.toLowerCase().includes('/maps/embed') ? url.toString() : '';
  } catch (_error) {
    return '';
  }
};

const buildGoogleMapsPinEmbedUrl = ({
  apiKey,
  hasPin,
  pinLat,
  pinLng,
  pinZoom,
  venueName,
  venueAddress,
}) => {
  if (apiKey) {
    const query = hasPin
      ? `${pinLat},${pinLng}`
      : [venueName, venueAddress].filter(Boolean).join(', ');
    const url = new URL('https://www.google.com/maps/embed/v1/place');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', query || `${DEFAULT_VENUE_NAME}, ${DEFAULT_VENUE_ADDRESS}`);

    if (hasPin) {
      url.searchParams.set('zoom', String(Math.min(20, Math.max(3, Math.round(pinZoom)))));
    }

    return url.toString();
  }

  return '';
};

const buildOpenStreetMapEmbedUrl = ({ hasPin, pinLat, pinLng, pinZoom }) => {
  if (!hasPin) return '';

  const lat = clamp(pinLat, -85, 85);
  const lng = clamp(pinLng, -180, 180);
  const zoom = clamp(Math.round(pinZoom || 15), 3, 20);
  const latDelta = Math.max(0.0025, 180 / Math.pow(2, zoom + 1));
  const lngDelta = Math.max(0.0025, 360 / Math.pow(2, zoom + 1));

  const url = new URL('https://www.openstreetmap.org/export/embed.html');
  url.searchParams.set(
    'bbox',
    [
      clamp(lng - lngDelta, -180, 180),
      clamp(lat - latDelta, -85, 85),
      clamp(lng + lngDelta, -180, 180),
      clamp(lat + latDelta, -85, 85),
    ].join(',')
  );
  url.searchParams.set('layer', 'mapnik');
  url.searchParams.set('marker', `${lat},${lng}`);
  return url.toString();
};

const resolveMapEmbedUrl = ({
  mode,
  apiKey,
  fallbackEmbedUrl,
  hasPin,
  pinLat,
  pinLng,
  pinZoom,
  venueName,
  venueAddress,
}) => {
  const normalizedFallbackUrl = normalizeEmbedUrl(fallbackEmbedUrl);

  if (mode === 'iframe') {
    return normalizedFallbackUrl || DEFAULT_MAP_EMBED_URL;
  }

  return (
    buildGoogleMapsPinEmbedUrl({
      apiKey,
      hasPin,
      pinLat,
      pinLng,
      pinZoom,
      venueName,
      venueAddress,
    }) ||
    buildOpenStreetMapEmbedUrl({ hasPin, pinLat, pinLng, pinZoom }) ||
    normalizedFallbackUrl ||
    DEFAULT_MAP_EMBED_URL
  );
};

export default function EventInfo() {
  const { data } = useSiteContent();
  const config = data?.eventConfig || {};
  const googleMapsEmbedApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY || '').trim();
  const venueNameLine1 = String(config.venue_name_line_1 || config.venue_name || DEFAULT_VENUE_NAME).trim();
  const venueNameLine2 = String(config.venue_name_line_2 || '').trim();
  const pinLat = toFiniteNumber(config.pin_latitude);
  const pinLng = toFiniteNumber(config.pin_longitude);
  const pinZoom = toFiniteNumber(config.pin_zoom, 15);
  const mapDisplayMode = toMapDisplayMode(config.map_display_mode);
  const hasPin = pinLat !== null && pinLng !== null;
  const pinQuery = hasPin ? `${pinLat},${pinLng}` : '';
  const directionsDestination = mapDisplayMode === 'pin' && hasPin
    ? pinQuery
    : config.venue_address || DEFAULT_VENUE_ADDRESS;
  const mapEmbedUrl = resolveMapEmbedUrl({
    mode: mapDisplayMode,
    apiKey: googleMapsEmbedApiKey,
    fallbackEmbedUrl: config.google_maps_embed_url,
    hasPin,
    pinLat,
    pinLng,
    pinZoom,
    venueName: [venueNameLine1, venueNameLine2].filter(Boolean).join(', '),
    venueAddress: config.venue_address || DEFAULT_VENUE_ADDRESS,
  });
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
                    {config.venue_address || DEFAULT_VENUE_ADDRESS}
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
