import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
    { label: 'DAYS', value: countdown.days },
    { label: 'HRS', value: countdown.hours },
    { label: 'MIN', value: countdown.mins },
    { label: 'SEC', value: countdown.secs },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-5xl"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="font-mono text-xs tracking-[0.3em] text-primary/60 mb-6 uppercase"
        >
          {hero.pretitle || 'Sacramento State University Presents'}
        </motion.p>

        <h1 className="font-heading font-bold leading-none mb-4">
          <motion.span
            className="block text-6xl sm:text-8xl md:text-9xl text-transparent"
            style={{ WebkitTextStroke: '1px hsl(var(--primary) / 0.6)' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            {hero.title_line_1 || 'CYBER'}
          </motion.span>
          <motion.span
            className="block text-6xl sm:text-8xl md:text-9xl glow-cyan text-primary"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 1 }}
          >
            {hero.title_line_2 || 'SWARM'}
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="font-mono text-sm md:text-base text-muted-foreground max-w-xl mx-auto mt-6 leading-relaxed"
        >
          {hero.subtitle ||
            'Cybersecurity Panel & Networking Event - Where collective defense meets collective intelligence.'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="flex justify-center gap-6 md:gap-10 mt-12"
        >
          {countdownItems.map((item) => (
            <div key={item.label} className="text-center">
              <div className="font-heading text-3xl md:text-5xl font-bold text-foreground tabular-nums">
                {String(item.value).padStart(2, '0')}
              </div>
              <div className="font-mono text-xs text-primary/50 tracking-widest mt-1">{item.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="mt-14"
        >
          <a
            href="#register"
            className="inline-flex items-center gap-2 px-8 py-3 border border-primary/40 text-primary font-mono text-sm tracking-widest uppercase hover:bg-primary/10 transition-all duration-300 hover:border-primary/80"
          >
            {hero.cta_label || 'Join the Swarm'}
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="w-5 h-5 text-primary/30" />
      </motion.div>
    </section>
  );
}
