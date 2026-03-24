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
  ChevronDown, ChevronUp, RefreshCw, Search,
  CheckSquare, Upload, Image as ImageIcon, X, Shield, Cpu, Brain,
  AlertTriangle, Trash2, Network, Plug, Cloud, Users,
} from 'lucide-react';
import { generateTechnicalReport, generateManagementReport, generateRetestReport } from '@/utils/reportGenerator';
import FindingDetailDialog from '@/components/FindingDetailDialog';
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
import {
  webChecklist, apiChecklist, cloudChecklist, aiLlmChecklist,
} from '@/data/Checklistdata';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
type RetestStatus = 'Open' | 'Fixed' | 'Not Fixed';
type CLType = 'web' | 'api' | 'cloud' | 'aiLlm';

type Project = {
  id: string; name: string; client: string;
  domain: string | null; ip_addresses: string[] | null;
  status: string | null; start_date: string | null; end_date: string | null;
  created_at: string;
  findings_count?: number; critical_count?: number; high_count?: number;
  medium_count?: number; low_count?: number; info_count?: number; assignees_count?: number;
};

type Finding = {
  id: string; title: string; description: string | null; severity: string | number;
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

type ChecklistRow = {
  id: string; project_id: string; checklist_type: string;
  category: string; item_key: string; is_checked: boolean;
  updated_by: string | null; updated_at: string | null;
};

type ArchComponent = {
  id: string; name: string;
  type: 'server' | 'database' | 'api' | 'frontend' | 'mobile' | 'cloud' | 'firewall' | 'loadbalancer' | 'external';
  ip?: string; port?: string; tech?: string; notes?: string;
  connections: string[];
};

type ArchUpload = { name: string; preview: string; notes: string; };

// ─── API base URL ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const STATIC_BASE = API_BASE.replace(/\/api$/, '');

// ─── Severity helpers ─────────────────────────────────────────────────────────

const normalizeSeverity = (s: string | number | null | undefined): Severity => {
  const map: Record<string, Severity> = {
    critical: 'Critical', high: 'High', medium: 'Medium',
    low: 'Low', informational: 'Informational', info: 'Informational',
  };
  const raw = String(s ?? '').toLowerCase().trim();
  if (map[raw]) return map[raw];
  const n = parseFloat(raw);
  if (!isNaN(n) && raw !== '') {
    if (n >= 9) return 'Critical';
    if (n >= 7) return 'High';
    if (n >= 4) return 'Medium';
    return 'Low';
  }
  return 'Informational';
};

const SEV: Record<Severity, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  High: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  Medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  Low: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  Informational: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
};

const getSeverityBadge = (s: string | number | null | undefined) => {
  const n = normalizeSeverity(s);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${SEV[n].bg} ${SEV[n].text} ${SEV[n].border}`}>
      {n}
    </span>
  );
};

const getSeverityIcon = (s: string | number | null | undefined) => {
  const n = normalizeSeverity(s);
  return <AlertTriangle className={`h-5 w-5 ${SEV[n].text}`} />;
};

const getRetestBadge = (status: string | null) => {
  if (!status) return null;
  const v: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    Open: 'destructive', Fixed: 'outline', 'Not Fixed': 'secondary',
  };
  return (
    <Badge variant={v[status] ?? 'secondary'} className="ml-2">
      <RefreshCw className="h-3 w-3 mr-1" />{status}
    </Badge>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams();
  const { role, user } = useAuth();
  const userId = (user?.id ?? '') as string;

  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [pocs, setPocs] = useState<Record<string, FindingPoc[]>>({});
  const [deletingFindingId, setDeletingFindingId] = useState<string | null>(null);
  const [uploadingFindingId, setUploadingFindingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [addFindingOpen, setAddFindingOpen] = useState(false);

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [activeChecklistTab, setActiveChecklistTab] = useState<CLType>('web');

  const [clProgress, setClProgress] = useState<Record<string, Record<string, boolean>>>({
    web: {}, api: {}, cloud: {}, aiLlm: {},
  });
  const [clSaving, setClSaving] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    severity: '' as Severity | '', title: '', description: '',
    stepsToReproduce: '', impact: '', remediation: '',
    affectedComponent: '', cvssScore: '', cweId: '',
  });

  const formPocInputRef = useRef<HTMLInputElement>(null);
  const [pendingPocs, setPendingPocs] = useState<{ file: File; preview: string }[]>([]);

  const [archComponents, setArchComponents] = useState<ArchComponent[]>([]);
  const [archUploads, setArchUploads] = useState<ArchUpload[]>([]);
  const [archMode, setArchMode] = useState<'builder' | 'upload'>('builder');
  const [addingComponent, setAddingComponent] = useState(false);
  const archFileRef = useRef<HTMLInputElement>(null);
  const [newComp, setNewComp] = useState<Omit<ArchComponent, 'id' | 'connections'>>({
    name: '', type: 'server', ip: '', port: '', tech: '', notes: '',
  });

  // ─── Auth headers ──────────────────────────────────────────────────────────

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const authHeadersNoContent = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      severity: '', title: '', description: '', stepsToReproduce: '',
      impact: '', remediation: '', affectedComponent: '', cvssScore: '', cweId: '',
    });
    pendingPocs.forEach(p => URL.revokeObjectURL(p.preview));
    setPendingPocs([]);
  };

  const getUsername = (uid: string | null | undefined): string => {
    if (!uid) return 'Unknown';
    const key = String(uid);
    if (allUsers[key]) return allUsers[key];
    const a = assignees.find(a => String(a.user_id) === key);
    if (a?.username) return a.username;
    return key;
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Not set';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // ─── Fetch data ────────────────────────────────────────────────────────────

  const fetchProjectData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const pr = await fetch(`${API_BASE}/projects/${id}`, { headers: authHeaders() });
      if (!pr.ok) throw new Error('Failed to fetch project');
      setProject(await pr.json());

      const fr = await fetch(`${API_BASE}/findings?project_id=${id}`, { headers: authHeaders() });
      let fetchedFindings: Finding[] = [];
      if (fr.ok) {
        const data: Finding[] = await fr.json();
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, informational: 4, info: 4 };
        data.sort((a, b) => (order[String(a.severity).toLowerCase()] ?? 5) - (order[String(b.severity).toLowerCase()] ?? 5));
        fetchedFindings = data;
        setFindings(data);
      }

      if (fetchedFindings.length > 0) {
        const pocResults = await Promise.all(
          fetchedFindings.map(f =>
            fetch(`${API_BASE}/findings/${f.id}/pocs`, { headers: authHeaders() })
              .then(r => r.ok ? r.json() : [])
              .then((rows: FindingPoc[]) => ({ findingId: f.id, rows }))
          )
        );
        const pocMap: Record<string, FindingPoc[]> = {};
        pocResults.forEach(({ findingId, rows }) => { pocMap[findingId] = rows; });
        setPocs(pocMap);
      }

      try {
        const ur = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
        if (ur.ok) {
          const ud = await ur.json();
          const map: Record<string, string> = {};
          ud.forEach((u: any) => { map[String(u.id)] = u.username || u.name || u.email || String(u.id); });
          setAllUsers(map);
        }
      } catch (_) { }

      const ar = await fetch(`${API_BASE}/projects/${id}/assignments`, { headers: authHeaders() });
      if (ar.ok) setAssignees(await ar.json());

      await fetchChecklistProgress();
    } catch (err) {
      console.error(err);
      toast.error('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProjectData(); }, [id]);

  // ─── Checklist DB ──────────────────────────────────────────────────────────

  const fetchChecklistProgress = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${id}/checklist`, { headers: authHeaders() });
      if (!res.ok) return;
      const rows: ChecklistRow[] = await res.json();
      const next: Record<string, Record<string, boolean>> = { web: {}, api: {}, cloud: {}, aiLlm: {} };
      rows.forEach(r => {
        const type = r.checklist_type as CLType;
        if (!next[type]) next[type] = {};
        next[type][r.item_key] = Boolean(r.is_checked);
      });
      setClProgress(next);
    } catch (e) {
      console.warn('fetchChecklistProgress failed:', e);
    }
  };

  const toggleItem = async (type: CLType, category: string, item: string) => {
    if (!id) return;
    const key = `${category}::${item}`;
    const newValue = !clProgress[type]?.[key];

    setClProgress(prev => ({ ...prev, [type]: { ...prev[type], [key]: newValue } }));
    setClSaving(prev => ({ ...prev, [`${type}::${key}`]: true }));

    try {
      const res = await fetch(`${API_BASE}/projects/${id}/checklist`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ checklist_type: type, category, item_key: key, is_checked: newValue, updated_by: userId }),
      });
      if (!res.ok) {
        setClProgress(prev => ({ ...prev, [type]: { ...prev[type], [key]: !newValue } }));
        toast.error('Failed to save checklist item');
      }
    } catch {
      setClProgress(prev => ({ ...prev, [type]: { ...prev[type], [key]: !newValue } }));
      toast.error('Failed to save checklist item');
    } finally {
      setClSaving(prev => ({ ...prev, [`${type}::${key}`]: false }));
    }
  };

  // ─── Update Project Status ─────────────────────────────────────────────────

  const handleUpdateStatus = async (newStatus: string) => {
    if (!project) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${project.id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error('Failed: ' + (e.message ?? res.statusText)); return; }
      setProject(prev => prev ? { ...prev, status: newStatus } : prev);
      toast.success(`Status updated to "${newStatus}"`);
    } catch { toast.error('Failed to update status'); }
    finally { setIsUpdatingStatus(false); }
  };

  // ─── POC staging ───────────────────────────────────────────────────────────

  const handleFormPocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter(f => ['image/jpeg', 'image/jpg', 'image/png'].includes(f.type));
    if (valid.length !== files.length) toast.error('Only JPEG and PNG files are allowed');
    setPendingPocs(prev => [...prev, ...valid.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    if (formPocInputRef.current) formPocInputRef.current.value = '';
  };

  const removePendingPoc = (i: number) => {
    setPendingPocs(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); });
  };

  // ─── Add Finding ───────────────────────────────────────────────────────────

  const handleSubmitFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.severity || !formData.title || !formData.description) { toast.error('Please fill in all required fields'); return; }
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
      if (!res.ok) { let msg = res.statusText; try { const e = await res.clone().json(); msg = e.message ?? msg; } catch (_) { } toast.error(`Failed to add finding: ${msg}`); return; }
      const nf: Finding = await res.json();
      const up: FindingPoc[] = [];
      for (const { file } of pendingPocs) {
        const p = new FormData(); p.append('file', file); p.append('uploaded_by', userId);
        try { const r = await fetch(`${API_BASE}/findings/${nf.id}/pocs`, { method: 'POST', headers: authHeadersNoContent(), body: p }); if (r.ok) up.push(await r.json()); } catch (_) { }
      }
      setFindings(prev => [nf, ...prev]);
      setPocs(prev => ({ ...prev, [nf.id]: up }));
      toast.success(`Finding added${pendingPocs.length > 0 ? ` with ${pendingPocs.length} POC(s)` : ''}!`);
      resetForm(); setAddFindingOpen(false);
    } catch { toast.error('Failed to add finding'); }
  };

  // ─── Delete Finding ────────────────────────────────────────────────────────

  const handleDelete = (findingId: string) => {
    const f = findings.find(f => f.id === findingId);
    if (!f || !userId || f.created_by !== userId) { toast.error('You can only delete your own findings'); return; }
    setDeletingFindingId(findingId);
  };

  const confirmDelete = async () => {
    if (!deletingFindingId) return;
    try {
      const res = await fetch(`${API_BASE}/findings/${deletingFindingId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const e = await res.json(); toast.error('Failed: ' + (e.message ?? res.statusText)); return; }
      setFindings(prev => prev.filter(f => f.id !== deletingFindingId));
      toast.success('Finding deleted');
    } catch { toast.error('Failed to delete finding'); }
    finally { setDeletingFindingId(null); }
  };

  // ─── Upload / Delete POC ───────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, findingId: string) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    const file = files[0];
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) { toast.error('Only JPEG and PNG allowed'); return; }
    try {
      const p = new FormData(); p.append('file', file); p.append('uploaded_by', userId);
      const res = await fetch(`${API_BASE}/findings/${findingId}/pocs`, { method: 'POST', headers: authHeadersNoContent(), body: p });
      if (!res.ok) { const e = await res.json(); toast.error('Upload failed: ' + (e.message ?? res.statusText)); return; }
      const np: FindingPoc = await res.json();
      setPocs(prev => ({ ...prev, [findingId]: [...(prev[findingId] || []), np] }));
      toast.success('POC uploaded!');
    } catch { toast.error('Failed to upload POC'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; setUploadingFindingId(null); }
  };

  const handleDeletePoc = async (poc: FindingPoc) => {
    if (!userId || poc.uploaded_by !== userId) { toast.error('You can only delete your own POCs'); return; }
    try {
      const res = await fetch(`${API_BASE}/findings/${poc.finding_id}/pocs/${poc.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const e = await res.json(); toast.error('Failed: ' + (e.message ?? res.statusText)); return; }
      setPocs(prev => ({ ...prev, [poc.finding_id]: prev[poc.finding_id]?.filter(p => p.id !== poc.id) || [] }));
      toast.success('POC deleted');
    } catch { toast.error('Failed to delete POC'); }
  };

  // ─── Update Retest Status ──────────────────────────────────────────────────

  const handleUpdateRetestStatus = async (findingId: string, status: RetestStatus) => {
    if (!user) { toast.error('You must be logged in'); return; }
    try {
      const res = await fetch(`${API_BASE}/findings/${findingId}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ retest_status: status, retest_date: new Date().toISOString(), retested_by: userId }),
      });
      if (!res.ok) { const e = await res.json(); toast.error('Failed: ' + (e.message ?? res.statusText)); return; }
      const updated: Finding = await res.json();
      setFindings(prev => prev.map(f => f.id === findingId ? updated : f));
      toast.success(`Retest status updated to "${status}"`);
    } catch { toast.error('Failed to update retest status'); }
  };

  // ─── Reports ───────────────────────────────────────────────────────────────

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
    const sm: Record<string, any> = { critical: 'critical', high: 'high', medium: 'medium', low: 'low', informational: 'info' };
    return fList.map(f => ({
      id: f.id, projectId, title: f.title, description: f.description || '',
      severity: sm[String(f.severity).toLowerCase()] || 'medium', cvssScore: f.cvss_score || 0,
      stepsToReproduce: f.steps_to_reproduce || '', impact: f.impact || '',
      remediation: f.remediation || '',
      affectedAssets: f.affected_component ? [f.affected_component] : [],
      evidence: [] as string[],
      status: (f.status?.toLowerCase() || 'open') as any,
      reportedBy: f.created_by, createdAt: new Date(f.created_at), updatedAt: new Date(f.created_at),
    }));
  };

  const handleGenerateTechnicalReport = async () => {
    if (!project) return;
    try {
      const pocImages: Record<string, string[]> = {};
      try {
        const r = await fetch(`${API_BASE}/findings/pocs?finding_ids=${findings.map(f => f.id).join(',')}`, { headers: authHeaders() });
        if (r.ok) { const d: any[] = await r.json(); d.forEach(p => { if (!pocImages[p.finding_id]) pocImages[p.finding_id] = []; pocImages[p.finding_id].push(p.file_path); }); }
      } catch { }
      toast.info('Generating report…');
      await generateTechnicalReport(buildReportProject(project), buildReportFindings(findings, project.id).map(f => ({ ...f, evidence: pocImages[f.id] || [] })), pocImages);
      toast.success('Technical Report generated!');
    } catch { toast.error('Failed to generate report'); }
  };

  const handleGenerateManagementReport = async () => {
    if (!project) return;
    try { await generateManagementReport(buildReportProject(project), buildReportFindings(findings, project.id)); toast.success('Management Report generated!'); }
    catch { toast.error('Failed to generate report'); }
  };

  const handleGenerateRetestReport = async () => {
    if (!project) return;
    try {
      await generateRetestReport(buildReportProject(project), findings.map(f => ({
        id: f.id, title: f.title, severity: String(f.severity).toLowerCase(),
        status: f.status || 'Open', retest_status: f.retest_status, retest_date: f.retest_date,
      })));
      toast.success('Retest Report generated!');
    } catch { toast.error('Failed to generate retest report'); }
  };

  // ─── Filtered findings ─────────────────────────────────────────────────────

  const filteredFindings = findings.filter(f => {
    const ms = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || (f.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const mv = severityFilter === 'all' || normalizeSeverity(f.severity) === severityFilter;
    return ms && mv;
  });

  // ─── Checklist renderer ────────────────────────────────────────────────────

  const renderChecklistContent = (
    type: CLType,
    data: { category: string; icon: string; items: string[] }[],
  ) => {
    const prog = clProgress[type] || {};
    const totalAll = data.reduce((s, sec) => s + sec.items.length, 0);
    const doneAll = data.reduce((s, sec) => s + sec.items.filter(i => prog[`${sec.category}::${i}`]).length, 0);
    const pctAll = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold text-primary">{pctAll}% ({doneAll}/{totalAll})</span>
          </div>
          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${pctAll}%` }} />
          </div>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {data.map((section) => {
            const done = section.items.filter(i => prog[`${section.category}::${i}`]).length;
            const pct = Math.round((done / section.items.length) * 100);
            return (
              <AccordionItem key={section.category} value={section.category} className="border border-border/50 rounded-lg px-4 bg-secondary/20">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{section.icon}</span>
                      <span className="font-medium text-left">{section.category}</span>
                      {done === section.items.length && section.items.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">Complete</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">{done}/{section.items.length}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pt-2 pb-1">
                    {section.items.map((item) => {
                      const key = `${section.category}::${item}`;
                      const isChecked = prog[key] || false;
                      const isSaving = clSaving[`${type}::${key}`] || false;
                      return (
                        <label key={item} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                          <div className="mt-0.5 shrink-0">
                            {isSaving
                              ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              : <Checkbox checked={isChecked} onCheckedChange={() => toggleItem(type, section.category, item)} />
                            }
                          </div>
                          <span className={`text-sm leading-relaxed ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
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
      </div>
    );
  };

  // ─── Checklist tab labels ──────────────────────────────────────────────────

  const checklistTabs: { type: CLType; label: string; icon: React.ReactNode; data: any[] }[] = [
    { type: 'web', label: 'Web', icon: <Globe className="h-3.5 w-3.5" />, data: webChecklist },
    { type: 'api', label: 'API', icon: <Plug className="h-3.5 w-3.5" />, data: apiChecklist },
    { type: 'cloud', label: 'Cloud', icon: <Cloud className="h-3.5 w-3.5" />, data: cloudChecklist },
    { type: 'aiLlm', label: 'AI/LLM', icon: <Brain className="h-3.5 w-3.5" />, data: aiLlmChecklist },
  ];

  const checklistTitles: Record<CLType, { title: string; subtitle: string }> = {
    web: { title: 'Web Application Security Checklist', subtitle: 'Comprehensive web app testing checklist. Progress is saved per project.' },
    api: { title: 'API Security Checklist', subtitle: 'REST & GraphQL API security testing checklist. Progress is saved per project.' },
    cloud: { title: 'Cloud Security Checklist', subtitle: 'AWS, Azure & GCP security misconfiguration checklist. Progress is saved per project.' },
    aiLlm: { title: 'AI/LLM Security Checklist', subtitle: 'LLM-specific vulnerabilities: prompt injection, excessive agency, data exposure and more.' },
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

        {/* Status row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={project.status as any} className="text-sm px-3 py-1">
            {(project.status || 'pending').charAt(0).toUpperCase() + (project.status || 'pending').slice(1)}
          </Badge>
          {(role === 'admin' || role === 'manager') && (
            <Select value={project.status || 'pending'} onValueChange={handleUpdateStatus} disabled={isUpdatingStatus}>
              <SelectTrigger className="h-8 w-40 text-xs bg-secondary/50">
                {isUpdatingStatus
                  ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Updating…</span>
                  : <SelectValue placeholder="Change status" />
                }
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          )}
          <span className="text-muted-foreground text-sm">{formatDate(project.start_date)} – {formatDate(project.end_date)}</span>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
            <TabsTrigger value="team">Team ({assignees.length > 0 ? assignees.length : (project?.assignees_count ?? 0)})</TabsTrigger>
            {(role === 'admin' || role === 'manager') && <TabsTrigger value="reports">Reports</TabsTrigger>}
            <TabsTrigger value="checklist"><CheckSquare className="h-3.5 w-3.5 mr-1" />Checklist</TabsTrigger>
            <TabsTrigger value="architecture"><Network className="h-3.5 w-3.5 mr-1" />Architecture</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-6">

            {/* Row 1: Project Brief + Risk Posture */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Project Brief */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Project Brief
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client</p>
                      <p className="font-semibold">{project.client || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project Name</p>
                      <p className="font-semibold">{project.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Start Date</p>
                      <p className="font-medium text-sm">{formatDate(project.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">End Date</p>
                      <p className="font-medium text-sm">{formatDate(project.end_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                      <Badge variant={project.status as any} className="capitalize">
                        {project.status || 'pending'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project ID</p>
                      <p className="font-mono text-xs text-muted-foreground truncate">{project.id}</p>
                    </div>
                  </div>

                  {/* Timeline bar */}
                  {project.start_date && project.end_date && (() => {
                    const start = new Date(project.start_date).getTime();
                    const end = new Date(project.end_date).getTime();
                    const now = Date.now();
                    const total = end - start;
                    const elapsed = Math.min(Math.max(now - start, 0), total);
                    const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
                    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
                    const isOver = now > end;
                    return (
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-muted-foreground">Timeline Progress</span>
                          <span className={`text-xs font-medium ${isOver ? 'text-destructive' : 'text-primary'}`}>
                            {isOver ? 'Overdue' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{new Date(project.start_date).toLocaleDateString()}</span>
                          <span className="text-xs text-muted-foreground">{new Date(project.end_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Risk Posture */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Risk Posture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map(sev => {
                    const count = findings.filter(f => normalizeSeverity(f.severity) === sev).length;
                    const total = findings.length || 1;
                    const pct = Math.round((count / total) * 100);
                    const { text } = SEV[sev];
                    const barColors: Record<Severity, string> = {
                      Critical: 'bg-red-500', High: 'bg-orange-500',
                      Medium: 'bg-yellow-500', Low: 'bg-green-500', Informational: 'bg-blue-500',
                    };
                    return (
                      <div key={sev}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs font-semibold ${text}`}>{sev}</span>
                          <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColors[sev]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Total Findings</span>
                      <span className="text-xs font-bold">{findings.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Scope & Target + Remediation Tracker */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Scope & Target */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Scope & Target
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Primary Domain</p>
                    {project.domain ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40 border border-border/50">
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-mono text-sm">{project.domain}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No domain specified</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      IP Addresses / Ranges ({project.ip_addresses?.length || 0})
                    </p>
                    {project.ip_addresses?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {project.ip_addresses.map((ip, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">{ip}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No IPs specified</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Assessment Coverage</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Web App', active: true, icon: '🌐' },
                        { label: 'API', active: true, icon: '🔌' },
                        { label: 'Network', active: false, icon: '🔗' },
                        { label: 'Mobile', active: false, icon: '📱' },
                        { label: 'Cloud', active: false, icon: '☁️' },
                        { label: 'AI/LLM', active: false, icon: '🤖' },
                      ].map(({ label, active, icon }) => (
                        <span
                          key={label}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-secondary/40 text-muted-foreground border-border/40'
                            }`}
                        >
                          {icon} {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Remediation Tracker */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Remediation Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const fixed = findings.filter(f => f.retest_status === 'Fixed').length;
                    const notFixed = findings.filter(f => f.retest_status === 'Not Fixed').length;
                    const open = findings.filter(f => !f.retest_status || f.retest_status === 'Open').length;
                    const total = findings.length || 1;
                    const fixedPct = Math.round((fixed / total) * 100);
                    const critHighOpen = findings.filter(f =>
                      (normalizeSeverity(f.severity) === 'Critical' || normalizeSeverity(f.severity) === 'High') &&
                      f.retest_status !== 'Fixed'
                    ).length;
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-2xl font-bold text-green-500">{fixed}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Fixed</p>
                          </div>
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-2xl font-bold text-red-500">{notFixed}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Not Fixed</p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/40 border border-border/40">
                            <p className="text-2xl font-bold text-muted-foreground">{open}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs text-muted-foreground">Fix Rate</span>
                            <span className="text-xs font-bold text-green-500">{fixedPct}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${fixedPct}%` }} />
                          </div>
                        </div>
                        {critHighOpen > 0 ? (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-xs text-destructive">
                              <span className="font-semibold">{critHighOpen} Critical/High</span> finding{critHighOpen !== 1 ? 's' : ''} still unresolved
                            </p>
                          </div>
                        ) : findings.length > 0 ? (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <CheckSquare className="h-4 w-4 text-green-500" />
                            <p className="text-xs text-green-500 font-medium">All Critical/High findings resolved ✓</p>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Team Snapshot + Recent Findings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Team Snapshot */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Team Snapshot
                  </CardTitle>
                  <CardDescription>{assignees.length} member{assignees.length !== 1 ? 's' : ''} assigned to this project</CardDescription>
                </CardHeader>
                <CardContent>
                  {assignees.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No testers assigned yet</p>
                  ) : (
                    <div className="space-y-2">
                      {assignees.slice(0, 5).map(member => {
                        const name = allUsers[String(member.user_id)] || member.username || 'Unknown';
                        const initials = name.charAt(0).toUpperCase();
                        const findingsByMember = findings.filter(f => String(f.created_by) === String(member.user_id)).length;
                        return (
                          <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                            <div className="h-8 w-8 rounded-full gradient-technieum flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{name}</p>
                              <p className="text-xs text-muted-foreground">Tester · {findingsByMember} finding{findingsByMember !== 1 ? 's' : ''} reported</p>
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">Active</Badge>
                          </div>
                        );
                      })}
                      {assignees.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">+{assignees.length - 5} more — see Team tab</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Findings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bug className="h-5 w-5 text-primary" />
                    Recent Findings
                  </CardTitle>
                  <CardDescription>Last 5 findings added to this project</CardDescription>
                </CardHeader>
                <CardContent>
                  {findings.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No findings yet — start the assessment</p>
                  ) : (
                    <div className="space-y-2">
                      {[...findings]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 5)
                        .map(f => (
                          <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                            <div className="shrink-0">{getSeverityIcon(f.severity)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{f.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(f.created_at).toLocaleDateString()} · by {getUsername(f.created_by)}
                              </p>
                            </div>
                            {getSeverityBadge(f.severity)}
                          </div>
                        ))
                      }
                      {findings.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          +{findings.length - 5} more — see Findings tab
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 4: Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Findings', value: findings.length, icon: <Bug className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
                { label: 'Team Size', value: assignees.length, icon: <Users className="h-5 w-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                { label: 'POCs Uploaded', value: Object.values(pocs).reduce((s, a) => s + a.length, 0), icon: <ImageIcon className="h-5 w-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                { label: 'Findings Fixed', value: findings.filter(f => f.retest_status === 'Fixed').length, icon: <CheckSquare className="h-5 w-5" />, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
              ].map(({ label, value, icon, color, bg, border }) => (
                <Card key={label} className={`border ${border} ${bg}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-3xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                      </div>
                      <div className={`${color} opacity-60`}>{icon}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

          </TabsContent>

          {/* ── FINDINGS ── */}
          <TabsContent value="findings" className="space-y-4">

            {/* ── Inner findings sub-tabs ── */}
            <Tabs defaultValue="all" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <TabsList className="bg-secondary/50 h-auto gap-1 p-1">
                  <TabsTrigger value="all" className="flex items-center gap-2 text-sm">
                    <Bug className="h-3.5 w-3.5" />
                    Pentest
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-semibold">
                      {findings.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="sast" className="flex items-center gap-2 text-sm">
                    <Shield className="h-3.5 w-3.5" />
                    SAST
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground font-semibold">0</span>
                  </TabsTrigger>
                  <TabsTrigger value="asm" className="flex items-center gap-2 text-sm">
                    <Cpu className="h-3.5 w-3.5" />
                    ASM
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground font-semibold">0</span>
                  </TabsTrigger>
                  <TabsTrigger value="llm" className="flex items-center gap-2 text-sm">
                    <Brain className="h-3.5 w-3.5" />
                    LLM / AI
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground font-semibold">0</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── ALL / PENTEST FINDINGS (existing) ── */}
              <TabsContent value="all" className="space-y-4 mt-0">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search findings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/50" />
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-secondary/50"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Informational">Informational</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="default" className="gradient-technieum" onClick={() => setAddFindingOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Add Finding
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map(sev => {
                    const count = findings.filter(f => normalizeSeverity(f.severity) === sev).length;
                    const { bg, text, border } = SEV[sev];
                    return (
                      <Card key={sev} className={`p-4 border ${border} ${bg}`}>
                        <div className="flex items-center justify-between">
                          <div><p className={`text-2xl font-bold ${text}`}>{count}</p><p className="text-xs text-muted-foreground">{sev}</p></div>
                          {getSeverityIcon(sev)}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  {filteredFindings.map((finding, index) => {
                    const isExpanded = expandedFinding === finding.id;
                    const canDelete = !!userId && finding.created_by === userId;
                    const findingPocs = pocs[finding.id] || [];
                    return (
                      <Card key={finding.id} className="animate-fade-in overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
                        <div className="p-4 cursor-pointer" onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                {getSeverityBadge(finding.severity)}
                                {finding.cvss_score && <span className="text-sm font-mono text-muted-foreground">CVSS {finding.cvss_score}</span>}
                                <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{project.name}</Badge>
                                {findingPocs.length > 0 && (
                                  <Badge variant="outline" className="text-xs"><ImageIcon className="h-3 w-3 mr-1" />{findingPocs.length} POC{findingPocs.length > 1 ? 's' : ''}</Badge>
                                )}
                              </div>
                              <h3 className="font-semibold mt-2">{finding.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{finding.description}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Badge variant={finding.status === 'Open' ? 'destructive' : 'secondary'}>{finding.status}</Badge>
                              {finding.retest_status && getRetestBadge(finding.retest_status)}
                              {canDelete && (
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(finding.id); }}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                              {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 animate-fade-in">
                            {finding.steps_to_reproduce && <div><h4 className="text-sm font-semibold text-primary mb-2">Steps to Reproduce</h4><pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-3 rounded-lg">{finding.steps_to_reproduce}</pre></div>}
                            {finding.impact && <div><h4 className="text-sm font-semibold text-primary mb-2">Impact</h4><p className="text-sm text-muted-foreground">{finding.impact}</p></div>}
                            {finding.remediation && <div><h4 className="text-sm font-semibold text-primary mb-2">Remediation</h4><pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-lg">{finding.remediation}</pre></div>}
                            {finding.affected_component && <div><h4 className="text-sm font-semibold text-primary mb-2">Affected Component</h4><Badge variant="secondary" className="font-mono text-xs">{finding.affected_component}</Badge></div>}
                            {finding.cwe_id && <div><h4 className="text-sm font-semibold text-primary mb-2">CWE</h4><Badge variant="outline" className="font-mono text-xs">{finding.cwe_id}</Badge></div>}

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-primary">Proof of Concept (POC)</h4>
                                <div>
                                  <input type="file" ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.png"
                                    onChange={(e) => handleFileUpload(e, uploadingFindingId || finding.id)} />
                                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setUploadingFindingId(finding.id); fileInputRef.current?.click(); }}>
                                    <Upload className="h-4 w-4 mr-1" />Upload POC
                                  </Button>
                                </div>
                              </div>
                              {findingPocs.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {findingPocs.map(poc => (
                                    <div key={poc.id} className="relative group">
                                      <img src={`${STATIC_BASE}${poc.file_path}`} alt={poc.file_name}
                                        className="rounded-lg border border-border/50 w-full h-32 object-cover cursor-pointer hover:opacity-80"
                                        onClick={(e) => { e.stopPropagation(); window.open(`${STATIC_BASE}${poc.file_path}`, '_blank'); }} />
                                      {!!userId && poc.uploaded_by === userId && (
                                        <button type="button" title="Delete POC"
                                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                          onClick={(e) => { e.stopPropagation(); handleDeletePoc(poc); }}>
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1 truncate">{poc.file_name}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-sm text-muted-foreground">No POC images uploaded yet.</p>}
                            </div>

                            <div className="pt-2 border-t border-border/50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-semibold text-primary mb-1">Retest Status</h4>
                                  <div className="flex items-center gap-2">
                                    {finding.retest_status ? (
                                      <>{getRetestBadge(finding.retest_status)}
                                        {finding.retest_date && <span className="text-xs text-muted-foreground ml-2">Last tested: {new Date(finding.retest_date).toLocaleDateString()}</span>}
                                        {finding.retested_by && <span className="text-xs text-muted-foreground">by {getUsername(finding.retested_by)}</span>}
                                      </>
                                    ) : <span className="text-sm text-muted-foreground">Not retested yet</span>}
                                  </div>
                                </div>
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Select value={finding.retest_status || ''} onValueChange={(v) => handleUpdateRetestStatus(finding.id, v as RetestStatus)}>
                                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Update status" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Open">Open</SelectItem>
                                      <SelectItem value="Fixed">Fixed</SelectItem>
                                      <SelectItem value="Not Fixed">Not Fixed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border/50">
                              <span>Reported by: {getUsername(finding.created_by)}</span>
                              <span>Created: {new Date(finding.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {filteredFindings.length === 0 && (
                  <Card className="p-12 text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No findings found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {findings.length === 0 ? 'Start documenting vulnerabilities found during the assessment' : 'Try adjusting your search or filter criteria'}
                    </p>
                  </Card>
                )}
              </TabsContent>

              {/* ── SAST FINDINGS ── */}
              <TabsContent value="sast" className="space-y-4 mt-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      SAST Findings
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Static Application Security Testing — code-level vulnerabilities</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <Upload className="h-4 w-4 mr-2" />Import SAST Results
                  </Button>
                </div>

                {/* Column headers — Aikido style */}
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-secondary/40 border-b border-border/50">
                    <div className="col-span-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">File</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Date</div>
                  </div>

                  {/* Empty state */}
                  <div className="px-4 py-16 text-center">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">No SAST results imported</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm mx-auto">
                      Import scanner output from Semgrep, Bandit, SonarQube, or any SARIF-compatible tool to see code-level findings here
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" disabled>
                      <Upload className="h-4 w-4 mr-2" />Import SAST Results
                    </Button>
                  </div>
                </div>

                {/* Supported scanners */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Supported scanners:</span>
                  {['Semgrep', 'Bandit', 'SonarQube', 'CodeQL', 'Checkmarx', 'Snyk Code'].map(tool => (
                    <span key={tool} className="text-xs px-2 py-0.5 rounded-full bg-secondary/60 border border-border/40 text-muted-foreground">
                      {tool}
                    </span>
                  ))}
                </div>
              </TabsContent>

              {/* ── ASM FINDINGS ── */}
              <TabsContent value="asm" className="space-y-4 mt-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      ASM Findings
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Attack Surface Management — exposed assets, open ports, services</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <Plus className="h-4 w-4 mr-2" />Connect ASM Tool
                  </Button>
                </div>

                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-secondary/40 border-b border-border/50">
                    <div className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset / Host</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Port / Service</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Detected</div>
                  </div>

                  <div className="px-4 py-16 text-center">
                    <Cpu className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">No ASM data connected</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm mx-auto">
                      Connect your Technieum ASM tool to automatically surface exposed assets, misconfigured services, and open ports for this target
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" disabled>
                      <Plus className="h-4 w-4 mr-2" />Connect ASM Tool
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Data sources:</span>
                  {['Technieum ASM', 'Shodan', 'Censys', 'Nmap', 'Subfinder', 'Nuclei'].map(tool => (
                    <span key={tool} className="text-xs px-2 py-0.5 rounded-full bg-secondary/60 border border-border/40 text-muted-foreground">
                      {tool}
                    </span>
                  ))}
                </div>
              </TabsContent>

              {/* ── LLM / AI FINDINGS ── */}
              <TabsContent value="llm" className="space-y-4 mt-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      LLM / AI Findings
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">AI-specific vulnerabilities — prompt injection, model abuse, data exfiltration</p>
                  </div>
                  <Button variant="default" className="gradient-technieum" size="sm" onClick={() => setAddFindingOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Add LLM Finding
                  </Button>
                </div>

                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-secondary/40 border-b border-border/50">
                    <div className="col-span-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</div>
                    <div className="col-span-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Date</div>
                  </div>

                  <div className="px-4 py-16 text-center">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">No LLM findings yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm mx-auto">
                      Document AI/LLM-specific vulnerabilities found during the assessment — prompt injection, jailbreaks, data leakage, excessive agency, and more
                    </p>
                    <Button variant="default" className="gradient-technieum mt-4" size="sm" onClick={() => setAddFindingOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />Add LLM Finding
                    </Button>
                  </div>
                </div>

                {/* LLM vuln category tags */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Common categories:</span>
                  {[
                    'Prompt Injection', 'Jailbreak', 'Data Exfiltration',
                    'Excessive Agency', 'Model Inversion', 'Supply Chain',
                    'Insecure Output', 'RAG Poisoning',
                  ].map(cat => (
                    <span key={cat} className="text-xs px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20 text-primary/70">
                      {cat}
                    </span>
                  ))}
                </div>
              </TabsContent>

            </Tabs>
          </TabsContent>

          {/* ── TEAM ── */}
          <TabsContent value="team" className="space-y-4">
            {assignees.length === 0 ? (
              <Card className="p-12 text-center"><p className="text-lg font-medium">No team members assigned</p><p className="text-sm text-muted-foreground mt-1">Assign testers from the Projects page</p></Card>
            ) : (
              <>
                <p className="text-muted-foreground">{assignees.length} member{assignees.length !== 1 ? 's' : ''} assigned</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignees.map((member) => {
                    const resolvedName = allUsers[String(member.user_id)] || member.username || '';
                    const sn = String(resolvedName).replace(/<[^>]*>/g, '').trim() || 'Unknown';
                    return (
                      <Card key={member.id} glow>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full gradient-technieum flex items-center justify-center text-primary-foreground font-semibold text-lg">
                              {sn.charAt(0).toUpperCase()}
                            </div>
                            <div><p className="font-medium">{sn}</p><Badge variant="secondary" className="mt-1">Tester</Badge></div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── REPORTS ── */}
          {(role === 'admin' || role === 'manager') && (
            <TabsContent value="reports" className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pentest Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card glow>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Technical Report</CardTitle><CardDescription>Detailed technical findings with steps to reproduce</CardDescription></CardHeader>
                    <CardContent><Button variant="outline" className="w-full" onClick={handleGenerateTechnicalReport}><Download className="h-4 w-4 mr-2" />Generate Technical Report</Button></CardContent>
                  </Card>
                  <Card glow>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Management Report</CardTitle><CardDescription>Executive summary for non-technical stakeholders</CardDescription></CardHeader>
                    <CardContent><Button variant="outline" className="w-full" onClick={handleGenerateManagementReport}><Download className="h-4 w-4 mr-2" />Generate Management Report</Button></CardContent>
                  </Card>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Remediation</h3>
                <Card glow>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" />Retest Report</CardTitle><CardDescription>Summary of remediation progress</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Fixed:</span><Badge variant="outline" className="bg-green-500/10 text-green-600">{findings.filter(f => f.retest_status === 'Fixed').length}</Badge></div>
                      <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Not Fixed:</span><Badge variant="destructive">{findings.filter(f => f.retest_status === 'Not Fixed').length}</Badge></div>
                      <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Open:</span><Badge variant="secondary">{findings.filter(f => !f.retest_status || f.retest_status === 'Open').length}</Badge></div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleGenerateRetestReport}><Download className="h-4 w-4 mr-2" />Generate Retest Report</Button>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Code Analysis</h3>
                <Card glow>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />SAST Report</CardTitle><CardDescription>Static Application Security Testing — code-level vulnerability report</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <Shield className="h-8 w-8 text-muted-foreground/50" />
                      <div><p className="text-sm font-medium">No SAST results imported</p><p className="text-xs text-muted-foreground mt-0.5">Import scanner output (Semgrep, Bandit, SonarQube, etc.) to generate a SAST report</p></div>
                    </div>
                    <Button variant="outline" className="w-full" disabled><Upload className="h-4 w-4 mr-2" />Import SAST Results</Button>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Attack Surface</h3>
                <Card glow>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" />ASM Report</CardTitle><CardDescription>Attack Surface Management — exposed assets, open ports, and service enumeration</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <Cpu className="h-8 w-8 text-muted-foreground/50" />
                      <div><p className="text-sm font-medium">No ASM data connected</p><p className="text-xs text-muted-foreground mt-0.5">Connect your ASM tool to enumerate exposed assets and auto-generate a surface report</p></div>
                    </div>
                    <Button variant="outline" className="w-full" disabled><Plus className="h-4 w-4 mr-2" />Connect ASM Tool</Button>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Security</h3>
                <Card glow>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />LLM Security Report</CardTitle><CardDescription>AI/LLM-specific vulnerability assessment — prompt injection, model abuse, data exfiltration</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <Brain className="h-8 w-8 text-muted-foreground/50" />
                      <div><p className="text-sm font-medium">No LLM assessment data</p><p className="text-xs text-muted-foreground mt-0.5">Complete the AI/LLM checklist and add LLM-specific findings to generate this report</p></div>
                    </div>
                    <Button variant="outline" className="w-full" disabled><Download className="h-4 w-4 mr-2" />Generate LLM Report</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ── CHECKLIST ── */}
          <TabsContent value="checklist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  {checklistTitles[activeChecklistTab].title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{checklistTitles[activeChecklistTab].subtitle}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg w-fit flex-wrap">
                  {checklistTabs.map(({ type, label, icon }) => {
                    const prog = clProgress[type] || {};
                    const data = checklistTabs.find(t => t.type === type)!.data;
                    const total = data.reduce((s: number, sec: any) => s + sec.items.length, 0);
                    const done = data.reduce((s: number, sec: any) => s + sec.items.filter((i: string) => prog[`${sec.category}::${i}`]).length, 0);
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    const isActive = activeChecklistTab === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setActiveChecklistTab(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        {icon}{label}
                        {pct > 0 && (
                          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                            {pct}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {checklistTabs.map(({ type, data }) =>
                  activeChecklistTab === type ? <div key={type}>{renderChecklistContent(type, data)}</div> : null
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ARCHITECTURE ── */}
          <TabsContent value="architecture" className="space-y-6">
 
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  Application Architecture
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Document the target's architecture — add components to auto-generate a map, or upload an existing diagram
                </p>
              </div>
              {/* Mode switcher */}
              <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg">
                <button
                  onClick={() => setArchMode('builder')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    archMode === 'builder'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Component Builder
                </button>
                <button
                  onClick={() => setArchMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    archMode === 'upload'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Diagram
                </button>
              </div>
            </div>
 
            {/* ── COMPONENT BUILDER MODE ── */}
            {archMode === 'builder' && (
              <div className="space-y-4">
 
                {/* Component type legend */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Component types:</span>
                  {([
                    { type: 'frontend',     label: 'Frontend',      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    icon: '🖥️'  },
                    { type: 'api',          label: 'API',           color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '🔌'  },
                    { type: 'server',       label: 'Server',        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '⚙️' },
                    { type: 'database',     label: 'Database',      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🗄️' },
                    { type: 'cloud',        label: 'Cloud',         color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',       icon: '☁️'  },
                    { type: 'firewall',     label: 'Firewall',      color: 'bg-red-500/20 text-red-400 border-red-500/30',       icon: '🔥'  },
                    { type: 'loadbalancer', label: 'Load Balancer', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⚖️' },
                    { type: 'mobile',       label: 'Mobile',        color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',    icon: '📱'  },
                    { type: 'external',     label: 'External',      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',    icon: '🌐'  },
                  ] as const).map(({ type, label, color, icon }) => (
                    <span key={type} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
                      {icon} {label}
                    </span>
                  ))}
                </div>
 
                {/* Add component button */}
                {!addingComponent && (
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors"
                    onClick={() => setAddingComponent(true)}
                  >
                    <Plus className="h-4 w-4 mr-2 text-primary" />
                    Add Component
                  </Button>
                )}
 
                {/* Add component form */}
                {addingComponent && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-primary">New Component</p>
                        <button onClick={() => { setAddingComponent(false); setNewComp({ name: '', type: 'server', ip: '', port: '', tech: '', notes: '' }); }}>
                          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Name *</Label>
                          <Input
                            placeholder="e.g., React Frontend"
                            className="h-8 text-sm bg-background"
                            value={newComp.name}
                            onChange={e => setNewComp(p => ({ ...p, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type *</Label>
                          <Select value={newComp.type} onValueChange={v => setNewComp(p => ({ ...p, type: v as any }))}>
                            <SelectTrigger className="h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="frontend">🖥️ Frontend</SelectItem>
                              <SelectItem value="api">🔌 API</SelectItem>
                              <SelectItem value="server">⚙️ Server</SelectItem>
                              <SelectItem value="database">🗄️ Database</SelectItem>
                              <SelectItem value="cloud">☁️ Cloud</SelectItem>
                              <SelectItem value="firewall">🔥 Firewall</SelectItem>
                              <SelectItem value="loadbalancer">⚖️ Load Balancer</SelectItem>
                              <SelectItem value="mobile">📱 Mobile</SelectItem>
                              <SelectItem value="external">🌐 External</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">IP / Hostname</Label>
                          <Input placeholder="e.g., 192.168.1.10" className="h-8 text-sm bg-background font-mono"
                            value={newComp.ip} onChange={e => setNewComp(p => ({ ...p, ip: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Port(s)</Label>
                          <Input placeholder="e.g., 80, 443, 8080" className="h-8 text-sm bg-background font-mono"
                            value={newComp.port} onChange={e => setNewComp(p => ({ ...p, port: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Technology</Label>
                          <Input placeholder="e.g., React, Node.js, MySQL" className="h-8 text-sm bg-background"
                            value={newComp.tech} onChange={e => setNewComp(p => ({ ...p, tech: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Notes</Label>
                          <Input placeholder="Any relevant notes" className="h-8 text-sm bg-background"
                            value={newComp.notes} onChange={e => setNewComp(p => ({ ...p, notes: e.target.value }))} />
                        </div>
                      </div>
                      {/* Connect to existing */}
                      {archComponents.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs">Connects to (optional)</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {archComponents.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setNewComp(p => ({
                                    ...p,
                                    // store connections temporarily in notes — handled on save
                                  }));
                                }}
                                className="text-xs px-2 py-1 rounded-full border border-border/50 bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                              >
                                {c.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="ghost" size="sm" onClick={() => { setAddingComponent(false); setNewComp({ name: '', type: 'server', ip: '', port: '', tech: '', notes: '' }); }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="gradient-technieum"
                          onClick={() => {
                            if (!newComp.name.trim()) { toast.error('Component name is required'); return; }
                            const comp: ArchComponent = {
                              id: crypto.randomUUID(),
                              ...newComp,
                              connections: [],
                            };
                            setArchComponents(prev => [...prev, comp]);
                            setNewComp({ name: '', type: 'server', ip: '', port: '', tech: '', notes: '' });
                            setAddingComponent(false);
                            toast.success('Component added');
                          }}
                        >
                          Add Component
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
 
                {/* Component list + auto-generated diagram */}
                {archComponents.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 
                    {/* Left: Component list */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Components ({archComponents.length})
                      </p>
                      {archComponents.map(comp => {
                        const typeStyles: Record<string, string> = {
                          frontend:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          api:          'bg-green-500/10 text-green-400 border-green-500/20',
                          server:       'bg-orange-500/10 text-orange-400 border-orange-500/20',
                          database:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
                          cloud:        'bg-sky-500/10 text-sky-400 border-sky-500/20',
                          firewall:     'bg-red-500/10 text-red-400 border-red-500/20',
                          loadbalancer: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                          mobile:       'bg-pink-500/10 text-pink-400 border-pink-500/20',
                          external:     'bg-gray-500/10 text-gray-400 border-gray-500/20',
                        };
                        const typeIcons: Record<string, string> = {
                          frontend: '🖥️', api: '🔌', server: '⚙️', database: '🗄️',
                          cloud: '☁️', firewall: '🔥', loadbalancer: '⚖️', mobile: '📱', external: '🌐',
                        };
                        return (
                          <Card key={comp.id} className="group">
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <span className={`mt-0.5 shrink-0 text-xs px-2 py-1 rounded-full border font-medium ${typeStyles[comp.type]}`}>
                                    {typeIcons[comp.type]} {comp.type}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{comp.name}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                      {comp.ip   && <span className="text-xs font-mono text-muted-foreground">{comp.ip}</span>}
                                      {comp.port && <span className="text-xs font-mono text-muted-foreground">:{comp.port}</span>}
                                      {comp.tech && <span className="text-xs text-muted-foreground">{comp.tech}</span>}
                                    </div>
                                    {comp.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{comp.notes}</p>}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setArchComponents(prev => prev.filter(c => c.id !== comp.id));
                                    toast.success('Component removed');
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive/60 hover:text-destructive" />
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
 
                    {/* Right: Auto-generated visual map */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Architecture Map
                      </p>
                      <Card className="border-border/50 bg-secondary/10 overflow-hidden">
                        <CardContent className="p-4">
                          {/* Visual grid diagram */}
                          <div className="relative min-h-64 flex flex-col items-center gap-3 py-4">
                            {/* Group by type layers */}
                            {(['firewall', 'loadbalancer', 'frontend', 'mobile', 'api', 'server', 'database', 'cloud', 'external'] as const)
                              .map(layer => {
                                const comps = archComponents.filter(c => c.type === layer);
                                if (comps.length === 0) return null;
                                const layerColors: Record<string, string> = {
                                  firewall: 'border-red-500/40 bg-red-500/5',
                                  loadbalancer: 'border-yellow-500/40 bg-yellow-500/5',
                                  frontend: 'border-blue-500/40 bg-blue-500/5',
                                  mobile: 'border-pink-500/40 bg-pink-500/5',
                                  api: 'border-green-500/40 bg-green-500/5',
                                  server: 'border-orange-500/40 bg-orange-500/5',
                                  database: 'border-purple-500/40 bg-purple-500/5',
                                  cloud: 'border-sky-500/40 bg-sky-500/5',
                                  external: 'border-gray-500/40 bg-gray-500/5',
                                };
                                const layerTextColors: Record<string, string> = {
                                  firewall: 'text-red-400', loadbalancer: 'text-yellow-400',
                                  frontend: 'text-blue-400', mobile: 'text-pink-400',
                                  api: 'text-green-400', server: 'text-orange-400',
                                  database: 'text-purple-400', cloud: 'text-sky-400',
                                  external: 'text-gray-400',
                                };
                                const icons: Record<string, string> = {
                                  frontend: '🖥️', api: '🔌', server: '⚙️', database: '🗄️',
                                  cloud: '☁️', firewall: '🔥', loadbalancer: '⚖️', mobile: '📱', external: '🌐',
                                };
                                return (
                                  <div key={layer} className="w-full">
                                    {/* Arrow connector (except first layer) */}
                                    <div className="flex justify-center mb-2">
                                      <div className="flex flex-col items-center gap-0.5">
                                        <div className="w-px h-4 bg-border/60" />
                                        <div className="w-2 h-2 border-r border-b border-border/60 rotate-45 -mt-1.5" />
                                      </div>
                                    </div>
                                    <div className={`rounded-lg border ${layerColors[layer]} p-3`}>
                                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${layerTextColors[layer]}`}>
                                        {icons[layer]} {layer}
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {comps.map(c => (
                                          <div key={c.id} className={`px-3 py-1.5 rounded-md border ${layerColors[layer]} text-center min-w-20`}>
                                            <p className="text-xs font-semibold truncate max-w-28">{c.name}</p>
                                            {c.ip && <p className="text-xs font-mono text-muted-foreground/70 truncate">{c.ip}</p>}
                                            {c.tech && <p className="text-xs text-muted-foreground/60 truncate">{c.tech}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                              .filter(Boolean)
                            }
                          </div>
                        </CardContent>
                      </Card>
 
                      {/* Export hint */}
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Architecture map auto-updates as you add components
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Empty state for builder */
                  <Card className="border-dashed border-border/40">
                    <CardContent className="py-16 text-center">
                      <div className="relative w-20 h-20 mx-auto mb-4">
                        {/* Mini diagram preview */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-6 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                          <span className="text-xs">🖥️</span>
                        </div>
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-4 bg-border/50" />
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-10 h-6 rounded bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                          <span className="text-xs">🔌</span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-10 h-6 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-xs">🗄️</span>
                        </div>
                        <div className="absolute bottom-0 right-0 w-10 h-6 rounded bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                          <span className="text-xs">⚙️</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold mt-2">No components yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                        Add servers, databases, APIs, firewalls and more — an architecture map will generate automatically
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => setAddingComponent(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />Add First Component
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
 
            {/* ── UPLOAD MODE ── */}
            {archMode === 'upload' && (
              <div className="space-y-4">
                {/* Upload drop zone */}
                <input
                  ref={archFileRef}
                  type="file"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.svg,.pdf"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files ?? []);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onload = ev => {
                        setArchUploads(prev => [...prev, {
                          name: file.name,
                          preview: ev.target?.result as string,
                          notes: '',
                        }]);
                      };
                      reader.readAsDataURL(file);
                    });
                    if (archFileRef.current) archFileRef.current.value = '';
                  }}
                />
 
                {archUploads.length === 0 ? (
                  <div
                    className="border-2 border-dashed border-border/40 rounded-xl p-16 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    onClick={() => archFileRef.current?.click()}
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-secondary/60 border border-border/50 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                      <Upload className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-semibold">Upload Architecture Diagram</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, SVG or PDF — Visio exports, draw.io, Lucidchart, screenshots
                    </p>
                    <Button variant="outline" size="sm" className="mt-4 pointer-events-none">
                      Choose Files
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {archUploads.map((upload, idx) => (
                      <Card key={idx} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="relative group">
                            <img
                              src={upload.preview}
                              alt={upload.name}
                              className="w-full max-h-96 object-contain bg-secondary/20"
                            />
                            <button
                              onClick={() => setArchUploads(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-3 right-3 h-7 w-7 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="p-4 border-t border-border/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{upload.name}</p>
                            </div>
                            <Textarea
                              placeholder="Add notes about this diagram — scope boundaries, trust zones, data flows..."
                              className="text-xs resize-none bg-secondary/30"
                              rows={2}
                              value={upload.notes}
                              onChange={e => setArchUploads(prev => prev.map((u, i) => i === idx ? { ...u, notes: e.target.value } : u))}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
 
                    {/* Add more */}
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => archFileRef.current?.click()}
                    >
                      <Plus className="h-4 w-4 mr-2" />Add Another Diagram
                    </Button>
                  </div>
                )}
 
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Supported formats:</span>
                  {['PNG', 'JPG', 'SVG', 'PDF', 'draw.io export', 'Visio export', 'Lucidchart'].map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-secondary/60 border border-border/40 text-muted-foreground">{f}</span>
                  ))}
                </div>
              </div>
            )}
 
          </TabsContent>

        </Tabs>
      </div>

      {/* ── Add Finding Dialog ── */}
      <Dialog open={addFindingOpen} onOpenChange={(open) => { setAddFindingOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Finding</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitFinding} className="space-y-4 mt-4">
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
                <Input placeholder="e.g., 9.8" type="number" step="0.1" min="0" max="10" value={formData.cvssScore} onChange={(e) => setFormData({ ...formData, cvssScore: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="Finding title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Affected Component</Label>
                <Input placeholder="e.g., /api/users" value={formData.affectedComponent} onChange={(e) => setFormData({ ...formData, affectedComponent: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CWE ID</Label>
                <Input placeholder="e.g., CWE-79" value={formData.cweId} onChange={(e) => setFormData({ ...formData, cweId: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea placeholder="Detailed description of the vulnerability" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Steps to Reproduce</Label>
              <Textarea placeholder="Step-by-step instructions to reproduce" rows={4} value={formData.stepsToReproduce} onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Impact</Label>
              <Textarea placeholder="Potential impact of this vulnerability" rows={2} value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Remediation</Label>
              <Textarea placeholder="Recommended remediation steps" rows={3} value={formData.remediation} onChange={(e) => setFormData({ ...formData, remediation: e.target.value })} />
            </div>
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
                <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => formPocInputRef.current?.click()}>
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload POC screenshots</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <DialogClose asChild><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button></DialogClose>
              <Button type="submit" className="gradient-technieum">Submit Finding</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deletingFindingId} onOpenChange={(open) => !open && setDeletingFindingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-destructive" />Delete Finding</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this finding? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeletingFindingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <FindingDetailDialog
        finding={selectedFinding as any}
        open={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedFinding(null); }}
        creatorName={selectedFinding ? getUsername(selectedFinding.created_by) : undefined}
      />
    </DashboardLayout>
  );
}