import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, CheckCircle2 } from 'lucide-react';

const STYLE_LABELS = {
  modern: 'מודרני',
  country: 'כפרי',
  industrial: 'תעשייתי',
  eclectic: 'אקלקטי',
  minimalist: 'מרדי',
};

const SPACE_LABELS = {
  up_to_80: 'עד 80 מ"ר',
  up_to_160: 'עד 160 מ"ר',
  up_to_240: 'עד 240 מ"ר',
  public_space: 'חלל ציבורי בלבד',
  specific_room: 'חדר ספציפי בבית',
};

const GIFT_LABELS = {
  chocolate: 'שוקולד מושחת',
  healthy: 'דיאטי בריא',
  fruit: 'פירותי',
};

export default function PortalQuestionnaireView({ questionnaire }) {
  if (!questionnaire || questionnaire.status !== 'submitted') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            שאלון טרום שיחה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            השאלון טרם מולא
          </p>
        </CardContent>
      </Card>
    );
  }

  let responses = {};
  try { responses = JSON.parse(questionnaire.responses); } catch { }

  const rows = [
    { label: 'תאריך לידה', value: responses.birth_date },
    { label: 'תאריך נישואין', value: responses.wedding_date },
    { label: 'נפשות בבית', value: responses.household },
    { label: 'חלל לעיצוב', value: SPACE_LABELS[responses.space_type] || responses.space_type_other || responses.space_type },
    { label: 'שטח וגיל הנכס', value: responses.property_size_age },
    { label: 'סגנון עיצובי', value: STYLE_LABELS[responses.design_style] || responses.design_style },
    { label: 'סיבת שיפוץ', value: responses.why_renovate },
    { label: 'ציפיות', value: responses.expectations === 'other' ? responses.expectations_other : responses.expectations },
    { label: 'תקציב משוער', value: responses.budget },
    { label: 'שי קטן', value: GIFT_LABELS[responses.gift] || responses.gift },
  ].filter(r => r.value);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          שאלון טרום שיחה — מולא ✅
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 text-sm py-1.5 border-b border-border last:border-0">
              <span className="font-medium text-muted-foreground w-28 shrink-0">{row.label}</span>
              <span className="text-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}