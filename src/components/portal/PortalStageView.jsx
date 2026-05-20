import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Check, Loader2, Circle } from 'lucide-react';
import { getStageByNum } from '@/lib/stageConfig';
import { motion } from 'framer-motion';
import PortalStageMeetings from './PortalStageMeetings';
import PortalStagePayments from './PortalStagePayments';
import PortalQuestionnaireView from './PortalQuestionnaireView';
import DetailedQuestionnaireForm from './DetailedQuestionnaireForm';
import DetailedQuestionnaireResults from './DetailedQuestionnaireResults';
import PortalDesignMap from './PortalDesignMap';
import InspirationBoardViewer from './InspirationBoardViewer';
import PortalQuoteView from './PortalQuoteView';

// Define what content each stage shows in the portal
const STAGE_CONTENT = {
  1: { questionnaire: 'short' },                    // שלב 1: רק שאלון קצר
  2: { meetings: true, docs: true },                  // שלב 2: פגישת היכרות + סיכום + מסמכים
  3: { meetings: true, payments: true, docs: true, quotes: true },  // שלב 3: פגישה + הצעת מחיר + תשלומים + מסמכים
  4: { docs: true, quotes: true },                    // שלב 4: חוזה + פרטי ההצעה שאושרה
  5: { questionnaire: 'detailed', docs: true },       // שלב 5: שאלון מפורט + מסמכים
  8: { meetings: true, docs: true, payments: true, inspiration: true }, // שלב 8: קונספט עיצובי + לוח השראה
};
// שלבים 6-13: פגישות + מסמכים + תשלומים (ברירת מחדל)

function getStageContent(stageNum) {
  return STAGE_CONTENT[stageNum] || { meetings: true, docs: true, payments: true };
}

export default function PortalStageView({ project, stageNum, meetings, payments, questionnaires }) {
  const stage = getStageByNum(stageNum);
  const status = project[stage?.key] || 'pending';
  const content = getStageContent(stageNum);

  const { data: documents = [] } = useQuery({
    queryKey: ['portal-stage-docs', project.id, stageNum],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id }),
    enabled: !!content.docs,
  });

  const stageDocs = content.docs 
    ? documents.filter(d => d.visible_to_client && d.is_current !== false && d.stage === stageNum)
    : [];

  const statusLabel = status === 'completed' ? 'הושלם ✅' : status === 'in_progress' ? 'בביצוע 🔄' : 'ממתין ⏳';
  const StatusIcon = status === 'completed' ? Check : status === 'in_progress' ? Loader2 : Circle;

  // Find relevant questionnaire
  const shortQ = questionnaires?.find(q => q.type === 'short');
  const detailedQ = questionnaires?.find(q => q.type === 'detailed');

  return (
    <motion.div
      key={stageNum}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Stage Header */}
      <div className="bg-gradient-to-l from-primary/5 to-transparent rounded-2xl p-6 border border-primary/10">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
            status === 'completed' ? 'bg-green-100' : status === 'in_progress' ? 'bg-primary/15' : 'bg-muted'
          }`}>
            {stage?.icon}
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl">שלב {stageNum} — {stage?.label}</h2>
            <p className="text-sm text-muted-foreground">{stage?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <StatusIcon className={`w-4 h-4 ${
            status === 'completed' ? 'text-green-600' : status === 'in_progress' ? 'text-primary animate-spin' : 'text-muted-foreground'
          }`} />
          <span className={`text-sm font-medium ${
            status === 'completed' ? 'text-green-600' : status === 'in_progress' ? 'text-primary' : 'text-muted-foreground'
          }`}>{statusLabel}</span>
        </div>
      </div>

      {/* Questionnaire (stage 1 or 5) */}
      {content.questionnaire === 'short' && (
        <PortalQuestionnaireView questionnaire={shortQ} />
      )}
      {content.questionnaire === 'detailed' && (
        detailedQ?.status === 'submitted' ? (
          <DetailedQuestionnaireResults questionnaire={detailedQ} />
        ) : (
          <DetailedQuestionnaireForm
            questionnaire={detailedQ}
            projectId={project.id}
            clientId={project.client_id}
          />
        )
      )}

      {/* Quotes (stage 3+4) */}
      {content.quotes && (
        <PortalQuoteView projectId={project.id} clientId={project.client_id} stageNum={stageNum} />
      )}

      {/* Meetings */}
      {content.meetings && (
        <PortalStageMeetings meetings={meetings} stageNum={stageNum} />
      )}

      {/* Documents */}
      {content.docs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              מסמכים בשלב זה
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageDocs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {status === 'pending' ? 'השלב עוד לא התחיל — המסמכים יופיעו כאן כשנגיע אליו' :
                   'אין מסמכים זמינים בשלב זה כרגע'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {stageDocs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                  >
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

      {/* Inspiration Board (stage 8) */}
      {content.inspiration && (
        <InspirationBoardViewer projectId={project.id} project={project} />
      )}

      {/* Design Map (stages 4+) */}
      {stageNum >= 4 && (
        <PortalDesignMap projectId={project.id} stageFilter={stageNum} />
      )}

      {/* Payments */}
      {content.payments && (
        <PortalStagePayments payments={payments} stageNum={stageNum} />
      )}
    </motion.div>
  );
}