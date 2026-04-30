import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function RevenueForecast({ payments }) {
  const now = new Date();
  const months = [];

  for (let i = -2; i <= 5; i++) {
    const monthDate = addMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const label = format(monthDate, 'MM/yy');

    const paid = payments
      .filter(p => p.status === 'paid' && p.paid_date && isWithinInterval(new Date(p.paid_date), { start, end }))
      .reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);

    const expected = payments
      .filter(p => (p.status === 'pending' || p.status === 'partial') && p.due_date && isWithinInterval(new Date(p.due_date), { start, end }))
      .reduce((sum, p) => sum + ((p.amount || 0) - (p.amount_paid || 0)), 0);

    months.push({ label, paid, expected });
  }

  const hasData = months.some(m => m.paid > 0 || m.expected > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          תחזית הכנסות
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground text-center py-8">אין נתוני תשלומים</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={months} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value, name) => [`₪${value.toLocaleString()}`, name === 'paid' ? 'שולם' : 'צפוי']}
                labelFormatter={(label) => `חודש ${label}`}
              />
              <Bar dataKey="paid" name="שולם" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expected" name="צפוי" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}