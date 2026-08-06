import React from 'react';
import ArtIcon from './ArtIcon';

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
      <div className="p-card">
        <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
          <ArtIcon name="list" size={48} />
          <div>
            <p className="p-label mb-0.5">מכירים אתכם</p>
            <h3 className="p-display text-lg">שאלון טרום שיחה</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-center py-4" style={{ color: '#8a7060' }}>
            השאלון טרם מולא
          </p>
        </div>
      </div>
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
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="check" size={48} />
        <div>
          <p className="p-label mb-0.5" style={{ color: '#6b7a4f' }}>הושלם</p>
          <h3 className="p-display text-lg">שאלון טרום שיחה — מולא</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-0">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-3 text-sm py-2.5" style={{ borderBottom: i < rows.length - 1 ? '1px solid #e8e0d8' : 'none' }}>
              <span className="p-label !text-[11px] w-28 shrink-0 pt-0.5">{row.label}</span>
              <span style={{ color: '#2a1f18' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}