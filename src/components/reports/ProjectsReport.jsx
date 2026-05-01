import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatusBadge from '@/components/shared/StatusBadge';
import STAGES from '@/lib/stageConfig';

export default function ProjectsReport({ projects, clients }) {
  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c.name; });

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'on_hold');

  const stageData = [];
  for (let i = 1; i <= 13; i++) {
    const count = activeProjects.filter(p => p.stage_current === i).length;
    stageData.push({ name: `שלב ${i}`, count });
  }

  return (
    <div className="space-y-6" id="report-content">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">התפלגות פרויקטים לפי שלב</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="פרויקטים" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">פרויקטים פעילים ({activeProjects.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">פרויקט</TableHead>
                <TableHead className="text-right">לקוח</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">שלב</TableHead>
                <TableHead className="text-right">התקדמות</TableHead>
                <TableHead className="text-right">תקציב</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeProjects.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{clientMap[p.client_id] || '—'}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell>{STAGES[p.stage_current - 1]?.name || `שלב ${p.stage_current}`}</TableCell>
                  <TableCell>{p.progress || 0}%</TableCell>
                  <TableCell>{p.total_budget ? `₪${p.total_budget.toLocaleString()}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}