import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Percent, Plus, Info } from 'lucide-react';
import { toast } from 'sonner';
import AddCommissionDialog from './AddCommissionDialog';

const STATUS_LABELS = { pending: 'ממתין', invoiced: 'נשלחה דרישה', received: 'התקבלה' };
const STATUS_COLORS = { pending: 'bg-amber-100 text-amber-700', invoiced: 'bg-blue-100 text-blue-700', received: 'bg-green-100 text-green-700' };

export default function ProjectCommissionsSection({ projectId }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions', projectId],
    queryFn: () => base44.entities.Commission.filter({ project_id: projectId }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
  });

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Commission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', projectId] });
      toast.success('עמלה עודכנה');
    },
  });

  const handleStatusChange = (comm, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'received') updates.received_at = new Date().toISOString().split('T')[0];
    if (newStatus === 'invoiced') updates.invoiced_at = new Date().toISOString().split('T')[0];
    updateMutation.mutate({ id: comm.id, data: updates });
  };

  const totalExpected = commissions.reduce((s, c) => s + (c.commission_amount || 0), 0);
  const totalReceived = commissions.filter(c => c.status === 'received').reduce((s, c) => s + (c.commission_amount || 0), 0);
  const totalPending = totalExpected - totalReceived;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Percent className="w-4 h-4" />
            עמלות ({commissions.length})
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" />הוסף עמלה
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {commissions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Info className="w-4 h-4" />
            <span>אין עמלות עדיין — יווצרו אוטומטית כשספק יאושר או יושלם</span>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">צפוי:</span>
                <span className="font-semibold">₪{totalExpected.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">התקבל:</span>
                <span className="font-semibold text-green-600">₪{totalReceived.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">לגבייה:</span>
                <span className="font-semibold text-amber-600">₪{totalPending.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-card rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right px-4 py-2 font-medium">ספק</th>
                    <th className="text-right px-4 py-2 font-medium">סכום בסיס</th>
                    <th className="text-right px-4 py-2 font-medium">%</th>
                    <th className="text-right px-4 py-2 font-medium">עמלה</th>
                    <th className="text-right px-4 py-2 font-medium">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => {
                    const supplier = supplierMap[c.supplier_id];
                    return (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{supplier?.name || '—'}</td>
                        <td className="px-4 py-2">₪{(c.purchase_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2">{c.commission_rate}%</td>
                        <td className="px-4 py-2 font-semibold">₪{(c.commission_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <Select value={c.status} onValueChange={v => handleStatusChange(c, v)}>
                            <SelectTrigger className="h-7 text-xs w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">ממתין</SelectItem>
                              <SelectItem value="invoiced">נשלחה דרישה</SelectItem>
                              <SelectItem value="received">התקבלה</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>

      <AddCommissionDialog open={addOpen} onOpenChange={setAddOpen} projectId={projectId} />
    </Card>
  );
}