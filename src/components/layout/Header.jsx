import React from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import useCurrentUser from '@/lib/useCurrentUser';

export default function Header({ onMenuToggle }) {
  const { user } = useCurrentUser();

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="w-6 h-6" />
          </button>
          <div className="relative hidden sm:block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לקוח, פרויקט..."
              className="pr-9 w-64 bg-muted/50 border-0 text-sm"
            />
          </div>
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
  );
}