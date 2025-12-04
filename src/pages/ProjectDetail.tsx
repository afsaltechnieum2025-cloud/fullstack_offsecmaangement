import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { projects, users, findings as allFindings } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Globe,
  Server,
  Calendar,
  Users as UsersIcon,
  Key,
  Bug,
  FileText,
  Download,
  Plus,
} from 'lucide-react';
import { Severity } from '@/types';
import { generateTechnicalReport, generateManagementReport } from '@/utils/reportGenerator';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <DashboardLayout title="Project Not Found">
        <Card className="p-12 text-center">
          <p className="text-lg font-medium">Project not found</p>
          <Link to="/projects">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </Card>
      </DashboardLayout>
    );
  }

  const projectFindings = allFindings.filter(f => f.projectId === project.id);
  const assignedUsers = users.filter(u => project.assignedTesters.includes(u.id));

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSeverityBadge = (severity: Severity) => {
    return <Badge variant={severity}>{severity}</Badge>;
  };

  const handleGenerateTechnicalReport = async () => {
    try {
      await generateTechnicalReport(project, projectFindings);
      toast.success('Technical Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    }
  };

  const handleGenerateManagementReport = async () => {
    try {
      await generateManagementReport(project, projectFindings);
      toast.success('Management Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    }
  };

  return (
    <DashboardLayout
      title={project.name}
      description={project.client}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link to="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>

        {/* Project Status */}
        <div className="flex items-center gap-4">
          <Badge variant={project.status as any} className="text-sm px-3 py-1">
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Badge>
          <span className="text-muted-foreground">
            {formatDate(project.startDate)} - {formatDate(project.endDate)}
          </span>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="findings">Findings ({projectFindings.length})</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <TabsTrigger value="reports">Reports</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Target Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Target Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Domain</p>
                    <p className="font-mono text-sm mt-1">{project.targetDomain}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Addresses</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {project.targetIPs.map((ip, i) => (
                        <Badge key={i} variant="secondary" className="font-mono">
                          {ip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credentials */}
              {project.credentials && project.credentials.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      Test Credentials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.credentials.map((cred, i) => (
                      <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Username</p>
                            <p className="font-mono text-sm">{cred.username}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Password</p>
                            <p className="font-mono text-sm">{cred.password}</p>
                          </div>
                        </div>
                        {cred.notes && (
                          <p className="text-xs text-muted-foreground mt-2">{cred.notes}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Project Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{project.description}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="findings" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                {projectFindings.length} findings reported
              </p>
              <Link to="/findings">
                <Button variant="gradient">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Finding
                </Button>
              </Link>
            </div>

            {projectFindings.length === 0 ? (
              <Card className="p-12 text-center">
                <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No findings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start documenting vulnerabilities found during the assessment
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {projectFindings.map((finding, index) => (
                  <Card
                    key={finding.id}
                    glow
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {finding.id}
                            </Badge>
                            {getSeverityBadge(finding.severity)}
                            {finding.cvssScore && (
                              <span className="text-sm text-muted-foreground">
                                CVSS: {finding.cvssScore}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold">{finding.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {finding.description}
                          </p>
                        </div>
                        <Badge variant={finding.status === 'open' ? 'destructive' : 'secondary'}>
                          {finding.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span>
                          Reported by: {users.find(u => u.id === finding.reportedBy)?.username}
                        </span>
                        <span>
                          {new Date(finding.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedUsers.map((member) => (
                <Card key={member.id} glow>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full gradient-technieum flex items-center justify-center text-primary-foreground font-semibold text-lg">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.username}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <Badge variant="secondary" className="mt-1">{member.role}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {(user?.role === 'admin' || user?.role === 'manager') && (
            <TabsContent value="reports" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card glow>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Technical Report
                    </CardTitle>
                    <CardDescription>
                      Detailed technical findings with steps to reproduce, impact analysis, and remediation guidance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleGenerateTechnicalReport}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generate Technical Report
                    </Button>
                  </CardContent>
                </Card>

                <Card glow>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Management Report
                    </CardTitle>
                    <CardDescription>
                      Executive summary highlighting key risks and security posture for non-technical stakeholders
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleGenerateManagementReport}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generate Management Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
