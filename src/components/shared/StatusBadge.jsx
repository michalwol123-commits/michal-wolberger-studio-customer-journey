import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  // Client statuses
  lead: { label: 'ליד', variant: 'outline', className: 'border-blue-300 text-blue-700 bg-blue-50' },
  qualified: { label: 'מתעניין', variant: 'outline', className: 'border-purple-300 text-purple-700 bg-purple-50' },

  proposal_presented: { label: 'הוגשה הצעה בפגישה', variant: 'outline', className: 'border-violet-300 text-violet-700 bg-violet-50' },
  proposal_sent: { label: 'הצעה נשלחה', variant: 'outline', className: 'border-amber-300 text-amber-700 bg-amber-50' },

  active_client: { label: 'לקוח פעיל', variant: 'outline', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  completed_client: { label: 'הושלם', variant: 'outline', className: 'border-slate-300 text-slate-600 bg-slate-50' },
  archived: { label: 'ארכיון', variant: 'outline', className: 'border-gray-300 text-gray-500 bg-gray-50' },
  // Project statuses
  active: { label: 'פעיל', variant: 'outline', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  on_hold: { label: 'מוקפא', variant: 'outline', className: 'border-amber-300 text-amber-700 bg-amber-50' },
  completed: { label: 'הושלם', variant: 'outline', className: 'border-slate-300 text-slate-600 bg-slate-50' },
  cancelled: { label: 'בוטל', variant: 'outline', className: 'border-red-300 text-red-600 bg-red-50' },
  // Quote statuses
  draft: { label: 'טיוטה', variant: 'outline', className: 'border-gray-300 text-gray-500 bg-gray-50' },
  sent: { label: 'נשלחה', variant: 'outline', className: 'border-blue-300 text-blue-700 bg-blue-50' },
  sent_for_signature: { label: 'נשלחה הצעה לחתימה', variant: 'outline', className: 'border-purple-300 text-purple-700 bg-purple-50' },
  contract_sent_for_signature: { label: 'נשלח הסכם לחתימה', variant: 'outline', className: 'border-indigo-300 text-indigo-700 bg-indigo-50' },
  approved: { label: 'מאושר', variant: 'outline', className: 'border-green-300 text-green-700 bg-green-50' },
  rejected: { label: 'נדחה', variant: 'outline', className: 'border-red-300 text-red-600 bg-red-50' },
  expired: { label: 'פג תוקף', variant: 'outline', className: 'border-gray-300 text-gray-500 bg-gray-50' },
  // Payment statuses
  pending: { label: 'ממתין', variant: 'outline', className: 'border-amber-300 text-amber-700 bg-amber-50' },
  partial: { label: 'חלקי', variant: 'outline', className: 'border-orange-300 text-orange-700 bg-orange-50' },
  paid: { label: 'שולם', variant: 'outline', className: 'border-green-300 text-green-700 bg-green-50' },
  overdue: { label: 'באיחור', variant: 'outline', className: 'border-red-300 text-red-600 bg-red-50' },
  // Task statuses
  open: { label: 'פתוח', variant: 'outline', className: 'border-blue-300 text-blue-700 bg-blue-50' },
  in_progress: { label: 'בביצוע', variant: 'outline', className: 'border-amber-300 text-amber-700 bg-amber-50' },
  done: { label: 'הושלם', variant: 'outline', className: 'border-green-300 text-green-700 bg-green-50' },
  // Meeting statuses
  scheduled: { label: 'מתוכנן', variant: 'outline', className: 'border-blue-300 text-blue-700 bg-blue-50' },
  no_show: { label: 'לא הגיע', variant: 'outline', className: 'border-red-300 text-red-600 bg-red-50' },
  rescheduled: { label: 'נדחה', variant: 'outline', className: 'border-purple-300 text-purple-700 bg-purple-50' },
  // Purchase Order statuses
  confirmed: { label: 'אושר', variant: 'outline', className: 'border-green-300 text-green-700 bg-green-50' },
  delivered: { label: 'סופק', variant: 'outline', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  // General
  failed: { label: 'נכשל', variant: 'outline', className: 'border-red-300 text-red-600 bg-red-50' },
  delivered: { label: 'נמסר', variant: 'outline', className: 'border-green-300 text-green-700 bg-green-50' },
  read: { label: 'נקרא', variant: 'outline', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  retried: { label: 'נשלח שוב', variant: 'outline', className: 'border-amber-300 text-amber-700 bg-amber-50' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'border-gray-300 text-gray-500' };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}