import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import useCurrentUser from '@/lib/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { Shield, Users, Settings, MessageCircle } from 'lucide-react';
import WhatsAppAgentTab from '@/components/settings/WhatsAppAgentTab';

export default function SettingsPage() {
  const { user, isAdmin, loading } = useCurrentUser();

  if (!loading && !isAdmin) return <Navigate to="/" />;

  return (
    <div>
      <PageHeader title="הגדרות" subtitle="Admin בלבד" />
      
      <Tabs defaultValue="general" dir="rtl">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-1.5">
            <Settings className="w-4 h-4" />
            כללי
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5">
            <MessageCircle className="w-4 h-4" />
            סוכן WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-heading">
                  <Users className="w-5 h-5 text-primary" />
                  פרטי משתמש
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">שם:</span> <span className="font-medium">{user?.full_name}</span></div>
                <div><span className="text-muted-foreground">אימייל:</span> <span className="font-medium" dir="ltr">{user?.email}</span></div>
                <div><span className="text-muted-foreground">תפקיד:</span> <span className="font-medium">{user?.role === 'admin' ? 'מנהל' : 'צוות'}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-heading">
                  <Shield className="w-5 h-5 text-primary" />
                  הרשאות
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-muted-foreground">תפקידים במערכת:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span><strong>Admin</strong> — גישה מלאה לכל המערכת</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span><strong>Staff</strong> — גישה לרשומות בבעלותם בלבד</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-heading">
                  <Settings className="w-5 h-5 text-primary" />
                  מידע על המערכת
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <p>מערכת CRM — מיכל וולברגר | סטודיו לעיצוב פנים</p>
                <p>גרסה 5.0</p>
                <p>נבנה על Base44 Platform</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppAgentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}