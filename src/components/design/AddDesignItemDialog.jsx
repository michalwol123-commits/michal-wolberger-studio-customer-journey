import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CATEGORY_CONFIG, COMMON_ROOMS, CATEGORIES } from './designConfig';

const EMPTY_OPTION = { name: '', link: '', price: '', notes: '' };

export default function AddDesignItemDialog({ open, onOpenChange, projectId, editItem, onSave, defaultStage }) {
  const [form, setForm] = useState({
    room: '', category: 'furniture', title: '', description: '',
    supplier: '', supplier_phone: '', status: 'planned',
    stage: defaultStage || 8, priority: 'must', notes: '',
    image_urls: [], options: [{ ...EMPTY_OPTION }]
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customRoom, setCustomRoom] = useState('');

  useEffect(() => {
    if (editItem) {
      let opts = [];
      try { opts = typeof editItem.options === 'string' ? JSON.parse(editItem.options) : (editItem.options || []); } catch {}
      if (opts.length === 0) opts = [{ ...EMPTY_OPTION }];
      setForm({ ...editItem, options: opts, image_urls: editItem.image_urls || [] });
      if (!COMMON_ROOMS.includes(editItem.room)) setCustomRoom(editItem.room);
    } else {
      setForm({
        room: '', category: 'furniture', title: '', description: '',
        supplier: '', supplier_phone: '', status: 'planned',
        stage: defaultStage || 8, priority: 'must', notes: '',
        image_urls: [], options: [{ ...EMPTY_OPTION }]
      });
      setCustomRoom('');
    }
  }, [editItem, open, defaultStage]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(f => ({ ...f, image_urls: [...f.image_urls, ...urls] }));
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.room) return;
    setSaving(true);
    const data = {
      ...form,
      project_id: projectId,
      room: customRoom || form.room,
      options: JSON.stringify(form.options.filter(o => o.name || o.link)),
    };
    delete data.id;
    delete data.created_date;
    delete data.updated_date;
    delete data.created_by;

    if (editItem?.id) {
      await base44.entities.DesignItem.update(editItem.id, data);
    } else {
      await base44.entities.DesignItem.create(data);
    }
    setSaving(false);
    onSave?.();
    onOpenChange(false);
  };

  const updateOption = (idx, field, value) => {
    setForm(f => ({
      ...f,
      options: f.options.map((o, i) => i === idx ? { ...o, [field]: value } : o)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{editItem ? 'עריכת פריט במפת פרויקט' : 'הוספת פריט למפת פרויקט'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Room */}
          <div>
            <Label>חלל/חדר *</Label>
            <Select value={COMMON_ROOMS.includes(form.room) ? form.room : '__custom'} onValueChange={v => {
              if (v === '__custom') { setForm(f => ({ ...f, room: '' })); }
              else { setForm(f => ({ ...f, room: v })); setCustomRoom(''); }
            }}>
              <SelectTrigger><SelectValue placeholder="בחרי חלל" /></SelectTrigger>
              <SelectContent>
                {COMMON_ROOMS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                <SelectItem value="__custom">אחר...</SelectItem>
              </SelectContent>
            </Select>
            {(form.room === '' && !COMMON_ROOMS.includes(form.room)) || customRoom ? (
              <Input className="mt-1" placeholder="שם החלל" value={customRoom} onChange={e => { setCustomRoom(e.target.value); setForm(f => ({ ...f, room: e.target.value })); }} />
            ) : null}
          </div>

          {/* Category */}
          <div>
            <Label>קטגוריה</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_CONFIG[c].icon} {CATEGORY_CONFIG[c].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="col-span-2">
            <Label>כותרת *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="למשל: ספה — ירוק זית / מוקה" />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <Label>תיאור והמלצה</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="ההמלצה המלאה, טיפים, הסבר..." />
          </div>

          {/* Supplier */}
          <div>
            <Label>ספק / מותג</Label>
            <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="שם הספק" />
          </div>
          <div>
            <Label>טלפון ספק</Label>
            <Input value={form.supplier_phone} onChange={e => setForm(f => ({ ...f, supplier_phone: e.target.value }))} placeholder="050-..." />
          </div>

          {/* Stage + Status + Priority */}
          <div>
            <Label>שלב</Label>
            <Select value={String(form.stage)} onValueChange={v => setForm(f => ({ ...f, stage: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[4,5,6,7,8,9,10,11,12,13].map(s => <SelectItem key={s} value={String(s)}>שלב {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">מתוכנן</SelectItem>
                  <SelectItem value="decided">הוחלט</SelectItem>
                  <SelectItem value="ordered">הוזמן</SelectItem>
                  <SelectItem value="delivered">סופק</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>עדיפות</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="must">חובה</SelectItem>
                  <SelectItem value="nice_to_have">נחמד שיהיה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options */}
          <div className="col-span-2">
            <Label>אופציות / מוצרים</Label>
            <div className="space-y-2 mt-1">
              {form.options.map((opt, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <Input className="col-span-3" placeholder="שם" value={opt.name} onChange={e => updateOption(i, 'name', e.target.value)} />
                  <Input className="col-span-4" placeholder="קישור" value={opt.link} onChange={e => updateOption(i, 'link', e.target.value)} />
                  <Input className="col-span-2" placeholder="מחיר" value={opt.price} onChange={e => updateOption(i, 'price', e.target.value)} />
                  <Input className="col-span-2" placeholder="הערה" value={opt.notes} onChange={e => updateOption(i, 'notes', e.target.value)} />
                  <Button size="icon" variant="ghost" className="col-span-1 h-9 w-9" onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setForm(f => ({ ...f, options: [...f.options, { ...EMPTY_OPTION }] }))}>
                <Plus className="w-3.5 h-3.5 ml-1" />הוספת אופציה
              </Button>
            </div>
          </div>

          {/* Images */}
          <div className="col-span-2">
            <Label>תמונות</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {form.image_urls.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border" />
                  <button onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, j) => j !== i) }))}
                    className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                </div>
              ))}
              <label className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
              {uploading && <span className="text-xs text-muted-foreground self-center">מעלה...</span>}
            </div>
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.title || !form.room}>
            {saving ? 'שומר...' : editItem ? 'עדכון' : 'הוספה'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}