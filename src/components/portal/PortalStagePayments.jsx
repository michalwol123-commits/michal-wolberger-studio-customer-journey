import React from 'react';
import { format } from 'date-fns';
import ArtIcon from './ArtIcon';

const payStatusStyle = {
  paid: { color: '#6b7a4f', label: 'שולם' },
  partial: { color: '#8a7060', label: 'חלקי' },
  pending: { color: '#8a7060', label: 'ממתין' },
  overdue: { color: '#8a5a4a', label: 'באיחור' },
};

export default function PortalStagePayments({ payments, stageNum }) {
  // Stage 3 shows all payments (quote payment + advance + mid + final)
  // Other stages show only payments with matching milestone_stage
  const stagePayments = stageNum === 3
    ? payments
    : payments.filter(p => p.milestone_stage === stageNum);

  if (stagePayments.length === 0) return null;

  return (
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="coin" size={48} floatDelay={2} />
        <div>
          <p className="p-label mb-0.5">כספים</p>
          <h3 className="p-display text-lg">תשלומים</h3>
        </div>
      </div>
      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #e0d8ce' }}>
                <th className="text-right px-3 py-2"><span className="p-label !text-[10px]">אבן דרך</span></th>
                <th className="text-right px-3 py-2"><span className="p-label !text-[10px]">סכום</span></th>
                <th className="text-right px-3 py-2"><span className="p-label !text-[10px]">תאריך יעד</span></th>
                <th className="text-right px-3 py-2"><span className="p-label !text-[10px]">סטטוס</span></th>
              </tr>
            </thead>
            <tbody>
              {stagePayments.map(pay => {
                const st = payStatusStyle[pay.status] || payStatusStyle.pending;
                return (
                  <tr key={pay.id} style={{ borderBottom: '1px solid #e8e0d8' }}>
                    <td className="px-3 py-3" style={{ color: '#4a3728' }}>{pay.milestone}</td>
                    <td className="px-3 py-3 p-display" style={{ color: '#2a1f18' }}>₪{pay.amount?.toLocaleString()}</td>
                    <td className="px-3 py-3" style={{ color: '#8a7060' }}>
                      {pay.due_date ? format(new Date(pay.due_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="p-label !text-[10px] px-2.5 py-1" style={{ border: `1px solid ${st.color}`, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}