import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from 'sonner';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

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

type RetestStatus = 'Open' | 'Fixed' | 'Not Fixed';

interface FindingPoc {
  id: string;
  finding_id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface Project {
  id: string;
  name: string;
  client: string;
}

interface Profile {
  user_id: string;
  username: string;
}

export default function Findings() {
  const { user, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pocs, setPocs] = useState<Record<string, FindingPoc[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFindingId, setDeletingFindingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFindingId, setUploadingFindingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    const [projectsRes, findingsRes, profilesRes] = await Promise.all([
      supabase.from('projects').select('id, name, client'),
      supabase.from('findings').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, username'),
    ]);

    if (projectsRes.data) setProjects(projectsRes.data);
    if (findingsRes.data) {
      setFindings(findingsRes.data as Finding[]);
      const findingIds = findingsRes.data.map(f => f.id);
      if (findingIds.length > 0) {
        const { data: pocsData } = await supabase
          .from('finding_pocs')
          .select('*')
          .in('finding_id', findingIds);

        if (pocsData) {
          const pocsByFinding: Record<string, FindingPoc[]> = {};
          pocsData.forEach(poc => {
            if (!pocsByFinding[poc.finding_id]) {
              pocsByFinding[poc.finding_id] = [];
            }
            pocsByFinding[poc.finding_id].push(poc as FindingPoc);
          });
          setPocs(pocsByFinding);
        }
      }
    }
    if (profilesRes.data) setProfiles(profilesRes.data);

    setIsLoading(false);
  };

  const filteredFindings = findings.filter((finding) => {
    const matchesSearch =
      finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (finding.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter;
    const matchesProject = projectFilter === 'all' || finding.project_id === projectFilter;
    return matchesSearch && matchesSeverity && matchesProject;
  });

  const getSeverityBadge = (severity: Severity) => {
    const variants: Record<Severity, 'destructive' | 'secondary' | 'outline'> = {
      Critical: 'destructive',
      High: 'destructive',
      Medium: 'secondary',
      Low: 'outline',
      Informational: 'outline',
    };
    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  const getSeverityIcon = (severity: Severity) => {
    const colors: Record<Severity, string> = {
      Critical: 'text-red-500',
      High: 'text-orange-500',
      Medium: 'text-yellow-500',
      Low: 'text-green-500',
      Informational: 'text-blue-500',
    };
    return <AlertTriangle className={`h-5 w-5 ${colors[severity]}`} />;
  };

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
  };

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

    const { data, error } = await supabase.from('findings').insert({
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
      created_by: user.id,
    }).select().single();

    if (error) {
      toast.error('Failed to add finding: ' + error.message);
      return;
    }

    setFindings([data as Finding, ...findings]);
    toast.success('Finding added successfully!');
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = (findingId: string) => {
    const finding = findings.find(f => f.id === findingId);
    if (!finding || finding.created_by !== user?.id) {
      toast.error('You can only delete your own findings');
      return;
    }
    setDeletingFindingId(findingId);
  };

  const confirmDelete = async () => {
    if (!deletingFindingId) return;

    const { error } = await supabase.from('findings').delete().eq('id', deletingFindingId);

    if (error) {
      toast.error('Failed to delete finding');
      return;
    }

    setFindings(findings.filter(f => f.id !== deletingFindingId));
    toast.success('Finding deleted');
    setDeletingFindingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, findingId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, JPG, and PNG files are allowed');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${findingId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('poc-images')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload POC: ' + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('poc-images').getPublicUrl(fileName);

    const { data: pocData, error: pocError } = await supabase.from('finding_pocs').insert({
      finding_id: findingId,
      file_path: urlData.publicUrl,
      file_name: file.name,
      uploaded_by: user.id,
    }).select().single();

    if (pocError) {
      toast.error('Failed to save POC reference');
      return;
    }

    setPocs(prev => ({
      ...prev,
      [findingId]: [...(prev[findingId] || []), pocData as FindingPoc],
    }));

    toast.success('POC uploaded successfully!');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadingFindingId(null);
  };

  const handleDeletePoc = async (poc: FindingPoc) => {
    if (poc.uploaded_by !== user?.id) {
      toast.error('You can only delete your own POCs');
      return;
    }

    const { error } = await supabase.from('finding_pocs').delete().eq('id', poc.id);

    if (error) {
      toast.error('Failed to delete POC');
      return;
    }

    setPocs(prev => ({
      ...prev,
      [poc.finding_id]: prev[poc.finding_id]?.filter(p => p.id !== poc.id) || [],
    }));

    toast.success('POC deleted');
  };

  const getUsername = (userId: string) => {
    return profiles.find(p => p.user_id === userId)?.username || 'Unknown';
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const handleUpdateRetestStatus = async (findingId: string, status: RetestStatus) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const { error } = await supabase
      .from('findings')
      .update({
        retest_status: status,
        retest_date: new Date().toISOString(),
        retested_by: user.id,
      })
      .eq('id', findingId);

    if (error) {
      toast.error('Failed to update retest status: ' + error.message);
      return;
    }

    setFindings(findings.map(f =>
      f.id === findingId
        ? { ...f, retest_status: status, retest_date: new Date().toISOString(), retested_by: user.id }
        : f
    ));
    toast.success(`Retest status updated to "${status}"`);
  };

  const getRetestBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, 'destructive' | 'secondary' | 'outline'> = {
      'Open': 'destructive',
      'Fixed': 'outline',
      'Not Fixed': 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'secondary'} className="ml-2">
        <RefreshCw className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Findings" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Findings"
      description="View and manage all vulnerability findings"
    >
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
          {(role === 'manager' || role === 'admin') && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-secondary/50">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)] w-full">
                <SelectItem value="all" className="truncate">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    className="truncate max-w-full"
                  >
                    <span className="truncate block max-w-[calc(100vw-4rem)]">
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gradient-technieum">
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map((severity) => {
            const count = findings.filter(f => f.severity === severity).length;
            return (
              <Card key={severity} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
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
          {filteredFindings.map((finding, index) => {
            const isExpanded = expandedFinding === finding.id;
            const canDelete = finding.created_by === user?.id;
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
                      {/* {getSeverityIcon(finding.severity)} */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          {getSeverityBadge(finding.severity)}
                          {finding.cvss_score && (
                            <span className="text-sm font-mono text-muted-foreground">
                              CVSS {finding.cvss_score}
                            </span>
                          )}
                          {/* Desktop/Tablet */}
                          <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                            {getProjectName(finding.project_id)}
                          </Badge>

                          {/* Mobile */}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(finding.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
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
                        <Badge variant="outline" className="font-mono text-xs">
                          {finding.cwe_id}
                        </Badge>
                      </div>
                    )}

                    {/* POC Images Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-primary">Proof of Concept (POC)</h4>
                        <div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, finding.id)}
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
                                src={poc.file_path}
                                alt={poc.file_name}
                                className="rounded-lg border border-border/50 w-full h-32 object-cover cursor-pointer hover:opacity-80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(poc.file_path, '_blank');
                                }}
                              />
                              {poc.uploaded_by === user?.id && (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePoc(poc);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                              <p className="text-xs text-muted-foreground mt-1 truncate">{poc.file_name}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No POC images uploaded yet.</p>
                      )}
                    </div>

                    {/* Retest Status Section */}
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
                            onValueChange={(value) => handleUpdateRetestStatus(finding.id, value as RetestStatus)}
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
          })}
        </div>

        {filteredFindings.length === 0 && (
          <Card className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No findings found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filter criteria
            </p>
          </Card>
        )}
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
            <Button variant="outline" onClick={() => setDeletingFindingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}