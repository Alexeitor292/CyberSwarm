import React from 'react';
import { useSiteContent } from '@/hooks/use-site-content';

export default function Footer() {
  const { data } = useSiteContent();
  const footer = data?.footer || {};

  const copyrightTemplate = footer.copyright_template || '(c) {year} Sac State CyberSwarm. All rights reserved.';
  const copyrightText = copyrightTemplate.replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="relative z-10 pb-16 pt-8 px-6 border-t border-primary/5" aria-label="Site footer">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-primary/30 rotate-45" aria-hidden="true" />
          <span className="font-heading text-sm font-semibold text-foreground/90">
            {footer.brand_name || 'CyberSwarm'}
          </span>
        </div>
        <p className="font-mono text-xs text-muted-foreground text-center">{copyrightText}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {footer.organization_text || 'Sacramento State University'}
        </p>
      </div>
    </footer>
  );
}
