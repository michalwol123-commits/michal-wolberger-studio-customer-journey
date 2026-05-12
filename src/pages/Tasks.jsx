import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import BulkDeleteBar from '@/components/shared/BulkDeleteBar';
import DeleteButton from '@/components/shared/DeleteButton';
import useCurrentUser from '@/lib/useCurrentUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Clock, User, Plus, Pencil } from 'lucide-react';
import ExportCSVButton from '@/components/shared/ExportCSVButton';
import ViewToggle from '@/components/shared/ViewToggle';
import TasksTable from '@/components/tasks/TasksTable';
import { format } from 'date-fns';
import AddTaskDialog from '@/components/tasks/AddTaskDialog';
import AddQuoteDialog from '@/components/quotes/AddQuoteDialog';
import { toast } from 'sonner';

const columns = [
  { id: 'open', label: 'פתוח', color: 'border-t-blue-400' },
  { id: 'in_progress', label: 'בביצוע', color: 'border-t-amber-400' },
  { id: 'done', label: 'הושלם', color: 'border-t-green-400' },
  { id: 'cancelled', label: 'בוטל', color: 'border-t-gray-400' },
];

const priorityLabels = { low: 'נמוך', normal: 'רגיל', high: 'גבוה', urgent: 'דחוף' };
const priorityColors = { low: 'text-gray-500', normal: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' };

export default function Tasks() {
  const { user, isAdmin } = useCurrentUser();
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [view, setView] = useState('cards');
  const [selectedIds, setSelectedIds] = useState([]);
  const [quoteForClient, setQuoteForClient] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });

  const filtered = isAdmin ? tasks : tasks.filter(t => t.assigned_to === user?.email);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.Task.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedIds([]);
      toast.success('המשימות נמחקו');
    },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(t => t.id));

  return (
    <div>
      <PageHeader title="משימות" subtitle={`${filtered.filter(t => t.status !== 'done' && t.status !== 'cancelled').length} משימות פתוחות`}>
        <ExportCSVButton
          data={filtered}
          columns={[
            { key: 'title', label: 'כותרת' },
            { key: 'status', label: 'סטטוס' },
            { key: 'priority', label: 'עדיפות' },
            { key: 'due_date', label: 'תאריך יעד' },
            { key: 'assigned_to', label: 'אחראי' },
            { label: 'לקוח', format: r => clientMap[r.client_id]?.name || '' },
          ]}
          filename="משימות"
        />
        <ViewToggle view={view} onViewChange={setView} />
        <Button onClick={() => { setEditTask(null); setShowAdd(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          משימה חדשה
        </Button>
      </PageHeader>

      {isAdmin && <BulkDeleteBar selectedIds={selectedIds} onDelete={(ids) => bulkDeleteMutation.mutate(ids || selectedIds)} entityLabel="משימות" />}

      {view === 'table' ? (
        <TasksTable
          tasks={filtered}
          clientMap={clientMap}
          onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
          onDelete={(id) => deleteMutation.mutate(id)}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          isAdmin={isAdmin}
          onPrepareQuote={(clientId) => setQuoteForClient(clientId)}
        />
      ) : (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const colTasks = filtered.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="min-w-[280px] w-[280px] flex-shrink-0">
              <div className={`flex items-center justify-between mb-3 px-1 pb-2 border-t-4 ${col.color} pt-2`}>
                <h3 className="text-sm font-semibold font-heading">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => {
                  const client = clientMap[task.client_id];
                  return (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm mb-2 flex-1">{task.title}</p>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTask(task); setShowAdd(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {isAdmin && (
                              <div onClick={e => e.stopPropagation()}>
                                <DeleteButton onDelete={() => deleteMutation.mutate(task.id)} entityLabel="משימה" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                          {task.due_date && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(task.due_date), 'dd/MM')}</span>
                          )}
                          {task.assigned_to && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assigned_to}</span>
                          )}
                          {client && <span>• {client.name}</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${priorityColors[task.priority] || ''}`}>
                            {priorityLabels[task.priority] || task.priority}
                          </span>
                          {task.status === 'open' && task.title?.includes('הצעת מחיר') && task.client_id && (
                            <button
                              onClick={() => setQuoteForClient(task.client_id)}
                              className="text-xs text-accent font-medium hover:underline"
                            >הכן</button>
                          )}
                          {task.status === 'open' && (
                            <button
                              onClick={() => updateMutation.mutate({ id: task.id, data: { status: 'in_progress' } })}
                              className="text-xs text-primary hover:underline"
                            >התחל</button>
                          )}
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => updateMutation.mutate({ id: task.id, data: { status: 'done' } })}
                              className="text-xs text-green-600 hover:underline"
                            >סיים</button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">ריק</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <AddTaskDialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) setEditTask(null); }} initialData={editTask} />

      <AddQuoteDialog
        open={!!quoteForClient}
        onOpenChange={(open) => { if (!open) setQuoteForClient(null); }}
        initialData={quoteForClient ? { client_id: quoteForClient } : null}
      />
    </div>
  );
}