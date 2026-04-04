export const DEFAULT_VENUE_NAME = 'The WELL';
export const DEFAULT_VENUE_ADDRESS = '6000 J St, Sacramento, CA 95819';
export const DEFAULT_DIRECTIONS_DESTINATION =
  'The WELL, Sacramento State, 6000 J St, Sacramento, CA 95819';
export const buildGoogleMapsDirectionsUrl = (destination) => {
  const next = String(destination || '').trim();
  if (!next) return '';

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(next)}`;
};
export const DEFAULT_DIRECTIONS_URL = buildGoogleMapsDirectionsUrl(DEFAULT_DIRECTIONS_DESTINATION);
export const DEFAULT_MAP_EMBED_URL =
  'https://www.google.com/maps?q=The+WELL+Sacramento+State+6000+J+St+Sacramento+CA+95819&output=embed';
export const LEGACY_DEFAULT_MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3119.4!2d-121.4244!3d38.5616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x809ad0a3c3b1b8e7%3A0x1b0e3a3f2b0b0b0b!2sCalifornia%20State%20University%2C%20Sacramento!5e0!3m2!1sen!2sus!4v1700000000000';
export const LEGACY_DEFAULT_DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=38.5616%2C-121.4244';

const extractAttributeUrl = (value, attributeName) => {
  const next = String(value || '').trim();
  if (!next) return '';

  const attributePattern = new RegExp(`${attributeName}=(['"])(.*?)\\1`, 'i');
  return next.match(attributePattern)?.[2] || next;
};

const parseAbsoluteUrl = (value, attributeName) => {
  const candidate = extractAttributeUrl(value, attributeName);
  if (!candidate) return null;

  try {
    return new URL(candidate);
  } catch (_error) {
    return null;
  }
};

export const normalizeGoogleMapsEmbedUrl = (value) => {
  const url = parseAbsoluteUrl(value, 'src');
  if (!url) return '';

  try {
    const host = url.hostname.toLowerCase();
    const isGoogleHost =
      host === 'google.com' ||
      host === 'www.google.com' ||
      host === 'maps.google.com';

    if (!isGoogleHost) return url.toString();

    const pathname = url.pathname.toLowerCase();
    const output = String(url.searchParams.get('output') || '').toLowerCase();

    if (pathname.includes('/maps/embed') || output === 'embed') {
      return url.toString();
    }

    return '';
  } catch (_error) {
    return '';
  }
};

export const normalizeGoogleMapsDirectionsUrl = (value) => {
  const url = parseAbsoluteUrl(value, 'href');
  return url ? url.toString() : '';
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

export const buildDirectionsUrlFromEmbedUrl = (
  value,
  venueAddress,
  fallbackDestination = DEFAULT_DIRECTIONS_DESTINATION
) => {
  const destination =
    extractDirectionsDestinationFromEmbedUrl(value, venueAddress) ||
    String(fallbackDestination || '').trim();

  return buildGoogleMapsDirectionsUrl(destination);
};
