import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import TutorialOverlay, { useTutorial } from '@/components/tutorial/TutorialOverlay';
import TutorialHelpButton from '@/components/tutorial/TutorialHelpButton';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tutorial = useTutorial();

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <TutorialOverlay
        active={tutorial.active}
        currentStep={tutorial.currentStep}
        setCurrentStep={tutorial.setCurrentStep}
        onStop={tutorial.stop}
      />
      {!tutorial.active && <TutorialHelpButton onStart={tutorial.start} />}
    </div>
  );
}