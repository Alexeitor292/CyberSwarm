export const DEFAULT_VENUE_NAME = 'Sacramento State University';
export const DEFAULT_VENUE_ADDRESS = '6000 J St, Sacramento, CA 95819';
export const DEFAULT_MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3119.4!2d-121.4244!3d38.5616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x809ad0a3c3b1b8e7%3A0x1b0e3a3f2b0b0b0b!2sCalifornia%20State%20University%2C%20Sacramento!5e0!3m2!1sen!2sus!4v1700000000000';

export const normalizeGoogleMapsEmbedUrl = (value) => {
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

const decodeMapToken = (value) => {
  const next = String(value || '').trim();
  if (!next) return '';

  try {
    return decodeURIComponent(next.replace(/\+/g, ' ')).trim();
  } catch (_error) {
    return next;
  }
};

export const extractDirectionsDestinationFromEmbedUrl = (value, venueAddress) => {
  const normalizedUrl = normalizeGoogleMapsEmbedUrl(value);
  if (!normalizedUrl) return '';

  try {
    const url = new URL(normalizedUrl);
    const directQuery = String(url.searchParams.get('q') || '').trim();
    if (directQuery) return directQuery;

    const pb = String(url.searchParams.get('pb') || '');
    if (!pb) return '';

    const latMatches = Array.from(pb.matchAll(/!3d(-?\d+(?:\.\d+)?)/g));
    const lngMatches = Array.from(pb.matchAll(/!2d(-?\d+(?:\.\d+)?)/g));
    const lat = latMatches.at(-1)?.[1];
    const lng = lngMatches.at(-1)?.[1];
    if (lat && lng) return `${lat},${lng}`;

    const placeName = decodeMapToken(pb.match(/!2s([^!]+)/)?.[1]);
    if (placeName) {
      return [placeName, String(venueAddress || '').trim()].filter(Boolean).join(', ');
    }
  } catch (_error) {
    return '';
  }

  return '';
};
