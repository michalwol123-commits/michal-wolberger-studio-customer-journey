import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const SPACE_OPTIONS = [
  { value: 'up_to_80', label: 'עד 80 מ"ר' },
  { value: 'up_to_160', label: 'עד 160 מ"ר' },
  { value: 'up_to_240', label: 'עד 240 מ"ר' },
  { value: 'public_space', label: 'חלל ציבורי בלבד' },
  { value: 'specific_room', label: 'חדר ספציפי בבית' },
  { value: 'other', label: 'אחר' },
];

const STYLE_OPTIONS = [
  { value: 'modern', label: 'מודרני', desc: 'מאופיין בניקיון עיצובי, שילוב קווים ישרים ומיעוט פרטים.' },
  { value: 'country', label: 'כפרי', desc: 'מאופיין בחיבור עמוק לטבע, מבוסס על חומרים גלם טבעיים ומייצר אווירה תמימה ונעימה.' },
  { value: 'industrial', label: 'תעשייתי', desc: 'מאופיין בסגנון מחוספס, חומרים גלם לא מעובדים כגון בטון, ברזל, עץ טבעי.' },
  { value: 'eclectic', label: 'אקלקטי', desc: 'משלב סגנונות ויצירתיות, מדבר בסגנון צבעוני בו ניתן לתת דרור לכל התשוקים היצירתיים שלכם.' },
  { value: 'minimalist', label: 'מרדי', desc: 'מראה מינימליסטי, שם דגש על עיצובים פשוטים ונקיים, צבעים בהירים וחומרים טבעיים.' },
];

const EXPECTATION_OPTIONS = [
  { value: 'fast_turnkey', label: 'רוצה שורה תחתונה, תכנוניות, החלטות — והכל כמה שיותר מהר.' },
  { value: 'hand_in_hand', label: 'רוצה חוויה של יצירה הדדית, תהליך יד ביד.' },
  { value: 'detailed_quotes', label: 'רוצה הצעות מחיר, אקסלים וסיכומים, ודעת כל דבר לפרטי פרטים.' },
  { value: 'calm_trust', label: 'רוצה שקט ובטחון נפשי, חשוב לי להרגיש מוגן ובטוח לגבי הבחירות.' },
  { value: 'other', label: 'אחר' },
];

const GIFT_OPTIONS = [
  { value: 'chocolate', label: 'שוקולד מושחת' },
  { value: 'healthy', label: 'דיאטי בריא' },
  { value: 'fruit', label: 'פירותי' },
];

const STYLE_PHILOSOPHY = [
  { value: 'love_variety', label: 'אנחנו אוהבים גיוון והפתעות ולהביא רעיונות שיהיו רק שלנו. רוצים להיות מיוחדים!' },
  { value: 'safe_beauty', label: 'אנחנו אוהבים ללכת על בטוח. רוצים לראות הכל בעיניים ולבחור כל פרט.' },
  { value: 'modern_fresh', label: 'אוהבים מה שטרנדי והולך עכשיו — כמה שיותר חדש — זה אנחנו!' },
  { value: 'practical', label: 'רוצים פרקטי ויפה. פחות משנה לנו מה קורה בבתים אחרים.' },
  { value: 'other', label: 'אחר' },
];

export default function ShortQuestionnaire() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    birth_date: '', wedding_date: '', household: '', space_type: '',
    space_type_other: '', property_size_age: '', design_style: '',
    why_renovate: '', expectations: '', expectations_other: '',
    budget: '', gift: '', style_philosophy: '', style_philosophy_other: '',
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return;
    setSubmitting(true);

    const { name, phone, email, ...responses } = form;
    await base44.entities.Questionnaire.create({
      type: 'short',
      status: 'submitted',
      name,
      phone,
      email,
      responses: JSON.stringify(responses),
      submitted_at: new Date().toISOString(),
      stage: 1,
    });

    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="max-w-md w-full"><CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="font-heading text-2xl font-bold">תודה רבה! 🙏</h2>
          <p className="text-muted-foreground">התשובות נשמרו בהצלחה. ניצור איתך קשר בהקדם.</p>
          <p className="text-sm text-muted-foreground">מיכל וולברגר — עיצוב פנים</p>
        </CardContent></Card>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <h1 className="font-heading text-2xl font-bold">שאלון טרום שיחת היכרות</h1>
              <p className="text-muted-foreground leading-relaxed">
                אשמח שתקחו מספר דקות לענות על השאלון הבא, כדי שנוכל לדייק ולמקד את שיחת הטלפון שלנו.
              </p>
              <p className="text-sm text-muted-foreground">
                נעים מאוד, מיכל. אם פניתם אליי כנראה שאתם נמצאים לפני רגע גדול ומרגש בחייכם,
                ומחפשים מישהי שתלווה אתכם יד ביד במסע המרגש הזה.
                אני יותר מאשמח לשתף פעולה יחד וליצור חיבורים מרגשים שלכם.
              </p>
              <p className="text-xs text-muted-foreground">כוכבית (*) מציינת שאלה שאי אפשר לדלג עליה</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
          <QuestionCard title="שם מלא *">
            <Input placeholder="שם מלא" value={form.name} onChange={e => updateField('name', e.target.value)} />
          </QuestionCard>

          <QuestionCard title="טלפון *">
            <Input type="tel" placeholder="050-1234567" value={form.phone} onChange={e => updateField('phone', e.target.value)} dir="ltr" />
          </QuestionCard>

          <QuestionCard title="מייל">
            <Input type="email" placeholder="your@email.com" value={form.email} onChange={e => updateField('email', e.target.value)} dir="ltr" />
          </QuestionCard>

          <QuestionCard title="תאריך לידה">
            <Input type="date" value={form.birth_date} onChange={e => updateField('birth_date', e.target.value)} />
          </QuestionCard>

          <QuestionCard title="תאריך נישואין">
            <Input type="date" value={form.wedding_date} onChange={e => updateField('wedding_date', e.target.value)} />
          </QuestionCard>

          <QuestionCard title="מספר הנפשות בבית וגילם *">
            <Textarea placeholder="לדוגמה: 2 מבוגרים, 3 ילדים (8, 5, 2)" value={form.household} onChange={e => updateField('household', e.target.value)} />
          </QuestionCard>

          <QuestionCard title="איזה חלל תרצו שנעצב? *">
            <RadioGroup value={form.space_type} onValueChange={v => updateField('space_type', v)} className="space-y-2">
              {SPACE_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-center gap-3">
                  <RadioGroupItem value={opt.value} id={`space-${opt.value}`} />
                  <Label htmlFor={`space-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {form.space_type === 'other' && (
              <Input className="mt-2" placeholder="פרטו..." value={form.space_type_other} onChange={e => updateField('space_type_other', e.target.value)} />
            )}
          </QuestionCard>

          <QuestionCard title="מה שטח הנכס? בן כמה שנים? *">
            <Textarea placeholder="לדוגמה: 120 מ״ר, בניין בן 15 שנה" value={form.property_size_age} onChange={e => updateField('property_size_age', e.target.value)} />
          </QuestionCard>

          <QuestionCard title="לאיזה סגנון עיצובי אתם מתחברים? *">
            <RadioGroup value={form.design_style} onValueChange={v => updateField('design_style', v)} className="space-y-3">
              {STYLE_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-start gap-3">
                  <RadioGroupItem value={opt.value} id={`style-${opt.value}`} className="mt-1" />
                  <Label htmlFor={`style-${opt.value}`} className="cursor-pointer">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground block">{opt.desc}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </QuestionCard>

          <QuestionCard title="מדוע החלטתם לשפץ כרגע? מה נותן לכם הרגשה לא טובה בביתכם? *">
            <Textarea placeholder="ספרו לנו..." value={form.why_renovate} onChange={e => updateField('why_renovate', e.target.value)} className="min-h-24" />
          </QuestionCard>

          <QuestionCard title="בוא נתאם ציפיות, מה הכי חשוב לכם לקבל ממני? *">
            <RadioGroup value={form.expectations} onValueChange={v => updateField('expectations', v)} className="space-y-2">
              {EXPECTATION_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-start gap-3">
                  <RadioGroupItem value={opt.value} id={`exp-${opt.value}`} className="mt-1" />
                  <Label htmlFor={`exp-${opt.value}`} className="cursor-pointer text-sm">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {form.expectations === 'other' && (
              <Input className="mt-2" placeholder="פרטו..." value={form.expectations_other} onChange={e => updateField('expectations_other', e.target.value)} />
            )}
          </QuestionCard>

          <QuestionCard title="כמה חשבתם להשקיע בשיפוץ? *">
            <Input placeholder="לדוגמה: 200,000-300,000 ₪" value={form.budget} onChange={e => updateField('budget', e.target.value)} />
          </QuestionCard>

          <QuestionCard title='אחד מהערכים המובילים בסטודיו הינם הקשבה לצרכי הלקוח... אשמח לדעת על הציפיות שלכם ממני:'>
            <RadioGroup value={form.style_philosophy} onValueChange={v => updateField('style_philosophy', v)} className="space-y-2">
              {STYLE_PHILOSOPHY.map(opt => (
                <div key={opt.value} className="flex items-start gap-3">
                  <RadioGroupItem value={opt.value} id={`phil-${opt.value}`} className="mt-1" />
                  <Label htmlFor={`phil-${opt.value}`} className="cursor-pointer text-sm">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {form.style_philosophy === 'other' && (
              <Input className="mt-2" placeholder="פרטו..." value={form.style_philosophy_other} onChange={e => updateField('style_philosophy_other', e.target.value)} />
            )}
          </QuestionCard>

          <QuestionCard title="עבור שי קטן — אשמח לדעת, האם אתם אנשים של: *">
            <RadioGroup value={form.gift} onValueChange={v => updateField('gift', v)} className="space-y-2">
              {GIFT_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-center gap-3">
                  <RadioGroupItem value={opt.value} id={`gift-${opt.value}`} />
                  <Label htmlFor={`gift-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </QuestionCard>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">תודה על הזמן! 💛 נשמח לדבר בקרוב.</p>
              {(!form.name || !form.phone) && (
                <p className="text-sm text-destructive">יש למלא שם מלא וטלפון כדי לשלוח</p>
              )}
              <Button size="lg" className="gap-2 w-full max-w-xs" onClick={handleSubmit} disabled={submitting || !form.name || !form.phone}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                שליחה
              </Button>
              <p className="text-xs text-muted-foreground">מיכל וולברגר — עיצוב פנים</p>
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  <ArrowRight className="w-4 h-4" />
                  חזרה למערכת
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function QuestionCard({ title, children }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Label className="text-sm font-medium">{title}</Label>
        {children}
      </CardContent>
    </Card>
  );
}