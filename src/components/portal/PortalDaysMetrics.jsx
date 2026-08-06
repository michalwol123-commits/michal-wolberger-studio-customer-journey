import React from 'react';
import ArtIcon from './ArtIcon';

function DayRing({ label, art, planned, actual, floatDelay = 0 }) {
  if (!planned) return null;
  const pct = Math.min((actual / planned) * 100, 100);
  const remaining = Math.max(0, planned - actual);

  const color = pct >= 100 ? '#6b7a4f' : '#2a1f18';
  const dashLen = pct * 2.827;

  return (
    <div className="flex flex-col items-center p-5" style={{ background: '#f0ebe4', border: '1px solid #e8e0d8' }}>
      <ArtIcon name={art} size={44} floatDelay={floatDelay} />
      <p className="p-label mt-2 mb-2">{label}</p>
      <svg viewBox="0 0 100 100" className="w-20 h-20 transform -rotate-90 mb-2">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e0d8ce" strokeWidth="3" />
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dashLen} 282.7`}
        />
      </svg>
      <p className="p-display text-lg" dir="ltr" style={{ color }}>{actual}/{planned}</p>
      <p className="text-[11px]" style={{ color: '#8a7060' }}>
        {remaining > 0 ? `נותרו ${remaining} ימים` : 'הושלם'}
      </p>
    </div>
  );
}

export default function PortalDaysMetrics({ project, stageNum }) {
  const show = {
    shopping:     stageNum === 9 || stageNum === 12 || (!stageNum),
    supervision:  stageNum === 11 || stageNum === 12 || (!stageNum),
    installation: stageNum === 12 || (!stageNum),
  };
  const hasAny = (show.shopping && project.shopping_days_planned)
    || (show.supervision && project.supervision_days_planned)
    || (show.installation && project.installation_days_planned);
  if (!hasAny) return null;

  return (
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="clock" size={48} floatDelay={1} />
        <div>
          <p className="p-label mb-0.5">ימים בפרויקט</p>
          <h3 className="p-display text-lg">מעקב ימים</h3>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {show.shopping && <DayRing label="ימי קניות" art="box" floatDelay={0} planned={project.shopping_days_planned} actual={project.shopping_days_actual || 0} />}
          {show.supervision && <DayRing label="ימי פיקוח" art="camera" floatDelay={1} planned={project.supervision_days_planned} actual={project.supervision_days_actual || 0} />}
          {show.installation && <DayRing label="ימי התקנות" art="home" floatDelay={2} planned={project.installation_days_planned} actual={project.installation_days_actual || 0} />}
        </div>
      </div>
    </div>
  );
}