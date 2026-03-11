import React from 'react';
import { motion } from 'framer-motion';
import { useSiteContent } from '@/hooks/use-site-content';

export default function CompanyLogos() {
  const { data } = useSiteContent();
  const organizations =
    data?.organizations
      ?.filter((item) => item.active !== false && item.name)
      ?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  return (
    <section className="relative z-10 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="font-mono text-xs text-center tracking-[0.3em] text-muted-foreground/70 uppercase mb-10">
          Participating Organizations
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
          {organizations.map((company, i) => (
            <motion.div
              key={company.id || `${company.name}-${i}`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              className="group cursor-default"
            >
              <span className="font-heading text-lg md:text-xl font-semibold text-muted-foreground/55 group-hover:text-primary transition-colors duration-500 tracking-wide">
                {company.name}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="mt-16 flex items-center gap-4 max-w-md mx-auto">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/20" />
          <div className="w-1 h-1 bg-primary/40 rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/20" />
        </div>
      </div>
    </section>
  );
}
