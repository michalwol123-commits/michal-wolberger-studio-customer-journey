import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';

export default function ProjectsTable({ projects, clientMap }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">שם</TableHead>
            <TableHead className="text-right">לקוח</TableHead>
            <TableHead className="text-right hidden sm:table-cell">שלב</TableHead>
            <TableHead className="text-right hidden md:table-cell">התקדמות</TableHead>
            <TableHead className="text-right hidden md:table-cell">תקציב</TableHead>
            <TableHead className="text-right">סטטוס</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map(p => {
            const client = clientMap[p.client_id];
            return (
              <TableRow key={p.id} className="hover:bg-muted/30">
                <TableCell>
                  <Link to={`/projects/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                </TableCell>
                <TableCell>{client?.name || '—'}</TableCell>
                <TableCell className="hidden sm:table-cell">{p.stage_current || 1}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <Progress value={p.progress || 0} className="h-1.5 w-16" />
                    <span className="text-xs text-muted-foreground">{p.progress || 0}%</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {p.total_budget ? `₪${p.total_budget.toLocaleString()}` : '—'}
                </TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}