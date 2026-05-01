import React from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      <Button
        variant={view === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('cards')}
        className="rounded-none px-2.5"
      >
        <LayoutGrid className="w-4 h-4" />
      </Button>
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="rounded-none px-2.5"
      >
        <Table2 className="w-4 h-4" />
      </Button>
    </div>
  );
}