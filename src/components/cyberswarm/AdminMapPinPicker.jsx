import React, { useEffect, useRef, useState } from 'react';

const toFiniteNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const LEAFLET_JS_SRC = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_SRC = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_SCRIPT_ID = 'cyberswarm-leaflet-js';
const LEAFLET_STYLE_ID = 'cyberswarm-leaflet-css';

let leafletPromise = null;

const isLeafletReady = () =>
  typeof window !== 'undefined' &&
  typeof window['L']?.map === 'function' &&
  typeof window['L']?.marker === 'function';

const loadLeaflet = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Map picker is only available in a browser.'));
  }

  if (isLeafletReady()) return Promise.resolve(window['L']);

  if (leafletPromise) {
    return leafletPromise;
  }

  leafletPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (isLeafletReady()) {
        resolve(window['L']);
      } else {
        reject(new Error('Leaflet loaded, but map constructor is unavailable.'));
      }
    };

    const fail = () => reject(new Error('Failed to load Leaflet map assets.'));

    if (!document.getElementById(LEAFLET_STYLE_ID)) {
      const style = document.createElement('link');
      style.id = LEAFLET_STYLE_ID;
      style.rel = 'stylesheet';
      style.href = LEAFLET_CSS_SRC;
      document.head.appendChild(style);
    }

    const existingScript = document.getElementById(LEAFLET_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', finish, { once: true });
      existingScript.addEventListener('error', fail, { once: true });
      setTimeout(finish, 0);
      return;
    }

    const script = document.createElement('script');
    script.id = LEAFLET_SCRIPT_ID;
    script.src = LEAFLET_JS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error) => {
    leafletPromise = null;
    throw error;
  });

  return leafletPromise;
};

export default function AdminMapPinPicker({
  latitude,
  longitude,
  zoom,
  onPinChange,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const clickHandlerRef = useRef(null);
  const dragHandlerRef = useRef(null);
  const onPinChangeRef = useRef(onPinChange);
  const [status, setStatus] = useState('');

  const lat = toFiniteNumber(latitude, 38.5616);
  const lng = toFiniteNumber(longitude, -121.4244);
  const mapZoom = Math.min(20, Math.max(3, Math.round(toFiniteNumber(zoom, 15))));

  useEffect(() => {
    onPinChangeRef.current = onPinChange;
  }, [onPinChange]);

  useEffect(() => {
    let cancelled = false;
    setStatus('Loading map...');

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, {
            zoomControl: true,
          });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 20,
          }).addTo(mapRef.current);
          mapRef.current.setView([lat, lng], mapZoom);
        }

        if (!markerRef.current) {
          markerRef.current = L.marker([lat, lng], {
            draggable: true,
          }).addTo(mapRef.current);
        }

        if (clickHandlerRef.current) {
          mapRef.current.off('click', clickHandlerRef.current);
        }
        if (dragHandlerRef.current) {
          markerRef.current.off('dragend', dragHandlerRef.current);
        }

        clickHandlerRef.current = (event) => {
          const nextLat = event?.latlng?.lat;
          const nextLng = event?.latlng?.lng;
          if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
          markerRef.current.setLatLng([nextLat, nextLng]);
          onPinChangeRef.current(nextLat, nextLng);
        };
        mapRef.current.on('click', clickHandlerRef.current);

        dragHandlerRef.current = (event) => {
          const nextLat = event?.target?.getLatLng?.()?.lat;
          const nextLng = event?.target?.getLatLng?.()?.lng;
          if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
          onPinChangeRef.current(nextLat, nextLng);
        };
        markerRef.current.on('dragend', dragHandlerRef.current);

        setStatus('');
      })
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : 'Could not load map.');
      });

    return () => {
      cancelled = true;
      if (mapRef.current && clickHandlerRef.current) {
        mapRef.current.off('click', clickHandlerRef.current);
      }
      if (markerRef.current && dragHandlerRef.current) {
        markerRef.current.off('dragend', dragHandlerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    mapRef.current.setView([lat, lng], mapZoom);
    markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng, mapZoom]);

  return (
    <div className="space-y-3">
      <p className="font-mono text-xs text-muted-foreground/75">
        Click on the map to drop a pin, or drag the pin to refine the exact location. Powered by OpenStreetMap.
      </p>
      <div className="border border-primary/20 rounded overflow-hidden">
        <div
          ref={containerRef}
          className="h-72 w-full"
          style={{ background: '#060a13' }}
        />
      </div>
      {status ? <p className="font-mono text-xs text-accent/90">{status}</p> : null}
      <p className="font-mono text-xs text-muted-foreground/70">
        Current pin: {lat.toFixed(6)}, {lng.toFixed(6)}
      </p>
    </div>
  );
}
