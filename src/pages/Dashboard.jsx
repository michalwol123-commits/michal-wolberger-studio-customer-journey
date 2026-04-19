import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, Calendar, CreditCard, CheckSquare, Briefcase, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import StatsCard from '@/components/shared/StatsCard';
import PageHeader from '@/components/shared/PageHeader';
import useCurrentUser from '@/lib/useCurrentUser';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import CriticalAlerts from '@/components/dashboard/CriticalAlerts';
import CustomerService from '@/components/dashboard/CustomerService';

export default function Dashboard() {
  const { user, isAdmin } = useCurrentUser();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 200),
    enabled: isAdmin,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-created_date', 200),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.Communication.list('-created_date', 200),
  });

  // Filter by role
  const myClients = isAdmin ? clients : clients.filter(c => c.owner === user?.email || c.assigned_to === user?.email);
  const myProjects = isAdmin ? projects : projects.filter(p => p.owner === user?.email);
  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assigned_to === user?.email);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today = format(now, 'yyyy-MM-dd');

  // KPIs
  const newLeads = myClients.filter(c => c.status === 'lead' && new Date(c.created_date) > weekAgo).length;
  const todayMeetings = meetings.filter(m => m.scheduled_at && m.scheduled_at.startsWith(today) && m.status === 'scheduled').length;
  const overduePayments = isAdmin ? payments.filter(p => p.status === 'overdue') : [];
  const openTasks = myTasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const activeProjects = myProjects.filter(p => p.status === 'active').length;
  const pipelineValue = myProjects.filter(p => p.status === 'active').reduce((sum, p) => sum + (p.total_budget || 0), 0);

  // Conversion
  const totalLeads = myClients.length;
  const activeAndCompleted = myClients.filter(c => c.status === 'active_client' || c.status === 'completed_client').length;
  const conversionRate = totalLeads > 0 ? Math.round((activeAndCompleted / totalLeads) * 100) : 0;

  // Recent leads
  const recentLeads = myClients.filter(c => c.status === 'lead').slice(0, 5);
  // Upcoming tasks
  const upcomingTasks = myTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').slice(0, 5);

  return (
    <div>
      <PageHeader title="דשבורד" subtitle="מרכז פיקוד — סטודיו מיכל וולברגר" />
      
      {/* Activity KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="לידים חדשים (שבוע)" value={newLeads} icon={UserPlus} color="primary" />
        <StatsCard title="פגישות היום" value={todayMeetings} icon={Calendar} color="secondary" />
        {isAdmin && (
          <StatsCard 
            title="תשלומים באיחור" 
            value={overduePayments.length}
            subtitle={overduePayments.length > 0 ? `₪${overduePayments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}` : undefined}
            icon={CreditCard} 
            color="destructive" 
          />
        )}
        <StatsCard title="משימות פתוחות" value={openTasks} icon={CheckSquare} color="warning" />
      </div>

      {/* Pipeline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatsCard title="פרויקטים פעילים" value={activeProjects} icon={Briefcase} color="accent" />
        <StatsCard title="ערך Pipeline" value={`₪${pipelineValue.toLocaleString()}`} icon={TrendingUp} color="primary" />
        <StatsCard title="Conversion Rate" value={`${conversionRate}%`} subtitle="ליד → לקוח" icon={TrendingUp} color="success" />
      </div>

      {/* Widget 4+5: Alerts & Customer Service */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CriticalAlerts
          payments={payments}
          tasks={myTasks}
          communications={communications}
          meetings={meetings}
          clients={myClients}
          isAdmin={isAdmin}
        />
        <CustomerService
          clients={myClients}
          communications={communications}
          meetings={meetings}
          projects={myProjects}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center justify-between">
              לידים אחרונים
              <Link to="/leads" className="text-sm text-primary font-normal hover:underline">הצג הכל</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין לידים חדשים</p>
            ) : recentLeads.map(lead => (
              <Link key={lead.id} to={`/clients/${lead.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {lead.name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </div>
                </div>
                <StatusBadge status={lead.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center justify-between">
              משימות קרובות
              <Link to="/tasks" className="text-sm text-primary font-normal hover:underline">הצג הכל</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין משימות פתוחות</p>
            ) : upcomingTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : 'ללא תאריך'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.priority === 'urgent' ? 'overdue' : task.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}