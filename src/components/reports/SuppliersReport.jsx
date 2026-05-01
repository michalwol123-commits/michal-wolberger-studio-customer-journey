import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SupplierCategoryBadge from '@/components/suppliers/SupplierCategoryBadge';
import { Star } from 'lucide-react';

export default function SuppliersReport({ suppliers, projectSuppliers, projects }) {
  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.name; });
  const supplierMap = {};
  suppliers.forEach(s => { supplierMap[s.id] = s; });

  // Aggregate by supplier
  const supplierAgg = {};
  projectSuppliers.forEach(ps => {
    const sid = ps.supplier_id;
    if (!supplierAgg[sid]) supplierAgg[sid] = { projects: 0, totalAgreed: 0 };
    supplierAgg[sid].projects++;
    supplierAgg[sid].totalAgreed += ps.agreed_amount || 0;
  });

  // Category distribution
  const catMap = {};
  suppliers.forEach(s => {
    catMap[s.category] = (catMap[s.category] || 0) + 1;
  });
  const catData = Object.entries(catMap).map(([k, v]) => ({ name: k, count: v }));

  const activeSuppliers = suppliers.filter(s => s.is_active !== false);

  return (
    <div className="space-y-6" id="report-content">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">ספקים פעילים</p>
            <p className="text-2xl font-bold font-heading">{activeSuppliers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">שיוכי ספק-פרויקט</p>
            <p className="text-2xl font-bold font-heading">{projectSuppliers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">סה״כ סכומים מוסכמים</p>
            <p className="text-2xl font-bold font-heading">₪{Object.values(supplierAgg).reduce((s, a) => s + a.totalAgreed, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading">ספקים לפי קטגוריה</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="ספקים" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading">רשימת ספקים ({activeSuppliers.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">קטגוריה</TableHead>
                <TableHead className="text-right">דירוג</TableHead>
                <TableHead className="text-right">רמת מחיר</TableHead>
                <TableHead className="text-right">פרויקטים</TableHead>
                <TableHead className="text-right">סכום מוסכם</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeSuppliers.map(s => {
                const agg = supplierAgg[s.id] || { projects: 0, totalAgreed: 0 };
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><SupplierCategoryBadge category={s.category} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {s.rating ? <><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{s.rating}</> : '—'}
                      </div>
                    </TableCell>
                    <TableCell>{s.price_level === 'low' ? 'נמוך' : s.price_level === 'mid' ? 'בינוני' : s.price_level === 'high' ? 'גבוה' : '—'}</TableCell>
                    <TableCell>{agg.projects}</TableCell>
                    <TableCell>{agg.totalAgreed > 0 ? `₪${agg.totalAgreed.toLocaleString()}` : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}