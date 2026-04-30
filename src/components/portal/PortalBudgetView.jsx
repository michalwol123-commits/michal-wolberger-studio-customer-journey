import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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

  const pctColor = (pct) => pct > 110 ? 'text-red-600' : pct > 90 ? 'text-amber-600' : 'text-green-600';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          מעקב תקציב
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">ניצול כולל</span>
            <span className={`text-sm font-bold ${pctColor(totalPct)}`}>{totalPct}%</span>
          </div>
          <Progress value={Math.min(totalPct, 100)} className="h-2.5" />
        </div>

        {/* By category */}
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{cat.name}</span>
                <span className={`text-xs font-semibold ${pctColor(cat.pct)}`}>{cat.pct}%</span>
              </div>
              <Progress value={Math.min(cat.pct, 100)} className="h-1.5" />
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">* אחוז הניצול מתוך התקציב המתוכנן</p>
      </CardContent>
    </Card>
  );
}