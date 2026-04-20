import React from 'react';

export const clampSponsorLogoScale = (value) => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return 110;
  return Math.min(400, Math.max(60, Math.round(scale)));
};

export const clampSponsorLogoOffset = (value) => {
  const offset = Number(value);
  if (!Number.isFinite(offset)) return 0;
  return Math.min(100, Math.max(-100, Math.round(offset)));
};

/**
 * @param {'transparent' | 'soft' | 'light' | 'dark' | 'color' | string | undefined} value
 * @returns {'transparent' | 'soft' | 'light' | 'dark' | 'color'}
 */
export const getSponsorLogoBackgroundMode = (value) => {
  if (value === 'soft' || value === 'light' || value === 'dark' || value === 'color') {
    return value;
  }
  return 'transparent';
};

/**
 * @param {'transparent' | 'soft' | 'light' | 'dark' | 'color'} mode
 * @returns {string}
 */
export const getSponsorLogoFrameClasses = (mode) => {
  if (mode === 'light') {
    return 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,247,250,0.9))] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]';
  }

  if (mode === 'dark') {
    return 'border border-primary/15 bg-[linear-gradient(180deg,rgba(5,14,24,0.92),rgba(10,23,35,0.82))] shadow-[inset_0_1px_0_rgba(61,227,255,0.1)]';
  }

  if (mode === 'soft') {
    return 'border border-primary/12 bg-[radial-gradient(circle_at_top,rgba(61,227,255,0.12),rgba(255,255,255,0.03)_55%,rgba(255,255,255,0)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
  }

  if (mode === 'color') {
    return 'border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]';
  }

  return 'border border-primary/8 bg-transparent';
};

/**
 * @param {'transparent' | 'soft' | 'light' | 'dark' | 'color'} mode
 * @returns {string}
 */
export const getSponsorLogoImageClasses = (mode) => {
  if (mode === 'transparent') {
    return 'max-h-full max-w-full object-contain drop-shadow-[0_14px_24px_rgba(0,240,255,0.14)]';
  }

  if (mode === 'dark') {
    return 'max-h-full max-w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.32)]';
  }

  return 'max-h-full max-w-full object-contain drop-shadow-[0_12px_20px_rgba(15,23,42,0.18)]';
};

const normalizeLogoBackgroundColor = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const shortHexMatch = normalized.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }
  return '#ffffff';
};

/**
 * @param {{
 *   logoUrl?: string | undefined,
 *   logoAlt?: string | undefined,
 *   logoBackground?: 'transparent' | 'soft' | 'light' | 'dark' | 'color' | string | undefined,
 *   logoBackgroundColor?: string | undefined,
 *   aspectRatio?: string | undefined,
 *   logoScale?: number | undefined,
 *   logoOffsetX?: number | undefined,
 *   logoOffsetY?: number | undefined,
 *   containerClassName?: string | undefined,
 *   fallback?: React.ReactNode,
 *   onPointerDown?: ((event: React.PointerEvent<HTMLDivElement>) => void) | undefined,
 *   onPointerMove?: ((event: React.PointerEvent<HTMLDivElement>) => void) | undefined,
 *   onPointerUp?: ((event: React.PointerEvent<HTMLDivElement>) => void) | undefined,
 *   onPointerCancel?: ((event: React.PointerEvent<HTMLDivElement>) => void) | undefined,
 *   onWheel?: ((event: React.WheelEvent<HTMLDivElement>) => void) | undefined,
 * }} props
 */
export default function SponsorLogoViewport({
  logoUrl = '',
  logoAlt = 'Sponsor logo',
  logoBackground = 'transparent',
  logoBackgroundColor = '#ffffff',
  aspectRatio = '16 / 10',
  logoScale = 110,
  logoOffsetX = 0,
  logoOffsetY = 0,
  containerClassName = '',
  fallback = null,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onWheel,
}) {
  const backgroundMode = getSponsorLogoBackgroundMode(logoBackground);
  const scale = clampSponsorLogoScale(logoScale);
  const offsetX = clampSponsorLogoOffset(logoOffsetX);
  const offsetY = clampSponsorLogoOffset(logoOffsetY);
  const source = String(logoUrl || '').trim();
  const frameAspectRatio = String(aspectRatio || '').trim() || '16 / 10';
  const customBackgroundColor = normalizeLogoBackgroundColor(logoBackgroundColor);
  const frameStyle = {
    aspectRatio: frameAspectRatio,
    ...(backgroundMode === 'color' ? { backgroundColor: customBackgroundColor } : {}),
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[1.35rem] ${getSponsorLogoFrameClasses(backgroundMode)} ${containerClassName}`.trim()}
      style={frameStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={onWheel}
    >
      {source ? (
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          <img
            src={source}
            alt={logoAlt}
            className={getSponsorLogoImageClasses(backgroundMode)}
            style={{
              transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale / 100})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          {fallback}
        </div>
      )}
    </div>
  );
}
