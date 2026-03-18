import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Eye, EyeOff, Pause, Play } from 'lucide-react';
import { useSiteContent } from '@/hooks/use-site-content';

const tickerItemClassName =
  'font-mono text-xs font-semibold text-foreground mx-7 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]';
const controlButtonClassName =
  'inline-flex items-center gap-1 rounded border border-primary/20 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-foreground transition hover:border-primary/45 hover:text-primary';

export default function AdminTicker() {
  const { data } = useSiteContent();
  const prefersReducedMotion = useReducedMotion();
  const updates =
    data?.adminUpdates
      ?.filter((item) => item.active !== false && item.message)
      ?.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
      ?.slice(0, 20) || [];
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [segmentRepeatCount, setSegmentRepeatCount] = useState(2);
  const [animationDuration, setAnimationDuration] = useState(28);
  const [isPaused, setIsPaused] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

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
  const shouldAnimate = !prefersReducedMotion && !isPaused;

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPaused(true);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (tickerContent.length === 0 || !shouldAnimate) return undefined;

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
  }, [contentKey, shouldAnimate, tickerContent.length]);

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
  if (isHidden) {
    return (
      <div className="fixed bottom-3 right-4 z-50">
        <button
          type="button"
          onClick={() => setIsHidden(false)}
          className={controlButtonClassName}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          Show Updates Ticker
        </button>
      </div>
    );
  }

  return (
    <section
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/92 backdrop-blur-sm border-t border-accent/30"
      aria-label="Latest updates ticker"
    >
      <div className="relative flex min-h-11 items-stretch">
        <div className="flex items-center gap-2 px-3 bg-accent/14 border-r border-accent/30 shrink-0">
          <AlertTriangle className="w-3 h-3 text-accent" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-foreground">
            Updates
          </span>
        </div>
        <div className="flex min-w-0 flex-1 items-stretch">
          <div className="min-w-0 flex-1 px-3 py-2">
            {shouldAnimate ? (
              <div ref={containerRef} className="relative overflow-hidden whitespace-nowrap" aria-hidden="true">
                <div
                  ref={measureRef}
                  className="absolute -z-10 opacity-0 pointer-events-none whitespace-nowrap"
                >
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
            ) : (
              <div
                className="overflow-x-auto whitespace-nowrap"
                tabIndex={0}
                aria-describedby="ticker-help"
              >
                {tickerContent.map((text, i) => (
                  <span key={`${i}-${text.slice(0, 20)}`} className={tickerItemClassName}>
                    {text}
                  </span>
                ))}
              </div>
            )}
            <p id="ticker-help" className="sr-only">
              Latest updates are also listed in the Admin Updates section above. Use the controls to
              pause or hide this ticker.
            </p>
          </div>

          <div className="flex items-center gap-2 border-l border-primary/10 px-3 shrink-0">
            {!prefersReducedMotion ? (
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className={controlButtonClassName}
                aria-pressed={isPaused}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {isPaused ? 'Play' : 'Pause'}
              </button>
            ) : (
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Motion reduced
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsHidden(true)}
              className={controlButtonClassName}
            >
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              Hide
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
