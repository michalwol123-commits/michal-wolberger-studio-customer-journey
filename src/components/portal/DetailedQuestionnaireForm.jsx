import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, CheckCircle2, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const DESIGN_STYLES = [
  { value: 'modern', label: 'מודרני' },
  { value: 'country', label: 'כפרי' },
  { value: 'elegant', label: 'אלגנטי' },
  { value: 'eclectic', label: 'אקלקטי' },
  { value: 'colorful', label: 'צבעוני' },
  { value: 'dont_know', label: 'לא יודעים' },
];

const TIME_AREAS = [
  { value: 'living_room', label: 'סלון' },
  { value: 'family_corner', label: 'פינת משפחה' },
  { value: 'kitchen', label: 'מטבח' },
  { value: 'garden', label: 'גינה' },
  { value: 'each_in_room', label: 'כל אחד בחדר שלו' },
  { value: 'other', label: 'אחר' },
];

const LIVING_ROOM_ITEMS = [
  'טלוויזיה', 'ספריה', 'שולחן קפה', 'שטיח', 'וילונות',
  'קולנוע ביתי', 'קמין', 'פסנתר', 'אוספים/ויטרינות', 'מקומות ישיבה נוספים',
];

const SEATING_OPTIONS = [
  { value: 'sofa_3_2', label: 'ספה 3+2' },
  { value: 'l_shape', label: 'ספה בצורת ר' },
  { value: 'long_armchairs', label: 'ספה ארוכה וכורסאות' },
  { value: 'other', label: 'אחר' },
];

const DINING_ITEMS = [
  { value: 'round_table', label: 'שולחן עגול/אליפטי' },
  { value: 'rectangular_table', label: 'שולחן מלבני' },
  { value: 'library_vitrine', label: 'ספריה/ויטרינה' },
  { value: 'candle_corner', label: 'פינת הדלקת נרות' },
  { value: 'other', label: 'אחר' },
];

export default function DetailedQuestionnaireForm({ questionnaire, projectId, clientId, onSubmitted }) {
  const [step, setStep] = useState(0); // 0=כללי, 1=סלון, 2=פינת אוכל
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    residents: '', birth_dates: '', time_area: '', time_area_other: '',
    design_style: '', home_feeling: '', preferred_colors: '', disliked_colors: '',
    // סלון
    living_items: [], living_items_other: '', tv_size: '', accent_wall: '',
    seating_type: '', seating_other: '', existing_furniture: '', living_notes: '',
    // פינת אוכל
    dining_items: [], dining_items_other: '', table_seats: '',
    hosting_style: '', dining_notes: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleCheckbox = (field, item) => {
    setForm(prev => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item] };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const data = {
      type: 'detailed',
      status: 'submitted',
      responses: JSON.stringify(form),
      submitted_at: new Date().toISOString(),
      stage: 5,
      client_id: clientId,
      project_id: projectId,
    };

    if (questionnaire?.id) {
      await base44.entities.Questionnaire.update(questionnaire.id, data);
    } else {
      await base44.entities.Questionnaire.create(data);
    }

    toast.success('השאלון נשלח בהצלחה!');
    setSubmitting(false);
    onSubmitted?.();
  };

  const steps = [
    { title: 'פרטים כלליים', icon: '🏠' },
    { title: 'סלון', icon: '🛋️' },
    { title: 'פינת אוכל', icon: '🍽️' },
  ];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`flex-1 text-center py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  step === i ? 'bg-primary text-primary-foreground' : i < step ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="text-lg block">{s.icon}</span>
                {s.title}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        {step === 0 && <GeneralSection form={form} update={update} />}
        {step === 1 && <LivingRoomSection form={form} update={update} toggleCheckbox={toggleCheckbox} />}
        {step === 2 && <DiningSection form={form} update={update} toggleCheckbox={toggleCheckbox} />}
      </motion.div>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4 flex justify-between gap-3">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>הקודם</Button>
          ) : <div />}
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)}>הבא</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              שליחת השאלון
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function GeneralSection({ form, update }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading">🏠 פרטים כלליים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup label="שמות כל מי שמתגורר + גילאים *">
          <Textarea placeholder="לדוגמה: דני (42), מיכל (39), יואב (12), נועה (8)" value={form.residents} onChange={e => update('residents', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="תאריכי לידה (של בני הזוג)">
          <Input placeholder="לדוגמה: 15/03/1984, 22/07/1987" value={form.birth_dates} onChange={e => update('birth_dates', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="היכן מבלים רוב הזמן בבית? *">
          <RadioGroup value={form.time_area} onValueChange={v => update('time_area', v)} className="space-y-2">
            {TIME_AREAS.map(opt => (
              <div key={opt.value} className="flex items-center gap-3">
                <RadioGroupItem value={opt.value} id={`ta-${opt.value}`} />
                <Label htmlFor={`ta-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {form.time_area === 'other' && (
            <Input className="mt-2" placeholder="פרטו..." value={form.time_area_other} onChange={e => update('time_area_other', e.target.value)} />
          )}
        </FieldGroup>
        <FieldGroup label="סגנון עיצובי *">
          <RadioGroup value={form.design_style} onValueChange={v => update('design_style', v)} className="grid grid-cols-2 gap-2">
            {DESIGN_STYLES.map(opt => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`ds-${opt.value}`} />
                <Label htmlFor={`ds-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </FieldGroup>
        <FieldGroup label="מה חשוב שישדר הבית שלכם?">
          <Textarea placeholder="לדוגמה: חמימות, מודרניות, שלווה..." value={form.home_feeling} onChange={e => update('home_feeling', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="צבעים מועדפים">
          <Input placeholder="לדוגמה: כחול, עץ טבעי, לבן..." value={form.preferred_colors} onChange={e => update('preferred_colors', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="צבעים שלא אוהבים">
          <Input placeholder="לדוגמה: ורוד, כתום..." value={form.disliked_colors} onChange={e => update('disliked_colors', e.target.value)} />
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function LivingRoomSection({ form, update, toggleCheckbox }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading">🛋️ סלון</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup label="מה חשוב שיהיה בסלון? *">
          <div className="grid grid-cols-2 gap-2">
            {LIVING_ROOM_ITEMS.map(item => (
              <label key={item} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(form.living_items || []).includes(item)}
                  onCheckedChange={() => toggleCheckbox('living_items', item)}
                />
                <span className="text-sm">{item}</span>
              </label>
            ))}
          </div>
          <Input className="mt-2" placeholder="אחר..." value={form.living_items_other} onChange={e => update('living_items_other', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="גודל טלוויזיה">
          <Input placeholder="לדוגמה: 65 אינץ׳" value={form.tv_size} onChange={e => update('tv_size', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="קיר כח (accent wall) בסלון?">
          <RadioGroup value={form.accent_wall} onValueChange={v => update('accent_wall', v)} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id="aw-yes" />
              <Label htmlFor="aw-yes" className="cursor-pointer">כן</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id="aw-no" />
              <Label htmlFor="aw-no" className="cursor-pointer">לא</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="maybe" id="aw-maybe" />
              <Label htmlFor="aw-maybe" className="cursor-pointer">אולי</Label>
            </div>
          </RadioGroup>
        </FieldGroup>
        <FieldGroup label="סוג ישיבה *">
          <RadioGroup value={form.seating_type} onValueChange={v => update('seating_type', v)} className="space-y-2">
            {SEATING_OPTIONS.map(opt => (
              <div key={opt.value} className="flex items-center gap-3">
                <RadioGroupItem value={opt.value} id={`seat-${opt.value}`} />
                <Label htmlFor={`seat-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {form.seating_type === 'other' && (
            <Input className="mt-2" placeholder="פרטו..." value={form.seating_other} onChange={e => update('seating_other', e.target.value)} />
          )}
        </FieldGroup>
        <FieldGroup label="רהיטים קיימים שתרצו להעביר לסלון החדש">
          <Textarea placeholder="לדוגמה: ויטרינה עתיקה, שטיח פרסי..." value={form.existing_furniture} onChange={e => update('existing_furniture', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="הערות נוספות לסלון">
          <Textarea placeholder="משהו נוסף שחשוב לכם?" value={form.living_notes} onChange={e => update('living_notes', e.target.value)} />
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function DiningSection({ form, update, toggleCheckbox }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading">🍽️ פינת אוכל</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup label="מה חשוב בפינת האוכל? *">
          <div className="space-y-2">
            {DINING_ITEMS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(form.dining_items || []).includes(opt.value)}
                  onCheckedChange={() => toggleCheckbox('dining_items', opt.value)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          <Input className="mt-2" placeholder="אחר..." value={form.dining_items_other} onChange={e => update('dining_items_other', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="לכמה אנשים מיועד שולחן האוכל? *">
          <Input placeholder="לדוגמה: 8 אנשים" value={form.table_seats} onChange={e => update('table_seats', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="איך אתם מארחים ובאיזו תדירות?">
          <Textarea placeholder="לדוגמה: ארוחות שבת משפחתיות, אירוח חברים פעם בשבוע..." value={form.hosting_style} onChange={e => update('hosting_style', e.target.value)} />
        </FieldGroup>
        <FieldGroup label="הערות נוספות לפינת אוכל">
          <Textarea placeholder="משהו נוסף שחשוב לכם?" value={form.dining_notes} onChange={e => update('dining_notes', e.target.value)} />
        </FieldGroup>
      </CardContent>
    </Card>
  );
}