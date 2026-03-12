import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const tickerItemClassName =
  'font-mono text-xs font-semibold text-foreground/88 mx-7 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]';

export default function AdminTicker() {
  const { data: updates = [] } = useQuery({
    queryKey: ['admin-updates'],
    queryFn: () => appClient.entities.AdminUpdate.filter({ active: true }, '-created_date', 20),
    refetchInterval: 30000,
  });
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [segmentRepeatCount, setSegmentRepeatCount] = useState(2);
  const [animationDuration, setAnimationDuration] = useState(28);

  const tickerContent = useMemo(
    () =>
      updates.map((u) => {
        const time = new Date(u.created_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        return `[SYSTEM UPDATE ${time}]: ${u.message}`;
      }),
    [updates]
  );

  const contentKey = useMemo(() => tickerContent.join('||'), [tickerContent]);

  useEffect(() => {
    if (tickerContent.length === 0) return undefined;

    let frame = 0;

    const recalc = () => {
      if (!containerRef.current || !measureRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const singleCycleWidth = measureRef.current.scrollWidth;
      if (!containerWidth || !singleCycleWidth) return;

      // Ensure one loop cycle is wider than the viewport to avoid blank gaps.
      const nextRepeatCount = Math.max(2, Math.ceil((containerWidth + 80) / singleCycleWidth));
      const nextDuration = Math.max(24, (singleCycleWidth * nextRepeatCount) / 90);

      setSegmentRepeatCount((prev) => (prev === nextRepeatCount ? prev : nextRepeatCount));
      setAnimationDuration((prev) =>
        Math.abs(prev - nextDuration) < 0.15 ? prev : nextDuration
      );
    };

    const scheduleRecalc = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(recalc);
    };

    scheduleRecalc();

    let observer = null;
    if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined') {
      observer = new window.ResizeObserver(scheduleRecalc);
      if (containerRef.current) observer.observe(containerRef.current);
      if (measureRef.current) observer.observe(measureRef.current);
    }

    window.addEventListener('resize', scheduleRecalc);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', scheduleRecalc);
    };
  }, [contentKey, tickerContent.length]);

  const segmentContent = useMemo(() => {
    const rows = [];
    for (let i = 0; i < segmentRepeatCount; i += 1) {
      rows.push(...tickerContent);
    }
    return rows;
  }, [segmentRepeatCount, tickerContent]);

  // Duplicate the segment for seamless loop.
  const doubled = [...segmentContent, ...segmentContent];

  if (updates.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/88 backdrop-blur-sm border-t border-accent/30">
      <div className="relative overflow-hidden h-9 flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-accent/14 flex items-center justify-center z-10 border-r border-accent/30">
          <AlertTriangle className="w-3 h-3 text-accent/90" />
        </div>
        <div ref={containerRef} className="relative ml-9 overflow-hidden whitespace-nowrap">
          <div ref={measureRef} className="absolute -z-10 opacity-0 pointer-events-none whitespace-nowrap">
            {tickerContent.map((text, i) => (
              <span key={`measure-${i}`} className={tickerItemClassName}>
                {text}
              </span>
            ))}
          </div>
          <motion.div
            className="inline-block whitespace-nowrap"
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: animationDuration,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {doubled.map((text, i) => (
              <span key={`${i}-${text.slice(0, 20)}`} className={tickerItemClassName}>
                {text}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
