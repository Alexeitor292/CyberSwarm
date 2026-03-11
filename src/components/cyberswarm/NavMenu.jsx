import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Agenda', href: '#agenda' },
  { label: 'Updates', href: '#updates' },
  { label: 'Location', href: '#info' },
  { label: 'Register', href: '#register' },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  const scrollTo = (href) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Menu button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-5 right-16 z-50 w-10 h-10 border border-primary/20 flex items-center justify-center hover:border-primary/50 transition-colors bg-background/60 backdrop-blur-sm"
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4 text-primary/70" />
      </button>

      {/* Full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center"
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-5 right-16 w-10 h-10 border border-primary/20 flex items-center justify-center hover:border-primary/50 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-primary/70" />
            </button>

            {/* Scan ring effect */}
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute w-32 h-32 border border-primary/30 rounded-full"
            />

            <nav className="flex flex-col items-center gap-8">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.08 + 0.2, duration: 0.4 }}
                  onClick={() => scrollTo(link.href)}
                  className="font-mono text-lg tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors uppercase"
                >
                  <span className="text-primary/30 mr-3 text-sm">0{i + 1}</span>
                  {link.label}
                </motion.button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}