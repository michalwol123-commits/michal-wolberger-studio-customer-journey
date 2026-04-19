import React from 'react';
import { Navigate } from 'react-router-dom';
import { BookOpen, Code } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import useCurrentUser from '@/lib/useCurrentUser';
import GuideSection from '@/components/guide/GuideSection';
import { userSections, techSections } from '@/components/guide/guideData';

export default function UserGuide() {
  const { isAdmin, loading } = useCurrentUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">
      {/* Hero */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-8 mb-8 text-center">
        <div className="inline-flex p-3 rounded-xl bg-primary/20 mb-4">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-heading font-bold mb-2">ברוכה הבאה למדריך למשתמשת</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          כאן תמצאי הסברים מפורטים על כל חלקי המערכת — מה עושה כל דף, איך הכל מתחבר לבוט הווטסאפ, איך לשנות תוכן בלי לגעת בקוד.
          <br />
          לחצי על כל שאלה כדי לפתוח את התשובה.
        </p>
      </div>

      {/* User sections */}
      <Accordion type="multiple" className="space-y-0">
        {userSections.map((section) => (
          <GuideSection key={section.id} section={section} />
        ))}
      </Accordion>

      {/* Tech separator */}
      <div className="my-10">
        <Separator className="mb-6" />
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-slate-200 text-slate-700">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg">למפתחת (איינת) / טכני</h2>
            <p className="text-xs text-muted-foreground">החלק הבא מיועד לצוות הטכני בלבד — הגדרות, מפתחות API, ופתרון תקלות</p>
          </div>
        </div>
      </div>

      {/* Tech sections */}
      <Accordion type="multiple" className="space-y-0">
        {techSections.map((section) => (
          <GuideSection key={section.id} section={section} />
        ))}
      </Accordion>

      <div className="h-16" />
    </div>
  );
}