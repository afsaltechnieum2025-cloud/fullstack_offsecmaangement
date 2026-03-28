import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
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

// ─── Colors ───────────────────────────────────────────────────────────────────
// Consistent with Projects and ProjectDetail pages

const severityColors = {
  Critical:      '#ef4444',   // red-500
  High:          '#f97316',   // orange-500
  Medium:        '#fb923c',   // orange-400
  Low:           '#f97316',   // primary orange — dimmed via opacity in chart
  Informational: '#6b7280',   // gray
};

const statusColors = {
  active: '#10b981',  // Green
  completed: '#0ea5e9',  // Blue
  pending: '#f59e0b',  // Orange
  overdue: '#ef4444',  // Red
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  findings_count: number;
  critical_count: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  info_count?: number;
  assignees_count: number;
  assignedTesters?: string[];
}

interface Finding {
  id: string;
  project_id: string;
  title: string;
  severity: string | number;
  status: string | null;
  created_at: string;
}

interface TeamMember {
  id: number;
  username: string;
  role: string | null;
  full_name: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token') ?? '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Severity normalization — identical to Findings.tsx / ProjectDetail.tsx ───

const normalizeSeverity = (s: string | number | null | undefined): Severity => {
  const map: Record<string, Severity> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    informational: 'Informational',
    info: 'Informational',
  };
  const raw = String(s ?? '').toLowerCase().trim();
  if (map[raw]) return map[raw];
  // Numeric CVSS fallback — only fires when value is actually numeric
  const n = parseFloat(raw);
  if (!isNaN(n) && raw !== '') {
    if (n >= 9.0) return 'Critical';
    if (n >= 7.0) return 'High';
    if (n >= 4.0) return 'Medium';
    return 'Low';
  }
  return 'Informational';
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, role, username } = useAuth();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allFindings, setAllFindings] = useState<Finding[]>([]);
  const [isLoadingFindings, setIsLoadingFindings] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchTeamMembers();
    }
  }, [user]);

  // ─── Fetch projects ─────────────────────────────────────────────────────────

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data: Project[] = await res.json();
      setProjects(data);
      // Once we have projects, fetch all findings for live counts
      fetchAllFindings(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  // ─── Fetch ALL findings across all projects (live, like Findings.tsx) ────────

  const fetchAllFindings = async (projectList: Project[]) => {
    if (!projectList.length) return;
    setIsLoadingFindings(true);
    try {
      // Fetch per project in parallel — same pattern as Findings.tsx
      const fetches = projectList.map(p =>
        fetch(`${API_BASE}/findings?project_id=${p.id}`, { headers: authHeaders() })
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      );
      const results: Finding[][] = await Promise.all(fetches);
      setAllFindings(results.flat());
    } catch (error) {
      console.error('Error fetching findings:', error);
    } finally {
      setIsLoadingFindings(false);
    }
  };

  // ─── Fetch team members ─────────────────────────────────────────────────────

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data: TeamMember[] = await res.json();
      setTeamMembers(data);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    }
  };

  // ─── Derived stats — computed from LIVE findings using normalizeSeverity ─────

  const stats = useMemo(() => {
    // Testers only see their assigned projects
    const userProjects = role === 'tester'
      ? projects.filter(p => user && p.assignedTesters?.includes(String(user.id)))
      : projects;

    const projectIds = new Set(userProjects.map(p => p.id));

    // Filter findings to only the projects this user can see
    const userFindings = allFindings.filter(f => projectIds.has(f.project_id));

    // Count by normalized severity — same normalizeSeverity as Findings.tsx
    const criticalFindings = userFindings.filter(f => normalizeSeverity(f.severity) === 'Critical').length;
    const highFindings = userFindings.filter(f => normalizeSeverity(f.severity) === 'High').length;
    const mediumFindings = userFindings.filter(f => normalizeSeverity(f.severity) === 'Medium').length;
    const lowFindings = userFindings.filter(f => normalizeSeverity(f.severity) === 'Low').length;
    const infoFindings = userFindings.filter(f => normalizeSeverity(f.severity) === 'Informational').length;

    return {
      totalProjects: userProjects.length,
      activeProjects: userProjects.filter(p => p.status === 'active').length,
      completedProjects: userProjects.filter(p => p.status === 'completed').length,
      overdueProjects: userProjects.filter(p => p.status === 'overdue').length,
      totalFindings: userFindings.length,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
      infoFindings,
    };
  }, [user, role, projects, allFindings]);

  // ─── Chart data ─────────────────────────────────────────────────────────────

  const severityData = [
    { name: 'Critical', value: stats.criticalFindings, color: severityColors.Critical },
    { name: 'High', value: stats.highFindings, color: severityColors.High },
    { name: 'Medium', value: stats.mediumFindings, color: severityColors.Medium },
    { name: 'Low', value: stats.lowFindings, color: severityColors.Low },
    { name: 'Informational', value: stats.infoFindings, color: severityColors.Informational },
  ];

  const projectStatusData = [
    { name: 'Active', value: stats.activeProjects, color: statusColors.active },
    { name: 'Completed', value: stats.completedProjects, color: statusColors.completed },
    { name: 'Pending', value: projects.filter(p => p.status === 'pending').length, color: statusColors.pending },
    { name: 'Overdue', value: stats.overdueProjects, color: statusColors.overdue },
  ];

  // Monthly trend — computed from live allFindings by created_at month
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; findings: number; projects: Set<string> }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    allFindings.forEach(f => {
      const d = new Date(f.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) {
        months[key] = { month: monthNames[d.getMonth()], findings: 0, projects: new Set() };
      }
      months[key].findings++;
      months[key].projects.add(f.project_id);
    });

    // Return 4 past months + current month + 1 next month = 6 total
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = months[key];
      return {
        month: monthNames[d.getMonth()],
        findings: entry?.findings ?? 0,
        projects: entry ? entry.projects.size : 0,
      };
    });
  }, [allFindings]);

  const recentProjects = useMemo(() => {
    if (role === 'admin') return projects.slice(0, 4);
    return projects
      .filter(p => user && p.assignedTesters?.includes(String(user.id)))
      .slice(0, 4);
  }, [user, role, projects]);

  // ─── Per-project live finding count helper ────────────────────────────────

  const getProjectFindingCount = (projectId: string) =>
    allFindings.filter(f => f.project_id === projectId).length;

  // ─── Render ─────────────────────────────────────────────────────────────────

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
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
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

        {/* Severity breakdown bar — quick glance (Updated colors) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(
            [
              { label: 'Critical', count: stats.criticalFindings, bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
              { label: 'High', count: stats.highFindings, bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
              { label: 'Medium', count: stats.mediumFindings, bg: 'bg-orange-400/10', text: 'text-orange-400', border: 'border-orange-400/30' },
              { label: 'Low', count: stats.lowFindings, bg: 'bg-primary/5', text: 'text-primary/50', border: 'border-primary/15' },
              { label: 'Informational', count: stats.infoFindings, bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
            ] as const
          ).map(({ label, count, bg, text, border }) => (
            <Card key={label} className={`p-4 border ${border} ${bg} animate-fade-in`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${text}`}>{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
                <AlertTriangle className={`h-5 w-5 ${text}`} />
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Findings by Severity — pie (Updated colors) */}
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
                      itemStyle={{ color: '#ffffff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {severityData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Findings Trend — live from allFindings (Updated gradient color to orange) */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Projects — finding count from live data */}
          <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => {
                  // Get the appropriate badge style based on status
                  const getStatusBadge = (status: string) => {
                    if (status === 'completed') {
                      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">completed</Badge>;
                    }
                    const variants: Record<string, 'active' | 'pending' | 'overdue' | 'secondary'> = {
                      active: 'active',
                      pending: 'pending',
                      overdue: 'overdue',
                    };
                    const variant = variants[status] || 'secondary';
                    return <Badge variant={variant}>{status}</Badge>;
                  };

                  return (
                    <div
                      key={project.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{project.client}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(project.status)}
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {getProjectFindingCount(project.id)} findings
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <FolderKanban className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No projects assigned to you yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          {(role === 'admin' || role === 'manager') && (
            <Card className="animate-fade-in" style={{ animationDelay: '350ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => {
                    const safeUsername = (member.username ?? member.full_name ?? '')
                      .replace(/<[^>]*>/g, '')
                      .replace(/[&<>"'`]/g, '')
                      .trim();

                    if (!safeUsername) return null;

                    const avatarChar = safeUsername.charAt(0).toUpperCase();

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
                          {/* <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role ?? 'user'}
                          </Badge> */}
                          {(() => {
                            const r = member.role ?? 'user';
                            const styles: Record<string, string> = {
                              admin: 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30',
                              manager: 'bg-primary/15 text-primary border-primary/40',
                              tester: 'bg-secondary text-muted-foreground border-border',
                              user: 'bg-secondary text-muted-foreground border-border',
                            };
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[r] ?? styles.user}`}>
                                {r}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No team members found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}