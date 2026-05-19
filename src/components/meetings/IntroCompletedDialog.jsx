import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';

export default function IntroCompletedDialog({ open, onOpenChange, onContinue, onNotInterested, loading }) {
  const [meetingPrice, setMeetingPrice] = useState(250);

  const handleContinue = () => {
    onContinue({ meetingPrice: Number(meetingPrice) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>שיחת טלפון ראשונית הושלמה</DialogTitle>
          <DialogDescription>
            האם הלקוח ממשיך לשלב הבא (היכרות והצגת הצעת מחיר)?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <Label className="text-sm font-medium">מחיר פגישת היכרות והצגת הצעת מחיר (₪)</Label>
            <Input
              type="number"
              value={meetingPrice}
              onChange={e => setMeetingPrice(e.target.value)}
              min={0}
              className="text-center text-lg font-semibold"
            />
          </div>
          <Button
            onClick={handleContinue}
            disabled={loading}
            className="gap-2 h-12 text-base bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-5 h-5" />
            ממשיך — פתח פגישת היכרות והצגת הצעת מחיר
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