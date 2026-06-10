import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, MapPin, Clock } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import AddMeetingDialog from '@/components/meetings/AddMeetingDialog';
import { format } from 'date-fns';

const typeLabels = {
  intro: 'שיחת טלפון ראשונית', qualifying: 'אפיון', quote_presentation: 'היכרות והצגת הצעת מחיר',
  stage_review: 'סקירת שלב', site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב',
};

export default function MeetingsList({ meetings, clientId, projectId }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);

  const sorted = [...meetings].sort((a, b) => {
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return new Date(b.scheduled_at) - new Date(a.scheduled_at);
  });

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1">
          <Plus className="w-4 h-4" />
          פגישה חדשה
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Calendar} title="אין פגישות" description="צרי פגישה חדשה" />
      ) : (
        <div className="space-y-2">
          {sorted.map(m => (
            <Card key={m.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => { setEditMeeting(m); setShowAdd(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{typeLabels[m.type] || m.type}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    {m.scheduled_at && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(m.scheduled_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {m.duration || 45} דקות
                        </span>
                      </div>
                    )}
                    {m.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {m.location}
                      </div>
                    )}
                    {m.summary && (
                      <p className="text-xs text-muted-foreground mt-1">{m.summary}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMeetingDialog
        open={showAdd}
        onOpenChange={(open) => { setShowAdd(open); if (!open) setEditMeeting(null); }}
        initialData={editMeeting || (clientId ? { client_id: clientId, project_id: projectId || '' } : undefined)}
      />
    </div>
  );
}