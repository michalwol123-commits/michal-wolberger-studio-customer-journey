import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Zap, Lightbulb, ArrowLeft, Play, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const springConfig = { type: 'spring', damping: 25, stiffness: 300 };

export default function TutorialCard({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onNavigate,
  waitingForNav,
  onPractice,
  allStepTitles = [],
  onJumpTo,
}) {
  const [showJumpMenu, setShowJumpMenu] = useState(false);
  const jumpRef = useRef(null);

  useEffect(() => {
    if (!showJumpMenu) return;
    const handler = (e) => {
      if (jumpRef.current && !jumpRef.current.contains(e.target)) setShowJumpMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showJumpMenu]);
  const Icon = step.icon;
  const progress = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <motion.div
      layoutId="tutorial-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={springConfig}
      className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-[520px] max-w-[90vw] z-[10002]"
      dir="rtl"
    >
      {/* Progress bar */}
      <div className="h-1.5 bg-muted w-full">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Header */}
      <div className={`p-4 bg-gradient-to-l ${step.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center ${step.iconColor}`}>
              {step.iconEmoji ? (
                <span className="text-lg">{step.iconEmoji}</span>
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground text-base">{step.title}</h3>
              <span className="text-xs text-muted-foreground">כרטיס {currentIndex + 1} מתוך {totalSteps}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {allStepTitles.length > 0 && onJumpTo && (
              <div className="relative" ref={jumpRef}>
                <button
                  onClick={() => setShowJumpMenu(!showJumpMenu)}
                  className="text-muted-foreground hover:text-foreground p-1 text-xs flex items-center gap-1 bg-white/60 rounded-md px-2 py-1"
                >
                  <ChevronsUpDown className="w-3 h-3" />
                  דלג ל...
                </button>
                {showJumpMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-[300px] overflow-y-auto w-64">
                    {allStepTitles.map((title, i) => (
                      <button
                        key={i}
                        onClick={() => { onJumpTo(i); setShowJumpMenu(false); }}
                        className={`w-full text-right px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                          i === currentIndex ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                        }`}
                      >
                        <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                        <span className="truncate">{title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={onSkip} className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{step.content}</p>

        {/* Tip */}
        {step.tip && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">{step.tip}</p>
          </div>
        )}

        {/* Auto note */}
        {step.autoNote && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-2.5">
            <Zap className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-xs text-green-700 font-medium">{step.autoNote}</p>
          </div>
        )}

        {/* Practice button */}
        {(onPractice || step.forcePractice) && !waitingForNav && (
          <Button
            onClick={() => {
              if (step.forcePractice && step.navigateTo && onNavigate) {
                onNavigate(step.navigateTo);
              }
              if (onPractice) onPractice();
            }}
            variant="outline"
            className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Play className="w-4 h-4" />
            תרגלי עכשיו
          </Button>
        )}

        {/* Navigate button(s) */}
        {waitingForNav && step.navigateLinks && (
          <div className="space-y-2">
            {step.navigateLinks.map((link, i) => (
              <Button
                key={i}
                onClick={() => onNavigate(link.path)}
                className="w-full gap-2"
                variant={i === 0 ? 'default' : 'outline'}
              >
                <ArrowLeft className="w-4 h-4" />
                {link.label}
              </Button>
            ))}
            {step.navigateNote && (
              <p className="text-xs text-muted-foreground text-center">{step.navigateNote}</p>
            )}
          </div>
        )}
        {waitingForNav && !step.navigateLinks && step.navigateTo && (
          <div className="space-y-2">
            <Button
              onClick={() => onNavigate(step.navigateTo)}
              className="w-full gap-2"
              variant="default"
            >
              <ArrowLeft className="w-4 h-4" />
              {step.navigateLabel}
            </Button>
            {step.navigateNote && (
              <p className="text-xs text-muted-foreground text-center">{step.navigateNote}</p>
            )}
          </div>
        )}
      </div>

      {/* Footer — navigation */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentIndex > 0 && (
            <Button variant="ghost" size="sm" onClick={onPrev} className="gap-1">
              <ChevronRight className="w-4 h-4" />
              הקודם
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            סגור
          </Button>
          <Button size="sm" onClick={onNext} className="gap-1">
            {currentIndex === totalSteps - 1 ? 'סיום' : 'הבא'}
            {currentIndex < totalSteps - 1 && <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Step dots — condensed for many steps */}
      <div className="flex justify-center gap-1 pb-3 px-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-colors ${
              i === currentIndex 
                ? 'w-3 h-1.5 bg-primary' 
                : i < currentIndex 
                  ? 'w-1.5 h-1.5 bg-primary/40' 
                  : 'w-1.5 h-1.5 bg-muted-foreground/20'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}