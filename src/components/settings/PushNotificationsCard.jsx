import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { pushSupported, isIOS, isStandalone, fetchPublicKey, getCurrentSubscription, enablePush, disablePush } from '@/lib/push';

export default function PushNotificationsCard() {
  const [key, setKey] = useState(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const iosBrowser = isIOS() && !isStandalone();
  const supported = pushSupported();

  useEffect(() => {
    if (!supported || iosBrowser) return;
    fetchPublicKey().then(setKey);
    getCurrentSubscription().then((s) => setOn(!!s && Notification.permission === 'granted'));
  }, []);

  const run = (fn) => async () => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error(e.message || 'שגיאה'); }
    setBusy(false);
  };
  const onEnable = run(async () => { await enablePush(key); setOn(true); toast.success('ההתראות הופעלו'); });
  const onDisable = run(async () => { await disablePush(); setOn(false); toast.success('ההתראות כובו'); });
  const onTest = run(async () => {
    const r = await base44.functions.invoke('sendTestPush', {});
    r.data.sent ? toast.success('נשלחה התראת בדיקה') : toast.error('לא נמצא מכשיר פעיל');
  });

  return (
    <Card id="push" className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-heading">
          <BellRing className="w-5 h-5 text-primary" /> התראות פוש
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        {iosBrowser ? (
          <p className="text-muted-foreground">באייפון ההתראות עובדות רק מהאייקון במסך הבית</p>
        ) : !supported ? (
          <p className="text-muted-foreground">הדפדפן הזה לא תומך בהתראות פוש</p>
        ) : (
          <>
            <p>מצב: <strong>{on ? 'פעיל במכשיר הזה' : Notification.permission === 'denied' ? 'חסום בהגדרות הדפדפן' : 'כבוי'}</strong></p>
            <div className="flex flex-wrap gap-2">
              {on ? (
                <Button variant="outline" disabled={busy} onClick={onDisable}>כיבוי</Button>
              ) : (
                <Button disabled={busy || !key} onClick={onEnable}>הפעלה</Button>
              )}
              <Button variant="outline" disabled={busy || !on} onClick={onTest}>שליחת התראת בדיקה</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}