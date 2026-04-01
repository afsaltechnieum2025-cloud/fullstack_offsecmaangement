import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FolderKanban,
  Bug,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';

const severityColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
};

const statusColors = {
  active: '#10b981',
  completed: '#0ea5e9',
  pending: '#f59e0b',
  overdue: '#ef4444',
};

interface SupabaseProject {
  id: string;
  name: string;
  client: string;
  status: string;
  findings_count: number;
  critical_count: number;
  assignees_count: number;
  [key: string]: any;
}

export default function Dashboard() {
  const { user, role, username } = useAuth();

  // ── Supabase projects state ──────────────────────────────────────────────
  const [projects, setProjects] = useState<SupabaseProject[]>([]);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) throw projectsError;

      const { data: findingsData } = await supabase
        .from('findings')
        .select('project_id, severity');

      const { data: assignmentsData } = await supabase
        .from('project_assignments')
        .select('project_id, user_id');

      const projectsWithCounts = (projectsData || []).map(project => {
        const projectFindings = findingsData?.filter(f => f.project_id === project.id) || [];
        const criticalFindings = projectFindings.filter(f => f.severity === 'critical');
        const assignees = assignmentsData?.filter(a => a.project_id === project.id) || [];

        return {
          ...project,
          findings_count: projectFindings.length,
          critical_count: criticalFindings.length,
          assignees_count: assignees.length,
          // keep a list of assigned user ids so tester filtering still works
          assignedTesters: assignees.map((a: any) => a.user_id),
          // normalise findings array shape expected by stats below
          findings: projectFindings,
        };
      });

      setProjects(projectsWithCounts);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const userProjects = role === 'tester'
      ? projects.filter(p => user && p.assignedTesters?.includes(user.id))
      : projects;

    const allFindings = userProjects.flatMap(p => p.findings ?? []);

    return {
      totalProjects: userProjects.length,
      activeProjects: userProjects.filter(p => p.status === 'active').length,
      completedProjects: userProjects.filter(p => p.status === 'completed').length,
      overdueProjects: userProjects.filter(p => p.status === 'overdue').length,
      totalFindings: allFindings.length,
      criticalFindings: allFindings.filter((f: any) => f.severity === 'Critical').length,
      highFindings: allFindings.filter((f: any) => f.severity === 'High').length,
      mediumFindings: allFindings.filter((f: any) => f.severity === 'Medium').length,
      lowFindings: allFindings.filter((f: any) => f.severity === 'Low').length,
      infoFindings: allFindings.filter((f: any) => f.severity === 'Informational').length,
    };
  }, [user, role, projects]);

  const severityData = [
    { name: 'Critical', value: stats.criticalFindings, color: severityColors.critical },
    { name: 'High', value: stats.highFindings, color: severityColors.high },
    { name: 'Medium', value: stats.mediumFindings, color: severityColors.medium },
    { name: 'Low', value: stats.lowFindings, color: severityColors.low },
    { name: 'Info', value: stats.infoFindings, color: severityColors.info },
  ];

  const projectStatusData = [
    { name: 'Active', value: stats.activeProjects, color: statusColors.active },
    { name: 'Completed', value: stats.completedProjects, color: statusColors.completed },
    { name: 'Pending', value: projects.filter(p => p.status === 'pending').length, color: statusColors.pending },
    { name: 'Overdue', value: stats.overdueProjects, color: statusColors.overdue },
  ];

  const monthlyData = [
    { month: 'Jul', findings: 12, projects: 2 },
    { month: 'Aug', findings: 18, projects: 3 },
    { month: 'Sep', findings: 24, projects: 4 },
    { month: 'Oct', findings: 35, projects: 4 },
    { month: 'Nov', findings: 28, projects: 3 },
    { month: 'Dec', findings: 7, projects: 2 },
  ];

  const recentProjects = useMemo(() => {
    if (role === 'admin') {
      return projects.slice(0, 4);
    }
    return projects
      .filter(p => user && p.assignedTesters?.includes(user.id))
      .slice(0, 4);
  }, [user, role, projects]);

  type AppRole = 'admin' | 'manager' | 'tester';

  interface UserWithRole {
    id: string;
    user_id: string;
    username: string;
    full_name: string | null;
    created_at: string;
    role: AppRole | null;
  }

  const [userss, setUserss] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          username: profile.username,
          full_name: profile.full_name,
          created_at: profile.created_at,
          role: userRole?.role as AppRole | null,
        };
      });

      setUserss(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = userss.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <DashboardLayout
      title={`Welcome back, ${username || 'User'}`}
      description="Here's an overview of your pentest operations"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card glow className="animate-fade-in" style={{ animationDelay: '0ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalProjects}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderKanban className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm">
                <Badge variant="active">{stats.activeProjects} Active</Badge>
              </div>
            </CardContent>
          </Card>

          <Card glow className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Findings</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalFindings}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Bug className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm">
                <Badge variant="critical">{stats.criticalFindings} Critical</Badge>
                <Badge variant="high">{stats.highFindings} High</Badge>
              </div>
            </CardContent>
          </Card>

          <Card glow className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold mt-1">{stats.completedProjects}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>On track this month</span>
              </div>
            </CardContent>
          </Card>

          <Card glow className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-3xl font-bold mt-1">{stats.overdueProjects}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
                <Clock className="h-4 w-4" />
                <span>Requires attention</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Findings by Severity */}
          <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">Findings by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222 47% 10%)',
                        border: '1px solid hsl(222 30% 18%)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {severityData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Findings Trend */}
          <Card className="lg:col-span-2 animate-fade-in hidden sm:block" style={{ animationDelay: '250ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">Findings Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorFindings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
                    <XAxis dataKey="month" stroke="hsl(215 20% 55%)" />
                    <YAxis stroke="hsl(215 20% 55%)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222 47% 10%)',
                        border: '1px solid hsl(222 30% 18%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="findings"
                      stroke="#f97316"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFindings)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects & Team */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.client}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={project.status as 'active' | 'completed' | 'pending' | 'overdue'}>
                        {project.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {project.findings_count} findings
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <FolderKanban className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No projects assigned to you yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {(role === 'admin' || role === 'manager') && (
            <Card className="animate-fade-in" style={{ animationDelay: '350ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredUsers.map((member) => {
                  const safeUsername = (member.username || '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/[&<>"'`]/g, '')
                    .trim();

                  const avatarChar = safeUsername.charAt(0).toUpperCase() || '?';

                  if (!safeUsername) return null;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                    >
                      <div
                        className="rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm"
                        style={{ minWidth: '36px', minHeight: '36px', width: '36px', height: '36px' }}
                      >
                        {avatarChar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-sm truncate"
                          title={safeUsername}
                        >
                          {safeUsername}
                        </p>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    {/* Name + Client */}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{project.client}</p>
                    </div>

                    {/* Badge + Findings — below on mobile, inline on sm+ */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={project.status as 'active' | 'completed' | 'pending' | 'overdue'}>
                        {project.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {project.findings_count} findings
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <FolderKanban className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No projects assigned to you yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {(role === 'admin' || role === 'manager') && (
            <Card className="animate-fade-in" style={{ animationDelay: '350ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredUsers.map((member) => {
                  const safeUsername = (member.username || '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/[&<>"'`]/g, '')
                    .trim();

                  const avatarChar = safeUsername.charAt(0).toUpperCase() || '?';

                  if (!safeUsername) return null;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                    >
                      <div
                        className="rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0"
                        style={{ width: '36px', height: '36px' }}
                      >
                        {avatarChar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={safeUsername}>
                          {safeUsername}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

      </div>

    </DashboardLayout>
  );
}