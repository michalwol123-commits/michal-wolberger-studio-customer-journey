import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CLIENT_STATUSES = [
  { value: 'lead', label: 'ליד' },
  { value: 'qualified', label: 'מתעניין' },
  { value: 'qualified_assessment', label: 'אפיון הושלם' },
  { value: 'proposal_sent', label: 'הצעה נשלחה' },
  { value: 'proposal_approved', label: 'הצעה אושרה' },
  { value: 'active_client', label: 'לקוח פעיל' },
  { value: 'completed_client', label: 'הושלם' },
  { value: 'archived', label: 'ארכיון' },
];

const statusLabels = Object.fromEntries(CLIENT_STATUSES.map(s => [s.value, s.label]));

const ALLOWED_TRANSITIONS = {
  lead: ['qualified', 'archived'],
  qualified: ['qualified_assessment', 'archived'],
  qualified_assessment: ['proposal_sent', 'archived'],
  proposal_sent: ['proposal_approved', 'qualified_assessment', 'archived'],
  proposal_approved: ['active_client', 'archived'],
  active_client: ['completed_client', 'archived'],
  completed_client: ['active_client', 'archived'],
  archived: ['lead'],
};

export default function ClientStatusChanger({ client }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.entities.Client.update(client.id, { status: newStatus });
      toast.success(`הסטטוס עודכן ל"${statusLabels[newStatus]}"`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', client.id] }),
  });

  return (
    <Select value={client.status} onValueChange={(val) => {
      const allowed = ALLOWED_TRANSITIONS[client.status] || [];
      if (!allowed.includes(val)) {
        toast.error(`לא ניתן לעבור מ"${statusLabels[client.status]}" ל"${statusLabels[val]}"`);
        return;
      }
      mutation.mutate(val);
    }} disabled={mutation.isPending}>
      <SelectTrigger className="w-44 h-8 text-xs">
        <SelectValue>{mutation.isPending ? '⏳ בודק...' : undefined}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CLIENT_STATUSES.map(s => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}