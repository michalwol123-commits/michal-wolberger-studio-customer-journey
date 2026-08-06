import React from 'react';

const PORTRAIT = 'https://media.base44.com/images/public/69c56d22dada4d9b43006820/56525d8a4_NIM_0107-2.jpg';

export default function MichalContactCard() {
  return (
    <div className="p-card p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-right">
      <img
        src={PORTRAIT}
        alt="מיכל וולברגר"
        className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shrink-0"
        style={{ border: '1.5px solid #c8bdb2' }}
      />
      <div className="flex-1">
        <p className="p-label mb-2">מיכל איתך לאורך כל הדרך</p>
        <h3 className="p-display text-2xl mb-2">יש שאלה? אני כאן בשבילך</h3>
        <p className="text-sm leading-relaxed" style={{ color: '#4a3728' }}>
          בכל שלב בפרויקט — מוזמנת לפנות אליי ישירות, ואחזור אלייך בהקדם.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
        <a href="https://wa.me/972524687812" target="_blank" rel="noopener noreferrer" className="p-btn text-sm !py-2.5 !px-6">
          וואטסאפ <span className="p-arrow">←</span>
        </a>
        <a href="tel:0524687812" className="p-btn-outline text-sm !py-2.5 !px-6">טלפון</a>
        <a href="mailto:michalwol123@gmail.com" className="p-btn-outline text-sm !py-2.5 !px-6">מייל</a>
      </div>
    </div>
  );
}