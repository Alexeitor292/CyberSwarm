import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Terminal, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useSiteContent } from '@/hooks/use-site-content';

export default function AdminUpdatesSection() {
  const { data } = useSiteContent();
  const prefersReducedMotion = useReducedMotion();
  const updates =
    data?.adminUpdates
      ?.filter((item) => item.active !== false && item.message)
      ?.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
      ?.slice(0, 10) || [];

  return (
    <section
      id="updates"
      tabIndex={-1}
      className="relative z-10 py-24 px-6 scroll-mt-24"
      aria-labelledby="updates-heading"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-primary/75 uppercase mb-3">
            // Broadcast
          </p>
          <h2 id="updates-heading" className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            Admin Updates
          </h2>
        </motion.div>

        {/* Terminal-style feed */}
        <div className="glass rounded-lg overflow-hidden scanline relative">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-primary/10 bg-background/40">
            <Terminal className="w-3.5 h-3.5 text-primary/70" aria-hidden="true" />
            <span className="font-mono text-xs text-muted-foreground">system_broadcast.log</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent/80 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              <span className="font-mono text-xs text-accent/90">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 max-h-96 overflow-y-auto">
            {updates.length > 0 ? (
              <ul role="list" aria-live="polite" aria-atomic="false" className="space-y-3">
                {updates.map((update, i) => (
                  <motion.li
                    key={update.id}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                    whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={
                      prefersReducedMotion ? { duration: 0 } : { delay: i * 0.05, duration: 0.3 }
                    }
                    className="flex items-start gap-3"
                  >
                    {update.priority === 'urgent' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-primary/75 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div className="flex-1 min-w-0">
                      <time
                        dateTime={update.created_date}
                        className="font-mono text-xs text-muted-foreground"
                      >
                        [{format(new Date(update.created_date), 'HH:mm')}]
                      </time>
                      <span className={`font-mono text-sm ml-2 ${
                        update.priority === 'urgent' ? 'text-accent-foreground glow-red' : 'text-foreground'
                      }`}>
                        {update.message}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <p className="font-mono text-sm text-muted-foreground">
                  {'>'} No active broadcasts. Standing by...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
