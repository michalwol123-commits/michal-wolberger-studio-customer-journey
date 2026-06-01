import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Phone, ExternalLink, Pencil } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import ProjectSupplierDialog from './ProjectSupplierDialog';

export default function ProjectSuppliersTab({ projectId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);


  const { data: projectSuppliers = [] } = useQuery({
    queryKey: ['project-suppliers', projectId],
    queryFn: () => base44.entities.ProjectSupplier.filter({ project_id: projectId }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
  });

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectSupplier.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectSupplier.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] }),
  });

  const handleStatusChange = (ps, newStatus) => {
    updateMutation.mutate({ id: ps.id, data: { status: newStatus } });
  };

  const handleInlineAmount = (ps, field, value) => {
    const num = value === '' ? null : Number(value);
    updateMutation.mutate({ id: ps.id, data: { [field]: num } });
  };

  const openAdd = () => {
    setEditData(null);
    setDialogOpen(true);
  };

  const openEdit = (ps) => {
    setEditData(ps);
    setDialogOpen(true);
  };

  // Group by budget_category
  const grouped = {};
  projectSuppliers.forEach(ps => {
    const cat = ps.budget_category || 'כללי';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ps);
  });

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    if (a === 'כללי') return 1;
    if (b === 'כללי') return -1;
    return a.localeCompare(b, 'he');
  });

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={openAdd} className="gap-1">
          <Plus className="w-4 h-4" />הוסף ספק לפרויקט
        </Button>
      </div>

      {projectSuppliers.length === 0 ? (
        <EmptyState title="אין ספקים" description="הוסיפי ספקים לפרויקט" />
      ) : (
        <div className="space-y-4">
          {sortedCategories.map(cat => (
            <div key={cat}>
              <h4 className="font-heading font-semibold text-sm mb-2">{cat}</h4>
              <div className="bg-card rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right px-4 py-2 font-medium">ספק</th>
                      <th className="text-right px-4 py-2 font-medium w-10">☎</th>
                      <th className="text-right px-4 py-2 font-medium">הצעה (₪)</th>
                      <th className="text-right px-4 py-2 font-medium">סגור (₪)</th>
                      <th className="text-right px-4 py-2 font-medium">סטטוס</th>
                      <th className="text-right px-4 py-2 font-medium">קובץ</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[cat].map(ps => {
                      const supplier = supplierMap[ps.supplier_id];
                      return (
                        <tr key={ps.id} className="border-b last:border-0">
                          <td className="px-4 py-2 font-medium">{supplier?.name || '—'}</td>
                          <td className="px-2 py-2">
                            {supplier?.phone && (
                              <a href={`tel:${supplier.phone}`} className="text-primary hover:text-primary/80">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs"
                              defaultValue={ps.quoted_amount || ''}
                              key={`q-${ps.id}-${ps.quoted_amount}`}
                              onBlur={(e) => handleInlineAmount(ps, 'quoted_amount', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs"
                              defaultValue={ps.agreed_amount || ''}
                              key={`a-${ps.id}-${ps.agreed_amount}`}
                              onBlur={(e) => handleInlineAmount(ps, 'agreed_amount', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Select value={ps.status} onValueChange={v => handleStatusChange(ps, v)}>
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">ממתין</SelectItem>
                                <SelectItem value="quoted">הצעה</SelectItem>
                                <SelectItem value="approved">מאושר</SelectItem>
                                <SelectItem value="rejected">נדחה</SelectItem>
                                <SelectItem value="completed">הושלם</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2">
                            {ps.attachment_url ? (
                              <a href={ps.attachment_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-2 flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(ps)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(ps.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectSupplierDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditData(null); }}
        projectId={projectId}
        editData={editData}
      />
    </div>
  );
}