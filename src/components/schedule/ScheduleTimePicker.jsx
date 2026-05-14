import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Clock, MapPin, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ScheduleTimePicker({ meetingData, token, onScheduled }) {
  const [selectedDateTime, setSelectedDateTime] = useState(
    meetingData.scheduled_at ? meetingData.scheduled_at.slice(0, 16) : ''
  );
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState(null);

  const handleSubmit = async () => {
    if (!selectedDateTime) return;
    setSubmitting(true);
    setConflict(null);

    const res = await base44.functions.invoke('submitSchedule', {
      token,
      scheduled_at: new Date(selectedDateTime).toISOString(),
      client_email: email || undefined,
    });

    setSubmitting(false);

    if (res.data?.error === 'conflict') {
      setConflict(res.data.conflicting_events);
    } else if (res.data?.status === 'ok') {
      onScheduled(selectedDateTime);
    }
  };

  // Set minimum date to now
  const now = new Date();
  const minDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center pb-3">
        <CardTitle className="font-heading text-xl">
          {meetingData.scheduled_at ? 'שינוי מועד' : 'בחירת מועד'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meeting info */}
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
            מועד נוכחי: {new Date(meetingData.scheduled_at).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' '}בשעה {new Date(meetingData.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Date/time picker */}
        <div>
          <Label>תאריך ושעה</Label>
          <Input
            type="datetime-local"
            value={selectedDateTime}
            onChange={e => { setSelectedDateTime(e.target.value); setConflict(null); }}
            min={minDateTime}
            className="text-base"
          />
        </div>

        {/* Email input */}
        <div>
          <Label>כתובת מייל לאישור</Label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            dir="ltr"
          />
        </div>

        {/* Conflict warning */}
        {conflict && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
              <AlertTriangle className="w-4 h-4" />
              המועד תפוס — נא לבחור מועד אחר
            </div>
            <ul className="text-xs text-amber-800 space-y-1 pr-4">
              {conflict.map((ev, i) => (
                <li key={i}>
                  {ev.summary} — {ev.start ? new Date(ev.start).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
                  {ev.end ? ` עד ${new Date(ev.end).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!selectedDateTime || submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {meetingData.scheduled_at ? 'עדכון מועד' : 'אישור מועד'}
        </Button>
      </CardContent>
    </Card>
  );
}