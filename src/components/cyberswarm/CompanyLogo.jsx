import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSiteContent } from '@/hooks/use-site-content';

export default function CompanyLogos() {
  const { data } = useSiteContent();
  const prefersReducedMotion = useReducedMotion();
  const organizationsSection = data?.organizationsSection || {};
  const organizations =
    data?.organizations
      ?.filter((item) => item.active !== false && item.name)
      ?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

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
          {organizationsSection.heading || 'Participating Organizations'}
        </h2>
        <ul
          role="list"
          className="flex flex-wrap justify-center items-center gap-8 md:gap-14"
        >
          {organizations.map((company, i) => (
            <motion.li
              key={company.id || `${company.name}-${i}`}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              whileInView={prefersReducedMotion ? {} : { opacity: 1 }}
              viewport={{ once: true }}
              transition={
                prefersReducedMotion ? { duration: 0 } : { delay: i * 0.08, duration: 0.5 }
              }
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              className="group cursor-default"
            >
              <span className="font-heading text-lg md:text-xl font-semibold text-foreground/90 group-hover:text-primary transition-colors duration-500 tracking-wide">
                {company.name}
              </span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-16 flex items-center gap-4 max-w-md mx-auto" aria-hidden="true">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/20" />
          <div className="w-1 h-1 bg-primary/40 rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/20" />
        </div>
      </div>
    </section>
  );
}
