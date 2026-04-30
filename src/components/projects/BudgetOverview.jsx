import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import EmptyState from '@/components/shared/EmptyState';
import AddBudgetItemDialog from './AddBudgetItemDialog';

export default function BudgetOverview({ projectId, totalBudget }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ['budget-items', projectId],
    queryFn: () => base44.entities.BudgetItem.filter({ project_id: projectId }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget-items', projectId] }),
  });

  const { totalPlanned, totalActual, chartData } = useMemo(() => {
    let planned = 0, actual = 0;
    const byCategory = {};

    items.forEach(item => {
      planned += item.planned_amount || 0;
      actual += item.actual_amount || 0;
      if (!byCategory[item.category]) {
        byCategory[item.category] = { category: item.category, planned: 0, actual: 0 };
      }
      byCategory[item.category].planned += item.planned_amount || 0;
      byCategory[item.category].actual += item.actual_amount || 0;
    });

    return { totalPlanned: planned, totalActual: actual, chartData: Object.values(byCategory) };
  }, [items]);

  const usagePercent = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
  const overBudget = totalActual > totalPlanned;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <Card className="px-4 py-2">
            <div className="text-xs text-muted-foreground">מתוכנן</div>
            <div className="font-bold text-lg">₪{totalPlanned.toLocaleString()}</div>
          </Card>
          <Card className="px-4 py-2">
            <div className="text-xs text-muted-foreground">בפועל</div>
            <div className={`font-bold text-lg ${overBudget ? 'text-destructive' : ''}`}>₪{totalActual.toLocaleString()}</div>
          </Card>
          <Card className="px-4 py-2">
            <div className="text-xs text-muted-foreground">ניצול</div>
            <div className={`font-bold text-lg ${overBudget ? 'text-destructive' : ''}`}>{usagePercent}%</div>
          </Card>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setShowAdd(true); }} className="gap-1">
          <Plus className="w-4 h-4" />פריט תקציב
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="אין פריטי תקציב" description="הוסיפי פריטי תקציב לפרויקט" />
      ) : (
        <>
          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-card border rounded-xl p-4 mb-4">
              <h4 className="font-heading font-semibold text-sm mb-3">מתוכנן vs בפועל</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} layout="vertical" margin={{ right: 20 }}>
                  <XAxis type="number" tickFormatter={v => `₪${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="planned" name="מתוכנן" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="actual" name="בפועל" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right px-4 py-2 font-medium">קטגוריה</th>
                  <th className="text-right px-4 py-2 font-medium">מתוכנן</th>
                  <th className="text-right px-4 py-2 font-medium">בפועל</th>
                  <th className="text-right px-4 py-2 font-medium">הפרש</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const diff = (item.actual_amount || 0) - (item.planned_amount || 0);
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{item.category}</td>
                      <td className="px-4 py-2">₪{(item.planned_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-2">₪{(item.actual_amount || 0).toLocaleString()}</td>
                      <td className={`px-4 py-2 ${diff > 0 ? 'text-destructive' : diff < 0 ? 'text-emerald-600' : ''}`}>
                        {diff > 0 ? '+' : ''}₪{diff.toLocaleString()}
                      </td>
                      <td className="px-2 flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => { setEditItem(item); setShowAdd(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AddBudgetItemDialog
        open={showAdd}
        onOpenChange={(open) => { setShowAdd(open); if (!open) setEditItem(null); }}
        projectId={projectId}
        initialData={editItem}
      />
    </div>
  );
}