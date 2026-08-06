import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ArtIcon from './ArtIcon';

function ThinBar({ pct }) {
  return (
    <div className="w-full" style={{ height: 2, background: '#e8e0d8' }}>
      <div style={{ height: 2, background: pct > 110 ? '#8a5a4a' : '#2a1f18', width: `${Math.min(pct, 100)}%`, transition: 'width 0.5s ease' }} />
    </div>
  );
}

export default function PortalBudgetView({ project }) {
  const { data: budgetItems = [] } = useQuery({
    queryKey: ['portal-budget', project.id],
    queryFn: () => base44.entities.BudgetItem.filter({ project_id: project.id }),
  });

  if (budgetItems.length === 0) return null;

  // Group by category and compute percentages
  const categoryMap = {};
  budgetItems.forEach(item => {
    const cat = item.category || 'כללי';
    if (!categoryMap[cat]) categoryMap[cat] = { planned: 0, actual: 0 };
    categoryMap[cat].planned += item.planned_amount || 0;
    categoryMap[cat].actual += item.actual_amount || 0;
  });

  const categories = Object.entries(categoryMap)
    .map(([name, data]) => ({
      name,
      planned: data.planned,
      actual: data.actual,
      pct: data.planned > 0 ? Math.round((data.actual / data.planned) * 100) : 0,
    }))
    .sort((a, b) => b.planned - a.planned);

  const totalPlanned = categories.reduce((s, c) => s + c.planned, 0);
  const totalActual = categories.reduce((s, c) => s + c.actual, 0);
  const totalPct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  const pctColor = (pct) => pct > 110 ? '#8a5a4a' : pct > 90 ? '#8a7060' : '#6b7a4f';

  return (
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="coin" size={48} floatDelay={3} />
        <div>
          <p className="p-label mb-0.5">תקציב</p>
          <h3 className="p-display text-lg">מעקב תקציב</h3>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {/* Overall */}
        <div className="p-4" style={{ background: '#f0ebe4', border: '1px solid #e8e0d8' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: '#2a1f18' }}>ניצול כולל</span>
            <span className="p-display text-lg" style={{ color: pctColor(totalPct) }}>{totalPct}%</span>
          </div>
          <ThinBar pct={totalPct} />
        </div>

        {/* By category */}
        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: '#4a3728' }}>{cat.name}</span>
                <span className="text-xs" style={{ color: pctColor(cat.pct) }}>{cat.pct}%</span>
              </div>
              <ThinBar pct={cat.pct} />
            </div>
          ))}
        </div>

        <p className="p-label !text-[10px] text-center">* אחוז הניצול מתוך התקציב המתוכנן</p>
      </div>
    </div>
  );
}