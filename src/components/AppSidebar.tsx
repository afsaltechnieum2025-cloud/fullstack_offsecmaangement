import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Bug,
  BookOpen,
  Users,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import logo from '@/assets/technieum-logo.png';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'tester'] },
  { name: 'Projects', href: '/projects', icon: FolderKanban, roles: ['admin', 'manager', 'tester'] },
  { name: 'Findings', href: '/findings', icon: Bug, roles: ['admin', 'manager', 'tester'] },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, roles: ['admin', 'manager', 'tester'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
];

export default function AppSidebar() {
  const { user, logout, role, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-screen gradient-sidebar border-r border-border/50 transition-all duration-300 sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={logo} alt="Technieum" className="h-12 w-auto" />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-gradient">OffSec Ops</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link to="/dashboard">
            <img src={logo} alt="Technieum" className="h-10 w-auto mx-auto" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-border/50">
        {user && (
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg bg-secondary/50 mb-3",
            collapsed && "justify-center"
          )}>
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
              {username?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{username}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
