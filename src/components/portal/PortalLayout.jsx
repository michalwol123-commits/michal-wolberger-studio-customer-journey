import React from 'react';
import { usePortal } from '@/lib/PortalContext';
import '@/components/portal/portal-theme.css';

const LOGO = 'https://media.base44.com/images/public/69c56d22dada4d9b43006820/d9f91c02a_image-removebg-preview.png';

export default function PortalLayout({ children, onShowGuide, showingGuide, hero }) {
  const { client } = usePortal();

  return (
    <div className="portal-theme min-h-screen flex flex-col" dir="rtl">
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{ background: 'rgba(245,240,235,0.9)', borderBottom: '1px solid #e0d8ce' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <img src={LOGO} alt="סטודיו מיכל וולברגר" className="h-10 w-auto" />
          <div className="flex items-center gap-4">
            {client && (
              <p className="text-sm hidden sm:block" style={{ color: '#8a7060' }}>
                שלום, <span style={{ color: '#2a1f18' }}>{client.name}</span>
              </p>
            )}
            {onShowGuide && (
              <button
                onClick={onShowGuide}
                className="text-xs px-4 py-2 transition-all"
                style={showingGuide
                  ? { background: '#2a1f18', color: '#f5f0eb', border: '1px solid #2a1f18' }
                  : { background: 'transparent', color: '#2a1f18', border: '1px solid #2a1f18' }}
              >
                מדריך
              </button>
            )}
          </div>
        </div>
      </header>

      {hero}

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 md:py-16 flex-1">
        {children}
      </main>

      <footer style={{ background: '#2a1f18' }}>
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 text-center">
          <img src={LOGO} alt="" className="h-12 w-auto mx-auto mb-6 opacity-90" style={{ filter: 'brightness(10)' }} />
          <p className="p-label mb-3" style={{ color: '#c8bdb2' }}>סטודיו מיכל וולברגר · עיצוב פנים</p>
          <h3 className="p-display text-2xl md:text-3xl mb-6" style={{ color: '#f5f0eb' }}>
            יש שאלה? מיכל כאן בשבילך
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm mb-10" style={{ color: '#c8bdb2' }}>
            <a href="https://wa.me/972524687812" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">וואטסאפ</a>
            <a href="tel:0524687812" className="hover:opacity-70 transition-opacity">052-4687812</a>
            <a href="mailto:michalwol123@gmail.com" className="hover:opacity-70 transition-opacity">michalwol123@gmail.com</a>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(200,189,178,0.5)', letterSpacing: '1px' }}>
            © {new Date().getFullYear()} סטודיו מיכל וולברגר · כל הזכויות שמורות
          </p>
        </div>
      </footer>
    </div>
  );
}