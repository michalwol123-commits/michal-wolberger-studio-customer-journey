import React, { useState } from 'react';
import { PortalProvider, usePortal } from '@/lib/PortalContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PortalLayout from '@/components/portal/PortalLayout';
import PortalLoading from '@/components/portal/PortalLoading';
import PortalError from '@/components/portal/PortalError';
import PortalWelcome from '@/components/portal/PortalWelcome';
import PortalProjectList from '@/components/portal/PortalProjectList';
import PortalProjectView from '@/components/portal/PortalProjectView';
import PortalCompleted from '@/components/portal/PortalCompleted';
import PortalGuide from '@/components/portal/PortalGuide';

function PortalRouter() {
  const { client, loading, error } = usePortal();
  const [selectedProject, setSelectedProject] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['portal-projects', client?.id],
    queryFn: () => base44.entities.Project.filter({ client_id: client.id }),
    enabled: !!client,
  });

  if (loading || projectsLoading) return <PortalLoading />;
  if (error || !client) return <PortalError />;

  const guideProps = { onShowGuide: () => setShowGuide(!showGuide), showingGuide: showGuide };

  if (showGuide) {
    return (
      <PortalLayout {...guideProps}>
        <PortalGuide />
      </PortalLayout>
    );
  }

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'on_hold');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const allProjects = [...activeProjects, ...completedProjects];

  // State E — handled above (error)

  // If a project is selected
  if (selectedProject) {
    if (selectedProject.status === 'completed') {
      return (
        <PortalLayout {...guideProps}>
          <PortalCompleted
            project={selectedProject}
            onBack={allProjects.length > 1 ? () => setSelectedProject(null) : null}
          />
        </PortalLayout>
      );
    }
    return (
      <PortalLayout {...guideProps}>
        <PortalProjectView
          project={selectedProject}
          onBack={allProjects.length > 1 ? () => setSelectedProject(null) : null}
        />
      </PortalLayout>
    );
  }

  // State A — no active project (lead/qualified)
  if (allProjects.length === 0) {
    return (
      <PortalLayout {...guideProps}>
        <PortalWelcome />
      </PortalLayout>
    );
  }

  // State B — single project (auto-select)
  if (allProjects.length === 1) {
    const proj = allProjects[0];
    if (proj.status === 'completed') {
      return (
        <PortalLayout {...guideProps}>
          <PortalCompleted project={proj} />
        </PortalLayout>
      );
    }
    return (
      <PortalLayout {...guideProps}>
        <PortalProjectView project={proj} />
      </PortalLayout>
    );
  }

  // State C — multiple projects
  return (
    <PortalLayout {...guideProps}>
      <PortalProjectList projects={allProjects} onSelect={setSelectedProject} />
    </PortalLayout>
  );
}

export default function Portal() {
  return (
    <PortalProvider>
      <PortalRouter />
    </PortalProvider>
  );
}