import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Shield, Wifi } from 'lucide-react';

export default function HUDOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="absolute top-4 left-4 md:top-6 md:left-6"
      >
        <p className="font-mono text-[10px] tracking-[0.22em] text-primary/40 uppercase">
          Threat Matrix // Active
        </p>
        <p className="font-mono text-[10px] tracking-[0.16em] text-primary/25 uppercase mt-1">
          Sacramento Node
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-3 text-primary/40"
      >
        <Shield className="w-3.5 h-3.5" />
        <Activity className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
      </motion.div>

      <div className="absolute top-4 left-4 w-12 h-12 border-l border-t border-primary/20" />
      <div className="absolute top-4 right-4 w-12 h-12 border-r border-t border-primary/20" />
      <div className="absolute bottom-12 left-4 w-12 h-12 border-l border-b border-primary/20" />
      <div className="absolute bottom-12 right-4 w-12 h-12 border-r border-b border-primary/20" />
    </div>
  );
}

