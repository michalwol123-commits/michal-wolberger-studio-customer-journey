import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Bot, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CAPABILITIES = [
  'ניהול לקוחות ולידים — הוספה, עדכון, חיפוש',
  'ניהול פרויקטים — שלבים, סטטוסים, התקדמות',
  'הצעות מחיר ותשלומים — מעקב ועדכון',
  'פגישות ומשימות — יצירה ומעקב',
  'ספקים, הזמנות רכש ועמלות',
  'תקציבים ודוחות שדה',
  'סטטיסטיקות ודשבורד',
];

export default function WhatsAppAgentTab() {
  const whatsappUrl = base44.agents.getWhatsAppConnectURL('crm_manager');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <Bot className="w-5 h-5 text-primary" />
            סוכן CRM חכם בוואטסאפ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            סוכן AI שמאפשר לנהל את כל מערכת ה-CRM ישירות מוואטסאפ — בלי צורך להיכנס למערכת.
            פשוט שלחי הודעה והסוכן יבצע את הפעולה עבורך.
          </p>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="w-4 h-4" />
              חבר לוואטסאפ
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-heading">מה הסוכן יכול לעשות?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {CAPABILITIES.map((cap, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}