import React, { useState } from 'react';
import { usePortal } from '@/lib/PortalContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartyPopper, Star, FileText, Download, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PortalCompleted({ project, onBack }) {
  const { client } = usePortal();
  const queryClient = useQueryClient();
  const [nps, setNps] = useState(project.nps_score || null);
  const [submitted, setSubmitted] = useState(!!project.nps_score);

  const { data: documents = [] } = useQuery({
    queryKey: ['portal-docs', project.id],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id }),
  });

  const visibleDocs = documents.filter(d => d.visible_to_client && d.is_current !== false);

  const updateProject = useMutation({
    mutationFn: (data) => base44.entities.Project.update(project.id, data),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['portal-projects'] });
    },
  });

  const handleNps = (score) => {
    setNps(score);
    updateProject.mutate({ nps_score: score });
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowRight className="w-4 h-4" />
          חזרה לרשימת הפרויקטים
        </Button>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="text-center border-2 border-green-200">
          <CardContent className="py-10">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="font-heading font-bold text-2xl mb-2">הפרויקט הושלם!</h1>
            <p className="text-muted-foreground mb-1">{project.name}</p>
            <p className="text-sm text-muted-foreground">תודה שבחרת בסטודיו מיכל וולברגר 🤍</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* NPS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              איך הייתה החוויה?
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-4">
                <p className="text-lg font-bold font-heading text-primary">{nps}/10</p>
                <p className="text-sm text-muted-foreground mt-1">תודה על המשוב!</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4 text-center">דרג/י את החוויה מ-1 עד 10</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                    <button
                      key={score}
                      onClick={() => handleNps(score)}
                      disabled={updateProject.isPending}
                      className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
                        nps === score
                          ? 'bg-primary text-primary-foreground scale-110'
                          : 'bg-muted hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Historical Documents */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              מסמכי הפרויקט
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visibleDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין מסמכים</p>
            ) : (
              <div className="space-y-2">
                {visibleDocs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type && <span className="capitalize">{doc.type}</span>}
                        {doc.stage && ` • שלב ${doc.stage}`}
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}