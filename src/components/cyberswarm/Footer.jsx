import React from 'react';
import { useSiteContent } from '@/hooks/use-site-content';

export default function Footer() {
  const { data } = useSiteContent();
  const footer = data?.footer || {};

  const copyrightTemplate = footer.copyright_template || '(c) {year} Sac State CyberSwarm. All rights reserved.';
  const copyrightText = copyrightTemplate.replace('{year}', String(new Date().getFullYear()));
  const helpText = footer.accessibility_help_text || 'Need help accessing this site or registering?';
  const helpEmail = String(footer.accessibility_email || '').trim();
  const hasHelpContact = Boolean(helpEmail);

  return (
    <footer className="relative z-10 pb-16 pt-8 px-6 border-t border-primary/45" aria-label="Site footer">
      <div className="max-w-6xl mx-auto space-y-5">
        {hasHelpContact ? (
          <p className="font-mono text-sm text-foreground text-center">
            {helpText}{' '}
            <a
              href={`mailto:${helpEmail}`}
              className="text-primary underline underline-offset-4 hover:text-foreground transition-colors"
            >
              {helpEmail}
            </a>
          </p>
        ) : null}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary/65 rotate-45" aria-hidden="true" />
            <span className="font-heading text-sm font-semibold text-foreground">
              {footer.brand_name || 'CyberSwarm'}
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground text-center">{copyrightText}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {footer.organization_text || 'Sacramento State University'}
          </p>
        </div>
      </div>
    </footer>
  );
}
