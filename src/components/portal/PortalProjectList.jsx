import React from 'react';
import { motion } from 'framer-motion';
import { getStageName } from '@/lib/stageConfig';
import ArtIcon from './ArtIcon';

const statusLabels = {
  active: 'פעיל',
  on_hold: 'מוקפא',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

export default function PortalProjectList({ projects, onSelect }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-10">
        <p className="p-label mb-2">הבתים שלך איתנו</p>
        <h1 className="p-display text-3xl md:text-4xl mb-2" style={{ fontWeight: 300 }}>הפרויקטים שלך</h1>
        <p className="text-sm" style={{ color: '#8a7060' }}>בחרי פרויקט לצפייה</p>
      </div>

      <div className="grid gap-5">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <button
              className="p-card w-full text-right cursor-pointer transition-all duration-300 hover:-translate-y-1 group"
              onClick={() => onSelect(project)}
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-5 gap-4">
                  <div className="flex items-center gap-4">
                    <ArtIcon name="home" size={52} floatDelay={i} />
                    <div>
                      <h3 className="p-display text-xl">{project.name}</h3>
                      <p className="p-label mt-1">
                        שלב {project.stage_current || 1} · {getStageName(project.stage_current || 1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="p-label px-3 py-1.5" style={{ border: '1px solid #e0d8ce' }}>
                      {statusLabels[project.status] || project.status}
                    </span>
                    <span className="text-sm transition-transform group-hover:-translate-x-1" style={{ color: '#8a7060' }}>←</span>
                  </div>
                </div>
                <div className="w-full" style={{ height: 2, background: '#c8bdb2' }}>
                  <div style={{ height: 2, background: '#2a1f18', width: `${project.progress || 0}%` }} />
                </div>
                <p className="text-xs mt-2" style={{ color: '#8a7060' }}>{project.progress || 0}% הושלם</p>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}