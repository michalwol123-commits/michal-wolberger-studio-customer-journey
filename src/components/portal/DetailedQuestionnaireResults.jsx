import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

const STYLE_LABELS = {
  modern: 'מודרני', country: 'כפרי', elegant: 'אלגנטי',
  eclectic: 'אקלקטי', colorful: 'צבעוני', dont_know: 'לא יודעים',
};

const TIME_LABELS = {
  living_room: 'סלון', family_corner: 'פינת משפחה', kitchen: 'מטבח',
  garden: 'גינה', each_in_room: 'כל אחד בחדר', other: 'אחר',
};

const SEATING_LABELS = {
  sofa_3_2: 'ספה 3+2', l_shape: 'ספה בצורת ר',
  long_armchairs: 'ספה ארוכה וכורסאות', other: 'אחר',
};

const DINING_LABELS = {
  round_table: 'שולחן עגול/אליפטי', rectangular_table: 'שולחן מלבני',
  library_vitrine: 'ספריה/ויטרינה', candle_corner: 'פינת הדלקת נרות', other: 'אחר',
};

function Section({ title, rows }) {
  const filtered = rows.filter(r => r.value);
  if (filtered.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-heading font-semibold text-primary mt-3 mb-1">{title}</h4>
      {filtered.map((row, i) => (
        <div key={i} className="flex gap-2 text-sm py-1.5 border-b border-border last:border-0">
          <span className="font-medium text-muted-foreground w-36 shrink-0">{row.label}</span>
          <span className="text-foreground">{Array.isArray(row.value) ? row.value.join(', ') : row.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DetailedQuestionnaireResults({ questionnaire }) {
  let r = {};
  try { r = JSON.parse(questionnaire.responses || '{}'); } catch {}

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          שאלון מפורט — מולא ✅
          {questionnaire.submitted_at && (
            <span className="text-xs font-normal text-muted-foreground mr-auto">
              {new Date(questionnaire.submitted_at).toLocaleDateString('he-IL')}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Section title="🏠 כללי" rows={[
          { label: 'דיירים + גילאים', value: r.residents },
          { label: 'תאריכי לידה', value: r.birth_dates },
          { label: 'מבלים רוב הזמן ב-', value: TIME_LABELS[r.time_area] || r.time_area_other },
          { label: 'סגנון עיצובי', value: STYLE_LABELS[r.design_style] },
          { label: 'הבית ישדר', value: r.home_feeling },
          { label: 'צבעים מועדפים', value: r.preferred_colors },
          { label: 'צבעים שלא', value: r.disliked_colors },
        ]} />
        <Section title="🛋️ סלון" rows={[
          { label: 'פריטים חשובים', value: r.living_items },
          { label: 'פריטים נוספים', value: r.living_items_other },
          { label: 'גודל טלוויזיה', value: r.tv_size },
          { label: 'קיר כח', value: r.accent_wall === 'yes' ? 'כן' : r.accent_wall === 'no' ? 'לא' : r.accent_wall === 'maybe' ? 'אולי' : '' },
          { label: 'סוג ישיבה', value: SEATING_LABELS[r.seating_type] || r.seating_other },
          { label: 'רהיטים קיימים', value: r.existing_furniture },
          { label: 'הערות', value: r.living_notes },
        ]} />
        <Section title="🍽️ פינת אוכל" rows={[
          { label: 'פריטים חשובים', value: r.dining_items?.map(v => DINING_LABELS[v] || v) },
          { label: 'פריטים נוספים', value: r.dining_items_other },
          { label: 'מספר סועדים', value: r.table_seats },
          { label: 'סגנון אירוח', value: r.hosting_style },
          { label: 'הערות', value: r.dining_notes },
        ]} />
      </CardContent>
    </Card>
  );
}