import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CLIENT_STATUSES = [
  { value: 'lead', label: 'ליד' },
  { value: 'qualified', label: 'מתעניין' },
  { value: 'proposal_sent', label: 'הצעה נשלחה' },
  { value: 'proposal_approved', label: 'הצעה אושרה' },
  { value: 'active_client', label: 'לקוח פעיל' },
  { value: 'completed_client', label: 'הושלם' },
  { value: 'archived', label: 'ארכיון' },
];

export default function ClientStatusChanger({ client }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newStatus) => base44.entities.Client.update(client.id, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', client.id] }),
  });

  return (
    <Select value={client.status} onValueChange={(val) => mutation.mutate(val)}>
      <SelectTrigger className="w-44 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CLIENT_STATUSES.map(s => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}