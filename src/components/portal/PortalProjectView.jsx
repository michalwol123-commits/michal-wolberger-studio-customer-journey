import React, { useState } from 'react';
import { usePortal } from '@/lib/PortalContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PortalTimeline from './PortalTimeline';
import PortalStageView from './PortalStageView';
import PortalGanttView from './PortalGanttView';
import PortalBudgetView from './PortalBudgetView';
import PortalDocApproval from './PortalDocApproval';
import PortalDaysMetrics from './PortalDaysMetrics';
import PortalNextStep from './PortalNextStep';
import MichalContactCard from './MichalContactCard';
import PortalImageSection from './PortalImageSection';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const SECTION_IMG = 'https://media.base44.com/images/public/69c56d22dada4d9b43006820/171771e17_Image25of71.jpg';

export default function PortalProjectView({ project, onBack }) {
  const { client } = usePortal();
  const [selectedStage, setSelectedStage] = useState(project.stage_current || 1);

  const { data: payments = [] } = useQuery({
    queryKey: ['portal-payments', project.id],
    queryFn: () => base44.entities.Payment.filter({ project_id: project.id }),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['portal-meetings', client.id],
    queryFn: () => base44.entities.Meeting.filter({ client_id: client.id }),
  });

  const { data: allDocs = [] } = useQuery({
    queryKey: ['portal-approval-docs', project.id],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id }),
  });

  const { data: questionnaires = [] } = useQuery({
    queryKey: ['portal-questionnaires', client.id],
    queryFn: () => base44.entities.Questionnaire.filter({ client_id: client.id }),
  });

  // Filter meetings to this project
  const projectMeetings = meetings.filter(m => !m.project_id || m.project_id === project.id);

  // "הצעד הבא שלך" — נגזר מנתונים שכבר נטענו (UI בלבד)
  const pendingSignDoc = allDocs.find(d => d.signature_status === 'pending_signature' && d.signature_token && d.visible_to_client);
  const pendingApprovalDoc = allDocs.find(d => d.approval_status === 'pending' && d.visible_to_client);
  const pendingQuestionnaire = questionnaires.find(q => q.status === 'pending');

  let nextAction = null;
  if (pendingSignDoc) {
    nextAction = {
      icon: 'pen',
      label: 'הצעד הבא שלך',
      title: 'מסמך ממתין לחתימתך',
      description: `"${pendingSignDoc.name}" מוכן — נותרה רק חתימה דיגיטלית קצרה.`,
      buttonLabel: 'לחתימה',
      onClick: () => { window.location.href = `/sign?token=${pendingSignDoc.signature_token}`; },
    };
  } else if (pendingApprovalDoc) {
    nextAction = {
      icon: 'doc',
      label: 'הצעד הבא שלך',
      title: 'מסמך ממתין לאישורך',
      description: `"${pendingApprovalDoc.name}" מחכה למשוב שלך.`,
      buttonLabel: 'לצפייה',
      onClick: () => document.getElementById('portal-doc-approval')?.scrollIntoView({ behavior: 'smooth' }),
    };
  } else if (pendingQuestionnaire) {
    nextAction = {
      icon: 'list',
      label: 'הצעד הבא שלך',
      title: 'שאלון ממתין למילוי',
      description: 'התשובות שלך יעזרו למיכל לדייק את התכנון עבורך.',
      buttonLabel: 'למילוי',
      onClick: () => document.getElementById('portal-stage')?.scrollIntoView({ behavior: 'smooth' }),
    };
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {onBack && (
        <button onClick={onBack} className="p-btn-outline text-sm !py-2 !px-5">
          <span>→</span> חזרה לרשימת הפרויקטים
        </button>
      )}

      {/* פס סטטוס הפרויקט */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-card p-8 md:p-10">
          <p className="p-label mb-3">הפרויקט שלך</p>
          <h2 className="p-display text-3xl md:text-4xl mb-4">{project.name}</h2>
          <div className="flex flex-wrap gap-x-8 gap-y-1 mb-8">
            {project.start_date && (
              <span className="p-label">התחלה · {format(new Date(project.start_date), 'dd/MM/yyyy')}</span>
            )}
            {project.end_date_est && (
              <span className="p-label">סיום משוער · {format(new Date(project.end_date_est), 'dd/MM/yyyy')}</span>
            )}
          </div>
          {/* פס התקדמות דק */}
          <div className="w-full" style={{ height: 2, background: '#c8bdb2' }}>
            <div style={{ height: 2, background: '#2a1f18', width: `${project.progress || 0}%`, transition: 'width 0.6s ease' }} />
          </div>
          <p className="text-sm mt-3" style={{ color: '#8a7060' }}>{project.progress || 0}% הושלם</p>
        </div>
      </motion.div>

      {/* הצעד הבא שלך */}
      <PortalNextStep action={nextAction} />

      {/* Main layout: Timeline sidebar + Stage content — על תמונת רקע שקופה */}
      <PortalImageSection imageUrl={project.portal_bg_url} plain={project.portal_plain_bg} className="py-10 md:py-14 px-4 md:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Timeline sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4"
        >
          <div className="p-card lg:sticky lg:top-24 p-5 md:p-6">
            <p className="p-label mb-1">מהלך הפרויקט</p>
            <h3 className="p-display text-lg mb-4">המסע שלך, שלב אחר שלב</h3>
            <PortalTimeline
              project={project}
              selectedStage={selectedStage}
              onSelectStage={setSelectedStage}
            />
          </div>
        </motion.div>

        {/* Stage content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Document approvals */}
          <div id="portal-doc-approval">
            <PortalDocApproval documents={allDocs} projectId={project.id} />
          </div>

          <div id="portal-stage">
            <PortalStageView
              project={project}
              stageNum={selectedStage}
              meetings={projectMeetings}
              payments={payments}
              questionnaires={questionnaires}
            />
          </div>

          {/* Days metrics (visible from stage 9+) */}
          {selectedStage >= 9 && <PortalDaysMetrics project={project} />}

          {/* Gantt timeline (visible from stage 6+) */}
          {selectedStage >= 6 && <PortalGanttView project={project} />}

          {/* Budget utilization (visible from stage 6+) */}
          {selectedStage >= 6 && <PortalBudgetView project={project} />}
        </div>
      </div>
      </PortalImageSection>

      {/* מפריד תמונה — מוסתר במצב רקע חלק */}
      {!project.portal_plain_bg && (
        <div className="relative h-40 md:h-56 overflow-hidden p-reveal">
          <img src={project.portal_divider_url || SECTION_IMG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(42,31,24,0.25)' }} />
        </div>
      )}

      {/* מיכל איתך — על תמונת רקע שקופה, לפני הפוטר */}
      <PortalImageSection imageUrl={project.portal_bg_url} plain={project.portal_plain_bg} className="py-10 md:py-14 px-4 md:px-8">
        <MichalContactCard />
      </PortalImageSection>
    </div>
  );
}