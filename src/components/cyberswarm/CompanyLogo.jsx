import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSiteContent } from '@/hooks/use-site-content';

/**
 * @param {{ content?: import('@/data/siteData').DEFAULT_SITE_CONTENT | undefined, editor?: any }} props
 */
export default function CompanyLogos({ content, editor } = {}) {
  const { data: siteData } = useSiteContent();
  const data = content || siteData;
  const prefersReducedMotion = useReducedMotion();
  const organizationsSection = data?.organizationsSection || {};
  const hideOrganizationsSection = organizationsSection.hide_organizations_section === true;
  const organizations =
    data?.organizations
      ?.map((item, index) => ({ ...item, __index: index }))
      ?.filter((item) => item.active !== false && item.name)
      ?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  if (hideOrganizationsSection) return null;

  return (
    <section
      className="relative z-10 py-16 px-6"
      aria-labelledby="organizations-heading"
    >
      <div className="max-w-6xl mx-auto">
        <h2
          id="organizations-heading"
          className="font-mono text-xs text-center tracking-[0.3em] text-muted-foreground uppercase mb-10"
        >
          {editor?.text
            ? editor.text({
                value: organizationsSection.heading,
                fallback: 'Participating Organizations',
                onChange: (value) => editor.setField('organizationsSection', 'heading', value),
                ariaLabel: 'Organizations heading',
              })
            : organizationsSection.heading || 'Participating Organizations'}
        </h2>
        <ul className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
          {organizations.map((company, i) => (
            <motion.li
              key={company.id || `${company.name}-${i}`}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              whileInView={prefersReducedMotion ? {} : { opacity: 1 }}
              viewport={{ once: true }}
              transition={
                prefersReducedMotion ? { duration: 0 } : { delay: i * 0.08, duration: 0.5 }
              }
            >
              <span className="font-heading text-lg md:text-xl font-semibold text-foreground tracking-wide">
                {editor?.text
                  ? editor.text({
                      value: company.name,
                      fallback: 'Organization',
                      onChange: (value) => editor.setListItemField('organizations', company.__index, 'name', value),
                      ariaLabel: `${company.name || 'Organization'} name`,
                    })
                  : company.name}
              </span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-16 flex items-center gap-4 max-w-md mx-auto" aria-hidden="true">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/35" />
          <div className="w-1 h-1 bg-primary/55 rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/35" />
        </div>
      </div>
    </section>
  );
}
