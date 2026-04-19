import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/lib/useCurrentUser';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import { he } from 'date-fns/locale';

const typeLabels = {
  intro: 'היכרות', qualifying: 'אפיון', stage_review: 'סקירת שלב',
  site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב'
};

export default function Meetings() {
  const { user, isAdmin } = useCurrentUser();
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-scheduled_at', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });

  // Filter by role
  const filtered = isAdmin
    ? meetings
    : meetings.filter(m => {
        const client = clientMap[m.client_id];
        return client && (client.owner === user?.email);
      });

  const now = new Date();
  const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 0 });

  const weekMeetings = filtered.filter(m => {
    if (!m.scheduled_at) return false;
    const d = new Date(m.scheduled_at);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  // Group by day
  const dayGroups = {};
  weekMeetings.forEach(m => {
    const day = format(new Date(m.scheduled_at), 'yyyy-MM-dd');
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(m);
  });

  return (
    <div>
      <PageHeader title="פגישות" subtitle="לוח שנה שבועי">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted">הקודם</button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted font-medium">היום</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted">הבא</button>
        </div>
      </PageHeader>

      <p className="text-sm text-muted-foreground mb-4">
        {format(weekStart, 'dd/MM', { locale: he })} — {format(weekEnd, 'dd/MM/yyyy', { locale: he })}
      </p>

      {Object.keys(dayGroups).length === 0 ? (
        <EmptyState icon={Calendar} title="אין פגישות השבוע" />
      ) : (
        <div className="space-y-6">
          {Object.entries(dayGroups).sort().map(([day, dayMeetings]) => (
            <div key={day}>
              <h3 className="text-sm font-semibold font-heading mb-2 text-muted-foreground">
                {format(new Date(day), 'EEEE, dd בMMMM', { locale: he })}
              </h3>
              <div className="space-y-2">
                {dayMeetings.map(m => {
                  const client = clientMap[m.client_id];
                  return (
                    <Card key={m.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{typeLabels[m.type] || m.type}</span>
                              <StatusBadge status={m.status} />
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {client && <span className="flex items-center gap-1"><User className="w-3 h-3" />{client.name}</span>}
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(m.scheduled_at), 'HH:mm')} • {m.duration} דק׳</span>
                              {m.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.location}</span>}
                            </div>
                            {m.summary && <p className="text-sm mt-2 text-muted-foreground">{m.summary}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}