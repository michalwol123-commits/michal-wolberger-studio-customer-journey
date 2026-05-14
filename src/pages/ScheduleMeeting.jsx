import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import ScheduleTimePicker from '@/components/schedule/ScheduleTimePicker';

export default function ScheduleMeeting() {
  const [loading, setLoading] = useState(true);
  const [meetingData, setMeetingData] = useState(null);
  const [error, setError] = useState(null);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('missing_token');
      setLoading(false);
      return;
    }

    base44.functions.invoke('getScheduleData', { token })
      .then(res => {
        setMeetingData(res.data);
        setLoading(false);
      })
      .catch(err => {
        const status = err?.response?.status;
        if (status === 404) setError('not_found');
        else if (status === 410) setError('meeting_closed');
        else setError('unknown');
        setLoading(false);
      });
  }, [token]);

  const handleScheduled = (dateTime) => {
    setScheduled(true);
    setScheduledTime(dateTime);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <div className="text-center space-y-3 max-w-sm">
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-heading text-xl font-bold">
            {error === 'not_found' && 'קישור לא תקין'}
            {error === 'meeting_closed' && 'הפגישה כבר לא פעילה'}
            {error === 'missing_token' && 'קישור חסר'}
            {error === 'unknown' && 'שגיאה'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {error === 'not_found' && 'הקישור אינו תקין או שהפגישה נמחקה.'}
            {error === 'meeting_closed' && 'הפגישה הסתיימה או בוטלה ולא ניתן לתאם מועד חדש.'}
            {error === 'missing_token' && 'חסר פרמטר בקישור. נא לפנות לסטודיו.'}
            {error === 'unknown' && 'אירעה שגיאה בטעינת הנתונים. נא לנסות שוב.'}
          </p>
        </div>
      </div>
    );
  }

  if (scheduled) {
    const dt = new Date(scheduledTime);
    const fmt = (d) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const start = new Date(scheduledTime);
    const end = new Date(start.getTime() + (meetingData.duration || 45) * 60 * 1000);
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetingData.type_label + ' - Michal Wolberger Studio')}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(meetingData.location || '')}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
          <h2 className="font-heading text-2xl font-bold">הפגישה נקבעה!</h2>
          <p className="text-muted-foreground">
            {meetingData.type_label} — {dt.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' '}בשעה {dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <a
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            הוסף ליומן Google
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">Michal Wolberger Studio</h1>
          <p className="text-muted-foreground mt-1">
            שלום {meetingData.client_name} 👋 — נא לבחור מועד נוח
          </p>
        </div>
        <ScheduleTimePicker
          meetingData={meetingData}
          token={token}
          onScheduled={handleScheduled}
        />
      </div>
    </div>
  );
}