import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import StatusBadge from '@/components/shared/StatusBadge';

const SOURCE_LABELS = {
  facebook: 'פייסבוק', instagram: 'אינסטגרם', referral: 'הפניה',
  google: 'גוגל', website: 'אתר', whatsapp: 'וואטסאפ', other: 'אחר'
};

const INTEREST_LABELS = { hot: 'חם', warm: 'פושר', cold: 'קר' };
const COLORS = ['hsl(22, 30%, 50%)', 'hsl(180, 14%, 55%)', 'hsl(28, 52%, 64%)', 'hsl(80, 60%, 35%)', 'hsl(4, 70%, 50%)', 'hsl(250, 50%, 60%)', 'hsl(45, 80%, 50%)'];

export default function LeadsReport({ clients }) {
  const leads = clients.filter(c => ['lead', 'qualified', 'proposal_sent'].includes(c.status));
  const converted = clients.filter(c => ['proposal_approved', 'active_client', 'completed_client'].includes(c.status));
  const conversionRate = clients.length > 0 ? Math.round((converted.length / clients.length) * 100) : 0;

  // By source
  const sourceMap = {};
  clients.forEach(c => {
    const src = c.source || 'other';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap).map(([k, v]) => ({ name: SOURCE_LABELS[k] || k, value: v }));

  // By interest
  const interestMap = {};
  leads.forEach(c => {
    const lvl = c.interest_level || 'cold';
    interestMap[lvl] = (interestMap[lvl] || 0) + 1;
  });
  const interestData = Object.entries(interestMap).map(([k, v]) => ({ name: INTEREST_LABELS[k] || k, count: v }));

  return (
    <div className="space-y-6" id="report-content">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">סה״כ לידים</p>
            <p className="text-2xl font-bold font-heading">{clients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">לידים פעילים</p>
            <p className="text-2xl font-bold font-heading">{leads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">אחוז המרה</p>
            <p className="text-2xl font-bold font-heading">{conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-heading">לפי מקור</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-heading">רמת עניין (לידים פעילים)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interestData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="לידים" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading">לידים פעילים ({leads.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">מקור</TableHead>
                <TableHead className="text-right">עניין</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">תקציב משוער</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell dir="ltr">{c.phone}</TableCell>
                  <TableCell>{SOURCE_LABELS[c.source] || c.source || '—'}</TableCell>
                  <TableCell>{INTEREST_LABELS[c.interest_level] || '—'}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell>{c.estimated_budget ? `₪${c.estimated_budget.toLocaleString()}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}