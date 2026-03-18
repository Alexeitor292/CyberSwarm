import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Agenda', href: '#agenda' },
  { label: 'Updates', href: '#updates' },
  { label: 'Location', href: '#info' },
  { label: 'Register', href: '#register' },
];
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const menuButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const menuId = useId();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const syncHash = () => {
      const nextHash = String(window.location.hash || '').replace(/^#/, '').trim();
      setActiveSection(nextHash);
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);

      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      } else {
        menuButtonRef.current?.focus();
      }
    };
  }, [open]);

  const scrollTo = (href) => {
    const sectionId = String(href || '').replace(/^#/, '').trim();
    setOpen(false);
    if (!sectionId) return;

    const scrollIntoSection = () => {
      const target = document.getElementById(sectionId);
      if (!target) {
        window.location.hash = sectionId;
        return;
      }

      target.focus({ preventScroll: true });
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      window.history.replaceState(null, '', `#${sectionId}`);
      setActiveSection(sectionId);
    };

    // Wait for the menu overlay to close before scrolling.
    window.requestAnimationFrame(() => window.requestAnimationFrame(scrollIntoSection));
  };

  return (
    <>
      {/* Menu button */}
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-5 right-16 z-50 w-10 h-10 border border-primary/20 flex items-center justify-center hover:border-primary/50 transition-colors bg-background/60 backdrop-blur-sm"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="dialog"
      >
        <Menu className="w-4 h-4 text-primary/70" aria-hidden="true" />
      </button>

      {/* Full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center"
            id={menuId}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-title`}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
          >
            <h2 id={`${menuId}-title`} className="sr-only">
              Site navigation
            </h2>

            {/* Close button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-5 right-16 w-10 h-10 border border-primary/20 flex items-center justify-center hover:border-primary/50 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-primary/70" aria-hidden="true" />
            </button>

            {/* Scan ring effect */}
            {!prefersReducedMotion ? (
              <motion.div
                initial={{ scale: 0, opacity: 0.5 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute w-32 h-32 border border-primary/30 rounded-full"
                aria-hidden="true"
              />
            ) : null}

            <nav aria-label="Primary" className="flex flex-col items-center gap-8">
              <ul className="flex flex-col items-center gap-8">
                {navLinks.map((link, i) => {
                  const sectionId = link.href.replace(/^#/, '');

                  return (
                    <li key={link.label}>
                      <motion.a
                        href={link.href}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { delay: i * 0.08 + 0.2, duration: 0.4 }
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          scrollTo(link.href);
                        }}
                        className="font-mono text-lg tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors uppercase"
                        aria-current={activeSection === sectionId ? 'location' : undefined}
                      >
                        <span className="text-primary/45 mr-3 text-sm" aria-hidden="true">
                          0{i + 1}
                        </span>
                        {link.label}
                      </motion.a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
