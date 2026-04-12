import React from 'react';

/**
 * @param {{ preview?: boolean | undefined }} props
 */
export default function HUDOverlay({ preview = false } = {}) {
  return (
    <div className={`pointer-events-none ${preview ? 'absolute' : 'fixed'} inset-0 z-20 overflow-hidden`} aria-hidden="true">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent" />
      <div className="absolute top-4 left-4 w-12 h-12 border-l border-t border-primary/55" />
      <div className="absolute top-4 right-4 w-12 h-12 border-r border-t border-primary/55" />
      <div className="absolute bottom-12 left-4 w-12 h-12 border-l border-b border-primary/55" />
      <div className="absolute bottom-12 right-4 w-12 h-12 border-r border-b border-primary/55" />
    </div>
  );
}
