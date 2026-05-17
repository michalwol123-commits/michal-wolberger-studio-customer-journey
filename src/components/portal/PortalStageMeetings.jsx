import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, FileText, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';

const typeLabels = {
  intro: 'היכרות',
  qualifying: 'אפיון',
  quote_presentation: 'הצגת הצעת מחיר',
  stage_review: 'סקירת שלב',
  site_visit: 'ביקור אתר',
  zoom: 'Zoom',
  design_approval: 'אישור עיצוב',
};

// Map meeting types to stages
const meetingStageMap = {
  intro: 2,
  qualifying: 2,
  quote_presentation: 3,
};

export default function PortalStageMeetings({ meetings, stageNum }) {
  // Filter meetings relevant to this stage
  const stageMeetings = meetings.filter(m => {
    // If meeting has explicit stage_ref, use it
    if (m.stage_ref) return m.stage_ref === stageNum;
    // Otherwise map by type
    const mappedStage = meetingStageMap[m.type];
    return mappedStage === stageNum;
  });

  // Only show completed/scheduled meetings
  const relevantMeetings = stageMeetings.filter(m => 
    m.status === 'completed' || m.status === 'scheduled'
  );

  if (relevantMeetings.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          פגישות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {relevantMeetings.map(m => (
          <div key={m.id} className="p-3 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{typeLabels[m.type] || m.type}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                m.status === 'completed' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {m.status === 'completed' ? 'התקיימה ✅' : 'מתוכננת'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {m.scheduled_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(m.scheduled_at), 'dd/MM/yyyy HH:mm')}
                </span>
              )}
              {!m.scheduled_at && m.scheduling_token && (
                <a href={`/schedule?token=${m.scheduling_token}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <CalendarPlus className="w-3.5 h-3.5" />
                    קבעי מועד
                  </Button>
                </a>
              )}
              {m.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{m.location}
                </span>
              )}
            </div>
            {m.summary && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.summary}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}