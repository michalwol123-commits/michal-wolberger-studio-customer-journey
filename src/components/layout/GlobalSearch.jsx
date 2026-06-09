import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Search,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  CreditCard,
  Truck,
  ArrowLeft,
} from 'lucide-react';
import _ from 'lodash';

const CATEGORIES = [
  { key: 'clients', label: 'לקוחות', icon: Users, color: 'text-blue-600' },
  { key: 'projects', label: 'פרויקטים', icon: Briefcase, color: 'text-emerald-600' },
  { key: 'tasks', label: 'משימות', icon: CheckSquare, color: 'text-amber-600' },
  { key: 'quotes', label: 'הצעות מחיר', icon: FileText, color: 'text-purple-600' },
  { key: 'payments', label: 'תשלומים', icon: CreditCard, color: 'text-green-600' },
  { key: 'suppliers', label: 'ספקים', icon: Truck, color: 'text-orange-600' },
];

export default function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

  const debouncedSet = useCallback(
    _.debounce((val) => setDebouncedQuery(val), 300),
    []
  );

  useEffect(() => {
    debouncedSet(query);
    return () => debouncedSet.cancel();
  }, [query, debouncedSet]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
    staleTime: 60000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
    staleTime: 60000,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
    staleTime: 60000,
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 200),
    staleTime: 60000,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 200),
    staleTime: 60000,
    enabled: open,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200),
    staleTime: 60000,
  });

  const q = debouncedQuery.trim().toLowerCase();

  const match = (val) => val?.toLowerCase().includes(q);

  const results = q.length < 2 ? {} : {
    clients: clients.filter(c => match(c.name) || c.phone?.includes(q) || match(c.email) || match(c.city)).slice(0, 5),
    projects: projects.filter(p => match(p.name)).slice(0, 5),
    tasks: tasks.filter(t => match(t.title) || match(t.description)).slice(0, 5),
    quotes: quotes.filter(qt => match(qt.title) || match(qt.scope)).slice(0, 5),
    payments: payments.filter(p => match(p.milestone) || match(p.notes)).slice(0, 5),
    suppliers: suppliers.filter(s => match(s.name) || s.phone?.includes(q) || match(s.category)).slice(0, 5),
  };

  const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  const handleSelect = (category, item) => {
    onOpenChange(false);
    switch (category) {
      case 'clients': navigate(`/clients/${item.id}`); break;
      case 'projects': navigate(`/projects/${item.id}`); break;
      case 'tasks': navigate('/tasks'); break;
      case 'quotes': navigate('/quotes'); break;
      case 'payments': navigate('/payments'); break;
      case 'suppliers': navigate('/suppliers'); break;
    }
  };

  const getItemLabel = (category, item) => {
    switch (category) {
      case 'clients': return item.name;
      case 'projects': return item.name;
      case 'tasks': return item.title;
      case 'quotes': return item.title;
      case 'payments': return `${item.milestone} — ₪${item.amount?.toLocaleString() || ''}`;
      case 'suppliers': return item.name;
      default: return '';
    }
  };

  const getItemSub = (category, item) => {
    switch (category) {
      case 'clients': return item.phone || item.email || '';
      case 'projects': return item.status || '';
      case 'tasks': return item.status || '';
      case 'quotes': return `₪${item.total_amount?.toLocaleString() || ''}`;
      case 'payments': return item.status || '';
      case 'suppliers': return item.category || '';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogTitle className="sr-only">חיפוש גלובלי</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לקוח, פרויקט, משימה..."
            className="border-0 shadow-none focus-visible:ring-0 text-base h-auto p-0"
            autoFocus
          />
          <kbd className="hidden sm:inline text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {q.length < 2 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              הקלידי לפחות 2 תווים לחיפוש
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              לא נמצאו תוצאות עבור "{debouncedQuery}"
            </div>
          ) : (
            CATEGORIES.map(({ key, label, icon: Icon, color }) => {
              const items = results[key];
              if (!items || items.length === 0) return null;
              return (
                <div key={key}>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/40 flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    {label}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(key, item)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/60 transition-colors text-right"
                    >
                      <div>
                        <p className="text-sm font-medium">{getItemLabel(key, item)}</p>
                        <p className="text-xs text-muted-foreground">{getItemSub(key, item)}</p>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center gap-3">
          <span>⌘K לפתיחה מהירה</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}