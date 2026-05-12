import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Pipeline from '@/pages/Pipeline';
import Leads from '@/pages/Leads';
import Clients from '@/pages/Clients';
import ClientProfile from '@/pages/ClientProfile';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Payments from '@/pages/Payments';
import Meetings from '@/pages/Meetings';
import Communications from '@/pages/Communications';
import Tasks from '@/pages/Tasks';
import SettingsPage from '@/pages/SettingsPage';
import UserGuide from '@/pages/UserGuide';
import Portal from '@/pages/Portal';
import ShortQuestionnaire from '@/pages/ShortQuestionnaire';
import Suppliers from '@/pages/Suppliers';
import PurchaseOrders from '@/pages/PurchaseOrders';
import Reports from '@/pages/Reports';
import Quotes from '@/pages/Quotes';

const AuthGate = ({ children }) => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return children;
};

const AuthedLayout = () => (
  <AuthGate>
    <AppLayout />
  </AuthGate>
);

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/portal" element={<Portal />} />
            <Route path="/q" element={<ShortQuestionnaire />} />
            <Route element={<AuthedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientProfile />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/communications" element={<Communications />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/user-guide" element={<UserGuide />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster position="top-center" dir="rtl" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App