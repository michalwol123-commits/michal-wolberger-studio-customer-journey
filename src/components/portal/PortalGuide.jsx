import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ArtIcon from './ArtIcon';

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #e8e0d8' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3.5 text-right text-sm transition-colors group">
        <span style={{ color: '#2a1f18' }}>{q}</span>
        <span className="shrink-0 text-xs transition-transform" style={{ color: '#8a7060', transform: open ? 'rotate(90deg)' : 'none' }}>←</span>
      </button>
      {open && <p className="text-sm pb-4 whitespace-pre-line leading-relaxed" style={{ color: '#8a7060' }}>{a}</p>}
    </div>
  );
}

export default function PortalGuide() {
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['portal-guide-sections'],
    queryFn: async () => (await base44.entities.PortalGuideSection.filter({ is_active: true }, { sort: 'order', limit: 50 })).items,
  });
  if (isLoading) return <p className="text-center text-sm" style={{ color: '#8a7060' }}>טוען...</p>;
  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div className="text-center mb-10">
        <p className="p-label mb-2">כל מה שצריך לדעת</p>
        <h2 className="p-display text-3xl md:text-4xl" style={{ fontWeight: 300 }}>מדריך שימוש בפורטל</h2>
      </div>

      {sections.map((section, i) => (
        <div key={i} className="p-card">
          <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
            <ArtIcon name={section.art} size={52} floatDelay={i} />
            <h3 className="p-display text-lg">{section.title}</h3>
          </div>
          <div className="px-6 py-5">
            {section.content && (
              <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: '#4a3728' }}>{section.content}</p>
            )}
            {section.items?.length > 0 && (
              <div>
                {section.items.map((item, j) => (
                  <AccordionItem key={j} q={item.q} a={item.a} />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}