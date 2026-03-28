import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Bug,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Pencil,
  TrendingUp,
  Globe,
  Brain,
  Network,
  ShieldCheck,
  Menu,
  Trophy,
  Crown,
  Briefcase,
  Shield,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  { name: 'Dashboard',    href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'tester'] },
  { name: 'Projects',     href: '/projects',  icon: FolderKanban,    roles: ['admin', 'manager', 'tester'] },
  { name: 'Findings',     href: '/findings',  icon: Bug,             roles: ['admin', 'manager', 'tester'] },
  { name: 'Wall Of Fame', href: '/HallofFame',icon: Trophy,          roles: ['admin', 'manager', 'tester'] },
  { name: 'Trending',     href: '/trending',  icon: TrendingUp,      roles: ['admin', 'manager', 'tester'] },
  { name: 'Users',        href: '/users',     icon: Users,           roles: ['admin'] },
  { name: 'ASM',          href: '/asm',       icon: Globe,           roles: ['admin'] },
  { name: 'LLM Suite',    href: '/llm',       icon: Brain,           roles: ['admin'] },
  { name: 'TOIP',         href: '/toip',      icon: Network,         roles: ['admin'] },
  { name: 'SAST',         href: '/sast',      icon: ShieldCheck,     roles: ['admin'] },
];

export default function AppSidebar() {
  const { user, logout, role, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Reactive isMobile using state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(
    (item) => role && item.roles.includes(role)
  );

  // Get role icon
  const getRoleIcon = (userRole: string | null) => {
    switch (userRole) {
      case 'admin':
        return <Crown className="h-4 w-4 text-primary" />;
      case 'manager':
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'tester':
        return <Shield className="h-4 w-4 text-emerald-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isOpen = !collapsed;

  return (
    <>
      {/* ── Mobile hamburger button (shown only when sidebar is closed on mobile) ── */}
      {isMobile && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-4 z-50 h-9 w-9 rounded-lg bg-secondary flex items-center justify-center"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* ── Overlay backdrop (mobile only, when sidebar is open) ── */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          // Base styles
          "flex flex-col h-screen gradient-sidebar border-r border-border/50 transition-all duration-300 z-50 shrink-0",
          // Desktop: sticky in-flow, always visible (collapsed or expanded)
          !isMobile && "sticky top-0",
          !isMobile && (collapsed ? "w-16" : "w-64"),
          // Mobile: fixed overlay, slides in/out
          isMobile && "fixed top-0 left-0",
          isMobile && (isOpen ? "w-64 translate-x-0" : "-translate-x-full w-64"),
        )}
      >
        {/* Logo Header */}
        <div className={cn(
          "flex items-center border-b border-border/50 p-4 min-h-[64px]",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-start gap-2 flex-1 min-w-0">
              <img
                src={logo}
                alt="Technieum"
                className="h-10 w-auto object-contain shrink-0 mt-0.5"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-sm text-gradient">Technieum</span>
                <span className="font-semibold text-xs text-muted-foreground">OffSec Portal</span>
              </div>
            </Link>
          )}

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
                onClick={() => isMobile && setCollapsed(true)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  collapsed && "justify-center px-2",
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
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">{username}</p>
                    {getRoleIcon(role)}
                  </div>
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