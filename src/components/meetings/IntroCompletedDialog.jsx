import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

export default function IntroCompletedDialog({ open, onOpenChange, onContinue, onNotInterested, loading }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>פגישת היכרות הושלמה</DialogTitle>
          <DialogDescription>
            האם הלקוח ממשיך לשלב הבא (פגישת הצעת מחיר)?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            onClick={onContinue}
            disabled={loading}
            className="gap-2 h-12 text-base bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-5 h-5" />
            ממשיך — פתח פגישת הצעת מחיר
          </Button>
          <Button
            variant="outline"
            onClick={onNotInterested}
            disabled={loading}
            className="gap-2 h-12 text-base border-destructive text-destructive hover:bg-destructive/10"
          >
            <XCircle className="w-5 h-5" />
            לא ממשיך — העבר לארכיון
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}