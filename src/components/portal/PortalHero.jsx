import React from 'react';
import { motion } from 'framer-motion';

const HERO_IMG = 'https://media.base44.com/images/public/69c56d22dada4d9b43006820/5a1c7b41c_Image37of491.jpg';

export default function PortalHero({ clientName, subtitle }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: '40vh', minHeight: 280 }}>
      <img
        src={HERO_IMG}
        alt="עיצוב פנים — סטודיו מיכל וולברגר"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* overlay גרדיאנט חום */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(42,31,24,0.75) 0%, rgba(42,31,24,0.35) 50%, rgba(42,31,24,0.15) 100%)' }}
      />
      {/* חלקיקי רקע צפים */}
      <div className="p-particle" style={{ width: 8, height: 8, top: '25%', right: '18%', background: 'rgba(200,189,178,0.35)', animation: 'floatY 7s ease-in-out infinite' }} />
      <div className="p-particle" style={{ width: 5, height: 5, top: '55%', right: '65%', background: 'rgba(180,160,140,0.3)', animation: 'floatY 9s ease-in-out infinite 1.5s' }} />
      <div className="p-particle" style={{ width: 3, height: 26, borderRadius: 0, top: '30%', left: '22%', background: 'rgba(200,189,178,0.2)', animation: 'floatY 8s ease-in-out infinite 0.8s' }} />

      <div className="absolute inset-0 flex items-end">
        <div className="max-w-5xl mx-auto w-full px-6 pb-10">
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="p-label mb-3"
            style={{ color: '#c8bdb2' }}
          >
            הפורטל האישי שלך · סטודיו מיכל וולברגר
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="p-display text-4xl md:text-5xl lg:text-[52px] leading-tight"
            style={{ color: '#f5f0eb', fontWeight: 300 }}
          >
            {clientName ? `שלום, ${clientName}` : 'ברוכים הבאים'}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-2 text-base md:text-lg"
              style={{ color: 'rgba(245,240,235,0.85)' }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}