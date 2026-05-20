import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import TutorialCard from './TutorialCard';
import TUTORIAL_STEPS from './tutorialSteps';

const STORAGE_KEY = 'michal_tutorial_completed';
const STEP_KEY = 'michal_tutorial_step';

export function useTutorial() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [practicing, setPracticing] = useState(false);

  const start = useCallback(() => {
    setCurrentStep(0);
    setActive(true);
    setPracticing(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    setPracticing(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.removeItem(STEP_KEY);
  }, []);

  const startPractice = useCallback(() => {
    setPracticing(true);
  }, []);

  const resumeFromPractice = useCallback(() => {
    setPracticing(false);
  }, []);

  // Auto-start on first visit
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const saved = localStorage.getItem(STEP_KEY);
      setCurrentStep(saved ? parseInt(saved, 10) : 0);
      setActive(true);
    }
  }, []);

  return { active, currentStep, setCurrentStep, start, stop, practicing, startPractice, resumeFromPractice };
}

export default function TutorialOverlay({ active, currentStep, setCurrentStep, onStop, practicing, onPractice, onResume }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [highlightRect, setHighlightRect] = useState(null);
  const [waitingForNav, setWaitingForNav] = useState(false);

  const step = TUTORIAL_STEPS[currentStep];

  const updateHighlight = useCallback(() => {
    if (!step || !step.highlightSelector) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(step.highlightSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setHighlightRect({
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
      setWaitingForNav(false);
    } else {
      setHighlightRect(null);
      const navTargets = step.navigateLinks
        ? step.navigateLinks.map(l => l.path)
        : step.navigateTo ? [step.navigateTo] : [];
      if (navTargets.length > 0 && !navTargets.includes(location.pathname)) {
        setWaitingForNav(true);
      }
    }
  }, [step, location.pathname, active]);

  // Track element position
  useEffect(() => {
    if (!active || !step) return;
    updateHighlight();

    // Poll for element (it might render after data loads)
    const interval = setInterval(updateHighlight, 500);
    
    // Also observe resize
    const handleResize = () => updateHighlight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [updateHighlight, currentStep]);

  // Save step to localStorage
  useEffect(() => {
    if (active) localStorage.setItem(STEP_KEY, currentStep.toString());
  }, [currentStep, active]);

  if (!step || !active) return null;

  // Practice mode — show only the floating resume button
  if (practicing) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={onResume}
        dir="rtl"
        className="fixed bottom-6 left-6 z-[10001] flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span className="text-sm font-medium">חזרה למדריך</span>
      </motion.button>
    );
  }

  const handleNext = () => {
    if (currentStep >= TUTORIAL_STEPS.length - 1) {
      onStop();
    } else {
      setCurrentStep(currentStep + 1);
      setWaitingForNav(false);
      setHighlightRect(null);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setWaitingForNav(false);
      setHighlightRect(null);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setWaitingForNav(false);
    // After navigation, the useEffect will pick up the element
  };

  const isCenter = step.position === 'center' || (!highlightRect && !waitingForNav);
  const showSpotlight = highlightRect && !isCenter;

  // Calculate card position
  const getCardStyle = () => {
    if (isCenter || waitingForNav) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    if (!highlightRect) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const cardWidth = 380;
    const cardHeight = 400;
    const gap = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;

    switch (step.position) {
      case 'bottom':
        top = highlightRect.y + highlightRect.height + gap;
        left = highlightRect.x + highlightRect.width / 2 - cardWidth / 2;
        if (top + cardHeight > vh) top = highlightRect.y - cardHeight - gap;
        break;
      case 'top':
        top = highlightRect.y - cardHeight - gap;
        left = highlightRect.x + highlightRect.width / 2 - cardWidth / 2;
        if (top < 0) top = highlightRect.y + highlightRect.height + gap;
        break;
      case 'left':
        top = highlightRect.y + highlightRect.height / 2 - cardHeight / 2;
        left = highlightRect.x - cardWidth - gap;
        if (left < 0) left = highlightRect.x + highlightRect.width + gap;
        break;
      case 'right':
        top = highlightRect.y + highlightRect.height / 2 - cardHeight / 2;
        left = highlightRect.x + highlightRect.width + gap;
        if (left + cardWidth > vw) left = highlightRect.x - cardWidth - gap;
        break;
      default:
        top = highlightRect.y + highlightRect.height + gap;
        left = highlightRect.x;
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, vw - cardWidth - 8));
    top = Math.max(8, Math.min(top, vh - cardHeight - 8));

    return { position: 'fixed', top, left };
  };

  return (
    <div className="fixed inset-0 z-[10000]" style={{ pointerEvents: 'none' }}>
      {/* Dark overlay with spotlight hole */}
      <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'all' }}>
        <defs>
          <mask id="tutorial-mask">
            <rect width="100%" height="100%" fill="white" />
            {showSpotlight && (
              <rect
                x={highlightRect.x}
                y={highlightRect.y}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
          {showSpotlight && (
            <filter id="tutorial-glow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#tutorial-mask)"
        />
        {/* Glow border */}
        {showSpotlight && (
          <rect
            x={highlightRect.x}
            y={highlightRect.y}
            width={highlightRect.width}
            height={highlightRect.height}
            rx="12"
            fill="none"
            stroke="hsl(22, 30%, 50%)"
            strokeWidth="2"
            filter="url(#tutorial-glow)"
            opacity="0.8"
          />
        )}
      </svg>

      {/* Tutorial card */}
      <AnimatePresence mode="wait">
        <div
          key={step.id}
          style={{ ...getCardStyle(), pointerEvents: 'all' }}
        >
          <TutorialCard
            step={step}
            currentIndex={currentStep}
            totalSteps={TUTORIAL_STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={onStop}
            onNavigate={handleNavigate}
            waitingForNav={waitingForNav}
            onPractice={step.highlightSelector || step.forcePractice ? onPractice : null}
          />
        </div>
      </AnimatePresence>
    </div>
  );
}