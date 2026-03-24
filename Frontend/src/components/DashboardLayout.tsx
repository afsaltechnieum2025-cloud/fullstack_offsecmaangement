import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import Footer from '@/components/Footer';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notifications } from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export default function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  // const userNotifications = notifications.filter(n => n.userId === user?.id || user?.role === 'admin');
  // const unreadCount = userNotifications.filter(n => !n.read).length;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="pl-10 md:pl-0"> {/* ← add this pl-10 for mobile hamburger clearance */}
              <h1 className="text-2xl font-bold">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {/* {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                        {unreadCount}
                      </span>
                    )} */}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="font-semibold">Notifications</p>
                  </div>
                  {/* {userNotifications.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No notifications
                    </div>
                  ) : (
                    userNotifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 cursor-pointer">
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                          <span className="font-medium text-sm">{notification.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </DropdownMenuItem>
                    ))
                  )} */}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
