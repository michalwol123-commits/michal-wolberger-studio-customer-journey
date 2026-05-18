import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { UserPlus, Phone, CheckCircle, FileText, Send, PartyPopper } from 'lucide-react';

const EVENTS = [
  { key: 'created_date', label: 'ליד נוצר', icon: UserPlus },
  { key: 'first_response_at', label: 'מענה ראשוני', icon: Phone },
  { key: 'qualified_at', label: 'הפך למתעניין', icon: CheckCircle },
  { key: 'proposal_presented_at', label: 'הוגשה הצעה בפגישה', icon: FileText },
  { key: 'proposal_sent_at', label: 'הצעה נשלחה', icon: Send },
  { key: 'completed_at', label: 'הושלם', icon: PartyPopper },
];

export default function ClientTimeline({ client }) {
  const events = EVENTS.filter(e => client[e.key]);

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">אין היסטוריה עדיין</div>
    );
  }

  return (
    <div className="relative pr-6">
      {/* Vertical line */}
      <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-6">
        {events.map((event) => {
          const Icon = event.icon;
          const date = new Date(client[event.key]);
          return (
            <div key={event.key} className="flex items-start gap-4 relative">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center z-10 shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{event.label}</p>
                <p className="text-xs text-muted-foreground">
                  {format(date, 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}