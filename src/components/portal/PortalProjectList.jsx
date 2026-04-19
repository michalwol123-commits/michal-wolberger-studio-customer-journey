import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, FolderOpen } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { motion } from 'framer-motion';

const stageLabels = {
  1: 'שאלון', 2: 'תכנית + גאנט', 3: 'תכניות עבודה', 4: 'קונספט עיצובי',
  5: 'ימי קניות', 6: 'תמחור + ספקים', 7: 'ביצוע', 8: 'התקנה', 9: 'מסירה'
};

export default function PortalProjectList({ projects, onSelect }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="font-heading font-bold text-2xl mb-1">הפרויקטים שלך</h1>
        <p className="text-muted-foreground text-sm">בחר פרויקט לצפייה</p>
      </div>

      <div className="grid gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/30"
              onClick={() => onSelect(project)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">{project.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        שלב {project.stage_current || 1}: {stageLabels[project.stage_current || 1]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={project.status} />
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <Progress value={project.progress || 0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{project.progress || 0}% הושלם</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}