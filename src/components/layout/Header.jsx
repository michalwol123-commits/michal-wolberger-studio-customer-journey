import React, { useState } from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import useCurrentUser from '@/lib/useCurrentUser';
import GlobalSearch from './GlobalSearch';

export default function Header({ onMenuToggle }) {
  const { user } = useCurrentUser();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onMenuToggle} className="lg:hidden text-muted-foreground hover:text-foreground">
              <Menu className="w-6 h-6" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors w-64"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span>חיפוש לקוח, פרויקט...</span>
              <kbd className="mr-auto text-xs bg-background/70 px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden text-muted-foreground hover:text-foreground"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {user?.full_name?.[0] || 'מ'}
              </div>
              <span className="hidden sm:inline text-sm font-medium">{user?.full_name || 'מיכל'}</span>
            </div>
          </div>
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}