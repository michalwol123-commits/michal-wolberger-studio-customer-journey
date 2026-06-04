import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'structure',  label: '🧱 בנייה' },
  { value: 'finishing',  label: '🎨 גמרים' },
  { value: 'electrical', label: '⚡ חשמל' },
  { value: 'plumbing',   label: '🔧 אינסטלציה' },
  { value: 'carpentry',  label: '🪵 נגרות' },
  { value: 'other',      label: '📌 אחר' },
];

const SEVERITIES = [
  { value: 'low',    label: 'נמוך',   className: 'bg-yellow-100 text-yellow-700' },
  { value: 'medium', label: 'בינוני', className: 'bg-orange-100 text-orange-700' },
  { value: 'high',   label: 'גבוה',   className: 'bg-red-100 text-red-700' },
];

const STATUSES = [
  { value: 'open',        label: 'פתוח' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'resolved',    label: '✅ טופל' },
];

export default function FieldVisitFindingsList({ visitId, projectId }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [adding, setAdding] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [newFinding, setNewFinding] = useState({
    description: '', category: 'other', severity: 'medium', location: '', notes: '',
  });

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ['findings', visitId],
    queryFn: () => base44.entities.FieldFinding.filter({ field_visit_id: visitId }),
    enabled: !!visitId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldFinding.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings', visitId] });
      setAdding(false);
      setNewFinding({ description: '', category: 'other', severity: 'medium', location: '', notes: '' });
      toast.success('ממצא נוסף');
    },
    onError: () => toast.error('שגיאה בשמירת ממצא'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.FieldFinding.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['findings', visitId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FieldFinding.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings', visitId] });
      toast.success('ממצא נמחק');
    },
  });

  const handleAddFinding = () => {
    if (!newFinding.description.trim()) return;
    createMutation.mutate({
      field_visit_id: visitId,
      project_id: projectId,
      finding_number: findings.length + 1,
      status: 'open',
      ...newFinding,
    });
  };

  const handlePhotoUpload = async (findingId, file) => {
    setUploadingId(findingId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateMutation.mutateAsync({ id: findingId, photo_url: file_url });
      toast.success('תמונה הועלתה');
    } catch {
      toast.error('שגיאה בהעלאת תמונה');
    } finally {
      setUploadingId(null);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center py-6">
      <Loader2 className="w-6 h-6 animate-spin text-[#8B7355]" />
    </div>
  );

  return (
    <div className="space-y-3" dir="rtl">
      {findings.length === 0 && !adding && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm mb-1">אין ממצאים עדיין</p>
          <p className="text-xs">לחץ על "הוסף ממצא" להתחיל</p>
        </div>
      )}

      {findings.map((finding, index) => {
        const sevCfg = SEVERITIES.find(s => s.value === finding.severity) || SEVERITIES[1];
        const catCfg = CATEGORIES.find(c => c.value === finding.category) || CATEGORIES[5];
        const isExpanded = expanded === finding.id;

        return (
          <Card key={finding.id} className={`border ${finding.severity === 'high' ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-gray-300 mt-0.5 min-w-[20px]">
                  #{finding.finding_number || index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 mb-1">
                    <Badge className={`text-xs ${sevCfg.className}`}>{sevCfg.label}</Badge>
                    <Badge variant="outline" className="text-xs">{catCfg.label}</Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-800 leading-snug">{finding.description}</p>
                  {finding.location && <p className="text-xs text-gray-400 mt-0.5">📍 {finding.location}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setExpanded(isExpanded ? null : finding.id)} className="p-1 text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteMutation.mutate(finding.id)} className="p-1 text-red-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  {finding.photo_url ? (
                    <div>
                      <img src={finding.photo_url} alt="ממצא" className="w-full max-h-48 object-cover rounded-xl" />
                      <button onClick={() => updateMutation.mutate({ id: finding.id, photo_url: null })} className="text-xs text-gray-400 mt-1">הסר תמונה</button>
                    </div>
                  ) : (
                    <label htmlFor={`photo-${finding.id}`} className="flex items-center justify-center gap-2 text-sm text-[#8B7355] border-2 border-dashed border-[#8B7355]/40 rounded-xl py-3 cursor-pointer hover:bg-[#8B7355]/5">
                      {uploadingId === finding.id
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> מעלה...</>
                        : <><Camera className="w-4 h-4" /> צלם / העלה תמונה</>}
                      <input id={`photo-${finding.id}`} type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={e => e.target.files?.[0] && handlePhotoUpload(finding.id, e.target.files[0])} />
                    </label>
                  )}

                  <div>
                    <span className="text-xs text-gray-500 block mb-1">סטטוס טיפול</span>
                    <div className="flex gap-2">
                      {STATUSES.map(s => (
                        <button key={s.value} onClick={() => updateMutation.mutate({ id: finding.id, status: s.value })}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${finding.status === s.value ? 'bg-[#8B7355] text-white border-[#8B7355]' : 'border-gray-200 text-gray-500'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input placeholder="אחראי לטיפול (אופציונלי)" value={finding.assigned_to || ''}
                    onChange={e => updateMutation.mutate({ id: finding.id, assigned_to: e.target.value })} className="text-sm" />

                  <Textarea placeholder="הערות נוספות..." value={finding.notes || ''}
                    onChange={e => updateMutation.mutate({ id: finding.id, notes: e.target.value })} className="text-sm min-h-[60px]" />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {adding ? (
        <Card className="border-2 border-dashed border-[#8B7355]/50">
          <CardContent className="pt-4 space-y-3">
            <Textarea placeholder="תיאור הממצא *" value={newFinding.description}
              onChange={e => setNewFinding(p => ({ ...p, description: e.target.value }))}
              className="text-sm min-h-[70px]" autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <select value={newFinding.category} onChange={e => setNewFinding(p => ({ ...p, category: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select value={newFinding.severity} onChange={e => setNewFinding(p => ({ ...p, severity: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <Input placeholder="מיקום (חדר, אזור...)" value={newFinding.location}
              onChange={e => setNewFinding(p => ({ ...p, location: e.target.value }))} className="text-sm" />
            <div className="flex gap-2">
              <Button onClick={handleAddFinding} disabled={!newFinding.description.trim() || createMutation.isPending}
                className="flex-1 bg-[#8B7355] hover:bg-[#7a6548] text-white text-sm h-10">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'הוסף ממצא'}
              </Button>
              <Button onClick={() => setAdding(false)} variant="outline" className="text-sm h-10">ביטול</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setAdding(true)} variant="outline"
          className="w-full border-dashed border-[#8B7355] text-[#8B7355] hover:bg-[#8B7355]/5 h-12">
          <Plus className="w-4 h-4 ml-1" /> הוסף ממצא
        </Button>
      )}
    </div>
  );
}