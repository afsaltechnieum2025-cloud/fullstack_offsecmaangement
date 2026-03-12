import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Bug,
  BookOpen,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import logo from '@/assets/technieum-logo.png';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'tester'] },
  { name: 'Projects', href: '/projects', icon: FolderKanban, roles: ['admin', 'manager', 'tester'] },
  { name: 'Findings', href: '/findings', icon: Bug, roles: ['admin', 'manager', 'tester'] },
  // { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, roles: ['admin', 'manager', 'tester'] },
  { name: 'check List', href: '/Check-list', icon: BookOpen, roles: ['admin', 'manager', 'tester'] },
  { name: 'Trending', href: '/trending', icon: BookOpen, roles: ['admin', 'manager', 'tester'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
  { name: 'ASM', href: '/asm', icon: Users, roles: ['admin'] },
  { name: 'LLM Suite', href: '/llm', icon: Users, roles: ['admin'] },
];

export default function AppSidebar() {
  const { user, logout, role, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-collapse on mobile
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Re-collapse if window resizes to mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <>
      {/* Mobile overlay — closes sidebar when tapping outside */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={cn(
          "flex flex-col h-screen gradient-sidebar border-r border-border/50 transition-all duration-300 sticky top-0 z-50 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center border-b border-border/50 p-4 min-h-[64px]",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {/* Logo mark — always visible */}
          {!collapsed && (
            <Link to="/dashboard" className="shrink-0">
              <img
                src={logo}
                alt="Technieum"
                className={cn("w-auto", collapsed ? "h-8 mx-auto" : "h-10")}
              />
            </Link>
          )}

          {/* Brand text — only when expanded */}
          {!collapsed && (
            <div className="flex flex-col flex-1 ml-2 min-w-0">
              <span className="font-bold text-sm text-gradient leading-tight">OffSec</span>
              <span className="font-bold text-sm text-gradient leading-tight">Ops</span>
            </div>
          )}

          {/* Toggle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={collapsed ? item.name : undefined}
                onClick={() => isMobile && setCollapsed(true)} // close on nav on mobile
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                {!collapsed && <span className="font-medium truncate">{item.name}</span>}
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
            onClick={() => setShowLogoutDialog(true)}
            title={collapsed ? "Sign Out" : undefined}
            className={cn(
              "w-full gap-3 text-muted-foreground hover:text-destructive",
              collapsed ? "justify-center px-2" : "justify-start"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}