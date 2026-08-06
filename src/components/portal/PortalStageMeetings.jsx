import React from 'react';
import { format } from 'date-fns';
import ArtIcon from './ArtIcon';

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
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="clock" size={48} />
        <div>
          <p className="p-label mb-0.5">נפגשות</p>
          <h3 className="p-display text-lg">פגישות</h3>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {relevantMeetings.map(m => (
          <div key={m.id} className="p-4 space-y-3" style={{ border: '1px solid #e8e0d8' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: '#2a1f18' }}>{typeLabels[m.type] || m.type}</span>
              <span
                className="p-label !text-[10px] px-2.5 py-1"
                style={m.status === 'completed'
                  ? { background: '#eef0e4', color: '#6b7a4f', border: '1px solid #6b7a4f' }
                  : { background: '#f0ebe4', color: '#4a3728', border: '1px solid #e0d8ce' }}
              >
                {m.status === 'completed' ? 'התקיימה' : 'מתוכננת'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: '#8a7060' }}>
              {m.scheduled_at && (
                <span>{format(new Date(m.scheduled_at), 'dd/MM/yyyy HH:mm')}</span>
              )}
              {!m.scheduled_at && m.scheduling_token && (
                <a href={`/schedule?token=${m.scheduling_token}`} target="_blank" rel="noopener noreferrer"
                  className="p-btn text-xs !py-1.5 !px-4">
                  קבעי מועד <span className="p-arrow">←</span>
                </a>
              )}
              {m.location && <span>{m.location}</span>}
            </div>
            {m.summary && (
              <div className="pt-3" style={{ borderTop: '1px solid #e8e0d8' }}>
                <p className="p-label !text-[10px] mb-1">סיכום</p>
                <p className="text-sm leading-relaxed" style={{ color: '#4a3728' }}>{m.summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}