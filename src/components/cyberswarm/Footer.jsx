import React from 'react';
import { useSiteContent } from '@/hooks/use-site-content';

/**
 * @param {{ content?: import('@/data/siteData').DEFAULT_SITE_CONTENT | undefined, editor?: any }} props
 */
export default function Footer({ content, editor } = {}) {
  const { data: siteData } = useSiteContent();
  const data = content || siteData;
  const footer = data?.footer || {};

  const currentYear = String(new Date().getFullYear());
  const copyrightTemplate = footer.copyright_template || '(c) {year} Sac State CyberSwarm. All rights reserved.';
  const copyrightText = copyrightTemplate.replace('{year}', currentYear);
  const helpText = footer.accessibility_help_text || 'Need help accessing this site or registering?';
  const helpEmail = String(footer.accessibility_email || '').trim();
  const hasHelpContact = Boolean(helpEmail);

  return (
    <footer className="relative z-10 pb-16 pt-8 px-6 border-t border-primary/45" aria-label="Site footer">
      <div className="max-w-6xl mx-auto space-y-5">
        {hasHelpContact ? (
          <p className="font-mono text-sm text-foreground text-center">
            {editor?.text
              ? editor.text({
                  as: 'span',
                  value: helpText,
                  fallback: 'Need help accessing this site or registering?',
                  onChange: (value) => editor.setField('footer', 'accessibility_help_text', value),
                  multiline: true,
                  ariaLabel: 'Footer accessibility help text',
                })
              : helpText}
            {' '}
            <a
              href={`mailto:${helpEmail}`}
              className="text-primary underline underline-offset-4 hover:text-foreground transition-colors"
            >
              {editor?.text
                ? editor.text({
                    value: helpEmail,
                    fallback: 'accessibility@cyberswarmsac.com',
                    onChange: (value) => editor.setField('footer', 'accessibility_email', value),
                    ariaLabel: 'Footer accessibility email',
                  })
                : helpEmail}
            </a>
          </p>
        ) : null}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary/65 rotate-45" aria-hidden="true" />
            <span className="font-heading text-sm font-semibold text-foreground">
              {editor?.text
                ? editor.text({
                    value: footer.brand_name,
                    fallback: 'CyberSwarm',
                    onChange: (value) => editor.setField('footer', 'brand_name', value),
                    ariaLabel: 'Footer brand name',
                  })
                : footer.brand_name || 'CyberSwarm'}
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground text-center">
            {editor?.text
              ? editor.text({
                  as: 'span',
                  value: copyrightText,
                  fallback: '(c) 2026 Sac State CyberSwarm. All rights reserved.',
                  onChange: (value) =>
                    editor.setField('footer', 'copyright_template', value.replace(currentYear, '{year}')),
                  multiline: true,
                  ariaLabel: 'Footer copyright text',
                })
              : copyrightText}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {editor?.text
              ? editor.text({
                  as: 'span',
                  value: footer.organization_text,
                  fallback: 'Sacramento State University',
                  onChange: (value) => editor.setField('footer', 'organization_text', value),
                  ariaLabel: 'Footer organization text',
                })
              : footer.organization_text || 'Sacramento State University'}
          </p>
        </div>
      </div>
    </footer>
  );
}
