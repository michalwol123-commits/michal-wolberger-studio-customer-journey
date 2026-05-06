import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CLIENT_STATUSES = [
  { value: 'lead', label: 'ליד' },
  { value: 'qualified', label: 'מתעניין' },
  { value: 'proposal_sent', label: 'הצעה נשלחה' },
  { value: 'proposal_approved', label: 'הצעה אושרה' },
  { value: 'active_client', label: 'לקוח פעיל' },
  { value: 'completed_client', label: 'הושלם' },
  { value: 'archived', label: 'ארכיון' },
];

const statusLabels = Object.fromEntries(CLIENT_STATUSES.map(s => [s.value, s.label]));

export default function ClientStatusChanger({ client }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newStatus) => {
      const previousStatus = client.status;
      await base44.entities.Client.update(client.id, { status: newStatus });

      // Wait for the State Machine automation to potentially rollback
      await new Promise(r => setTimeout(r, 4000));

      // Re-fetch the client to check if the status actually changed
      const [updated] = await base44.entities.Client.filter({ id: client.id });
      if (updated && updated.status !== newStatus) {
        toast.error(
          `לא ניתן להעביר סטטוס מ"${statusLabels[previousStatus]}" ל"${statusLabels[newStatus]}"`,
          { description: `הסטטוס חזר ל"${statusLabels[updated.status]}"` }
        );
      } else {
        toast.success(`הסטטוס עודכן ל"${statusLabels[newStatus]}"`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', client.id] }),
  });

  return (
    <Select value={client.status} onValueChange={(val) => mutation.mutate(val)} disabled={mutation.isPending}>
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