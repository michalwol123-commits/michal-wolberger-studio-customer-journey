import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      <Button
        variant={view === 'cards' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-none h-8 px-2.5"
        onClick={() => onViewChange('cards')}
      >
        <LayoutGrid className="w-4 h-4" />
      </Button>
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-none h-8 px-2.5"
        onClick={() => onViewChange('table')}
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  );
}