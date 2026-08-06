import React from 'react';
import ArtIcon from './ArtIcon';

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
    <div className="space-y-0 mb-6 last:mb-0">
      <h4 className="p-display text-base mt-4 mb-2 pb-2" style={{ borderBottom: '1px solid #e0d8ce' }}>{title}</h4>
      {filtered.map((row, i) => (
        <div key={i} className="flex gap-3 text-sm py-2" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #e8e0d8' : 'none' }}>
          <span className="p-label !text-[11px] w-36 shrink-0 pt-0.5">{row.label}</span>
          <span style={{ color: '#2a1f18' }}>{Array.isArray(row.value) ? row.value.join(', ') : row.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DetailedQuestionnaireResults({ questionnaire }) {
  let r = {};
  try { r = JSON.parse(questionnaire.responses || '{}'); } catch {}

  return (
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="check" size={48} />
        <div className="flex-1">
          <p className="p-label mb-0.5" style={{ color: '#6b7a4f' }}>הושלם</p>
          <h3 className="p-display text-lg">שאלון מפורט — מולא</h3>
        </div>
        {questionnaire.submitted_at && (
          <span className="p-label !text-[10px]">
            {new Date(questionnaire.submitted_at).toLocaleDateString('he-IL')}
          </span>
        )}
      </div>
      <div className="p-6">
        <Section title="כללי" rows={[
          { label: 'דיירים + גילאים', value: r.residents },
          { label: 'תאריכי לידה', value: r.birth_dates },
          { label: 'מבלים רוב הזמן ב-', value: TIME_LABELS[r.time_area] || r.time_area_other },
          { label: 'סגנון עיצובי', value: STYLE_LABELS[r.design_style] },
          { label: 'הבית ישדר', value: r.home_feeling },
          { label: 'צבעים מועדפים', value: r.preferred_colors },
          { label: 'צבעים שלא', value: r.disliked_colors },
        ]} />
        <Section title="סלון" rows={[
          { label: 'פריטים חשובים', value: r.living_items },
          { label: 'פריטים נוספים', value: r.living_items_other },
          { label: 'גודל טלוויזיה', value: r.tv_size },
          { label: 'קיר כח', value: r.accent_wall === 'yes' ? 'כן' : r.accent_wall === 'no' ? 'לא' : r.accent_wall === 'maybe' ? 'אולי' : '' },
          { label: 'סוג ישיבה', value: SEATING_LABELS[r.seating_type] || r.seating_other },
          { label: 'רהיטים קיימים', value: r.existing_furniture },
          { label: 'הערות', value: r.living_notes },
        ]} />
        <Section title="פינת אוכל" rows={[
          { label: 'פריטים חשובים', value: r.dining_items?.map(v => DINING_LABELS[v] || v) },
          { label: 'פריטים נוספים', value: r.dining_items_other },
          { label: 'מספר סועדים', value: r.table_seats },
          { label: 'סגנון אירוח', value: r.hosting_style },
          { label: 'הערות', value: r.dining_notes },
        ]} />
      </div>
    </div>
  );
}