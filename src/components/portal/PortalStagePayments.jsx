import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

export default function PortalStagePayments({ payments, stageNum }) {
  // Stage 3 shows all payments (quote payment + advance + mid + final)
  // Other stages show only payments with matching milestone_stage
  const stagePayments = stageNum === 3
    ? payments
    : payments.filter(p => p.milestone_stage === stageNum);

  if (stagePayments.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          תשלומים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-right px-3 py-2 font-medium">אבן דרך</th>
                <th className="text-right px-3 py-2 font-medium">סכום</th>
                <th className="text-right px-3 py-2 font-medium">תאריך יעד</th>
                <th className="text-right px-3 py-2 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {stagePayments.map(pay => (
                <tr key={pay.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5">{pay.milestone}</td>
                  <td className="px-3 py-2.5 font-medium">₪{pay.amount?.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {pay.due_date ? format(new Date(pay.due_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={pay.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}