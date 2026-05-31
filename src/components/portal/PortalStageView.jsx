import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Check, Loader2, Circle, CheckCircle2, Lock, ExternalLink, PenLine, Heart, Star, X } from 'lucide-react';
import { getStageByNum } from '@/lib/stageConfig';
import { motion, AnimatePresence } from 'framer-motion';
import PortalStageMeetings from './PortalStageMeetings';
import PortalStagePayments from './PortalStagePayments';
import PortalQuestionnaireView from './PortalQuestionnaireView';
import DetailedQuestionnaireForm from './DetailedQuestionnaireForm';
import DetailedQuestionnaireResults from './DetailedQuestionnaireResults';
import PortalDesignMap from './PortalDesignMap';
import InspirationBoardViewer from './InspirationBoardViewer';
import PortalQuoteView from './PortalQuoteView';
import PortalDaysMetrics from './PortalDaysMetrics';

const STAGE_CONTENT = {
  1: { questionnaire: 'short', docs: true },
  2: { meetings: true, docs: true },
  3: { meetings: true, payments: true, docs: true, quotes: true },
  4: { docs: true, quotes: true },
  5: { questionnaire: 'detailed', docs: true },
  6: { floor_plan: true, meetings: true, docs: true },
  8: { meetings: true, docs: true, payments: true, inspiration: true },
  9: { days: true },
  11: { days: true },
  12: { days: true },
  13: { payments: true, docs: true, completion: true },
};
function getStageContent(stageNum) {
  return STAGE_CONTENT[stageNum] || { meetings: true, docs: true, payments: true };
}

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
      <Card className="overflow-hidden">
        <CardHeader className="pb-3" style={{ background: 'linear-gradient(135deg, #f5efe6 0%, #ede0d0 100%)' }}>
          <CardTitle className="text-base font-heading flex items-center gap-2" style={{ color: '#4a3928' }}>
            {isLocked
              ? <><Lock className="w-4 h-4 text-green-600" /> תכנית העמדה — אושרה וחתומה ✅</>
              : <><PenLine className="w-4 h-4" style={{ color: '#8B7355' }} /> בחרו את תכנית העמדה שלכם</>}
          </CardTitle>
          {!isLocked && (
            <p className="text-sm mt-1" style={{ color: '#8B7355' }}>
              עיינו בתכניות המוצעות ובחרו את זו שמתאימה לכם — לאחר החתימה לא ניתן לשנות.
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {isLocked && signedDoc && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  {signedDoc.name || 'תכנית העמדה'} — נחתמה על ידי {signedDoc.signer_name}
                </p>
                {signedDoc.signed_at && (
                  <p className="text-xs text-green-600">{new Date(signedDoc.signed_at).toLocaleDateString('he-IL')}</p>
                )}
              </div>
              {signedDoc.signed_pdf_url && (
                <a href={signedDoc.signed_pdf_url} target="_blank" rel="noopener noreferrer"
                  className="mr-auto flex items-center gap-1 text-xs text-green-700 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> PDF חתום
                </a>
              )}
            </div>
          )}
          {!isLocked && floorPlans.map((doc, i) => {
            const isImage = /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(doc.file_url || '');
            const canSign = doc.signature_token && doc.signature_status !== 'signed';
            const signUrl = `${APP_URL}/sign?token=${doc.signature_token}`;
            return (
              <div key={doc.id} className="rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-colors">
                {isImage && (
                  <div className="w-full h-48 bg-muted overflow-hidden">
                    <img src={doc.file_url} alt={doc.name} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 shrink-0" style={{ color: '#8B7355' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name || `תכנית ${i + 1}`}</p>
                      {doc.signature_status === 'signed' && <p className="text-xs text-green-600">✓ נחתמה</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isImage && doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> צפייה
                      </a>
                    )}
                    {canSign && (
                      <a href={signUrl}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: '#8B7355' }}>
                        <PenLine className="w-3.5 h-3.5" /> בוחרים ומאשרים ✍️
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!isLocked && floorPlans.every(d => !d.signature_token) && (
            <p className="text-sm text-muted-foreground text-center py-3">
              התכניות עדיין לא מוכנות לחתימה — נודיע לכם כשיהיו מוכנות 🙂
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

const CLOSING_LETTER = [
  { text: 'עיצוב עבורי הוא הרבה מעבר לבחירת חומרים, צבעים ורהיטים.', style: 'lead' },
  { text: 'זו היכולת לקחת אנשים, חלומות, הרגלים ורגעים קטנים מהחיים\nולהפוך אותם לבית שמרגיש נכון באמת.', style: 'body' },
  { text: 'אבל יותר מהכל,\nכל פרויקט הוא קודם כל חיבור אנושי.\nההיכרות, השיחות, ההתלבטויות, ההתרגשויות בדרך,\nוהאמון שאתם נותנים בי להיכנס אל תוך המקום הכי אישי שלכם,\nהבית שלכם.', style: 'body' },
  { text: 'לאורך כל הדרך היה לי חשוב לא רק ליצור עבורכם חלל יפה ומדויק,\nאלא גם חוויה נעימה, קשובה ומלאה בשיתוף פעולה.\nכזו שבה אתם מרגישים שיש מי שמלווה אתכם, רואה אתכם,\nומחזיק יחד איתכם את כל חלקי הפאזל עד שהתמונה השלמה מתחברת.', style: 'body' },
  { text: 'מאחורי כל תמונה בפרויקט הזה\nיש מחשבה, רגש, אינספור החלטות קטנות והמון אהבה למה שאנחנו יוצרים יחד.', style: 'body' },
  { text: 'תודה שנתתם בי את האמון להיות חלק מהדרך שלכם.\nזו תמיד זכות גדולה עבורי,\nואני מקווה שבכל פעם שתיכנסו הביתה תרגישו בדיוק את מה שחלמנו ליצור כאן יחד ❤️', style: 'closing' },
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
    <div className="space-y-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        className="relative overflow-hidden rounded-3xl"
        style={{ background: 'linear-gradient(135deg, #f5efe6 0%, #ede0d0 50%, #f0e8da 100%)' }}>
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #8B7355 0%, transparent 70%)' }} />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #8B7355 0%, transparent 70%)' }} />
        <div className="relative z-10 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ background: '#8B7355' }}>
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B7355' }}>מכתב אישי</p>
              <p className="text-sm font-semibold" style={{ color: '#5a4a38' }}>מיכל וולברגר</p>
            </div>
          </div>
          <p className="text-lg font-semibold mb-6" style={{ color: '#5a4a38' }}>
            {clientName ? `${clientName} היקר/ה,` : 'לקוח/ה יקר/ה,'}
          </p>
          <div className="space-y-5">
            {CLOSING_LETTER.map((block, i) => (
              <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.12, duration: 0.6 }}
                className={`whitespace-pre-line leading-relaxed ${block.style === 'lead' ? 'text-lg font-semibold' : 'text-base'}`}
                style={{ color: block.style === 'lead' ? '#4a3928' : '#5a4a38' }}>
                {block.text}
              </motion.p>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t" style={{ borderColor: 'rgba(139,115,85,0.3)' }}>
            <p className="text-sm" style={{ color: '#8B7355' }}>באהבה,</p>
            <p className="text-xl font-semibold mt-1" style={{ color: '#4a3928', fontFamily: 'Georgia, serif' }}>מיכל וולברגר</p>
            <p className="text-xs mt-1" style={{ color: '#8B7355' }}>סטודיו מיכל וולברגר — עיצוב פנים</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
        className="rounded-2xl border p-5 flex items-center justify-between gap-4"
        style={{ background: '#fffdf9', borderColor: '#e8ddd0' }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />)}</div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#4a3928' }}>אהבתם את הפרויקט?</p>
            <p className="text-xs" style={{ color: '#8B7355' }}>חוות הדעת שלכם עוזרת ללקוחות עתידיים לבחור נכון</p>
          </div>
        </div>
        <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:opacity-90 shrink-0"
          style={{ background: '#8B7355' }}>
          <ExternalLink className="w-4 h-4" /> כתבו לנו ביקורת
        </a>
      </motion.div>

      {collageDocs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 rounded-full" style={{ background: '#8B7355' }} />
            <h3 className="text-base font-semibold" style={{ color: '#4a3928' }}>רגעים מהפרויקט שלנו</h3>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '140px' }}>
            {collageDocs.map((doc, i) => (
              <motion.button key={doc.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }} onClick={() => setLightboxUrl(doc.file_url)}
                className="relative overflow-hidden rounded-2xl group cursor-pointer focus:outline-none"
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
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
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
  const stageDocs = content.docs
    ? documents.filter(d => {
        if (d.is_current === false) return false;
        if (d.stage != null && d.stage !== 0 && Number(d.stage) === Number(stageNum)) return true;
        if ((!d.stage || d.stage === 0) && isCurrentStage) return true;
        return false;
      })
    : [];

  const statusLabel = status === 'completed' ? 'הושלם ✅' : status === 'in_progress' ? 'בביצוע 🔄' : 'ממתין ⏳';
  const StatusIcon = status === 'completed' ? Check : status === 'in_progress' ? Loader2 : Circle;
  const shortQ = questionnaires?.find(q => q.type === 'short');
  const detailedQ = questionnaires?.find(q => q.type === 'detailed');

  return (
    <motion.div key={stageNum} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <div className="bg-gradient-to-l from-primary/5 to-transparent rounded-2xl p-6 border border-primary/10">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${status === 'completed' ? 'bg-green-100' : status === 'in_progress' ? 'bg-primary/15' : 'bg-muted'}`}>
            {stage?.icon}
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl">שלב {stageNum} — {stage?.label}</h2>
            <p className="text-sm text-muted-foreground">{stage?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <StatusIcon className={`w-4 h-4 ${status === 'completed' ? 'text-green-600' : status === 'in_progress' ? 'text-primary animate-spin' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-medium ${status === 'completed' ? 'text-green-600' : status === 'in_progress' ? 'text-primary' : 'text-muted-foreground'}`}>{statusLabel}</span>
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
      {content.days && <PortalDaysMetrics project={project} />}
      {content.meetings && <PortalStageMeetings meetings={meetings} stageNum={stageNum} />}

      {content.docs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />מסמכים בשלב זה
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageDocs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {status === 'pending' ? 'השלב עוד לא התחיל — המסמכים יופיעו כאן כשנגיע אליו' : 'אין מסמכים זמינים בשלב זה כרגע'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {stageDocs.map(doc => (
                  <a key={doc.id} href={doc.signed_pdf_url || doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type && <span className="capitalize">{doc.type}</span>}
                          {doc.version_number > 1 && ` • גרסה ${doc.version_number}`}
                        </p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {content.inspiration && <InspirationBoardViewer projectId={project.id} project={project} />}
      {stageNum >= 4 && <PortalDesignMap projectId={project.id} stageFilter={stageNum} />}
      {content.completion && <PortalProjectCompletion project={project} clientName={project?.client_name} />}
      {content.payments && <PortalStagePayments payments={payments} stageNum={stageNum} />}
    </motion.div>
  );
}