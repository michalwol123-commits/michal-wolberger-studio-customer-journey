import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react';

const STYLE_LABELS = {
  modern: 'מודרני', country: 'כפרי', industrial: 'תעשייתי',
  eclectic: 'אקלקטי', minimalist: 'מרדי',
  elegant: 'אלגנטי', colorful: 'צבעוני', dont_know: 'לא יודעים',
};

const SPACE_LABELS = {
  up_to_80: 'עד 80 מ"ר', up_to_160: 'עד 160 מ"ר',
  up_to_240: 'עד 240 מ"ר', public_space: 'חלל ציבורי בלבד',
  specific_room: 'חדר ספציפי בבית',
};

const GIFT_LABELS = { chocolate: 'שוקולד מושחת', healthy: 'דיאטי בריא', fruit: 'פירותי' };

const EXPECTATION_LABELS = {
  fast_turnkey: 'שורה תחתונה, החלטות מהירות',
  hand_in_hand: 'תהליך יד ביד',
  detailed_quotes: 'הצעות מחיר מפורטות',
  calm_trust: 'שקט ובטחון נפשי',
};

const PHILOSOPHY_LABELS = {
  love_variety: 'אוהבים גיוון והפתעות',
  safe_beauty: 'הולכים על בטוח',
  modern_fresh: 'טרנדי וחדש',
  practical: 'פרקטי ויפה',
};

export default function QuestionnaireResponsesView({ questionnaires }) {
  if (!questionnaires || questionnaires.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">לא נמצאו שאלונים</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {questionnaires.map(q => (
        <QuestionnaireCard key={q.id} questionnaire={q} />
      ))}
    </div>
  );
}

function QuestionnaireCard({ questionnaire }) {
  const q = questionnaire;
  const isSubmitted = q.status === 'submitted';
  const typeLabel = q.type === 'short' ? 'שאלון קצר' : 'שאלון מפורט';

  let responses = {};
  try { responses = JSON.parse(q.responses || '{}'); } catch {}

  const contactRows = [
    { label: 'שם', value: q.name },
    { label: 'טלפון', value: q.phone },
    { label: 'מייל', value: q.email },
  ].filter(r => r.value);

  const isDetailed = q.type === 'detailed';

  // שאלון קצר
  const shortRows = [
    { label: 'תאריך לידה', value: responses.birth_date },
    { label: 'תאריך נישואין', value: responses.wedding_date },
    { label: 'נפשות בבית', value: responses.household },
    { label: 'חלל לעיצוב', value: SPACE_LABELS[responses.space_type] || responses.space_type_other || responses.space_type },
    { label: 'שטח וגיל הנכס', value: responses.property_size_age },
    { label: 'סגנון עיצובי', value: STYLE_LABELS[responses.design_style] || responses.design_style },
    { label: 'סיבת שיפוץ', value: responses.why_renovate },
    { label: 'ציפיות', value: EXPECTATION_LABELS[responses.expectations] || (responses.expectations === 'other' ? responses.expectations_other : responses.expectations) },
    { label: 'תקציב משוער', value: responses.budget },
    { label: 'פילוסופיית סגנון', value: PHILOSOPHY_LABELS[responses.style_philosophy] || (responses.style_philosophy === 'other' ? responses.style_philosophy_other : responses.style_philosophy) },
    { label: 'שי קטן', value: GIFT_LABELS[responses.gift] || responses.gift },
  ].filter(r => r.value);

  // שאלון מפורט
  const SEATING_LABELS = { sofa_3_2: 'ספה 3+2', l_shape: 'ספה בצורת ר', long_armchairs: 'ספה ארוכה וכורסאות' };
  const DINING_LABELS = { round_table: 'שולחן עגול/אליפטי', rectangular_table: 'שולחן מלבני', library_vitrine: 'ספריה/ויטרינה', candle_corner: 'פינת הדלקת נרות' };
  const TIME_LABELS = { living_room: 'סלון', family_corner: 'פינת משפחה', kitchen: 'מטבח', garden: 'גינה', each_in_room: 'כל אחד בחדר' };

  const detailedRows = isDetailed ? {
    general: [
      { label: 'דיירים + גילאים', value: responses.residents },
      { label: 'תאריכי לידה', value: responses.birth_dates },
      { label: 'מבלים רוב הזמן ב-', value: TIME_LABELS[responses.time_area] || responses.time_area_other },
      { label: 'סגנון עיצובי', value: STYLE_LABELS[responses.design_style] },
      { label: 'הבית ישדר', value: responses.home_feeling },
      { label: 'צבעים מועדפים', value: responses.preferred_colors },
      { label: 'צבעים שלא', value: responses.disliked_colors },
    ].filter(r => r.value),
    living: [
      { label: 'פריטים', value: responses.living_items?.length ? responses.living_items.join(', ') : null },
      { label: 'גודל טלוויזיה', value: responses.tv_size },
      { label: 'קיר כח', value: responses.accent_wall === 'yes' ? 'כן' : responses.accent_wall === 'no' ? 'לא' : responses.accent_wall === 'maybe' ? 'אולי' : null },
      { label: 'סוג ישיבה', value: SEATING_LABELS[responses.seating_type] || responses.seating_other },
      { label: 'רהיטים קיימים', value: responses.existing_furniture },
      { label: 'הערות', value: responses.living_notes },
    ].filter(r => r.value),
    dining: [
      { label: 'פריטים', value: responses.dining_items?.map(v => DINING_LABELS[v] || v).join(', ') || null },
      { label: 'מספר סועדים', value: responses.table_seats },
      { label: 'סגנון אירוח', value: responses.hosting_style },
      { label: 'הערות', value: responses.dining_notes },
    ].filter(r => r.value),
  } : null;

  const rows = isDetailed ? [] : shortRows;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          {isSubmitted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Clock className="w-5 h-5 text-amber-500" />
          )}
          {typeLabel} — {isSubmitted ? 'מולא ✅' : 'ממתין למילוי'}
          {q.submitted_at && (
            <span className="text-xs font-normal text-muted-foreground mr-auto">
              {new Date(q.submitted_at).toLocaleDateString('he-IL')}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isSubmitted ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            השאלון נשלח ללקוח וטרם מולא
          </p>
        ) : rows.length === 0 && contactRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין תשובות</p>
        ) : (
          <div className="space-y-2">
            {contactRows.map((row, i) => (
              <div key={`c-${i}`} className="flex gap-2 text-sm py-1.5 border-b border-border">
                <span className="font-medium text-primary w-32 shrink-0">{row.label}</span>
                <span className="text-foreground" dir={row.label === 'שם' ? 'rtl' : 'ltr'}>{row.value}</span>
              </div>
            ))}
            {!isDetailed && rows.map((row, i) => (
              <div key={i} className="flex gap-2 text-sm py-1.5 border-b border-border last:border-0">
                <span className="font-medium text-muted-foreground w-32 shrink-0">{row.label}</span>
                <span className="text-foreground">{row.value}</span>
              </div>
            ))}
            {isDetailed && detailedRows && (
              <>
                {detailedRows.general.length > 0 && <SectionBlock title="🏠 כללי" rows={detailedRows.general} />}
                {detailedRows.living.length > 0 && <SectionBlock title="🛋️ סלון" rows={detailedRows.living} />}
                {detailedRows.dining.length > 0 && <SectionBlock title="🍽️ פינת אוכל" rows={detailedRows.dining} />}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionBlock({ title, rows }) {
  return (
    <div className="mt-3">
      <h4 className="text-sm font-heading font-semibold text-primary mb-1">{title}</h4>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 text-sm py-1.5 border-b border-border last:border-0">
          <span className="font-medium text-muted-foreground w-32 shrink-0">{row.label}</span>
          <span className="text-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  );
}