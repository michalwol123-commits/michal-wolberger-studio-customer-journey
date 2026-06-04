import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertCircle, MinusCircle, Plus, Trash2, Save, Send, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import FieldVisitFindingsList from './FieldVisitFindingsList';

const SUPERVISION_CHECKLIST = [
  { id: 's1', label: 'בנייה - מחיצות ועבודות גבס' },
  { id: 's2', label: 'חשמל - נקודות ולוח' },
  { id: 's3', label: 'אינסטלציה - מים, ניקוזים וביוב' },
  { id: 's4', label: 'ריצוף ואריחים' },
  { id: 's5', label: 'טיח, צבע וגמרים' },
  { id: 's6', label: 'נגרות, דלתות ואלומיניום' },
  { id: 's7', label: 'תאורה - מיקום ונקודות' },
  { id: 's8', label: 'הערות כלליות / חריגות מתכנית' },
];

const INSTALLATION_CHECKLIST = [
  { id: 'i1', label: 'ריהוט - הרכבה, מיקום ומפרט' },
  { id: 'i2', label: 'וילונות, קרניז ועיצוב בד' },
  { id: 'i3', label: 'תאורה - גופים ומנורות' },
  { id: 'i4', label: 'מטבח - אביזרים, מכשירים, אינטגרציה' },
  { id: 'i5', label: 'אמבטיה/שירותים - אביזרים ומראות' },
  { id: 'i6', label: 'ציורים, מדפים ועיצוב קיר' },
  { id: 'i7', label: 'גימורים כלליים - ניקיון, פגמים, תיקונים' },
];

const initChecklist = (type) =>
  (type === 'installation' ? INSTALLATION_CHECKLIST : SUPERVISION_CHECKLIST).map(item => ({
    ...item, status: null, note: '', photo_url: '', custom: false,
  }));

const parseChecklist = (raw) => {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
};

const STATUS_BTNS = [
  { key: 'ok',    label: 'תקין',        Icon: CheckCircle,  cls: 'border-green-400 bg-green-50 text-green-700' },
  { key: 'issue', label: 'ממצא',        Icon: AlertCircle,  cls: 'border-red-400 bg-red-50 text-red-700' },
  { key: 'na',    label: 'לא רלוונטי', Icon: MinusCircle,  cls: 'border-gray-300 bg-gray-50 text-gray-500' },
];

const TABS = [
  { id: 'checklist', label: "צ'קליסט" },
  { id: 'findings',  label: 'ממצאים' },
  { id: 'summary',   label: 'סיכום' },
];

export default function FieldVisitForm({ projectId, visit, defaultVisitType, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const isNew = !visit?.id;
  const stateRef = useRef({});

  const [visitType, setVisitType]       = useState(visit?.visit_type || defaultVisitType || 'supervision');
  const [visitDate, setVisitDate]       = useState(visit?.visit_date || new Date().toISOString().split('T')[0]);
  const [checklist, setChecklist]       = useState(visit?.checklist_items ? parseChecklist(visit.checklist_items) : initChecklist(visit?.visit_type || defaultVisitType || 'supervision'));
  const [generalNotes, setGeneralNotes] = useState(visit?.general_notes || '');
  const [attendees, setAttendees]       = useState(visit?.attendees || '');
  const [decisions, setDecisions]       = useState(visit?.decisions || '');
  const [nextSteps, setNextSteps]       = useState(visit?.next_steps || '');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [activeTab, setActiveTab]       = useState('checklist');
  const [savedId, setSavedId]           = useState(visit?.id || null);
  const [saving, setSaving]             = useState(false);
  const [sending, setSending]           = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState(null);

  stateRef.current = { visitType, visitDate, checklist, generalNotes, attendees, decisions, nextSteps, savedId };

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.FieldVisit.create(data) });
  const updateMutation = useMutation({ mutationFn: ({ id, ...data }) => base44.entities.FieldVisit.update(id, data) });

  const buildPayload = (status = 'draft') => {
    const s = stateRef.current;
    return {
      project_id: projectId,
      visit_type: s.visitType,
      visit_date: s.visitDate,
      checklist_items: JSON.stringify(s.checklist),
      general_notes: s.generalNotes,
      attendees: s.attendees,
      decisions: s.decisions,
      next_steps: s.nextSteps,
      status,
    };
  };

  // Auto-save every 30s
  useEffect(() => {
    const timer = setInterval(async () => {
      const { savedId: id } = stateRef.current;
      if (!id) return;
      try { await base44.entities.FieldVisit.update(id, buildPayload('draft')); } catch {}
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSave = async (status = 'draft') => {
    setSaving(true);
    try {
      let id = stateRef.current.savedId;
      if (!id) {
        const result = await createMutation.mutateAsync(buildPayload(status));
        id = result.id;
        setSavedId(id);
      } else {
        await updateMutation.mutateAsync({ id, ...buildPayload(status) });
      }
      queryClient.invalidateQueries({ queryKey: ['field-visits', projectId] });
      if (onSaved) onSaved(id);
      toast.success(status === 'completed' ? 'ביקור נשמר' : 'טיוטה נשמרה');
      return id;
    } catch {
      toast.error('שגיאה בשמירה');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Auto-save when switching to findings tab (to get savedId)
  const handleTabChange = async (tabId) => {
    if (tabId === 'findings' && !stateRef.current.savedId) {
      await handleSave('draft');
    }
    setActiveTab(tabId);
  };

  const handleSendReport = async () => {
    setSending(true);
    try {
      const id = await handleSave('completed');
      if (!id) return;
      await base44.entities.FieldVisit.update(id, { report_requested_at: new Date().toISOString() });
      toast.success('הדוח בדרך ✉️ יישלח למייל הלקוח');
      onClose?.();
    } catch {
      toast.error('שגיאה בשליחת הדוח');
    } finally {
      setSending(false);
    }
  };

  const updateItem = (itemId, field, value) =>
    setChecklist(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i));

  const handleItemPhoto = async (itemId, file) => {
    setUploadingItemId(itemId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateItem(itemId, 'photo_url', file_url);
      toast.success('תמונה הועלתה');
    } catch {
      toast.error('שגיאה בהעלאת תמונה');
    } finally {
      setUploadingItemId(null);
    }
  };

  const addCustomItem = () => {
    const label = newItemLabel.trim();
    if (!label) return;
    setChecklist(prev => [...prev, { id: 'custom_' + Date.now(), label, status: null, note: '', photo_url: '', custom: true }]);
    setNewItemLabel('');
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5]" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex justify-between items-center">
        <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        <h1 className="font-semibold text-[#5A4632] text-sm">
          {visitType === 'supervision' ? '📋 ביקור פיקוח' : '🔧 ביקור התקנות'}
          {visitDate && <span className="text-gray-400 font-normal mr-2 text-xs">{new Date(visitDate).toLocaleDateString('he-IL')}</span>}
        </h1>
        <button onClick={() => handleSave('draft')} disabled={saving} className="text-[#8B7355] text-sm font-medium flex items-center gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          שמור
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">

        {/* Visit type + date (new only) */}
        {isNew && (
          <Card className="border-[#E8E0D8]">
            <CardContent className="pt-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-2">סוג ביקור</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'supervision', l: '📋 פיקוח' }, { v: 'installation', l: '🔧 התקנות' }].map(({ v, l }) => (
                    <button key={v} onClick={() => { setVisitType(v); setChecklist(initChecklist(v)); }}
                      className={'py-3 rounded-2xl border-2 text-sm font-medium transition-all ' + (visitType === v ? 'border-[#8B7355] bg-[#8B7355] text-white' : 'border-gray-200 text-gray-600')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">תאריך ביקור</p>
                <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-white rounded-2xl p-1 border border-gray-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)}
              className={'py-2 rounded-xl text-sm font-medium transition-all ' + (activeTab === t.id ? 'bg-[#8B7355] text-white shadow-sm' : 'text-gray-400')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="space-y-3">
            {/* Add custom item — top */}
            <Card className="border-2 border-dashed border-[#8B7355]/30">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-400 mb-2">הוספת סעיף לבדיקה</p>
                <div className="flex gap-2">
                  <Input placeholder="שם הסעיף..." value={newItemLabel}
                    onChange={e => setNewItemLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomItem()} className="text-sm flex-1" />
                  <Button type="button" onClick={addCustomItem} disabled={!newItemLabel.trim()} size="sm" variant="outline" className="border-[#8B7355] text-[#8B7355] shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {checklist.map(item => (
              <Card key={item.id} className={'border ' + (item.status === 'issue' ? 'border-red-200 bg-red-50/20' : 'border-gray-100')}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm text-[#2C2C2C] flex-1 leading-snug">{item.label}</span>
                    <button onClick={() => setChecklist(prev => prev.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-400 ml-2 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {STATUS_BTNS.map(({ key, label, Icon, cls }) => (
                      <button key={key} onClick={() => updateItem(item.id, 'status', item.status === key ? null : key)}
                        className={'flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-all ' + (item.status === key ? cls : 'border-gray-100 text-gray-300')}>
                        <Icon className="w-4 h-4" /><span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* When marked as "ממצא" — show note + inline photo */}
                  {item.status === 'issue' && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        placeholder="תיאור הממצא..."
                        value={item.note}
                        onChange={e => updateItem(item.id, 'note', e.target.value)}
                        className="text-sm min-h-[56px]"
                      />

                      {/* Photo upload inline */}
                      {item.photo_url ? (
                        <div className="relative">
                          <img src={item.photo_url} alt="ממצא" className="w-full max-h-40 object-cover rounded-xl" />
                          <button
                            onClick={() => updateItem(item.id, 'photo_url', '')}
                            className="absolute top-2 left-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={'photo-' + item.id}
                          className="flex items-center justify-center gap-2 text-sm text-[#8B7355] border-2 border-dashed border-[#8B7355]/40 rounded-xl py-2.5 cursor-pointer hover:bg-[#8B7355]/5 transition-colors">
                          {uploadingItemId === item.id
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> מעלה...</>
                            : <><Camera className="w-4 h-4" /> צלם תמונה של הממצא</>}
                          <input
                            id={'photo-' + item.id}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && handleItemPhoto(item.id, e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* General notes */}
            <Card className="border-gray-100">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-500 mb-1">הערות כלליות לביקור</p>
                <Textarea placeholder="הערות, חריגות מהתכנית..." value={generalNotes}
                  onChange={e => setGeneralNotes(e.target.value)} className="min-h-[80px] text-sm" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* FINDINGS TAB — לממצאים מפורטים עם קטגוריה/חומרה/מיקום */}
        {activeTab === 'findings' && (
          savedId
            ? <FieldVisitFindingsList visitId={savedId} projectId={projectId} />
            : (
              <Card className="border-gray-100">
                <CardContent className="pt-8 pb-8 text-center text-gray-400">
                  <p className="text-sm mb-1">שומר ביקור...</p>
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8B7355]" />
                </CardContent>
              </Card>
            )
        )}

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <Card className="border-gray-100">
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">נוכחים בביקור</p>
                <Textarea placeholder="שמות המשתתפים..." value={attendees} onChange={e => setAttendees(e.target.value)} className="min-h-[64px] text-sm" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">מה סוכם</p>
                <Textarea placeholder="החלטות וסיכומים..." value={decisions} onChange={e => setDecisions(e.target.value)} className="min-h-[80px] text-sm" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">צעדים הבאים</p>
                <Textarea placeholder="משימות לביצוע, מי אחראי, עד מתי..." value={nextSteps} onChange={e => setNextSteps(e.target.value)} className="min-h-[80px] text-sm" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex gap-2 z-20">
        <Button onClick={() => handleSave('draft')} disabled={saving} variant="outline" className="flex-1 border-[#8B7355] text-[#8B7355] h-11">
          <Save className="w-4 h-4 ml-1" />{saving ? 'שומר...' : 'שמור טיוטה'}
        </Button>
        <Button onClick={handleSendReport} disabled={sending || saving} className="flex-1 bg-[#8B7355] hover:bg-[#7a6548] text-white h-11">
          {sending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Send className="w-4 h-4 ml-1" />}
          {sending ? 'שולח...' : 'שלח דוח'}
        </Button>
      </div>
    </div>
  );
}