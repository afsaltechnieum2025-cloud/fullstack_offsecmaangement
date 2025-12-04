import { useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { projects, findings, users } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
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

export default function Dashboard() {
  const { user } = useAuth();

  const stats = useMemo(() => {
    const userProjects = user?.role === 'tester' 
      ? projects.filter(p => p.assignedTesters.includes(user.id))
      : projects;

    const allFindings = userProjects.flatMap(p => p.findings);
    
    return {
      totalProjects: userProjects.length,
      activeProjects: userProjects.filter(p => p.status === 'active').length,
      completedProjects: userProjects.filter(p => p.status === 'completed').length,
      overdueProjects: userProjects.filter(p => p.status === 'overdue').length,
      totalFindings: allFindings.length,
      criticalFindings: allFindings.filter(f => f.severity === 'critical').length,
      highFindings: allFindings.filter(f => f.severity === 'high').length,
      mediumFindings: allFindings.filter(f => f.severity === 'medium').length,
      lowFindings: allFindings.filter(f => f.severity === 'low').length,
      infoFindings: allFindings.filter(f => f.severity === 'info').length,
    };
  }, [user]);

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

  const recentProjects = projects.slice(0, 4);

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.username}`}
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
          <Card className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '250ms' }}>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.client}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={project.status}>{project.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {project.findings.length} findings
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Card className="animate-fade-in" style={{ animationDelay: '350ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {users.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.username}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
