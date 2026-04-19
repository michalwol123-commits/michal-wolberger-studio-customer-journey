import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { HeadphonesIcon, Users, Clock, Star, TrendingUp } from 'lucide-react';
import { differenceInHours, differenceInDays } from 'date-fns';

export default function CustomerService({ clients, communications, meetings, projects }) {
  const now = new Date();

  // Average first-response time (leads with first_response_at)
  const leadsWithResponse = clients.filter(c => c.first_response_at && c.created_date);
  let avgResponseHours = null;
  if (leadsWithResponse.length > 0) {
    const totalHours = leadsWithResponse.reduce((sum, c) => {
      return sum + differenceInHours(new Date(c.first_response_at), new Date(c.created_date));
    }, 0);
    avgResponseHours = Math.round(totalHours / leadsWithResponse.length);
  }

  // Leads awaiting first contact
  const awaitingContact = clients.filter(c => c.status === 'lead' && !c.first_response_at).length;

  // Active clients count
  const activeClients = clients.filter(c => c.status === 'active_client').length;

  // Completed projects NPS
  const projectsWithNps = projects.filter(p => p.nps_score != null);
  const avgNps = projectsWithNps.length > 0
    ? (projectsWithNps.reduce((s, p) => s + p.nps_score, 0) / projectsWithNps.length).toFixed(1)
    : null;

  // Recent communication volume (7d)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentComms = communications.filter(c => new Date(c.created_date) > weekAgo).length;

  const metrics = [
    { label: 'זמן תגובה ממוצע', value: avgResponseHours != null ? `${avgResponseHours} שע׳` : '—', icon: Clock, color: 'text-blue-600 bg-blue-50' },
    { label: 'ממתינים למענה', value: awaitingContact, icon: Users, color: 'text-amber-600 bg-amber-50' },
    { label: 'לקוחות פעילים', value: activeClients, icon: HeadphonesIcon, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'NPS ממוצע', value: avgNps || '—', icon: Star, color: 'text-purple-600 bg-purple-50' },
    { label: 'תקשורת (7 ימים)', value: recentComms, icon: TrendingUp, color: 'text-primary bg-primary/10' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <HeadphonesIcon className="w-4 h-4 text-secondary" />
          שירות לקוח
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${m.color}`}>
              <m.icon className="w-4 h-4" />
            </div>
            <span className="text-sm flex-1">{m.label}</span>
            <span className="text-sm font-bold">{m.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}