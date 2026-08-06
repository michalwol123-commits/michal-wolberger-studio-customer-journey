import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DEFAULT_HERO = 'https://media.base44.com/images/public/69c56d22dada4d9b43006820/5a1c7b41c_Image37of491.jpg';

export default function PortalHero({ clientName, subtitle, imageUrl, plain = false }) {
  const [src, setSrc] = useState(imageUrl || DEFAULT_HERO);

  useEffect(() => { setSrc(imageUrl || DEFAULT_HERO); }, [imageUrl]);

  // צבעי טקסט: על תמונה — קרם; במצב חלק — אספרסו על גרייז'
  const labelColor = plain ? 'rgba(42,31,24,0.6)' : '#c8bdb2';
  const titleColor = plain ? '#2a1f18' : '#f5f0eb';
  const subColor = plain ? 'rgba(42,31,24,0.75)' : 'rgba(245,240,235,0.85)';
  const particleBase = plain ? 'rgba(42,31,24,' : 'rgba(200,189,178,';

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '40vh', minHeight: 280, background: plain ? '#c8bdb2' : undefined }}
    >
      {!plain && (
        <>
          <img
            src={src}
            alt="עיצוב פנים — סטודיו מיכל וולברגר"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => { if (src !== DEFAULT_HERO) setSrc(DEFAULT_HERO); }}
          />
          {/* overlay גרדיאנט חום */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(42,31,24,0.75) 0%, rgba(42,31,24,0.35) 50%, rgba(42,31,24,0.15) 100%)' }}
          />
        </>
      )}

      {/* חלקיקי רקע צפים */}
      <div className="p-particle" style={{ width: 8, height: 8, top: '25%', right: '18%', background: `${particleBase}0.28)`, animation: 'floatY 7s ease-in-out infinite' }} />
      <div className="p-particle" style={{ width: 5, height: 5, top: '55%', right: '65%', background: `${particleBase}0.22)`, animation: 'floatY 9s ease-in-out infinite 1.5s' }} />
      <div className="p-particle" style={{ width: 3, height: 26, borderRadius: 0, top: '30%', left: '22%', background: `${particleBase}0.18)`, animation: 'floatY 8s ease-in-out infinite 0.8s' }} />

      <div className="absolute inset-0 flex items-end">
        <div className="max-w-5xl mx-auto w-full px-6 pb-10">
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="p-label mb-3"
            style={{ color: labelColor }}
          >
            הפורטל האישי שלך · סטודיו מיכל וולברגר
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="p-display p-hero-title text-4xl md:text-5xl lg:text-[52px] leading-tight"
            style={{ color: titleColor }}
          >
            {clientName ? `שלום, ${clientName}` : 'ברוכים הבאים'}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-2 text-base md:text-lg"
              style={{ color: subColor }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}