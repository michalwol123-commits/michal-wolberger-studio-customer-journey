import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function PortalError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="font-heading font-bold text-xl mb-2">קישור לא תקין</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          הקישור שקיבלת אינו תקין או שפג תוקפו.
          <br />
          אנא פני למיכל לקבלת קישור חדש.
        </p>
      </Card>
    </div>
  );
}