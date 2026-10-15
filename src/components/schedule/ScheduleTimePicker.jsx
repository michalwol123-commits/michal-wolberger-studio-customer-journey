import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Clock, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { israelIso, israelLocalInput, formatIsraelTime } from '@/lib/israelTime';

export default function ScheduleTimePicker({ meetingData, token, onScheduled }) {
  const [selectedDateTime, setSelectedDateTime] = useState(
    israelLocalInput(meetingData.scheduled_at)
  );
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async () => {
    if (!selectedDateTime) return;
    setSubmitting(true);
    setConflict(null);
    setErrorMsg(null);

    try {
      const res = await base44.functions.invoke('submitSchedule', {
        token,
        scheduled_at: israelIso(selectedDateTime),
      });

      // base44.functions.invoke returns data directly OR nested under .data
      const data = res?.data ?? res;

      if (data?.error === 'conflict') {
        setConflict(data.conflicting_events);
      } else if (data?.status === 'ok') {
        onScheduled(israelIso(selectedDateTime));
      } else if (data?.error) {
        setErrorMsg('שגיאה: ' + data.error);
      } else {
        // Unexpected response — still call onScheduled if we have a datetime
        onScheduled(israelIso(selectedDateTime));
      }
    } catch (err) {
      console.error('submitSchedule failed:', err);
      setErrorMsg('אירעה שגיאה. נא לנסות שוב או לפנות לסטודיו.');
    } finally {
      setSubmitting(false);
    }
  };

  const minDateTime = israelLocalInput(new Date());

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center pb-3">
        <CardTitle className="font-heading text-xl">
          {meetingData.scheduled_at ? 'שינוי מועד' : 'בחירת מועד'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" />
            <span className="font-medium">{meetingData.type_label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{meetingData.duration} דקות</span>
          </div>
          {meetingData.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{meetingData.location}</span>
            </div>
          )}
        </div>

        {meetingData.scheduled_at && (
          <div className="text-sm text-muted-foreground text-center">
            מועד נוכחי: {new Date(meetingData.scheduled_at).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' })}
            {' '}בשעה {formatIsraelTime(meetingData.scheduled_at)}
          </div>
        )}

        <div>
          <Label>תאריך ושעה</Label>
          <Input
            type="datetime-local"
            value={selectedDateTime}
            onChange={e => { setSelectedDateTime(e.target.value); setConflict(null); setErrorMsg(null); }}
            min={minDateTime}
            className="text-base"
          />
        </div>

        {conflict && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
              <AlertTriangle className="w-4 h-4" />
              המועד תפוס — נא לבחור מועד אחר
            </div>
            <ul className="text-xs text-amber-800 space-y-1 pr-4">
              {conflict.map((ev, i) => (
                <li key={i}>
                  {ev.summary} — {ev.start ? formatIsraelTime(ev.start) : ''}
                  {ev.end ? ` עד ${formatIsraelTime(ev.end)}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!selectedDateTime || submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {meetingData.scheduled_at ? 'עדכון מועד' : 'אישור מועד'}
        </Button>
      </CardContent>
    </Card>
  );
}