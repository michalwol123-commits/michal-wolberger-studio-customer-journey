import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, CreditCard, Clock, MessageSquareWarning, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';

export default function CriticalAlerts({ payments, tasks, communications, meetings, clients, isAdmin }) {
  const now = new Date();
  const alerts = [];

  // Overdue payments (admin only)
  if (isAdmin) {
    payments.filter(p => p.status === 'overdue').forEach(p => {
      alerts.push({
        id: `pay-${p.id}`,
        icon: CreditCard,
        color: 'text-red-600 bg-red-50',
        text: `תשלום באיחור: ${p.milestone} — ₪${(p.amount || 0).toLocaleString()}`,
        link: '/payments',
      });
    });
  }

  // Overdue tasks
  tasks.filter(t => 
    (t.status === 'open' || t.status === 'in_progress') && 
    t.due_date && new Date(t.due_date) < now
  ).forEach(t => {
    alerts.push({
      id: `task-${t.id}`,
      icon: Clock,
      color: 'text-orange-600 bg-orange-50',
      text: `משימה באיחור: ${t.title}`,
      link: '/tasks',
    });
  });

  // Failed communications
  if (isAdmin) {
    communications.filter(c => c.type === 'system_error' || c.status === 'failed').forEach(c => {
      alerts.push({
        id: `comm-${c.id}`,
        icon: XCircle,
        color: 'text-red-600 bg-red-50',
        text: `שגיאת שליחה: ${c.content?.slice(0, 60) || 'הודעה כשלה'}`,
        link: '/communications',
      });
    });
  }

  // No-show meetings
  meetings.filter(m => m.status === 'no_show').slice(0, 3).forEach(m => {
    const client = clients.find(c => c.id === m.client_id);
    alerts.push({
      id: `meet-${m.id}`,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50',
      text: `לא הגיע לפגישה: ${client?.name || 'לקוח'}`,
      link: '/meetings',
    });
  });

  // Stale leads (no response > 48h)
  clients.filter(c => 
    c.status === 'lead' && 
    !c.first_response_at &&
    differenceInDays(now, new Date(c.created_date)) >= 2
  ).forEach(c => {
    alerts.push({
      id: `stale-${c.id}`,
      icon: MessageSquareWarning,
      color: 'text-purple-600 bg-purple-50',
      text: `ליד ללא מענה 48+ שעות: ${c.name}`,
      link: `/clients/${c.id}`,
    });
  });

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-green-600" />
            התראות קריטיות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">🎉 אין התראות — הכל תקין!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          התראות קריטיות
          <span className="mr-auto text-xs font-normal bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{alerts.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-72 overflow-y-auto">
        {alerts.slice(0, 10).map(alert => (
          <Link key={alert.id} to={alert.link} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`p-1.5 rounded-lg ${alert.color}`}>
              <alert.icon className="w-4 h-4" />
            </div>
            <p className="text-sm flex-1">{alert.text}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}