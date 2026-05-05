import React from 'react';
import { usePortal } from '@/lib/PortalContext';
import { BookOpen } from 'lucide-react';

export default function PortalLayout({ children, onShowGuide, showingGuide }) {
  const { client } = usePortal();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-base">מיכל וולברגר</h1>
            <p className="text-xs text-muted-foreground">סטודיו לעיצוב פנים</p>
          </div>
          <div className="flex items-center gap-3">
            {onShowGuide && (
              <button
                onClick={onShowGuide}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  showingGuide
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                מדריך
              </button>
            )}
            {client && (
              <p className="text-sm text-muted-foreground">
                שלום, <span className="font-medium text-foreground">{client.name}</span>
              </p>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}