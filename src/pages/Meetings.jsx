import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import BulkDeleteBar from '@/components/shared/BulkDeleteBar';
import DeleteButton from '@/components/shared/DeleteButton';
import useCurrentUser from '@/lib/useCurrentUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, MapPin, User, Plus, CheckCircle } from 'lucide-react';
import ViewToggle from '@/components/shared/ViewToggle';
import MeetingsTable from '@/components/meetings/MeetingsTable';
import AddMeetingDialog from '@/components/meetings/AddMeetingDialog';
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

const typeLabels = {
  intro: 'היכרות', qualifying: 'אפיון', stage_review: 'סקירת שלב',
  site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב'
};

export default function Meetings() {
  const { user, isAdmin } = useCurrentUser();
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState('cards');
  const [showAdd, setShowAdd] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const queryClient = useQueryClient();

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

  const dayGroups = {};
  weekMeetings.forEach(m => {
    const day = format(new Date(m.scheduled_at), 'yyyy-MM-dd');
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(m);
  });

  const completeMutation = useMutation({
    mutationFn: async (meeting) => {
      await base44.entities.Meeting.update(meeting.id, { status: 'completed' });
      // If intro meeting completed → move lead to "qualified"
      if (meeting.type === 'intro' && meeting.client_id) {
        const client = clientMap[meeting.client_id];
        if (client && client.status === 'lead') {
          await base44.entities.Client.update(meeting.client_id, { status: 'qualified' });
        }
      }
      // If qualifying meeting completed → move client to "qualified_assessment"
      if (meeting.type === 'qualifying' && meeting.client_id) {
        const client = clientMap[meeting.client_id];
        if (client && client.status === 'qualified') {
          await base44.entities.Client.update(meeting.client_id, { status: 'qualified_assessment' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('הפגישה סומנה כהושלמה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Meeting.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.Meeting.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSelectedIds([]);
      toast.success('הפגישות נמחקו');
    },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === weekMeetings.length ? [] : weekMeetings.map(m => m.id));

  return (
    <div>
      <PageHeader title="פגישות" subtitle="לוח שנה שבועי">
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onViewChange={setView} />
          <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted">הקודם</button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted font-medium">היום</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted">הבא</button>
          <Button onClick={() => { setEditMeeting(null); setShowAdd(true); }} className="gap-1">
            <Plus className="w-4 h-4" />פגישה חדשה
          </Button>
        </div>
      </PageHeader>

      <p className="text-sm text-muted-foreground mb-4">
        {format(weekStart, 'dd/MM', { locale: he })} — {format(weekEnd, 'dd/MM/yyyy', { locale: he })}
      </p>

      {isAdmin && <BulkDeleteBar selectedIds={selectedIds} onDelete={() => bulkDeleteMutation.mutate(selectedIds)} entityLabel="פגישות" />}

      {weekMeetings.length === 0 ? (
        <EmptyState icon={Calendar} title="אין פגישות השבוע" />
      ) : view === 'table' ? (
        <MeetingsTable
          meetings={weekMeetings}
          clientMap={clientMap}
          onEdit={(m) => { setEditMeeting(m); setShowAdd(true); }}
          onDelete={(id) => deleteMutation.mutate(id)}
          onComplete={(m) => completeMutation.mutate(m)}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          isAdmin={isAdmin}
        />
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
                    <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setEditMeeting(m); setShowAdd(true); }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {isAdmin && (
                              <div onClick={e => e.stopPropagation()} className="pt-0.5">
                                <Checkbox checked={selectedIds.includes(m.id)} onCheckedChange={() => toggleSelect(m.id)} />
                              </div>
                            )}
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
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {m.status === 'scheduled' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => completeMutation.mutate(m)} title="סמן כהושלם">
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <DeleteButton onDelete={() => deleteMutation.mutate(m.id)} entityLabel="פגישה" />
                            )}
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

      <AddMeetingDialog
        open={showAdd}
        onOpenChange={(open) => { setShowAdd(open); if (!open) setEditMeeting(null); }}
        initialData={editMeeting}
      />
    </div>
  );
}