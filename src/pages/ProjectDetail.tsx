import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Globe,
  Server,
  Calendar,
  Bug,
  FileText,
  Download,
  Plus,
  Loader2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { generateTechnicalReport, generateManagementReport, generateRetestReport } from '@/utils/reportGenerator';
import FindingDetailDialog from '@/components/FindingDetailDialog';

type Project = {
  id: string;
  name: string;
  client: string;
  domain: string | null;
  ip_addresses: string[] | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type Finding = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  cvss_score: number | null;
  status: string | null;
  created_at: string;
  created_by: string;
  steps_to_reproduce: string | null;
  impact: string | null;
  remediation: string | null;
  affected_component: string | null;
  cwe_id: string | null;
  retest_status: string | null;
  retest_date: string | null;
  retest_notes: string | null;
  retested_by: string | null;
};

type Profile = {
  user_id: string;
  username: string;
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { role, user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignees, setAssignees] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id, user]);

  const fetchProjectData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (projectError) throw projectError;
      setProject(projectData);

      if (projectData) {
        // Fetch findings for this project
        const { data: findingsData, error: findingsError } = await supabase
          .from('findings')
          .select('*')
          .eq('project_id', id)
          .order('severity', { ascending: true });

        if (findingsError) throw findingsError;
        setFindings(findingsData || []);

        // Fetch profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username');
        setProfiles(profilesData || []);

        // Fetch project assignees
        const { data: assignmentsData } = await supabase
          .from('project_assignments')
          .select('user_id')
          .eq('project_id', id);

        if (assignmentsData && profilesData) {
          const assignedProfiles = profilesData.filter(p => 
            assignmentsData.some(a => a.user_id === p.user_id)
          );
          setAssignees(assignedProfiles);
        }
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const getUsername = (userId: string) => {
    return profiles.find(p => p.user_id === userId)?.username || 'Unknown';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSeverityBadge = (severity: string) => {
    const variant = severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
    return <Badge variant={variant}>{severity}</Badge>;
  };

  const handleGenerateTechnicalReport = async () => {
    if (!project) return;
    try {
      // Fetch POC images for all findings
      const findingIds = findings.map(f => f.id);
      const pocImages: Record<string, string[]> = {};
      
      if (findingIds.length > 0) {
        const { data: pocsData } = await supabase
          .from('finding_pocs')
          .select('finding_id, file_path')
          .in('finding_id', findingIds);
        
        if (pocsData) {
          pocsData.forEach(poc => {
            if (!pocImages[poc.finding_id]) {
              pocImages[poc.finding_id] = [];
            }
            pocImages[poc.finding_id].push(poc.file_path);
          });
        }
      }

      // Transform data for report generator
      const reportProject = {
        id: project.id,
        name: project.name,
        description: '',
        client: project.client,
        targetDomain: project.domain || '',
        targetIPs: project.ip_addresses || [],
        credentials: [],
        assignedTesters: [],
        managerId: '',
        status: (project.status || 'active') as 'active' | 'completed' | 'pending' | 'overdue',
        startDate: project.start_date ? new Date(project.start_date) : new Date(),
        endDate: project.end_date ? new Date(project.end_date) : new Date(),
        createdAt: new Date(project.created_at),
        findings: [],
      };
      
      const reportFindings = findings.map(f => {
        const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
          'critical': 'critical',
          'high': 'high',
          'medium': 'medium',
          'low': 'low',
          'informational': 'info',
        };
        return {
          id: f.id,
          projectId: project.id,
          title: f.title,
          description: f.description || '',
          severity: severityMap[f.severity.toLowerCase()] || 'medium',
          cvssScore: f.cvss_score || 0,
          stepsToReproduce: f.steps_to_reproduce || '',
          impact: f.impact || '',
          remediation: f.remediation || '',
          affectedAssets: f.affected_component ? [f.affected_component] : [],
          evidence: pocImages[f.id] || [],
          status: (f.status?.toLowerCase() || 'open') as 'open' | 'remediated' | 'accepted' | 'false_positive',
          reportedBy: f.created_by,
          createdAt: new Date(f.created_at),
          updatedAt: new Date(f.created_at),
        };
      });

      toast.info('Generating report with POC images... This may take a moment.');
      await generateTechnicalReport(reportProject, reportFindings, pocImages);
      toast.success('Technical Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    }
  };

  const handleGenerateManagementReport = async () => {
    if (!project) return;
    try {
      const reportProject = {
        id: project.id,
        name: project.name,
        description: '',
        client: project.client,
        targetDomain: project.domain || '',
        targetIPs: project.ip_addresses || [],
        credentials: [],
        assignedTesters: [],
        managerId: '',
        status: (project.status || 'active') as 'active' | 'completed' | 'pending' | 'overdue',
        startDate: project.start_date ? new Date(project.start_date) : new Date(),
        endDate: project.end_date ? new Date(project.end_date) : new Date(),
        createdAt: new Date(project.created_at),
        findings: [],
      };
      
      const reportFindings = findings.map(f => {
        const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
          'critical': 'critical',
          'high': 'high',
          'medium': 'medium',
          'low': 'low',
          'informational': 'info',
        };
        return {
          id: f.id,
          projectId: project.id,
          title: f.title,
          description: f.description || '',
          severity: severityMap[f.severity.toLowerCase()] || 'medium',
          cvssScore: f.cvss_score || 0,
          stepsToReproduce: f.steps_to_reproduce || '',
          impact: f.impact || '',
          remediation: f.remediation || '',
          affectedAssets: f.affected_component ? [f.affected_component] : [],
          status: (f.status?.toLowerCase() || 'open') as 'open' | 'remediated' | 'accepted' | 'false_positive',
          reportedBy: f.created_by,
          createdAt: new Date(f.created_at),
          updatedAt: new Date(f.created_at),
        };
      });

      await generateManagementReport(reportProject, reportFindings);
      toast.success('Management Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    }
  };

  const handleGenerateRetestReport = async () => {
    if (!project) return;
    try {
      const reportProject = {
        id: project.id,
        name: project.name,
        description: '',
        client: project.client,
        targetDomain: project.domain || '',
        targetIPs: project.ip_addresses || [],
        credentials: [],
        assignedTesters: [],
        managerId: '',
        status: (project.status || 'active') as 'active' | 'completed' | 'pending' | 'overdue',
        startDate: project.start_date ? new Date(project.start_date) : new Date(),
        endDate: project.end_date ? new Date(project.end_date) : new Date(),
        createdAt: new Date(project.created_at),
        findings: [],
      };
      
      const retestFindings = findings.map(f => ({
        id: f.id,
        title: f.title,
        severity: f.severity.toLowerCase(),
        status: f.status || 'Open',
        retest_status: f.retest_status,
        retest_date: f.retest_date,
      }));

      await generateRetestReport(reportProject, retestFindings);
      toast.success('Retest Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate retest report');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
            {(project.status || 'pending').charAt(0).toUpperCase() + (project.status || 'pending').slice(1)}
          </Badge>
          <span className="text-muted-foreground">
            {formatDate(project.start_date)} - {formatDate(project.end_date)}
          </span>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
            <TabsTrigger value="team">Team ({assignees.length})</TabsTrigger>
            {(role === 'admin' || role === 'manager') && (
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
                    <p className="font-mono text-sm mt-1">{project.domain || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Addresses</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {project.ip_addresses && project.ip_addresses.length > 0 ? (
                        project.ip_addresses.map((ip, i) => (
                          <Badge key={i} variant="secondary" className="font-mono">
                            {ip}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No IPs specified</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Findings Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bug className="h-5 w-5 text-primary" />
                    Findings Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-destructive/10">
                      <p className="text-2xl font-bold text-destructive">
                        {findings.filter(f => f.severity === 'Critical').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Critical</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-orange-500/10">
                      <p className="text-2xl font-bold text-orange-500">
                        {findings.filter(f => f.severity === 'High').length}
                      </p>
                      <p className="text-sm text-muted-foreground">High</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                      <p className="text-2xl font-bold text-yellow-500">
                        {findings.filter(f => f.severity === 'Medium').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Medium</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-500/10">
                      <p className="text-2xl font-bold text-blue-500">
                        {findings.filter(f => f.severity === 'Low').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Low</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="findings" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                {findings.length} findings reported
              </p>
              <Link to="/findings">
                <Button variant="gradient">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Finding
                </Button>
              </Link>
            </div>

            {findings.length === 0 ? (
              <Card className="p-12 text-center">
                <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No findings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start documenting vulnerabilities found during the assessment
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {findings.map((finding, index) => (
                  <Card
                    key={finding.id}
                    glow
                    className="animate-fade-in cursor-pointer hover:border-primary/50 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => {
                      setSelectedFinding(finding);
                      setIsDetailOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {getSeverityBadge(finding.severity)}
                            {finding.cvss_score && (
                              <span className="text-sm text-muted-foreground">
                                CVSS: {finding.cvss_score}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold">{finding.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {finding.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={finding.status === 'Open' ? 'destructive' : 'secondary'}>
                            {finding.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span>
                          Reported by: {getUsername(finding.created_by)}
                        </span>
                        <span>
                          {new Date(finding.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {assignees.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg font-medium">No team members assigned</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Assign testers to this project from the Projects page
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignees.map((member) => (
                  <Card key={member.user_id} glow>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full gradient-technieum flex items-center justify-center text-primary-foreground font-semibold text-lg">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{member.username}</p>
                          <Badge variant="secondary" className="mt-1">Tester</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {(role === 'admin' || role === 'manager') && (
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

              <Card glow>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Retest Report
                  </CardTitle>
                  <CardDescription>
                    Summary of remediation progress showing fixed vs. not fixed findings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Fixed:</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">
                        {findings.filter(f => f.retest_status === 'Fixed').length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Not Fixed:</span>
                      <Badge variant="destructive">
                        {findings.filter(f => f.retest_status === 'Not Fixed').length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Open:</span>
                      <Badge variant="secondary">
                        {findings.filter(f => !f.retest_status || f.retest_status === 'Open').length}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleGenerateRetestReport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Retest Report
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <FindingDetailDialog
        finding={selectedFinding}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedFinding(null);
        }}
        creatorName={selectedFinding ? getUsername(selectedFinding.created_by) : undefined}
      />
    </DashboardLayout>
  );
}
