import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { getStageByNum } from '@/lib/stageConfig';
import { motion, AnimatePresence } from 'framer-motion';
import ArtIcon from './ArtIcon';
import PortalStageMeetings from './PortalStageMeetings';
import PortalStagePayments from './PortalStagePayments';
import PortalQuestionnaireView from './PortalQuestionnaireView';
import DetailedQuestionnaireForm from './DetailedQuestionnaireForm';
import DetailedQuestionnaireResults from './DetailedQuestionnaireResults';
import PortalDesignMap from './PortalDesignMap';
import InspirationBoardViewer from './InspirationBoardViewer';
import PortalQuoteView from './PortalQuoteView';
import PortalDaysMetrics from './PortalDaysMetrics';
import PortalSupplierDocs from './PortalSupplierDocs';
import PortalFieldVisits from './PortalFieldVisits';
import PortalFloorPlanConfirmation from './PortalFloorPlanConfirmation';

const STAGE_CONTENT = {
  1: { questionnaire: 'short', docs: true },
  2: { meetings: true, docs: true },
  3: { meetings: true, payments: true, docs: true, quotes: true },
  4: { docs: true, quotes: true },
  5: { questionnaire: 'detailed', docs: true },
  6: { floor_plan: true, meetings: true, docs: true },
  8: { meetings: true, docs: true, payments: true, inspiration: true },
  9:  { days: true, meetings: true, docs: true, payments: true, fieldvisits: true },
  10: { meetings: true, docs: true, payments: true, supplier_docs: true },
  11: { days: true, meetings: true, docs: true, payments: true, fieldvisits: true },
  12: { days: true, meetings: true, docs: true, payments: true, fieldvisits: true },
  13: { payments: true, docs: true, completion: true },
};
function getStageContent(stageNum) {
  return STAGE_CONTENT[stageNum] || { meetings: true, docs: true, payments: true };
}

const STAGE_ART = {
  1: 'chat', 2: 'clock', 3: 'doc', 4: 'pen', 5: 'list', 6: 'ruler', 7: 'ruler',
  8: 'palette', 9: 'box', 10: 'box', 11: 'camera', 12: 'camera', 13: 'home',
};

const APP_URL = window.location.origin;

function PortalFloorPlanApproval({ project }) {
  const { data: allDocs = [], isLoading } = useQuery({
    queryKey: ['portal-floor-plans', project.id],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id, visible_to_client: true }),
  });
  const floorPlans = allDocs.filter(d => d.type === 'floor_plan' && d.is_current !== false);
  const isLocked = !!project.floor_plan_locked;
  const signedDoc = floorPlans.find(d => d.signature_status === 'signed');
  if (isLoading || floorPlans.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="p-card overflow-hidden">
        <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8', background: '#f0ebe4' }}>
          <ArtIcon name={isLocked ? 'check' : 'ruler'} size={52} />
          <div>
            <p className="p-label mb-1">תכנית העמדה</p>
            <h3 className="p-display text-lg">
              {isLocked ? 'תכנית העמדה — אושרה וחתומה' : 'בחרו את תכנית העמדה שלכם'}
            </h3>
            {!isLocked && (
              <p className="text-sm mt-1" style={{ color: '#8a7060' }}>
                עיינו בתכניות המוצעות ובחרו את זו שמתאימה לכם — לאחר החתימה לא ניתן לשנות.
              </p>
            )}
          </div>
        </div>
        <div className="p-5 space-y-3">
          {isLocked && signedDoc && (
            <div className="flex items-center gap-3 p-4" style={{ background: '#eef0e4', border: '1px solid #6b7a4f' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#6b7a4f' }}>
                  {signedDoc.name || 'תכנית העמדה'} — נחתמה על ידי {signedDoc.signer_name}
                </p>
                {signedDoc.signed_at && (
                  <p className="text-xs" style={{ color: '#6b7a4f' }}>{new Date(signedDoc.signed_at).toLocaleDateString('he-IL')}</p>
                )}
              </div>
              {signedDoc.signed_pdf_url && (
                <a href={signedDoc.signed_pdf_url} target="_blank" rel="noopener noreferrer"
                  className="mr-auto text-xs underline" style={{ color: '#6b7a4f' }}>
                  PDF חתום ←
                </a>
              )}
            </div>
          )}
          {!isLocked && floorPlans.map((doc, i) => {
            const isImage = /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(doc.file_url || '');
            const canSign = doc.signature_token && doc.signature_status !== 'signed';
            const signUrl = `${APP_URL}/sign?token=${doc.signature_token}`;
            return (
              <div key={doc.id} className="overflow-hidden transition-colors" style={{ border: '1px solid #e8e0d8' }}>
                {isImage && (
                  <div className="w-full h-48 overflow-hidden" style={{ background: '#f0ebe4' }}>
                    <img src={doc.file_url} alt={doc.name} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#2a1f18' }}>{doc.name || `תכנית ${i + 1}`}</p>
                    {doc.signature_status === 'signed' && <p className="text-xs" style={{ color: '#6b7a4f' }}>נחתמה</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isImage && doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-btn-outline text-xs !py-1.5 !px-4">
                        צפייה
                      </a>
                    )}
                    {canSign && (
                      <a href={signUrl} className="p-btn text-xs !py-1.5 !px-4">
                        בוחרים ומאשרים <span className="p-arrow">←</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!isLocked && floorPlans.every(d => !d.signature_token) && (
            <p className="text-sm text-center py-3" style={{ color: '#8a7060' }}>
              התכניות עדיין לא מוכנות לחתימה — נודיע לכם כשיהיו מוכנות
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const CLOSING_LETTER = [
  { text: 'עיצוב עבורי הוא הרבה מעבר לבחירת חומרים, צבעים ורהיטים.', style: 'lead' },
  { text: 'זו היכולת לקחת אנשים, חלומות, הרגלים ורגעים קטנים מהחיים\nולהפוך אותם לבית שמרגיש נכון באמת.', style: 'body' },
  { text: 'אבל יותר מהכל,\nכל פרויקט הוא קודם כל חיבור אנושי.\nההיכרות, השיחות, ההתלבטויות, ההתרגשויות בדרך,\nוהאמון שאתם נותנים בי להיכנס אל תוך המקום הכי אישי שלכם,\nהבית שלכם.', style: 'body' },
  { text: 'לאורך כל הדרך היה לי חשוב לא רק ליצור עבורכם חלל יפה ומדויק,\nאלא גם חוויה נעימה, קשובה ומלאה בשיתוף פעולה.\nכזו שבה אתם מרגישים שיש מי שמלווה אתכם, רואה אתכם,\nומחזיק יחד איתכם את כל חלקי הפאזל עד שהתמונה השלמה מתחברת.', style: 'body' },
  { text: 'מאחורי כל תמונה בפרויקט הזה\nיש מחשבה, רגש, אינספור החלטות קטנות והמון אהבה למה שאנחנו יוצרים יחד.', style: 'body' },
  { text: 'תודה שנתתם בי את האמון להיות חלק מהדרך שלכם.\nזו תמיד זכות גדולה עבורי,\nואני מקווה שבכל פעם שתיכנסו הביתה תרגישו בדיוק את מה שחלמנו ליצור כאן יחד', style: 'closing' },
];
const PHOTO_DOC_TYPES = ['render', 'concept', 'photo', 'inspiration', 'mood_board', 'floor_plan'];
const GOOGLE_REVIEW_URL = 'https://www.google.com/search?q=%D7%9E%D7%99%D7%9B%D7%9C+%D7%95%D7%95%D7%9C%D7%91%D7%A8%D7%92%D7%A8+%D7%AA%D7%9B%D7%A0%D7%95%D7%9F+%D7%95%D7%A2%D7%99%D7%A6%D7%95%D7%91+%D7%A4%D7%A0%D7%99%D7%9D+%D7%91%D7%99%D7%A7%D7%95%D7%A8%D7%95%D7%AA';

function PortalProjectCompletion({ project, clientName }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const { data: allDocs = [] } = useQuery({
    queryKey: ['portal-completion-photos', project.id],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id, visible_to_client: true }),
  });
  const collageDocs = allDocs.filter(d => {
    if (d.is_current === false || !d.file_url) return false;
    return PHOTO_DOC_TYPES.includes(d.type) || /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(d.file_url);
  }).slice(0, 12);

  return (
    <div className="space-y-10" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        className="p-card relative overflow-hidden">
        <div className="relative z-10 p-8 md:p-14">
          <div className="flex items-center gap-4 mb-10">
            <ArtIcon name="heart" size={56} />
            <div>
              <p className="p-label mb-1">מכתב אישי</p>
              <p className="p-display text-lg">מיכל וולברגר</p>
            </div>
          </div>
          <p className="p-display text-xl mb-8">
            {clientName ? `${clientName} היקר/ה,` : 'לקוח/ה יקר/ה,'}
          </p>
          <div className="space-y-6">
            {CLOSING_LETTER.map((block, i) => (
              <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.12, duration: 0.6 }}
                className={`whitespace-pre-line leading-relaxed ${block.style === 'lead' ? 'p-display text-lg' : 'text-base'}`}
                style={{ color: block.style === 'lead' ? '#2a1f18' : '#4a3728' }}>
                {block.text}
              </motion.p>
            ))}
          </div>
          <div className="mt-12 pt-8" style={{ borderTop: '1px solid #e0d8ce' }}>
            <p className="text-sm" style={{ color: '#8a7060' }}>באהבה,</p>
            <p className="p-display text-2xl mt-1">מיכל וולברגר</p>
            <p className="p-label mt-2">סטודיו מיכל וולברגר · עיצוב פנים</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
        className="p-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-right">
          <p className="p-display text-lg mb-1">אהבתם את הפרויקט?</p>
          <p className="text-xs" style={{ color: '#8a7060' }}>חוות הדעת שלכם עוזרת ללקוחות עתידיים לבחור נכון</p>
        </div>
        <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="p-btn text-sm shrink-0">
          כתבו לנו ביקורת <span className="p-arrow">←</span>
        </a>
      </motion.div>

      {collageDocs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="mb-6">
            <p className="p-label mb-1">גלריה</p>
            <h3 className="p-display text-xl">רגעים מהפרויקט שלנו</h3>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '140px' }}>
            {collageDocs.map((doc, i) => (
              <motion.button key={doc.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }} onClick={() => setLightboxUrl(doc.file_url)}
                className="relative overflow-hidden group cursor-pointer focus:outline-none"
                style={{ gridColumn: i === 0 ? 'span 2' : 'span 1', gridRow: i === 0 ? 'span 2' : 'span 1' }}>
                <img src={doc.file_url} alt={doc.name || 'תמונה'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-xs px-3 py-2 truncate w-full">{doc.name}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {lightboxUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
            <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxUrl(null)}>
              <X className="w-8 h-8" />
            </button>
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={lightboxUrl} alt="תצוגה מוגדלת"
              className="max-w-full max-h-[90vh] object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PortalStageView({ project, stageNum, meetings, payments, questionnaires }) {
  const stage = getStageByNum(stageNum);
  const status = project[stage?.key] || 'pending';
  const content = getStageContent(stageNum);

  const { data: documents = [] } = useQuery({
    queryKey: ['portal-stage-docs', project.id, stageNum],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id, visible_to_client: true }),
    enabled: !!content.docs,
  });

  const isCurrentStage = Number(stageNum) === Number(project.stage_current);
  const PHOTO_TYPES_TO_HIDE = ['render', 'concept', 'photo', 'inspiration', 'mood_board'];
  const stageDocs = content.docs
    ? documents.filter(d => {
        if (d.is_current === false) return false;
        if (d.type === 'shopping_invoice' || d.type === 'quote') return false;
        if (Number(stageNum) === 13 && PHOTO_TYPES_TO_HIDE.includes(d.type)) return false;
        // Stage 4: show contract docs
        if (Number(stageNum) === 4 && d.type === 'contract') return true;
        if (d.stage != null && d.stage !== 0 && Number(d.stage) === Number(stageNum)) return true;
        if ((!d.stage || d.stage === 0) && isCurrentStage) return true;
        return false;
      })
    : [];

  const statusLabel = status === 'completed' ? 'הושלם' : status === 'in_progress' ? 'בביצוע' : 'ממתין';
  const statusColor = status === 'completed' ? '#6b7a4f' : status === 'in_progress' ? '#2a1f18' : '#8a7060';
  const shortQ = questionnaires?.find(q => q.type === 'short');
  const detailedQ = questionnaires?.find(q => q.type === 'detailed');

  return (
    <motion.div key={stageNum} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      {/* כותרת שלב */}
      <div className="p-card p-6 md:p-8 flex items-center gap-5">
        <ArtIcon name={STAGE_ART[Number(stageNum)] || 'path'} size={64} />
        <div className="flex-1">
          <p className="p-label mb-1">שלב {stageNum} מתוך 13</p>
          <h2 className="p-display text-2xl md:text-3xl mb-1">{stage?.label}</h2>
          <p className="text-sm" style={{ color: '#8a7060' }}>{stage?.description}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: statusColor }} />
            <span className="p-label" style={{ color: statusColor }}>{statusLabel}</span>
          </div>
        </div>
      </div>

      {content.questionnaire === 'short' && <PortalQuestionnaireView questionnaire={shortQ} />}
      {content.questionnaire === 'detailed' && (
        detailedQ?.status === 'submitted'
          ? <DetailedQuestionnaireResults questionnaire={detailedQ} />
          : <DetailedQuestionnaireForm questionnaire={detailedQ} projectId={project.id} clientId={project.client_id} />
      )}
      {content.quotes && <PortalQuoteView projectId={project.id} clientId={project.client_id} stageNum={stageNum} />}
      {content.floor_plan && <PortalFloorPlanApproval project={project} />}
      {content.floor_plan && <PortalFloorPlanConfirmation project={project} />}
      {content.days && <PortalDaysMetrics project={project} stageNum={Number(stageNum)} />}
      {content.meetings && <PortalStageMeetings meetings={meetings} stageNum={stageNum} />}
      {content.fieldvisits && <PortalFieldVisits project={project} visitTypeFilter={Number(stageNum) === 12 ? 'installation' : Number(stageNum) === 11 ? 'supervision' : undefined} />}

      {content.docs && (
        <div className="p-card">
          <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
            <ArtIcon name="doc" size={48} floatDelay={1} />
            <div>
              <p className="p-label mb-0.5">מסמכים</p>
              <h3 className="p-display text-lg">מסמכים בשלב זה</h3>
            </div>
          </div>
          <div className="p-5">
            {stageDocs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm" style={{ color: '#8a7060' }}>
                  {status === 'pending' ? 'השלב עוד לא התחיל — המסמכים יופיעו כאן כשנגיע אליו' : 'אין מסמכים זמינים בשלב זה כרגע'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {stageDocs.map(doc => (
                  <a key={doc.id} href={doc.signed_pdf_url || doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 transition-all group"
                    style={{ border: '1px solid #e8e0d8' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#2a1f18' }}>{doc.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#8a7060' }}>
                        {doc.type && <span>{doc.type}</span>}
                        {doc.version_number > 1 && ` · גרסה ${doc.version_number}`}
                      </p>
                    </div>
                    <span className="text-sm transition-transform group-hover:-translate-x-1" style={{ color: '#8a7060' }}>←</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {content.inspiration && <InspirationBoardViewer projectId={project.id} project={project} />}
      {stageNum >= 4 && <PortalDesignMap projectId={project.id} stageFilter={stageNum} />}
      {content.completion && <PortalProjectCompletion project={project} clientName={project?.client_name} />}
      {content.payments && <PortalStagePayments payments={payments} stageNum={stageNum} />}
      {content.supplier_docs && <PortalSupplierDocs project={project} />}
    </motion.div>
  );
}