import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mic2, Users, Coffee, Wrench, Radio } from 'lucide-react';
import { useSiteContent } from '@/hooks/use-site-content';

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

/**
 * @param {{ content?: import('@/data/siteData').DEFAULT_SITE_CONTENT | undefined, editor?: any }} props
 */
export default function AgendaTimeline({ content, editor } = {}) {
  const { data: siteData } = useSiteContent();
  const data = content || siteData;
  const prefersReducedMotion = useReducedMotion();
  const items = data?.agendaItems || [];

  const activeItems = items
    .map((item, index) => ({ ...item, __index: index }))
    .filter((item) => item.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <section
      id="agenda"
      tabIndex={-1}
      className="relative z-10 py-24 px-6 scroll-mt-24"
      aria-labelledby="agenda-heading"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-mono text-xs tracking-[0.3em] text-primary/85 uppercase mb-3">// Schedule</p>
          <h2 id="agenda-heading" className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            The Agenda
          </h2>
        </motion.div>

        <div className="relative">
          <div
            className="absolute left-0 md:left-24 top-0 bottom-0 w-px bg-gradient-to-b from-primary/55 via-primary/25 to-transparent"
            aria-hidden="true"
          />

          <ol className="space-y-1">
            {activeItems.map((item, i) => {
              const Icon = typeIcons[item.session_type] || Radio;
              const timeRange = [item.start_time, item.end_time].filter(Boolean).join(' to ');
              const sessionLabel =
                item.session_label || typeLabels[item.session_type] || item.session_type;

              return (
                <motion.li
                  key={item.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                  whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={
                    prefersReducedMotion ? { duration: 0 } : { delay: i * 0.05, duration: 0.6 }
                  }
                  className="relative flex gap-6 md:gap-10 pl-6 md:pl-0"
                >
                  <div className="hidden md:block w-20 text-right shrink-0 pt-5" aria-hidden="true">
                    <span className="font-mono text-xs text-muted-foreground">
                      {editor?.text
                        ? editor.text({
                            value: item.start_time,
                            fallback: '09:00 AM',
                            onChange: (value) =>
                              editor.setListItemField('agendaItems', item.__index, 'start_time', value),
                            ariaLabel: `${item.title || 'Agenda item'} start time`,
                          })
                        : item.start_time}
                    </span>
                  </div>

                  <div className="absolute left-0 md:left-24 top-5 -translate-x-1/2" aria-hidden="true">
                    <div className="w-2 h-2 bg-primary/65 rotate-45" />
                  </div>

                  <div className="flex-1 pb-8 pl-4 md:pl-8">
                    <div className="glass rounded-lg p-5 box-glow-cyan">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          {timeRange ? <p className="sr-only">Time: {timeRange}</p> : null}
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-3.5 h-3.5 text-primary/85" aria-hidden="true" />
                            <span className="font-mono text-xs text-primary/85 uppercase tracking-widest">
                              {editor?.text
                                ? editor.text({
                                    value: item.session_label || sessionLabel,
                                    fallback: 'SESSION',
                                    onChange: (value) =>
                                      editor.setListItemField('agendaItems', item.__index, 'session_label', value),
                                    ariaLabel: `${item.title || 'Agenda item'} label`,
                                  })
                                : sessionLabel}
                            </span>
                          </div>
                          <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
                            {editor?.text
                              ? editor.text({
                                  value: item.title,
                                  fallback: 'Agenda Session',
                                  onChange: (value) =>
                                    editor.setListItemField('agendaItems', item.__index, 'title', value),
                                  multiline: true,
                                  ariaLabel: `${item.title || 'Agenda item'} title`,
                                })
                              : item.title}
                          </h3>
                          {item.speaker && (
                            <p className="font-mono text-sm text-muted-foreground">
                              {editor?.text
                                ? editor.text({
                                    value: item.speaker,
                                    fallback: 'Speaker',
                                    onChange: (value) =>
                                      editor.setListItemField('agendaItems', item.__index, 'speaker', value),
                                    ariaLabel: `${item.title || 'Agenda item'} speaker`,
                                  })
                                : item.speaker}
                              {item.company && (
                                <span className="text-primary/80">
                                  {' - '}
                                  {editor?.text
                                    ? editor.text({
                                        value: item.company,
                                        fallback: 'Company',
                                        onChange: (value) =>
                                          editor.setListItemField('agendaItems', item.__index, 'company', value),
                                        ariaLabel: `${item.title || 'Agenda item'} company`,
                                      })
                                    : item.company}
                                </span>
                              )}
                            </p>
                          )}
                          {item.description && (
                            <p className="font-mono text-sm text-muted-foreground mt-2 leading-relaxed">
                              {editor?.text
                                ? editor.text({
                                    as: 'span',
                                    value: item.description,
                                    fallback: 'Session description',
                                    onChange: (value) =>
                                      editor.setListItemField('agendaItems', item.__index, 'description', value),
                                    multiline: true,
                                    ariaLabel: `${item.title || 'Agenda item'} description`,
                                  })
                                : item.description}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 md:hidden" aria-hidden="true">
                          <span className="font-mono text-xs text-muted-foreground">
                            {editor?.text
                              ? editor.text({
                                  value: item.start_time,
                                  fallback: '09:00 AM',
                                  onChange: (value) =>
                                    editor.setListItemField('agendaItems', item.__index, 'start_time', value),
                                  ariaLabel: `${item.title || 'Agenda item'} mobile start time`,
                                })
                              : item.start_time}
                            {' - '}
                            {editor?.text
                              ? editor.text({
                                  value: item.end_time,
                                  fallback: '09:45 AM',
                                  onChange: (value) =>
                                    editor.setListItemField('agendaItems', item.__index, 'end_time', value),
                                  ariaLabel: `${item.title || 'Agenda item'} mobile end time`,
                                })
                              : item.end_time}
                          </span>
                        </div>
                        <div className="hidden md:block shrink-0" aria-hidden="true">
                          <span className="font-mono text-xs text-muted-foreground">
                            {editor?.text
                              ? editor.text({
                                  value: item.end_time,
                                  fallback: '09:45 AM',
                                  onChange: (value) =>
                                    editor.setListItemField('agendaItems', item.__index, 'end_time', value),
                                  ariaLabel: `${item.title || 'Agenda item'} end time`,
                                })
                              : item.end_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>

          {activeItems.length === 0 && (
            <div className="pl-10 md:pl-40">
              <div className="glass rounded-lg p-8 text-center">
                <p className="font-mono text-sm text-muted-foreground">[ AGENDA LOADING... CHECK BACK SOON ]</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
