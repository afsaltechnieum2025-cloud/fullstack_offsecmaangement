import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Trash2,
  Upload,
  Image as ImageIcon,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
type RetestStatus = 'Open' | 'Fixed' | 'Not Fixed';

interface Finding {
  id: string;
  project_id: string;
  title: string;
  severity: Severity;
  description: string | null;
  impact: string | null;
  remediation: string | null;
  steps_to_reproduce: string | null;
  affected_component: string | null;
  cvss_score: number | null;
  cwe_id: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  retest_status: string | null;
  retest_date: string | null;
  retest_notes: string | null;
  retested_by: string | null;
}

interface FindingPoc {
  id: string;
  finding_id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
  blob_data?: string; // For storing blob URLs
}

interface Project {
  id: string;
  name: string;
  client: string;
}

interface Assignee {
  id: string;
  user_id: string;
  username: string;
}

// ─── API base URL ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const STATIC_BASE = API_BASE.replace(/\/api$/, '');

// ─── Component ────────────────────────────────────────────────────────────────

export default function Findings() {
  const { user, role } = useAuth();
  const userId = (user?.id ?? '') as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  const [findings, setFindings] = useState<Finding[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assigneeMap, setAssigneeMap] = useState<Record<string, Assignee[]>>({});
  const [pocs, setPocs] = useState<Record<string, FindingPoc[]>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFindingId, setDeletingFindingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFindingId, setUploadingFindingId] = useState<string | null>(null);

  const formPocInputRef = useRef<HTMLInputElement>(null);
  const [pendingPocs, setPendingPocs] = useState<{ file: File; preview: string }[]>([]);

  const [formData, setFormData] = useState({
    projectId: '',
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

  // ─── Auth header ─────────────────────────────────────────────────────────────

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const authHeadersNoContent = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ─── Helper to convert file to blob URL ─────────────────────────────────────
  const fileToBlobUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const projectsRes = await fetch(`${API_BASE}/projects`, {
        headers: authHeaders(),
      });
      const projectsData: Project[] = projectsRes.ok ? await projectsRes.json() : [];
      setProjects(projectsData);

      let allFindings: Finding[] = [];

      if (projectsData.length > 0) {
        const findingFetches = projectsData.map(p =>
          fetch(`${API_BASE}/findings?project_id=${p.id}`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : [])
        );
        const results = await Promise.all(findingFetches);
        allFindings = results.flat();
      }

      const severityOrder: Record<string, number> = {
        critical: 0, high: 1, medium: 2, low: 3, informational: 4,
      };
      allFindings.sort(
        (a, b) =>
          (severityOrder[a.severity.toLowerCase()] ?? 5) -
          (severityOrder[b.severity.toLowerCase()] ?? 5)
      );
      setFindings(allFindings);

      if (projectsData.length > 0) {
        const assigneeFetches = projectsData.map(p =>
          fetch(`${API_BASE}/projects/${p.id}/assignments`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : [])
            .then((rows: Assignee[]) => ({ projectId: p.id, rows }))
        );
        const assigneeResults = await Promise.all(assigneeFetches);
        const map: Record<string, Assignee[]> = {};
        assigneeResults.forEach(({ projectId, rows }) => {
          map[projectId] = rows;
        });
        setAssigneeMap(map);
      }

      if (allFindings.length > 0) {
        const pocFetches = allFindings.map(f =>
          fetch(`${API_BASE}/findings/${f.id}/pocs`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : [])
            .then(async (rows: FindingPoc[]) => {
              // Convert each POC to blob URL
              const enhancedRows = await Promise.all(
                rows.map(async (poc) => {
                  try {
                    const response = await fetch(`${STATIC_BASE}${poc.file_path}`);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    return { ...poc, blob_data: blobUrl };
                  } catch (error) {
                    console.error('Error loading POC blob:', error);
                    return poc;
                  }
                })
              );
              return { findingId: f.id, rows: enhancedRows };
            })
        );
        const pocResults = await Promise.all(pocFetches);
        const pocMap: Record<string, FindingPoc[]> = {};
        pocResults.forEach(({ findingId, rows }) => {
          pocMap[findingId] = rows;
        });
        setPocs(pocMap);
      }
    } catch (error) {
      console.error('Error fetching findings data:', error);
      toast.error('Failed to load findings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      // Cleanup blob URLs
      Object.values(pocs).forEach(pocList => {
        pocList.forEach(poc => {
          if (poc.blob_data) {
            URL.revokeObjectURL(poc.blob_data);
          }
        });
      });
    };
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const getUsername = (uid: string) => {
    for (const assignees of Object.values(assigneeMap)) {
      const match = assignees.find(a => a.user_id === uid);
      if (match) return match.username;
    }
    return uid;
  };

  const getProjectName = (projectId: string) =>
    projects.find(p => p.id === projectId)?.name ?? 'Unknown Project';

  const resetForm = () => {
    setFormData({
      projectId: '',
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
    pendingPocs.forEach(p => URL.revokeObjectURL(p.preview));
    setPendingPocs([]);
  };

  const normalizeSeverity = (s: string): Severity => {
    const map: Record<string, Severity> = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      informational: 'Informational',
      info: 'Informational',
    };
    return map[s.toLowerCase()] ?? 'Informational';
  };

  // Simplified color scheme - only primary and critical red
  const SEVERITY_STYLES: Record<Severity, { bg: string; text: string; border: string }> = {
    Critical: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
    High: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
    Medium: { bg: 'bg-primary/8', text: 'text-primary', border: 'border-primary/25' },
    Low: { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/20' },
    Informational: { bg: 'bg-primary/3', text: 'text-primary/80', border: 'border-primary/15' },
  };

  const getSeverityBadge = (severity: string) => {
    const normalized = normalizeSeverity(severity);
    const { bg, text, border } = SEVERITY_STYLES[normalized];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg} ${text} ${border}`}>
        {normalized}
      </span>
    );
  };

  const getSeverityIcon = (severity: string) => {
    const normalized = normalizeSeverity(severity);
    return (
      <AlertTriangle className={`h-5 w-5 ${normalized === 'Critical' ? 'text-red-500' : 'text-primary'}`} />
    );
  };

  const getRetestBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, string> = {
      Open: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
      Fixed: 'bg-primary/10 text-primary border-primary/30',
      'Not Fixed': 'bg-primary/8 text-primary border-primary/25',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${variants[status]}`}>
        <RefreshCw className="h-3 w-3 mr-1" />
        {status}
      </span>
    );
  };

  // ─── Add Finding ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId || !formData.severity || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/findings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          project_id: formData.projectId,
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          steps_to_reproduce: formData.stepsToReproduce || null,
          impact: formData.impact || null,
          remediation: formData.remediation || null,
          affected_component: formData.affectedComponent || null,
          cvss_score: formData.cvssScore ? parseFloat(formData.cvssScore) : null,
          cwe_id: formData.cweId || null,
          created_by: userId,
        }),
      });

      if (!res.ok) {
        let errMsg = res.statusText;
        try { const err = await res.clone().json(); errMsg = err.message ?? errMsg; } catch (_) {}
        toast.error(`Failed to add finding (${res.status}): ${errMsg}`);
        return;
      }

      const newFinding: Finding = await res.json();

      const uploadedPocs: FindingPoc[] = [];
      if (pendingPocs.length > 0) {
        for (const { file } of pendingPocs) {
          const formPayload = new FormData();
          formPayload.append('file', file);
          formPayload.append('uploaded_by', userId);
          try {
            const pocRes = await fetch(`${API_BASE}/findings/${newFinding.id}/pocs`, {
              method: 'POST',
              headers: authHeadersNoContent(),
              body: formPayload,
            });
            if (pocRes.ok) {
              const poc: FindingPoc = await pocRes.json();
              // Create blob URL for the new POC
              const blobUrl = URL.createObjectURL(file);
              uploadedPocs.push({ ...poc, blob_data: blobUrl });
            }
          } catch (_) { /* skip failed POC uploads silently */ }
        }
      }

      setFindings(prev => [newFinding, ...prev]);
      setPocs(prev => ({ ...prev, [newFinding.id]: uploadedPocs }));
      toast.success(`Finding added${uploadedPocs.length > 0 ? ` with ${uploadedPocs.length} POC(s)` : ''}!`);
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error adding finding:', error);
      toast.error('Failed to add finding');
    }
  };

  // ─── Stage POC files in the Add Finding form ──────────────────────────────────

  const handleFormPocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    const valid = files.filter(f => allowed.includes(f.type));
    if (valid.length !== files.length) toast.error('Only JPEG and PNG files are allowed');
    
    const newPocs = await Promise.all(
      valid.map(async file => ({ file, preview: await fileToBlobUrl(file) }))
    );
    setPendingPocs(prev => [...prev, ...newPocs]);
    if (formPocInputRef.current) formPocInputRef.current.value = '';
  };

  const removePendingPoc = (index: number) => {
    setPendingPocs(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ─── Delete Finding ───────────────────────────────────────────────────────────

  const handleDelete = (findingId: string) => {
    const finding = findings.find(f => f.id === findingId);
    if (!finding || !userId || finding.created_by !== userId) {
      toast.error('You can only delete your own findings');
      return;
    }
    setDeletingFindingId(findingId);
  };

  const confirmDelete = async () => {
    if (!deletingFindingId) return;
    try {
      const res = await fetch(`${API_BASE}/findings/${deletingFindingId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error('Failed to delete: ' + (err.message ?? res.statusText));
        return;
      }
      
      // Cleanup blob URLs for this finding
      const findingPocs = pocs[deletingFindingId];
      if (findingPocs) {
        findingPocs.forEach(poc => {
          if (poc.blob_data) URL.revokeObjectURL(poc.blob_data);
        });
      }
      
      setFindings(prev => prev.filter(f => f.id !== deletingFindingId));
      toast.success('Finding deleted');
    } catch (error) {
      console.error('Error deleting finding:', error);
      toast.error('Failed to delete finding');
    } finally {
      setDeletingFindingId(null);
    }
  };

  // ─── Upload POC ───────────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, findingId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, JPG, and PNG files are allowed');
      return;
    }

    try {
      const formPayload = new FormData();
      formPayload.append('file', file);
      formPayload.append('uploaded_by', userId);

      const res = await fetch(`${API_BASE}/findings/${findingId}/pocs`, {
        method: 'POST',
        headers: authHeadersNoContent(),
        body: formPayload,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error('Upload failed: ' + (err.message ?? res.statusText));
        return;
      }

      const newPoc: FindingPoc = await res.json();
      // Create blob URL for the uploaded image
      const blobUrl = URL.createObjectURL(file);
      const enhancedPoc = { ...newPoc, blob_data: blobUrl };
      
      setPocs(prev => ({
        ...prev,
        [findingId]: [...(prev[findingId] || []), enhancedPoc],
      }));
      toast.success('POC uploaded successfully!');
    } catch (error) {
      console.error('Error uploading POC:', error);
      toast.error('Failed to upload POC');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadingFindingId(null);
    }
  };

  // ─── Delete POC ───────────────────────────────────────────────────────────────

  const handleDeletePoc = async (poc: FindingPoc) => {
    if (!userId || poc.uploaded_by !== userId) {
      toast.error('You can only delete your own POCs');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/findings/${poc.finding_id}/pocs/${poc.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error('Failed to delete POC: ' + (err.message ?? res.statusText));
        return;
      }
      
      // Revoke blob URL if it exists
      if (poc.blob_data) {
        URL.revokeObjectURL(poc.blob_data);
      }
      
      setPocs(prev => ({
        ...prev,
        [poc.finding_id]: prev[poc.finding_id]?.filter(p => p.id !== poc.id) || [],
      }));
      toast.success('POC deleted');
    } catch (error) {
      console.error('Error deleting POC:', error);
      toast.error('Failed to delete POC');
    }
  };

  // ─── Update Retest Status ─────────────────────────────────────────────────────

  const handleUpdateRetestStatus = async (findingId: string, status: RetestStatus) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/findings/${findingId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          retest_status: status,
          retest_date: new Date().toISOString(),
          retested_by: userId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error('Failed to update retest status: ' + (err.message ?? res.statusText));
        return;
      }

      const updated: Finding = await res.json();
      setFindings(prev => prev.map(f => f.id === findingId ? updated : f));
      toast.success(`Retest status updated to "${status}"`);
    } catch (error) {
      console.error('Error updating retest status:', error);
      toast.error('Failed to update retest status');
    }
  };

  // ─── Filtered list ────────────────────────────────────────────────────────────

  const filteredFindings = findings.filter(finding => {
    const matchesSearch =
      finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (finding.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesSeverity = severityFilter === 'all' || normalizeSeverity(finding.severity) === severityFilter;
    const matchesProject = projectFilter === 'all' || finding.project_id === projectFilter;
    return matchesSearch && matchesSeverity && matchesProject;
  });

  // ─── Render guards ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <DashboardLayout title="Findings" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Findings" description="View and manage all vulnerability findings">
      <div className="space-y-6">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search findings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Informational">Informational</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-secondary/50">
              <SelectValue placeholder="Filter by Project" />
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)] w-full">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="truncate max-w-full">
                  <span className="truncate block max-w-[calc(100vw-4rem)]">{p.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gradient-technieum shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Add Finding
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Finding</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select
                      value={formData.projectId}
                      onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity *</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value) => setFormData({ ...formData, severity: value as Severity })}
                    >
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="Finding title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
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

                {/* POC Upload in form */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Proof of Concept (POC)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => formPocInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Add Images
                    </Button>
                    <input
                      ref={formPocInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                      onChange={handleFormPocSelect}
                    />
                  </div>
                  {pendingPocs.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {pendingPocs.map((poc, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={poc.preview}
                            alt={poc.file.name}
                            className="rounded-lg border border-border/50 w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePendingPoc(idx)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{poc.file.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => formPocInputRef.current?.click()}
                    >
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
        </div>

        {/* Stats - Simplified with primary colors */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map(severity => {
            const count = findings.filter(f =>
              normalizeSeverity(f.severity) === severity
            ).length;
            const { bg, text, border } = SEVERITY_STYLES[severity];
            return (
              <Card key={severity} className={`p-4 border ${border} ${bg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-bold ${text}`}>{count}</p>
                    <p className="text-xs text-muted-foreground">{severity}</p>
                  </div>
                  {getSeverityIcon(severity)}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Findings List */}
        <div className="space-y-3">
          {filteredFindings.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No findings found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click the "Add Finding" button to create your first finding
              </p>
            </Card>
          ) : (
            filteredFindings.map((finding, index) => {
              const isExpanded = expandedFinding === finding.id;
              const canDelete = !!userId && finding.created_by === userId;
              const findingPocs = pocs[finding.id] || [];

              return (
                <Card
                  key={finding.id}
                  className="animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            {getSeverityBadge(finding.severity)}
                            {finding.cvss_score && (
                              <span className="text-sm font-mono text-muted-foreground">
                                CVSS {finding.cvss_score}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                              {getProjectName(finding.project_id)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs max-w-[120px] sm:hidden block">
                              <span className="truncate block">{getProjectName(finding.project_id)}</span>
                            </Badge>
                            {findingPocs.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                {findingPocs.length} POC{findingPocs.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold mt-2">{finding.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {finding.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={finding.status === 'Open' ? 'destructive' : 'secondary'}>
                          {finding.status}
                        </Badge>
                        {finding.retest_status && getRetestBadge(finding.retest_status)}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDelete(finding.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        {isExpanded
                          ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          : <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        }
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 animate-fade-in">
                      {finding.steps_to_reproduce && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2">Steps to Reproduce</h4>
                          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-3 rounded-lg">
                            {finding.steps_to_reproduce}
                          </pre>
                        </div>
                      )}
                      {finding.impact && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2">Impact</h4>
                          <p className="text-sm text-muted-foreground">{finding.impact}</p>
                        </div>
                      )}
                      {finding.remediation && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2">Remediation</h4>
                          <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-lg">
                            {finding.remediation}
                          </pre>
                        </div>
                      )}
                      {finding.affected_component && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2">Affected Component</h4>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {finding.affected_component}
                          </Badge>
                        </div>
                      )}
                      {finding.cwe_id && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2">CWE</h4>
                          <Badge variant="outline" className="font-mono text-xs">{finding.cwe_id}</Badge>
                        </div>
                      )}

                      {/* POC Images with Blob URLs */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-primary">Proof of Concept (POC)</h4>
                          <div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              accept=".jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, uploadingFindingId || finding.id)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadingFindingId(finding.id);
                                fileInputRef.current?.click();
                              }}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Upload POC
                            </Button>
                          </div>
                        </div>
                        {findingPocs.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {findingPocs.map(poc => (
                              <div key={poc.id} className="relative group">
                                <img
                                  src={poc.blob_data || `${STATIC_BASE}${poc.file_path}`}
                                  alt={poc.file_name}
                                  className="rounded-lg border border-border/50 w-full h-32 object-cover cursor-pointer hover:opacity-80"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    window.open(poc.blob_data || `${STATIC_BASE}${poc.file_path}`, '_blank');
                                  }}
                                />
                                {!!userId && poc.uploaded_by === userId && (
                                  <button
                                    type="button"
                                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                    onClick={(e) => { e.stopPropagation(); handleDeletePoc(poc); }}
                                    title="Delete POC"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                                <p className="text-xs text-muted-foreground mt-1 truncate">{poc.file_name}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No POC images uploaded yet.</p>
                        )}
                      </div>

                      {/* Retest Status */}
                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-primary mb-1">Retest Status</h4>
                            <div className="flex items-center gap-2">
                              {finding.retest_status ? (
                                <>
                                  {getRetestBadge(finding.retest_status)}
                                  {finding.retest_date && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      Last tested: {new Date(finding.retest_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {finding.retested_by && (
                                    <span className="text-xs text-muted-foreground">
                                      by {getUsername(finding.retested_by)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not retested yet</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={finding.retest_status || ''}
                              onValueChange={(value) =>
                                handleUpdateRetestStatus(finding.id, value as RetestStatus)
                              }
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue placeholder="Update status" />
                              </SelectTrigger>
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
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingFindingId} onOpenChange={(open) => !open && setDeletingFindingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Finding
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this finding? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeletingFindingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}