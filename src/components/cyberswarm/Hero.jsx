import React, { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useSiteContent } from '@/hooks/use-site-content';

const parseTimeFromEventWindow = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const firstPart = raw.split('-')[0].trim();
  const match = firstPart.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  const hoursRaw = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = String(match[3] || '').toUpperCase();

  if (Number.isNaN(hoursRaw) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem === 'AM' || meridiem === 'PM') {
    if (hoursRaw < 1 || hoursRaw > 12) return null;
    let hours = hoursRaw % 12;
    if (meridiem === 'PM') hours += 12;
    return { hours, minutes };
  }

  if (hoursRaw < 0 || hoursRaw > 23) return null;
  return { hours: hoursRaw, minutes };
};

const resolveCountdownDate = (eventConfig, hero) => {
  const eventDate = String(eventConfig?.event_date || '').trim();
  if (eventDate) {
    const parsedTime = parseTimeFromEventWindow(eventConfig?.event_time) || { hours: 9, minutes: 0 };
    const hh = String(parsedTime.hours).padStart(2, '0');
    const mm = String(parsedTime.minutes).padStart(2, '0');
    const fromEventConfig = new Date(`${eventDate}T${hh}:${mm}:00`);
    if (!Number.isNaN(fromEventConfig.getTime())) return fromEventConfig;
  }

  const fallback = new Date(hero?.countdown_target || '2026-04-15T09:00:00');
  return Number.isNaN(fallback.getTime()) ? new Date('2026-04-15T09:00:00') : fallback;
};

export default function Hero() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const { data } = useSiteContent();
  const hero = data?.hero || {};
  const eventConfig = data?.eventConfig || {};
  const prefersReducedMotion = useReducedMotion();
  const handleJumpToAgenda = useCallback((event) => {
    event.preventDefault();

    const agendaSection = document.getElementById('agenda');
    if (!agendaSection) return;

    if (window.location.hash !== '#agenda') {
      window.history.replaceState(null, '', '#agenda');
    }

    agendaSection.focus({ preventScroll: true });
    agendaSection.scrollIntoView({ block: 'start' });
  }, []);
  const countdownTarget = resolveCountdownDate(eventConfig, hero);
  const countdownTargetLabel = countdownTarget.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  useEffect(() => {
    const eventDate = resolveCountdownDate(eventConfig, hero);

    const tick = () => {
      const now = new Date();
      const diff = eventDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [eventConfig.event_date, eventConfig.event_time, hero.countdown_target]);

  const countdownItems = [
    { label: 'Days', value: countdown.days },
    { label: 'Hours', value: countdown.hours },
    { label: 'Minutes', value: countdown.mins },
    { label: 'Seconds', value: countdown.secs },
  ];

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div
        className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative z-10 text-center max-w-5xl"
      >
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? {} : { opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.8 }}
          className="font-mono text-xs tracking-[0.3em] text-primary/85 mb-6 uppercase"
        >
          {hero.pretitle || 'Sacramento State University Presents'}
        </motion.p>

        <h1 id="hero-title" className="font-heading font-bold leading-none mb-4">
          <motion.span
            className="block text-6xl sm:text-8xl md:text-9xl text-foreground"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5, duration: 1 }}
          >
            {hero.title_line_1 || 'CYBER'}
          </motion.span>
          <motion.span
            className="block text-6xl sm:text-8xl md:text-9xl glow-cyan text-primary"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.7, duration: 1 }}
          >
            {hero.title_line_2 || 'SWARM'}
          </motion.span>
        </h1>

        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? {} : { opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 1.1, duration: 0.8 }}
          className="font-mono text-sm md:text-base text-muted-foreground max-w-xl mx-auto mt-6 leading-relaxed"
        >
          {hero.subtitle ||
            'Cybersecurity Panel & Networking Event - Where collective defense meets collective intelligence.'}
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 1.4, duration: 0.8 }}
          className="flex justify-center gap-6 md:gap-10 mt-12"
          aria-labelledby="countdown-heading"
        >
          <p id="countdown-heading" className="sr-only">
            Countdown to the event on {countdownTargetLabel}
          </p>
          <dl className="flex justify-center gap-6 md:gap-10">
            {countdownItems.map((item) => (
              <div key={item.label} className="text-center">
                <dd className="font-heading text-3xl md:text-5xl font-bold text-foreground tabular-nums">
                  {String(item.value).padStart(2, '0')}
                </dd>
                <dt className="font-mono text-xs text-primary/85 tracking-widest mt-1 uppercase">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? {} : { opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 1.8, duration: 0.8 }}
          className="mt-14"
        >
          <a
            href="#register"
            className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-background/35 px-8 py-3 text-primary font-mono text-sm tracking-widest uppercase transition-all duration-300 hover:border-primary/85 hover:bg-primary/12"
          >
            {hero.cta_label || 'Join the Swarm'}
          </a>
        </motion.div>
      </motion.div>

      <motion.a
        href="#agenda"
        onClick={handleJumpToAgenda}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
        animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: Infinity }}
        aria-label="Jump to the agenda section"
      >
        <ChevronDown className="w-5 h-5 text-primary/65" aria-hidden="true" />
      </motion.a>
    </section>
  );
}
