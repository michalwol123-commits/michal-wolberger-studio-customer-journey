import React from 'react';
import STAGES from '@/lib/stageConfig';

const CheckMark = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

function StageCircle({ status, isCurrent, num, size = 34 }) {
  const base = {
    width: size, height: size, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.3s ease',
    fontFamily: "'Frank Ruhl Libre', serif", fontSize: size * 0.4,
  };
  if (status === 'completed') {
    return (
      <div style={{ ...base, background: '#6b7a4f', border: '1.5px solid #6b7a4f', color: '#eef0e4' }}>
        <CheckMark className="w-4 h-4" />
      </div>
    );
  }
  if (isCurrent || status === 'in_progress') {
    return (
      <div style={{ ...base, background: '#2a1f18', border: '1.5px solid #2a1f18', color: '#f5f0eb', boxShadow: '0 0 0 3px #f5f0eb, 0 0 0 4.5px #c8bdb2' }}>
        {num}
      </div>
    );
  }
  return (
    <div style={{ ...base, background: 'transparent', border: '1.5px solid #4a3728', color: '#4a3728' }}>
      {num}
    </div>
  );
}

export default function PortalTimeline({ project, selectedStage, onSelectStage }) {
  return (
    <>
      {/* מובייל — פס אופקי */}
      <div className="lg:hidden overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex items-start gap-1 min-w-max">
          {STAGES.map((stage, i) => {
            const status = project[stage.key] || 'pending';
            const isCurrent = project.stage_current === stage.num;
            const isSelected = selectedStage === stage.num;
            return (
              <React.Fragment key={stage.key}>
                <button onClick={() => onSelectStage(stage.num)} className="flex flex-col items-center gap-1.5 w-16 group">
                  <StageCircle status={status} isCurrent={isCurrent} num={stage.num} size={32} />
                  <span
                    className="text-[10px] leading-tight text-center"
                    style={{ color: isSelected ? '#2a1f18' : '#8a7060', fontWeight: isSelected ? 500 : 400 }}
                  >
                    {stage.shortLabel}
                  </span>
                </button>
                {i < STAGES.length - 1 && (
                  <div className="h-px w-3 mt-4 shrink-0" style={{ background: status === 'completed' ? '#6b7a4f' : '#e0d8ce' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* דסקטופ — ציר אנכי */}
      <div className="hidden lg:block space-y-0">
        {STAGES.map((stage, i) => {
          const status = project[stage.key] || 'pending';
          const isCurrent = project.stage_current === stage.num;
          const isSelected = selectedStage === stage.num;
          return (
            <button
              key={stage.key}
              onClick={() => onSelectStage(stage.num)}
              className="w-full flex items-stretch gap-3 text-right px-2 transition-all group"
              style={{ background: isSelected ? '#f0ebe4' : 'transparent' }}
            >
              <div className="flex flex-col items-center py-1.5">
                <StageCircle status={status} isCurrent={isCurrent} num={stage.num} />
                {i < STAGES.length - 1 && (
                  <div className="w-px flex-1 min-h-[14px] mt-1" style={{ background: status === 'completed' ? '#6b7a4f' : '#e0d8ce' }} />
                )}
              </div>
              <div className="pt-2.5 flex-1 flex items-start justify-between">
                <p
                  className="text-sm transition-colors group-hover:opacity-80"
                  style={{
                    color: isSelected || isCurrent ? '#2a1f18' : status === 'completed' ? '#4a3728' : '#8a7060',
                    fontWeight: isSelected ? 500 : 400,
                  }}
                >
                  שלב {stage.num} — {stage.shortLabel}
                </p>
                <span
                  className="text-xs mt-0.5 transition-transform group-hover:-translate-x-1"
                  style={{ color: '#c8bdb2' }}
                >←</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}