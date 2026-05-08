import React from 'react';
import { LayoutGrid, List, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ViewToggle({ view, onViewChange, options }) {
  const defaultOptions = [
    { value: 'cards', icon: LayoutGrid, title: 'כרטיסים' },
    { value: 'table', icon: List, title: 'טבלה' },
  ];
  const opts = options || defaultOptions;

  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      {opts.map(opt => {
        const Icon = opt.icon;
        return (
          <Button
            key={opt.value}
            variant={view === opt.value ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-8 px-2.5"
            onClick={() => onViewChange(opt.value)}
            title={opt.title}
          >
            <Icon className="w-4 h-4" />
          </Button>
        );
      })}
    </div>
  );
}