import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChartIcon } from 'lucide-react';

const STATUS_CONFIG = [
  { key: 'lead', label: 'ליד', color: '#3b82f6' },
  { key: 'qualified', label: 'מתעניין', color: '#8b5cf6' },
  { key: 'proposal_sent', label: 'הצעה נשלחה', color: '#f59e0b' },
  { key: 'proposal_approved', label: 'הצעה אושרה', color: '#22c55e' },
  { key: 'active_client', label: 'לקוח פעיל', color: '#10b981' },
  { key: 'completed_client', label: 'הושלם', color: '#64748b' },
];

export default function PipelineChart({ clients }) {
  const data = STATUS_CONFIG
    .map(s => ({ name: s.label, value: clients.filter(c => c.status === s.key).length, color: s.color }))
    .filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-primary" />
            Pipeline לקוחות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">אין נתונים להצגה</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-primary" />
          Pipeline לקוחות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              dataKey="value"
              paddingAngle={3}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, 'לקוחות']} />
            <Legend
              verticalAlign="bottom"
              iconSize={10}
              formatter={(value) => <span className="text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}