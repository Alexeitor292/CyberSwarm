import React from 'react';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function AdminTicker() {
  const { data: updates = [] } = useQuery({
    queryKey: ['admin-updates'],
    queryFn: () => appClient.entities.AdminUpdate.filter({ active: true }, '-created_date', 20),
    refetchInterval: 30000,
  });

  if (updates.length === 0) return null;

  const tickerContent = updates.map((u) => {
    const time = new Date(u.created_date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `[SYSTEM UPDATE ${time}]: ${u.message}`;
  });

  // Double the content for seamless loop
  const doubled = [...tickerContent, ...tickerContent];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-t border-accent/20">
      <div className="relative overflow-hidden h-10 flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-accent/10 flex items-center justify-center z-10 border-r border-accent/20">
          <AlertTriangle className="w-3 h-3 text-accent" />
        </div>
        <div className="ml-10 overflow-hidden whitespace-nowrap">
          <motion.div
            className="inline-block whitespace-nowrap"
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: updates.length * 12,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {doubled.map((text, i) => (
              <span key={i} className="font-mono text-xs text-accent/80 mx-8 glow-red">
                {text}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
