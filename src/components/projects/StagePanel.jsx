import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Download, Eye } from 'lucide-react';
import { getStageByNum } from '@/lib/stageConfig';
import UploadDocumentDialog from '@/components/documents/UploadDocumentDialog';
import StageGallery from './StageGallery';
import StageAdvanceButton from './StageAdvanceButton';

const VISUAL_STAGES = [8]; // stages that get gallery view

export default function StagePanel({ project, stageNum }) {
  const [showUpload, setShowUpload] = useState(false);
  const stage = getStageByNum(stageNum);
  const stageStatus = project[stage?.key] || 'pending';

  const { data: allDocs = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 500),
  });

  const stageDocs = allDocs.filter(
    d => d.project_id === project.id && d.stage === stageNum && d.is_current !== false
  );

  const isVisualStage = VISUAL_STAGES.includes(stageNum);
  const imageDocs = stageDocs.filter(d => ['render', 'concept', 'photo'].includes(d.type));
  const otherDocs = stageDocs.filter(d => !['render', 'concept', 'photo'].includes(d.type));

  const statusLabels = { pending: 'ממתין', in_progress: 'בביצוע', completed: 'הושלם' };
  const statusColors = {
    pending: 'text-muted-foreground bg-muted',
    in_progress: 'text-primary bg-primary/10',
    completed: 'text-green-700 bg-green-50',
  };

  return (
    <div className="space-y-4">
      {/* Stage header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                {stage?.icon} שלב {stageNum} — {stage?.label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{stage?.description}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColors[stageStatus]}`}>
              {statusLabels[stageStatus]}
            </span>
          </div>
          {/* Advance button — only shown on current stage */}
          {stageNum === project.stage_current && stageNum < 13 && (
            <div className="mt-4 flex justify-end">
              <StageAdvanceButton project={project} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual gallery for stage 8 */}
      {isVisualStage && imageDocs.length > 0 && (
        <StageGallery docs={imageDocs} />
      )}

      {/* Documents list */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <FileText className="w-4 h-4" />
            מסמכים ({isVisualStage ? otherDocs.length : stageDocs.length})
          </CardTitle>
          <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1">
            <Upload className="w-4 h-4" />
            העלאת מסמך לשלב {stageNum}
          </Button>
        </CardHeader>
        <CardContent>
          {(isVisualStage ? otherDocs : stageDocs).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין מסמכים בשלב זה</p>
          ) : (
            <div className="space-y-2">
              {(isVisualStage ? otherDocs : stageDocs).map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} • גרסה {doc.version_number || 1}
                      {doc.visible_to_client && <span className="text-green-600 mr-2">• גלוי ללקוח ✓</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadDocumentDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        projectId={project.id}
        clientId={project.client_id}
        defaultStage={stageNum}
      />
    </div>
  );
}