import React from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Mic2, Users, Coffee, Wrench, Radio } from 'lucide-react';

const typeIcons = {
  keynote: Mic2,
  panel: Users,
  networking: Users,
  workshop: Wrench,
  break: Coffee,
};

const typeLabels = {
  keynote: 'KEYNOTE',
  panel: 'PANEL',
  networking: 'NETWORKING',
  workshop: 'WORKSHOP',
  break: 'BREAK',
};

export default function AgendaTimeline() {
  const { data: items = [] } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => appClient.entities.AgendaItem.list('order', 50),
  });

  const activeItems = items.filter((item) => item.active !== false);

  return (
    <section id="agenda" className="relative z-10 py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-primary/50 uppercase mb-3">// Schedule</p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground">The Agenda</h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-0 md:left-24 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />

          <div className="space-y-1">
            {activeItems.map((item, i) => {
              const Icon = typeIcons[item.session_type] || Radio;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.05, duration: 0.6 }}
                  className="group relative flex gap-6 md:gap-10 pl-6 md:pl-0"
                >
                  <div className="hidden md:block w-20 text-right shrink-0 pt-5">
                    <span className="font-mono text-xs text-muted-foreground/80">{item.start_time}</span>
                  </div>

                  <div className="absolute left-0 md:left-24 top-5 -translate-x-1/2">
                    <div className="w-2 h-2 bg-primary/40 rotate-45 group-hover:bg-primary group-hover:scale-150 transition-all duration-300" />
                  </div>

                  <div className="flex-1 pb-8 pl-4 md:pl-8">
                    <div className="glass rounded-lg p-5 group-hover:border-primary/30 transition-all duration-500 box-glow-cyan group-hover:box-glow-cyan">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-3.5 h-3.5 text-primary/60" />
                            <span className="font-mono text-xs text-primary/50 uppercase tracking-widest">
                              {item.session_label || typeLabels[item.session_type] || item.session_type}
                            </span>
                          </div>
                          <h3 className="font-heading text-lg font-semibold text-foreground mb-1">{item.title}</h3>
                          {item.speaker && (
                            <p className="font-mono text-sm text-muted-foreground">
                              {item.speaker}
                              {item.company && <span className="text-primary/40"> - {item.company}</span>}
                            </p>
                          )}
                          {item.description && (
                            <p className="font-mono text-xs text-muted-foreground/80 mt-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 md:hidden">
                          <span className="font-mono text-xs text-muted-foreground/65">
                            {item.start_time} - {item.end_time}
                          </span>
                        </div>
                        <div className="hidden md:block shrink-0">
                          <span className="font-mono text-xs text-muted-foreground/65">{item.end_time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {activeItems.length === 0 && (
            <div className="pl-10 md:pl-40">
              <div className="glass rounded-lg p-8 text-center">
                <p className="font-mono text-sm text-muted-foreground/70">[ AGENDA LOADING... CHECK BACK SOON ]</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
