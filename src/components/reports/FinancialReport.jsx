import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import StatusBadge from '@/components/shared/StatusBadge';

const COLORS = ['hsl(80, 60%, 35%)', 'hsl(28, 80%, 52%)', 'hsl(4, 70%, 50%)', 'hsl(22, 30%, 50%)'];

export default function FinancialReport({ payments, projects }) {
  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.name; });

  const totalExpected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const totalPending = totalExpected - totalPaid - totalOverdue;

  const pieData = [
    { name: 'שולם', value: totalPaid },
    { name: 'ממתין', value: Math.max(0, totalPending) },
    { name: 'באיחור', value: totalOverdue },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6" id="report-content">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">סה״כ צפוי</p>
            <p className="text-2xl font-bold font-heading">₪{totalExpected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">שולם</p>
            <p className="text-2xl font-bold font-heading text-green-600">₪{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">באיחור</p>
            <p className="text-2xl font-bold font-heading text-red-600">₪{totalOverdue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">חלוקת תשלומים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ₪${value.toLocaleString()}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">פירוט תשלומים ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">פרויקט</TableHead>
                <TableHead className="text-right">אבן דרך</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">שולם</TableHead>
                <TableHead className="text-right">תאריך יעד</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{projectMap[p.project_id] || '—'}</TableCell>
                  <TableCell>{p.milestone}</TableCell>
                  <TableCell>₪{(p.amount || 0).toLocaleString()}</TableCell>
                  <TableCell>₪{(p.amount_paid || 0).toLocaleString()}</TableCell>
                  <TableCell>{p.due_date || '—'}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}