import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FolderKanban,
  Briefcase,
  CreditCard,
  Calendar,
  MessageSquare,
  CheckSquare,
  FileText,
  Truck,
  BarChart3,
  Settings,
  BookOpen,
  ChevronRight,
  X
} from 'lucide-react';
import useCurrentUser from '@/lib/useCurrentUser';

const navItems = [
  { path: '/', label: 'דשבורד', icon: LayoutDashboard, adminOnly: false },
  { path: '/pipeline', label: 'Pipeline', icon: FolderKanban, adminOnly: false },
  { path: '/leads', label: 'לידים', icon: UserPlus, adminOnly: false },
  { path: '/clients', label: 'לקוחות', icon: Users, adminOnly: false },
  { path: '/projects', label: 'פרויקטים', icon: Briefcase, adminOnly: false },
  { path: '/payments', label: 'תשלומים', icon: CreditCard, adminOnly: true },
  { path: '/meetings', label: 'פגישות', icon: Calendar, adminOnly: false },
  { path: '/communications', label: 'תקשורת', icon: MessageSquare, adminOnly: false },
  { path: '/tasks', label: 'משימות', icon: CheckSquare, adminOnly: false },
  { path: '/suppliers', label: 'ספקים', icon: Truck, adminOnly: false },
  { path: '/purchase-orders', label: 'הזמנות רכש', icon: FileText, adminOnly: false },
  { path: '/reports', label: 'דוחות', icon: BarChart3, adminOnly: false },
  { path: '/settings', label: 'הגדרות', icon: Settings, adminOnly: true },
  { path: '/user-guide', label: 'מדריך למשתמשת', icon: BookOpen, adminOnly: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { isAdmin } = useCurrentUser();

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 right-0 h-full w-64 bg-sidebar border-l border-sidebar-border z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
          <div>
            <h1 className="font-heading font-bold text-lg text-sidebar-foreground">מיכל וולברגר</h1>
            <p className="text-xs text-muted-foreground">סטודיו לעיצוב פנים</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {filteredItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                  }
                `}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 mr-auto rotate-180" />}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}