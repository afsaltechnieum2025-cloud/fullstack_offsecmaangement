import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { findings as initialFindings, projects, users } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Severity, Finding } from '@/types';
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
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

export default function Findings() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [findingsList, setFindingsList] = useState<Finding[]>(initialFindings);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    severity: '' as Severity | '',
    title: '',
    description: '',
    stepsToReproduce: '',
    impact: '',
    remediation: '',
    affectedAssets: '',
    cvssScore: '',
  });

  const userProjects = user?.role === 'tester'
    ? projects.filter(p => p.assignedTesters.includes(user.id))
    : projects;

  const userFindings = findingsList.filter(f => 
    userProjects.some(p => p.id === f.projectId)
  );

  const filteredFindings = userFindings.filter((finding) => {
    const matchesSearch =
      finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finding.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter;
    const matchesProject = projectFilter === 'all' || finding.projectId === projectFilter;
    return matchesSearch && matchesSeverity && matchesProject;
  });

  const getSeverityBadge = (severity: Severity) => {
    return <Badge variant={severity}>{severity}</Badge>;
  };

  const getSeverityIcon = (severity: Severity) => {
    const colors: Record<Severity, string> = {
      critical: 'text-red-500',
      high: 'text-orange-500',
      medium: 'text-yellow-500',
      low: 'text-green-500',
      info: 'text-blue-500',
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
      affectedAssets: '',
      cvssScore: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId || !formData.severity || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newFinding: Finding = {
      id: `TECH-${String(findingsList.length + 1).padStart(3, '0')}`,
      projectId: formData.projectId,
      title: formData.title,
      description: formData.description,
      severity: formData.severity as Severity,
      status: 'open',
      stepsToReproduce: formData.stepsToReproduce,
      impact: formData.impact,
      remediation: formData.remediation,
      affectedAssets: formData.affectedAssets.split(',').map(a => a.trim()).filter(a => a),
      cvssScore: formData.cvssScore ? parseFloat(formData.cvssScore) : undefined,
      reportedBy: user?.id || '3',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setFindingsList([newFinding, ...findingsList]);
    toast.success('Finding added successfully!');
    resetForm();
    setDialogOpen(false);
  };

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
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          {/* Project Filter - for managers and admins */}
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-secondary/50">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {userProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
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
                        {userProjects.map(p => (
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
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="info">Informational</SelectItem>
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
                  <Label>Affected Assets (comma-separated)</Label>
                  <Input 
                    placeholder="e.g., /api/users, /api/admin" 
                    value={formData.affectedAssets}
                    onChange={(e) => setFormData({ ...formData, affectedAssets: e.target.value })}
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
                  <Button type="submit" variant="gradient">Submit Finding</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {['critical', 'high', 'medium', 'low', 'info'].map((severity) => {
            const count = userFindings.filter(f => f.severity === severity).length;
            return (
              <Card key={severity} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{severity}</p>
                  </div>
                  {getSeverityIcon(severity as Severity)}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Findings List */}
        <div className="space-y-3">
          {filteredFindings.map((finding, index) => {
            const project = projects.find(p => p.id === finding.projectId);
            const reporter = users.find(u => u.id === finding.reportedBy);
            const isExpanded = expandedFinding === finding.id;

            return (
              <Card
                key={finding.id}
                glow
                className="animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(finding.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="outline" className="text-xs font-mono">
                            {finding.id}
                          </Badge>
                          {getSeverityBadge(finding.severity)}
                          {finding.cvssScore && (
                            <span className="text-sm font-mono text-muted-foreground">
                              CVSS {finding.cvssScore}
                            </span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {project?.name}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mt-2">{finding.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {finding.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={finding.status === 'open' ? 'destructive' : finding.status === 'remediated' ? 'active' : 'secondary'}>
                        {finding.status}
                      </Badge>
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
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-2">Steps to Reproduce</h4>
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-3 rounded-lg">
                        {finding.stepsToReproduce}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-2">Impact</h4>
                      <p className="text-sm text-muted-foreground">{finding.impact}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-2">Remediation</h4>
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-lg">
                        {finding.remediation}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-2">Affected Assets</h4>
                      <div className="flex flex-wrap gap-2">
                        {finding.affectedAssets.map((asset, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {asset}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border/50">
                      <span>Reported by: {reporter?.username}</span>
                      <span>Created: {new Date(finding.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(finding.updatedAt).toLocaleDateString()}</span>
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
    </DashboardLayout>
  );
}