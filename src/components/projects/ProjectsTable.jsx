import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/shared/StatusBadge';
import DeleteButton from '@/components/shared/DeleteButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

export default function ProjectsTable({ projects, clientMap, onDelete, selectedIds, onToggleSelect, onToggleAll, isAdmin }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {isAdmin && (
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={selectedIds?.length === projects.length && projects.length > 0} onCheckedChange={onToggleAll} />
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium">שם</th>
              <th className="text-right px-4 py-3 font-medium">לקוח</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">שלב</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">התקדמות</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">תקציב</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              {isAdmin && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => {
              const client = clientMap[p.client_id];
              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <Checkbox checked={selectedIds?.includes(p.id)} onCheckedChange={() => onToggleSelect(p.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link to={`/projects/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{client?.name || '—'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{p.stage_current || 1}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Progress value={p.progress || 0} className="h-1.5 w-20" />
                      <span className="text-xs text-muted-foreground">{p.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {p.total_budget ? `₪${p.total_budget.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  {isAdmin && (
                    <td className="px-2">
                      <DeleteButton onDelete={() => onDelete(p.id)} entityLabel="פרויקט" />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}