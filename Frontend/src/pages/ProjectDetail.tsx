import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, Globe, Bug, FileText, Download, Plus, Loader2,
  ChevronRight, RefreshCw, Search, CheckSquare, Upload,
  Image as ImageIcon, X, Shield, Cpu, Brain,
} from 'lucide-react';
import { generateTechnicalReport, generateManagementReport, generateRetestReport } from '@/utils/reportGenerator';
import FindingDetailDialog from '@/components/FindingDetailDialog';
import { owaspChecklist } from '@/data/mockData';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

type Project = {
  id: string; name: string; client: string;
  domain: string | null; ip_addresses: string[] | null;
  status: string | null; start_date: string | null; end_date: string | null;
  created_at: string;
  findings_count?: number; critical_count?: number; high_count?: number;
  medium_count?: number; low_count?: number; info_count?: number; assignees_count?: number;
};

type Finding = {
  id: string; title: string; description: string | null; severity: string;
  cvss_score: number | null; status: string | null; created_at: string; created_by: string;
  steps_to_reproduce: string | null; impact: string | null; remediation: string | null;
  affected_component: string | null; cwe_id: string | null;
  retest_status: string | null; retest_date: string | null;
  retest_notes: string | null; retested_by: string | null;
};

type FindingPoc = {
  id: string; finding_id: string; file_path: string;
  file_name: string; uploaded_by: string; uploaded_at: string;
};

type Assignee = {
  id: string; user_id: string; username: string; assigned_at: string;
};

// ─── API base URL ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams();
  const { role, user } = useAuth();
  const userId = (user?.id ?? '') as string;

  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [addFindingOpen, setAddFindingOpen] = useState(false);

  const [formData, setFormData] = useState({
    severity: '' as Severity | '', title: '', description: '',
    stepsToReproduce: '', impact: '', remediation: '',
    affectedComponent: '', cvssScore: '', cweId: '',
  });

  // POC staging
  const formPocInputRef = useRef<HTMLInputElement>(null);
  const [pendingPocs, setPendingPocs] = useState<{ file: File; preview: string }[]>([]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      severity: '', title: '', description: '', stepsToReproduce: '',
      impact: '', remediation: '', affectedComponent: '', cvssScore: '', cweId: '',
    });
    pendingPocs.forEach(p => URL.revokeObjectURL(p.preview));
    setPendingPocs([]);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getSeverityBadge = (severity: string) => {
    const map: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-500 border-red-500/30',
      high:     'bg-orange-500/10 text-orange-500 border-orange-500/30',
      medium:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      low:      'bg-green-500/10 text-green-500 border-green-500/30',
      informational: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      info:     'bg-blue-500/10 text-blue-500 border-blue-500/30',
    };
    const cls = map[severity.toLowerCase()] ?? map['info'];
    const label = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
        {label}
      </span>
    );
  };

  // ─── Auth headers ──────────────────────────────────────────────────────────

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const authHeadersNoContent = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchProjectData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const projectRes = await fetch(`${API_BASE}/projects/${id}`, { headers: authHeaders() });
      if (!projectRes.ok) throw new Error('Failed to fetch project');
      setProject(await projectRes.json());

      const findingsRes = await fetch(`${API_BASE}/findings?project_id=${id}`, { headers: authHeaders() });
      if (findingsRes.ok) {
        const data: Finding[] = await findingsRes.json();
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
        data.sort((a, b) => (order[a.severity.toLowerCase()] ?? 5) - (order[b.severity.toLowerCase()] ?? 5));
        setFindings(data);
      }

      const assignRes = await fetch(`${API_BASE}/projects/${id}/assignments`, { headers: authHeaders() });
      if (assignRes.ok) setAssignees(await assignRes.json());
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProjectData(); }, [id]);

  // ─── POC staging ───────────────────────────────────────────────────────────

  const handleFormPocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    const valid = files.filter(f => allowed.includes(f.type));
    if (valid.length !== files.length) toast.error('Only JPEG and PNG files are allowed');
    setPendingPocs(prev => [...prev, ...valid.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    if (formPocInputRef.current) formPocInputRef.current.value = '';
  };

  const removePendingPoc = (index: number) => {
    setPendingPocs(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ─── Add Finding ───────────────────────────────────────────────────────────

  const handleSubmitFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.severity || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields'); return;
    }
    if (!userId || !id) { toast.error('You must be logged in'); return; }

    try {
      const res = await fetch(`${API_BASE}/findings`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          project_id: id, title: formData.title, description: formData.description,
          severity: formData.severity, steps_to_reproduce: formData.stepsToReproduce || null,
          impact: formData.impact || null, remediation: formData.remediation || null,
          affected_component: formData.affectedComponent || null,
          cvss_score: formData.cvssScore ? parseFloat(formData.cvssScore) : null,
          cwe_id: formData.cweId || null, created_by: userId,
        }),
      });

      if (!res.ok) {
        let errMsg = res.statusText;
        try { const err = await res.clone().json(); errMsg = err.message ?? errMsg; } catch (_) {}
        toast.error(`Failed to add finding: ${errMsg}`); return;
      }

      const newFinding: Finding = await res.json();

      // Upload pending POCs
      for (const { file } of pendingPocs) {
        const payload = new FormData();
        payload.append('file', file);
        payload.append('uploaded_by', userId);
        try {
          await fetch(`${API_BASE}/findings/${newFinding.id}/pocs`, {
            method: 'POST', headers: authHeadersNoContent(), body: payload,
          });
        } catch (_) {}
      }

      setFindings(prev => [newFinding, ...prev]);
      toast.success(`Finding added${pendingPocs.length > 0 ? ` with ${pendingPocs.length} POC(s)` : ''}!`);
      resetForm();
      setAddFindingOpen(false);
    } catch (error) {
      console.error('Error adding finding:', error);
      toast.error('Failed to add finding');
    }
  };

  // ─── Checklist ─────────────────────────────────────────────────────────────

  const toggleChecklistItem = (category: string, item: string) => {
    const key = `${category}-${item}`;
    setChecklistProgress(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getCategoryProgress = (category: string, items: string[]) => {
    const completed = items.filter(item => checklistProgress[`${category}-${item}`]).length;
    return { completed, total: items.length };
  };

  // ─── Report Generators ─────────────────────────────────────────────────────

  const buildReportProject = (p: Project) => ({
    id: p.id, name: p.name, description: '', client: p.client,
    targetDomain: p.domain || '', targetIPs: p.ip_addresses || [],
    credentials: [], assignedTesters: [], managerId: '',
    status: (p.status || 'active') as 'active' | 'completed' | 'pending' | 'overdue',
    startDate: p.start_date ? new Date(p.start_date) : new Date(),
    endDate: p.end_date ? new Date(p.end_date) : new Date(),
    createdAt: new Date(p.created_at), findings: [],
  });

  const buildReportFindings = (fList: Finding[], projectId: string) => {
    const sm: Record<string, 'critical'|'high'|'medium'|'low'|'info'> = {
      critical:'critical', high:'high', medium:'medium', low:'low', informational:'info',
    };
    return fList.map(f => ({
      id: f.id, projectId, title: f.title, description: f.description || '',
      severity: sm[f.severity.toLowerCase()] || 'medium', cvssScore: f.cvss_score || 0,
      stepsToReproduce: f.steps_to_reproduce || '', impact: f.impact || '',
      remediation: f.remediation || '',
      affectedAssets: f.affected_component ? [f.affected_component] : [],
      evidence: [] as string[],
      status: (f.status?.toLowerCase() || 'open') as 'open'|'remediated'|'accepted'|'false_positive',
      reportedBy: f.created_by, createdAt: new Date(f.created_at), updatedAt: new Date(f.created_at),
    }));
  };

  const handleGenerateTechnicalReport = async () => {
    if (!project) return;
    try {
      const pocImages: Record<string, string[]> = {};
      try {
        const pocRes = await fetch(`${API_BASE}/findings/pocs?finding_ids=${findings.map(f=>f.id).join(',')}`, { headers: authHeaders() });
        if (pocRes.ok) {
          const d: { finding_id: string; file_path: string }[] = await pocRes.json();
          d.forEach(p => { if (!pocImages[p.finding_id]) pocImages[p.finding_id]=[]; pocImages[p.finding_id].push(p.file_path); });
        }
      } catch {}
      toast.info('Generating report… This may take a moment.');
      await generateTechnicalReport(buildReportProject(project), buildReportFindings(findings, project.id).map(f=>({...f,evidence:pocImages[f.id]||[]})), pocImages);
      toast.success('Technical Report generated successfully!');
    } catch (error) { toast.error('Failed to generate report'); }
  };

  const handleGenerateManagementReport = async () => {
    if (!project) return;
    try {
      await generateManagementReport(buildReportProject(project), buildReportFindings(findings, project.id));
      toast.success('Management Report generated successfully!');
    } catch { toast.error('Failed to generate report'); }
  };

  const handleGenerateRetestReport = async () => {
    if (!project) return;
    try {
      await generateRetestReport(buildReportProject(project), findings.map(f => ({
        id: f.id, title: f.title, severity: f.severity.toLowerCase(),
        status: f.status || 'Open', retest_status: f.retest_status, retest_date: f.retest_date,
      })));
      toast.success('Retest Report generated successfully!');
    } catch { toast.error('Failed to generate retest report'); }
  };

  // ─── Render guards ─────────────────────────────────────────────────────────

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
            <Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" />Back to Projects</Button>
          </Link>
        </Card>
      </DashboardLayout>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <DashboardLayout title={project.name} description={project.client}>
      <div className="space-y-6">
        <Link to="/projects">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back to Projects</Button>
        </Link>

        <div className="flex items-center gap-4">
          <Badge variant={project.status as any} className="text-sm px-3 py-1">
            {(project.status || 'pending').charAt(0).toUpperCase() + (project.status || 'pending').slice(1)}
          </Badge>
          <span className="text-muted-foreground">{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
            <TabsTrigger value="team">Team ({assignees.length})</TabsTrigger>
            {(role === 'admin' || role === 'manager') && <TabsTrigger value="reports">Reports</TabsTrigger>}
            <TabsTrigger value="checklist">Check List</TabsTrigger>
            <TabsTrigger value="sast" className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />SAST
            </TabsTrigger>
            <TabsTrigger value="asm" className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5" />ASM
            </TabsTrigger>
            <TabsTrigger value="llm" className="flex items-center gap-1">
              <Brain className="h-3.5 w-3.5" />LLM
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />Target Information
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
                      ) : <span className="text-muted-foreground text-sm">No IPs specified</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bug className="h-5 w-5 text-primary" />Findings Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Critical', count: project.critical_count ?? findings.filter(f=>f.severity.toLowerCase()==='critical').length, color: 'text-red-500', bg: 'bg-red-500/10' },
                      { label: 'High',     count: project.high_count     ?? findings.filter(f=>f.severity.toLowerCase()==='high').length,     color: 'text-orange-500', bg: 'bg-orange-500/10' },
                      { label: 'Medium',   count: project.medium_count   ?? findings.filter(f=>f.severity.toLowerCase()==='medium').length,   color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                      { label: 'Low',      count: project.low_count      ?? findings.filter(f=>f.severity.toLowerCase()==='low').length,      color: 'text-green-500',  bg: 'bg-green-500/10'  },
                    ].map(({ label, count, color, bg }) => (
                      <div key={label} className={`text-center p-3 rounded-lg ${bg}`}>
                        <p className={`text-2xl font-bold ${color}`}>{count}</p>
                        <p className="text-sm text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Findings ── */}
          <TabsContent value="findings" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">{findings.length} findings reported</p>
              <Button variant="gradient" onClick={() => setAddFindingOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Finding
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search findings..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/50" />
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
                    <Card key={finding.id} glow
                      className="animate-fade-in cursor-pointer hover:border-primary/50 transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => { setSelectedFinding(finding); setIsDetailOpen(true); }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              {getSeverityBadge(finding.severity)}
                              {finding.cvss_score && <span className="text-sm text-muted-foreground">CVSS: {finding.cvss_score}</span>}
                            </div>
                            <h3 className="font-semibold">{finding.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{finding.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={finding.status === 'Open' ? 'destructive' : 'secondary'}>{finding.status}</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                          <span>Reported by: {assignees.find(a => a.user_id === finding.created_by)?.username ?? finding.created_by}</span>
                          <span>{new Date(finding.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

          {/* ── Team ── */}
          <TabsContent value="team" className="space-y-4">
            {assignees.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg font-medium">No team members assigned</p>
                <p className="text-sm text-muted-foreground mt-1">Assign testers to this project from the Projects page</p>
              </Card>
            ) : (
              <>
                <p className="text-muted-foreground">{assignees.length} member{assignees.length !== 1 ? 's' : ''} assigned</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignees.map((member) => {
                    const safeUsername = String(member.username || '').replace(/<[^>]*>/g, '').trim() || 'Unknown';
                    const initial = safeUsername.charAt(0).toUpperCase();
                    return (
                      <Card key={member.id} glow>
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
              </>
            )}
          </TabsContent>

          {/* ── Reports ── */}
          {(role === 'admin' || role === 'manager') && (
            <TabsContent value="reports" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card glow>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Technical Report</CardTitle>
                    <CardDescription>Detailed technical findings with steps to reproduce, impact analysis, and remediation guidance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" onClick={handleGenerateTechnicalReport}>
                      <Download className="h-4 w-4 mr-2" />Generate Technical Report
                    </Button>
                  </CardContent>
                </Card>
                <Card glow>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Management Report</CardTitle>
                    <CardDescription>Executive summary highlighting key risks and security posture for non-technical stakeholders</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" onClick={handleGenerateManagementReport}>
                      <Download className="h-4 w-4 mr-2" />Generate Management Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <Card glow>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" />Retest Report</CardTitle>
                  <CardDescription>Summary of remediation progress showing fixed vs. not fixed findings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Fixed:</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">{findings.filter(f=>f.retest_status==='Fixed').length}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Not Fixed:</span>
                      <Badge variant="destructive">{findings.filter(f=>f.retest_status==='Not Fixed').length}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Open:</span>
                      <Badge variant="secondary">{findings.filter(f=>!f.retest_status||f.retest_status==='Open').length}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleGenerateRetestReport}>
                    <Download className="h-4 w-4 mr-2" />Generate Retest Report
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Checklist ── */}
          <TabsContent value="checklist" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary" />OWASP Web Application Security Testing Checklist</CardTitle>
                <p className="text-sm text-muted-foreground">Comprehensive checklist based on OWASP testing guidelines. Track your testing progress for each engagement.</p>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-2">
                  {owaspChecklist.map((section) => {
                    const progress = getCategoryProgress(section.category, section.items);
                    const pct = Math.round((progress.completed / progress.total) * 100);
                    return (
                      <AccordionItem key={section.category} value={section.category} className="border border-border/50 rounded-lg px-4 bg-secondary/20">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-medium">{section.category}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-sm text-muted-foreground">{progress.completed}/{progress.total}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {section.items.map((item) => {
                              const key = `${section.category}-${item}`;
                              const isChecked = checklistProgress[key] || false;
                              return (
                                <label key={item} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                                  <Checkbox checked={isChecked} onCheckedChange={() => toggleChecklistItem(section.category, item)} className="mt-0.5" />
                                  <span className={`text-sm ${isChecked ? 'text-muted-foreground line-through' : ''}`}>{item}</span>
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

          {/* ── SAST ── */}
          <TabsContent value="sast" className="space-y-4">
            <Card className="p-12 text-center">
              <Shield className="h-16 w-16 mx-auto text-primary/40 mb-4" />
              <p className="text-lg font-semibold">Static Application Security Testing</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                SAST results for this project will appear here. Upload or integrate your SAST scanner output to track code-level vulnerabilities.
              </p>
              <Button variant="outline" className="mt-6" disabled>
                <Plus className="h-4 w-4 mr-2" />Import SAST Results
              </Button>
            </Card>
          </TabsContent>

          {/* ── ASM ── */}
          <TabsContent value="asm" className="space-y-4">
            <Card className="p-12 text-center">
              <Cpu className="h-16 w-16 mx-auto text-primary/40 mb-4" />
              <p className="text-lg font-semibold">Attack Surface Management</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Asset discovery and attack surface data for this project will appear here. Connect your ASM tool to enumerate exposed assets and services.
              </p>
              <Button variant="outline" className="mt-6" disabled>
                <Plus className="h-4 w-4 mr-2" />Connect ASM Tool
              </Button>
            </Card>
          </TabsContent>

          {/* ── LLM ── */}
          <TabsContent value="llm" className="space-y-4">
            <Card className="p-12 text-center">
              <Brain className="h-16 w-16 mx-auto text-primary/40 mb-4" />
              <p className="text-lg font-semibold">LLM Security Testing</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                AI/LLM security assessment findings for this project will appear here. Document prompt injection, jailbreaks, and model-specific vulnerabilities.
              </p>
              <Button variant="outline" className="mt-6" disabled>
                <Plus className="h-4 w-4 mr-2" />Add LLM Findings
              </Button>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* ── Add Finding Dialog ── */}
      <Dialog open={addFindingOpen} onOpenChange={(open) => { setAddFindingOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Finding</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitFinding} className="space-y-4 mt-4">
            {/* Locked project */}
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
                <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v as Severity })}>
                  <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
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
                <Input placeholder="e.g., 9.8" type="number" step="0.1" min="0" max="10"
                  value={formData.cvssScore} onChange={(e) => setFormData({ ...formData, cvssScore: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="Finding title" value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Affected Component</Label>
                <Input placeholder="e.g., /api/users" value={formData.affectedComponent}
                  onChange={(e) => setFormData({ ...formData, affectedComponent: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CWE ID</Label>
                <Input placeholder="e.g., CWE-79" value={formData.cweId}
                  onChange={(e) => setFormData({ ...formData, cweId: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea placeholder="Detailed description of the vulnerability" rows={3}
                value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Steps to Reproduce</Label>
              <Textarea placeholder="Step-by-step instructions to reproduce" rows={4}
                value={formData.stepsToReproduce} onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Impact</Label>
              <Textarea placeholder="Potential impact of this vulnerability" rows={2}
                value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Remediation</Label>
              <Textarea placeholder="Recommended remediation steps" rows={3}
                value={formData.remediation} onChange={(e) => setFormData({ ...formData, remediation: e.target.value })} />
            </div>

            {/* ── POC Upload ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Proof of Concept (POC)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => formPocInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" />Add Images
                </Button>
                <input ref={formPocInputRef} type="file" accept=".jpg,.jpeg,.png" multiple className="hidden" onChange={handleFormPocSelect} />
              </div>
              {pendingPocs.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {pendingPocs.map((poc, idx) => (
                    <div key={idx} className="relative group">
                      <img src={poc.preview} alt={poc.file.name} className="rounded-lg border border-border/50 w-full h-24 object-cover" />
                      <button type="button" onClick={() => removePendingPoc(idx)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                        <X className="h-3 w-3" />
                      </button>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{poc.file.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => formPocInputRef.current?.click()}>
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload POC screenshots</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG up to 10MB</p>
                </div>
              )}
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

      {/* ── Finding Detail Dialog ── */}
      <FindingDetailDialog
        finding={selectedFinding}
        open={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedFinding(null); }}
        creatorName={selectedFinding ? assignees.find(a => a.user_id === selectedFinding.created_by)?.username ?? selectedFinding.created_by : undefined}
      />
    </DashboardLayout>
  );
}