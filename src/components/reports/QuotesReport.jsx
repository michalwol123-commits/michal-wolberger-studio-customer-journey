import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_LABELS = {
  draft: 'טיוטה',
  sent: 'נשלח',
  sent_for_signature: 'נשלחה הצעה לחתימה',
  contract_sent_for_signature: 'נשלח הסכם לחתימה',
  approved: 'מאושר',
  rejected: 'נדחה',
  expired: 'פג תוקף',
};

const PACKAGE_LABELS = { basic: 'בסיסי', mid: 'בינוני', premium: 'פרימיום' };
const FUNNEL_COLORS = ['#94a3b8', '#3b82f6', '#8b5cf6', '#6366f1', '#22c55e', '#ef4444', '#6b7280'];

export default function QuotesReport({ quotes, clients }) {
  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });

  // Funnel data
  const funnelSteps = ['draft', 'sent', 'sent_for_signature', 'contract_sent_for_signature', 'approved', 'rejected', 'expired'];
  const funnelData = funnelSteps.map(s => ({
    name: STATUS_LABELS[s],
    value: quotes.filter(q => q.status === s).length,
  }));

  // Conversion stats
  const total = quotes.length;
  const sent = quotes.filter(q => ['sent', 'sent_for_signature', 'contract_sent_for_signature', 'approved', 'rejected', 'expired'].includes(q.status)).length;
  const approved = quotes.filter(q => q.status === 'approved').length;
  const conversionRate = sent > 0 ? Math.round((approved / sent) * 100) : 0;

  // Average time to approval
  const approvedQuotes = quotes.filter(q => q.status === 'approved' && q.approved_at && q.sent_at);
  const avgDaysToApprove = approvedQuotes.length > 0
    ? Math.round(approvedQuotes.reduce((sum, q) => {
        const diff = (new Date(q.approved_at) - new Date(q.sent_at)) / (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0) / approvedQuotes.length)
    : null;

  // By package
  const byPackage = {};
  quotes.forEach(q => {
    const pkg = q.package_type || 'unknown';
    if (!byPackage[pkg]) byPackage[pkg] = { count: 0, total: 0, approved: 0 };
    byPackage[pkg].count++;
    byPackage[pkg].total += q.total_amount || 0;
    if (q.status === 'approved') byPackage[pkg].approved++;
  });

  const totalAmount = quotes.reduce((s, q) => s + (q.total_amount || 0), 0);
  const approvedAmount = quotes.filter(q => q.status === 'approved').reduce((s, q) => s + (q.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">סה״כ הצעות</p>
            <p className="text-2xl font-bold font-heading">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">אחוז המרה</p>
            <p className="text-2xl font-bold font-heading text-green-600">{conversionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">ממוצע ימים לאישור</p>
            <p className="text-2xl font-bold font-heading">{avgDaysToApprove ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">סכום שאושר</p>
            <p className="text-2xl font-bold font-heading">₪{approvedAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader><CardTitle className="text-base">Funnel הצעות</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={funnelData} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* By package */}
      <Card>
        <CardHeader><CardTitle className="text-base">פילוח לפי חבילה</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right px-3 py-2 font-medium">חבילה</th>
                  <th className="text-right px-3 py-2 font-medium">כמות</th>
                  <th className="text-right px-3 py-2 font-medium">סכום כולל</th>
                  <th className="text-right px-3 py-2 font-medium">אושרו</th>
                  <th className="text-right px-3 py-2 font-medium">% המרה</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byPackage).map(([pkg, d]) => (
                  <tr key={pkg} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{PACKAGE_LABELS[pkg] || pkg}</td>
                    <td className="px-3 py-2">{d.count}</td>
                    <td className="px-3 py-2">₪{d.total.toLocaleString()}</td>
                    <td className="px-3 py-2">{d.approved}</td>
                    <td className="px-3 py-2">{d.count > 0 ? Math.round((d.approved / d.count) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}