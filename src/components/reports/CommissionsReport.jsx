import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_LABELS = { pending: 'ממתין', invoiced: 'נשלחה דרישה', received: 'התקבלה' };
const STATUS_COLORS = { pending: 'bg-amber-100 text-amber-700', invoiced: 'bg-blue-100 text-blue-700', received: 'bg-green-100 text-green-700' };

export default function CommissionsReport() {
  const [viewMode, setViewMode] = useState('supplier');

  const { data: commissions = [] } = useQuery({
    queryKey: ['all-commissions'],
    queryFn: () => base44.entities.Commission.list('-created_date', 500),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 500),
  });

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  const totalExpected = commissions.reduce((s, c) => s + (c.commission_amount || 0), 0);
  const totalReceived = commissions.filter(c => c.status === 'received').reduce((s, c) => s + (c.commission_amount || 0), 0);
  const totalPending = totalExpected - totalReceived;

  // Group by supplier
  const bySupplier = {};
  commissions.forEach(c => {
    const sid = c.supplier_id;
    if (!bySupplier[sid]) bySupplier[sid] = { expected: 0, received: 0, pending: 0, count: 0 };
    bySupplier[sid].expected += c.commission_amount || 0;
    bySupplier[sid].count++;
    if (c.status === 'received') bySupplier[sid].received += c.commission_amount || 0;
    else bySupplier[sid].pending += c.commission_amount || 0;
  });

  const supplierRows = Object.entries(bySupplier)
    .map(([sid, agg]) => ({ supplier: supplierMap[sid], ...agg }))
    .sort((a, b) => b.expected - a.expected);

  const chartData = supplierRows.slice(0, 10).map(r => ({
    name: r.supplier?.name || '—',
    התקבל: r.received,
    ממתין: r.pending,
  }));

  return (
    <div className="space-y-6" id="report-content">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">סה״כ עמלות צפויות</p>
            <p className="text-2xl font-bold font-heading">₪{totalExpected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">התקבל</p>
            <p className="text-2xl font-bold font-heading text-green-600">₪{totalReceived.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">לגבייה</p>
            <p className="text-2xl font-bold font-heading text-amber-600">₪{totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading">עמלות לפי ספק</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis />
                  <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                  <Bar dataKey="התקבל" fill="hsl(var(--chart-4))" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="ממתין" fill="hsl(var(--chart-3))" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">תצוגה:</span>
        <Select value={viewMode} onValueChange={setViewMode}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="supplier">לפי ספק</SelectItem>
            <SelectItem value="all">כל העסקאות</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            {viewMode === 'supplier' ? 'עמלות לפי ספק' : 'כל העמלות'} ({viewMode === 'supplier' ? supplierRows.length : commissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {viewMode === 'supplier' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">ספק</TableHead>
                  <TableHead className="text-right">עמלה %</TableHead>
                  <TableHead className="text-right">צפוי</TableHead>
                  <TableHead className="text-right">התקבל</TableHead>
                  <TableHead className="text-right">ממתין</TableHead>
                  <TableHead className="text-right">עסקאות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.supplier?.name || '—'}</TableCell>
                    <TableCell>{r.supplier?.commission_rate || '—'}%</TableCell>
                    <TableCell>₪{r.expected.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">₪{r.received.toLocaleString()}</TableCell>
                    <TableCell className="text-amber-600">₪{r.pending.toLocaleString()}</TableCell>
                    <TableCell>{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">ספק</TableHead>
                  <TableHead className="text-right">פרויקט</TableHead>
                  <TableHead className="text-right">סכום בסיס</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">עמלה</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{supplierMap[c.supplier_id]?.name || '—'}</TableCell>
                    <TableCell>{projectMap[c.project_id]?.name || '—'}</TableCell>
                    <TableCell>₪{(c.purchase_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>{c.commission_rate}%</TableCell>
                    <TableCell className="font-semibold">₪{(c.commission_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[c.status] || ''}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}