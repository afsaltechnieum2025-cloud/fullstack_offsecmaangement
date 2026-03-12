import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Globe,
  Server,
  Calendar,
  CheckSquare,
  Bug,
  FileText,
  Download,
  Plus,
  Loader2,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { generateTechnicalReport, generateManagementReport, generateRetestReport } from '@/utils/reportGenerator';
import FindingDetailDialog from '@/components/FindingDetailDialog';
import { knowledgeBase, owaspChecklist, users } from '@/data/mockData';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

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
  const [checklistProgress, setChecklistProgress] = useState<Record<string, boolean>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Add Finding dialog state
  const [addFindingOpen, setAddFindingOpen] = useState(false);
  const [formData, setFormData] = useState({
    severity: '' as Severity | '',
    title: '',
    description: '',
    stepsToReproduce: '',
    impact: '',
    remediation: '',
    affectedComponent: '',
    cvssScore: '',
    cweId: '',
  });

  const resetForm = () => {
    setFormData({
      severity: '',
      title: '',
      description: '',
      stepsToReproduce: '',
      impact: '',
      remediation: '',
      affectedComponent: '',
      cvssScore: '',
      cweId: '',
    });
  };

  const handleSubmitFinding = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.severity || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user || !id) {
      toast.error('You must be logged in');
      return;
    }

    const { data, error } = await supabase.from('findings').insert({
      project_id: id,
      title: formData.title,
      description: formData.description,
      severity: formData.severity,
      steps_to_reproduce: formData.stepsToReproduce || null,
      impact: formData.impact || null,
      remediation: formData.remediation || null,
      affected_component: formData.affectedComponent || null,
      cvss_score: formData.cvssScore ? parseFloat(formData.cvssScore) : null,
      cwe_id: formData.cweId || null,
      created_by: user.id,
    }).select().single();

    if (error) {
      toast.error('Failed to add finding: ' + error.message);
      return;
    }

    setFindings([data as Finding, ...findings]);
    toast.success('Finding added successfully!');
    resetForm();
    setAddFindingOpen(false);
  };

  const toggleChecklistItem = (category: string, item: string) => {
    const key = `${category}-${item}`;
    setChecklistProgress(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getCategoryProgress = (category: string, items: string[]) => {
    const completed = items.filter(item => checklistProgress[`${category}-${item}`]).length;
    return { completed, total: items.length };
  };

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id, user]);

  const fetchProjectData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (projectError) throw projectError;
      setProject(projectData);

      if (projectData) {
        const { data: findingsData, error: findingsError } = await supabase
          .from('findings')
          .select('*')
          .eq('project_id', id)
          .order('severity', { ascending: true });

        if (findingsError) throw findingsError;
        setFindings(findingsData || []);

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username');
        setProfiles(profilesData || []);

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
    <DashboardLayout title={project.name} description={project.client}>
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
            <TabsTrigger value="checklist">Check List</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          <Badge key={i} variant="secondary" className="font-mono">{ip}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No IPs specified</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

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
              <p className="text-muted-foreground">{findings.length} findings reported</p>
              <Button variant="gradient" onClick={() => setAddFindingOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Finding
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>

            {(() => {
              const filtered = findings.filter(f =>
                f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (f.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
              );
              if (filtered.length === 0) return (
                <Card className="p-12 text-center">
                  <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">{findings.length === 0 ? 'No findings yet' : 'No findings match your search'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {findings.length === 0 ? 'Start documenting vulnerabilities found during the assessment' : 'Try a different search term'}
                  </p>
                </Card>
              );
              return (
                <div className="space-y-3">
                  {filtered.map((finding, index) => (
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
                          <span>Reported by: {getUsername(finding.created_by)}</span>
                          <span>{new Date(finding.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
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
                {assignees.map((member) => {
                  // Strip any HTML tags from username for safe display
                  const safeUsername = String(member.username).replace(/<[^>]*>/g, '').trim() || 'Unknown';
                  const initial = safeUsername.charAt(0).toUpperCase();

                  return (
                    <Card key={member.user_id} glow>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full gradient-technieum flex items-center justify-center text-primary-foreground font-semibold text-lg">
                            {initial}
                          </div>
                          <div>
                            <p className="font-medium">{safeUsername}</p>
                            <Badge variant="secondary" className="mt-1">Tester</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
                    <Button variant="outline" className="w-full" onClick={handleGenerateTechnicalReport}>
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
                    <Button variant="outline" className="w-full" onClick={handleGenerateManagementReport}>
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
                  <Button variant="outline" className="w-full" onClick={handleGenerateRetestReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Retest Report
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="checklist" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  OWASP Web Application Security Testing Checklist
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Comprehensive checklist based on OWASP testing guidelines. Track your testing progress for each engagement.
                </p>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-2">
                  {owaspChecklist.map((section) => {
                    const progress = getCategoryProgress(section.category, section.items);
                    const progressPercent = Math.round((progress.completed / progress.total) * 100);
                    return (
                      <AccordionItem
                        key={section.category}
                        value={section.category}
                        className="border border-border/50 rounded-lg px-4 bg-secondary/20"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-medium">{section.category}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {progress.completed}/{progress.total}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {section.items.map((item) => {
                              const key = `${section.category}-${item}`;
                              const isChecked = checklistProgress[key] || false;
                              return (
                                <label
                                  key={item}
                                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => toggleChecklistItem(section.category, item)}
                                    className="mt-0.5"
                                  />
                                  <span className={`text-sm ${isChecked ? 'text-muted-foreground line-through' : ''}`}>
                                    {item}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Finding Dialog */}
      <Dialog open={addFindingOpen} onOpenChange={(open) => { setAddFindingOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Finding</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitFinding} className="space-y-4 mt-4">
            {/* Project field — locked to current project */}
            <div className="space-y-2">
              <Label>Project</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/50 text-sm">
                <span className="flex-1 font-medium">{project.name}</span>
                <Badge variant="secondary" className="text-xs">Current Project</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value as Severity })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Informational">Informational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CVSS Score</Label>
                <Input
                  placeholder="e.g., 9.8"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.cvssScore}
                  onChange={(e) => setFormData({ ...formData, cvssScore: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Title *</Label>
                <Input
                  placeholder="Finding title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Affected Component</Label>
                <Input
                  placeholder="e.g., /api/users"
                  value={formData.affectedComponent}
                  onChange={(e) => setFormData({ ...formData, affectedComponent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CWE ID</Label>
                <Input
                  placeholder="e.g., CWE-79"
                  value={formData.cweId}
                  onChange={(e) => setFormData({ ...formData, cweId: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Detailed description of the vulnerability"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Steps to Reproduce</Label>
              <Textarea
                placeholder="Step-by-step instructions to reproduce"
                rows={4}
                value={formData.stepsToReproduce}
                onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Impact</Label>
              <Textarea
                placeholder="Potential impact of this vulnerability"
                rows={2}
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Remediation</Label>
              <Textarea
                placeholder="Recommended remediation steps"
                rows={3}
                value={formData.remediation}
                onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </DialogClose>
              <Button type="submit" className="gradient-technieum">Submit Finding</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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