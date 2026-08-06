import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ScheduleTimePicker from '@/components/schedule/ScheduleTimePicker';
import ArtIcon from '@/components/portal/ArtIcon';
import '@/components/portal/portal-theme.css';

const LOGO = 'https://media.base44.com/images/public/69c56d22dada4d9b43006820/d9f91c02a_image-removebg-preview.png';

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
      <div className="portal-theme min-h-screen flex items-center justify-center" dir="rtl">
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: '2px solid #e0d8ce', borderTopColor: '#2a1f18' }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-theme min-h-screen flex items-center justify-center p-4" dir="rtl">
        <div className="p-card text-center space-y-4 max-w-sm p-10">
          <div className="flex justify-center"><ArtIcon name="compass" size={80} /></div>
          <h2 className="p-display text-2xl">
            {error === 'not_found' && 'קישור לא תקין'}
            {error === 'meeting_closed' && 'הפגישה כבר לא פעילה'}
            {error === 'missing_token' && 'קישור חסר'}
            {error === 'unknown' && 'שגיאה'}
          </h2>
          <p className="text-sm" style={{ color: '#8a7060' }}>
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
    return (
      <div className="portal-theme min-h-screen flex items-center justify-center p-4" dir="rtl">
        <div className="p-card text-center space-y-5 max-w-sm p-10">
          <div className="flex justify-center"><ArtIcon name="check" size={88} /></div>
          <h2 className="p-display text-3xl">הפגישה נקבעה!</h2>
          <p style={{ color: '#4a3728' }}>
            {meetingData.type_label} — {dt.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' '}בשעה {dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {(() => {
            const fmt = (d) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
            const start = new Date(scheduledTime);
            const end = new Date(start.getTime() + (meetingData.duration || 45) * 60 * 1000);
            const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetingData.type_label + ' - Michal Wolberger Studio')}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(meetingData.location || '')}`;
            return (
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-btn text-sm"
              >
                הוסף ליומן Google <span className="p-arrow">←</span>
              </a>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="portal-theme min-h-screen flex items-center justify-center p-4 py-12" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src={LOGO} alt="סטודיו מיכל וולברגר" className="h-14 w-auto mx-auto mb-5" />
          <p className="p-label mb-2">מיכל וולברגר · סטודיו לעיצוב פנים</p>
          <h1 className="p-display p-hero-title text-3xl">שלום, {meetingData.client_name}</h1>
          <p className="mt-2 text-sm" style={{ color: '#8a7060' }}>נא לבחור מועד נוח לפגישה</p>
        </div>
        <div className="flex justify-center">
          <ArtIcon name="calendar" size={72} />
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