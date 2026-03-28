import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Calendar,
  Users as UsersIcon,
  Globe,
  Server,
  ChevronRight,
  Filter,
  Loader2,
  UserPlus,
  Trash2,
  X,
  Check,
  UserMinus,
  AlertTriangle,
  FileText,
  Edit,
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
  client: string;
  description: string | null;
  domain: string | null;
  ip_addresses: string[] | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  created_by: string | null;
  findings_count?: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  info_count?: number;
  assignees_count?: number;
};

type Profile = {
  id: string;
  user_id: string;
  username: string;
  email?: string;
  role?: string;
};

type Assignee = {
  id: string;
  user_id: string;
  username: string;
  assigned_at: string;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token') ?? '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Projects() {
  const { role, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Multi-select assign state
  const [currentAssignees, setCurrentAssignees] = useState<Assignee[]>([]);
  const [selectedTesters, setSelectedTesters] = useState<string[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Updated project form with all fields from database
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    description: '',
    domain: '',
    ip_addresses: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });

  // Edit project form
  const [editProject, setEditProject] = useState({
    id: '',
    name: '',
    client: '',
    description: '',
    domain: '',
    ip_addresses: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });

  // Date picker states
  const [createStartDate, setCreateStartDate] = useState<Date | undefined>(undefined);
  const [createEndDate, setCreateEndDate] = useState<Date | undefined>(undefined);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>(undefined);
  const [editEndDate, setEditEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchProjects();
    fetchProfiles();
  }, [user]);

  // ─── Fetch projects with counts ───────────────────────────────────────────

  const fetchProjects = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Projects API returned ${res.status}`);
      const data = await res.json();

      // Fetch findings counts for each project
      const projectsWithCounts = await Promise.all(
        data.map(async (project: Project) => {
          try {
            const findingsRes = await fetch(`${API_BASE}/findings?project_id=${project.id}`, { headers: authHeaders() });
            if (findingsRes.ok) {
              const findings = await findingsRes.json();
              const criticalCount = findings.filter((f: any) =>
                String(f.severity).toLowerCase() === 'critical'
              ).length;
              const highCount = findings.filter((f: any) =>
                String(f.severity).toLowerCase() === 'high'
              ).length;
              const mediumCount = findings.filter((f: any) =>
                String(f.severity).toLowerCase() === 'medium'
              ).length;
              const lowCount = findings.filter((f: any) =>
                String(f.severity).toLowerCase() === 'low'
              ).length;
              const infoCount = findings.filter((f: any) =>
                String(f.severity).toLowerCase() === 'informational' ||
                String(f.severity).toLowerCase() === 'info'
              ).length;

              // Fetch assignees count
              const assigneesRes = await fetch(`${API_BASE}/projects/${project.id}/assignments`, { headers: authHeaders() });
              let assigneesCount = 0;
              if (assigneesRes.ok) {
                const assignees = await assigneesRes.json();
                assigneesCount = assignees.length;
              }

              return {
                ...project,
                findings_count: findings.length,
                critical_count: criticalCount,
                high_count: highCount,
                medium_count: mediumCount,
                low_count: lowCount,
                info_count: infoCount,
                assignees_count: assigneesCount,
              };
            }
          } catch (error) {
            console.error(`Error fetching findings for project ${project.id}:`, error);
          }
          return { ...project, findings_count: 0, assignees_count: 0 };
        })
      );

      setProjects(projectsWithCounts);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Fetch users ──────────────────────────────────────────────────────────

  const fetchProfiles = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const normalised: Profile[] = data.map((u: any) => ({
        id: u.id,
        user_id: u.id,
        username: u.username ?? u.name ?? u.email ?? String(u.id),
        email: u.email,
        role: u.role,
      }));
      setProfiles(normalised);
    } catch (error) {
      console.warn('fetchProfiles failed (non-critical):', error);
    }
  };

  // ─── Fetch current assignees for a project ────────────────────────────────

  const fetchAssignees = async (projectId: string) => {
    setLoadingAssignees(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/assignments`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch assignees');
      const data: Assignee[] = await res.json();
      setCurrentAssignees(data);
    } catch {
      toast.error('Failed to load current team members');
      setCurrentAssignees([]);
    } finally {
      setLoadingAssignees(false);
    }
  };

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.domain && project.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getStatusBadge = (status: string | null) => {
    if (status === 'completed') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">Completed</Badge>;
    }
    const variants: Record<string, 'active' | 'pending' | 'overdue' | 'secondary'> = {
      active: 'active',
      pending: 'pending',
      overdue: 'overdue',
    };
    const variant = variants[status || 'pending'] || 'secondary';
    return <Badge variant={variant}>{status || 'pending'}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ─── Toggle tester selection ──────────────────────────────────────────────

  const toggleTesterSelection = (profileId: string) => {
    setSelectedTesters(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  // ─── Create project with all fields ───────────────────────────────────────

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newProject.name || !newProject.client) {
      toast.error('Project name and client are required');
      return;
    }

    try {
      // Parse IP addresses if provided
      let ipAddresses = null;
      if (newProject.ip_addresses && newProject.ip_addresses.trim()) {
        ipAddresses = newProject.ip_addresses
          .split(',')
          .map(ip => ip.trim())
          .filter(ip => ip.length > 0);
      }

      const projectData = {
        name: newProject.name,
        client: newProject.client,
        description: newProject.description || null,
        domain: newProject.domain || null,
        ip_addresses: ipAddresses,
        start_date: createStartDate ? createStartDate.toISOString().split('T')[0] : null,
        end_date: createEndDate ? createEndDate.toISOString().split('T')[0] : null,
        status: newProject.status,
        created_by: user?.id,
      };

      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(projectData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create project');
      }

      toast.success('Project created successfully!');
      setIsDialogOpen(false);

      // Reset form
      setNewProject({
        name: '',
        client: '',
        description: '',
        domain: '',
        ip_addresses: '',
        start_date: '',
        end_date: '',
        status: 'active',
      });
      setCreateStartDate(undefined);
      setCreateEndDate(undefined);

      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  // ─── Edit project ─────────────────────────────────────────────────────────

  const openEditDialog = (project: Project) => {
    setEditProject({
      id: project.id,
      name: project.name,
      client: project.client,
      description: project.description || '',
      domain: project.domain || '',
      ip_addresses: project.ip_addresses ? project.ip_addresses.join(', ') : '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      status: project.status || 'active',
    });
    setEditStartDate(project.start_date ? new Date(project.start_date) : undefined);
    setEditEndDate(project.end_date ? new Date(project.end_date) : undefined);
    setIsEditDialogOpen(true);
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editProject.name || !editProject.client) {
      toast.error('Project name and client are required');
      return;
    }

    setIsEditing(true);
    try {
      // Parse IP addresses if provided
      let ipAddresses = null;
      if (editProject.ip_addresses && editProject.ip_addresses.trim()) {
        ipAddresses = editProject.ip_addresses
          .split(',')
          .map(ip => ip.trim())
          .filter(ip => ip.length > 0);
      }

      const projectData = {
        name: editProject.name,
        client: editProject.client,
        description: editProject.description || null,
        domain: editProject.domain || null,
        ip_addresses: ipAddresses,
        start_date: editStartDate ? editStartDate.toISOString().split('T')[0] : null,
        end_date: editEndDate ? editEndDate.toISOString().split('T')[0] : null,
        status: editProject.status,
      };

      const res = await fetch(`${API_BASE}/projects/${editProject.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(projectData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update project');
      }

      toast.success('Project updated successfully!');
      setIsEditDialogOpen(false);
      fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update project');
    } finally {
      setIsEditing(false);
    }
  };

  // ─── Assign multiple testers ──────────────────────────────────────────────

  const handleAssignTesters = async () => {
    if (!selectedProject || selectedTesters.length === 0) {
      toast.error('Please select at least one tester');
      return;
    }

    setIsAssigning(true);
    let successCount = 0;
    let skipCount = 0;

    try {
      for (const profileId of selectedTesters) {
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) continue;

        const res = await fetch(`${API_BASE}/projects/${selectedProject.id}/assignments`, {
          method: 'POST',
          headers: authHeaders(),
          // body: JSON.stringify({ user_id: profile.user_id }),
          body: JSON.stringify({ user_id: profile.user_id, assigned_by_id: user?.id }),
        });

        if (res.status === 409) {
          skipCount++;
          continue;
        }

        if (res.ok) successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} tester${successCount > 1 ? 's' : ''} assigned successfully!`);
      }
      if (skipCount > 0) {
        toast.info(`${skipCount} tester${skipCount > 1 ? 's were' : ' was'} already assigned`);
      }

      setSelectedTesters([]);
      await fetchAssignees(selectedProject.id);
      fetchProjects();
    } catch {
      toast.error('Failed to assign testers');
    } finally {
      setIsAssigning(false);
    }
  };

  // ─── Remove assignee ──────────────────────────────────────────────────────

  const handleRemoveAssignee = async (assignee: Assignee) => {
    if (!selectedProject) return;
    setRemovingUserId(assignee.user_id);
    try {
      const res = await fetch(
        `${API_BASE}/projects/${selectedProject.id}/assignments/${assignee.user_id}`,
        { method: 'DELETE', headers: authHeaders() }
      );
      if (!res.ok) throw new Error('Failed to remove');
      setCurrentAssignees(prev => prev.filter(a => a.user_id !== assignee.user_id));
      toast.success(`${assignee.username} removed from project`);
      fetchProjects();
    } catch {
      toast.error('Failed to remove team member');
    } finally {
      setRemovingUserId(null);
    }
  };

  // ─── Open assign dialog ───────────────────────────────────────────────────

  const openAssignDialog = async (project: Project) => {
    setSelectedProject(project);
    setSelectedTesters([]);
    setUserSearchQuery('');
    setIsAssignDialogOpen(true);
    await fetchAssignees(project.id);
  };

  // ─── Delete project ───────────────────────────────────────────────────────

  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectToDelete.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete project');
      toast.success('Project deleted successfully!');
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
      fetchProjects();
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Derived: available users (not yet assigned) ──────────────────────────

  const assignedUserIds = new Set(currentAssignees.map(a => String(a.user_id)));
  const availableProfiles = profiles.filter(
    p => !assignedUserIds.has(String(p.user_id)) &&
      (userSearchQuery === '' || p.username.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <DashboardLayout title="Projects" description="Manage and track all penetration testing engagements">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Projects" description="Manage and track all penetration testing engagements">
      <div className="space-y-6">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by name, client, domain, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          {(role === 'admin' || role === 'manager') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-technieum"><Plus className="h-4 w-4 mr-2" />New Project</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Create New Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project Name *</Label>
                      <Input
                        placeholder="e.g., Security Assessment Q1 2026"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Name *</Label>
                      <Input
                        placeholder="e.g., Acme Corporation"
                        value={newProject.client}
                        onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the project scope, objectives, and any special requirements..."
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Domain</Label>
                      <Input
                        placeholder="e.g., example.com"
                        value={newProject.domain}
                        onChange={(e) => setNewProject({ ...newProject, domain: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Primary domain for the assessment</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Target IPs</Label>
                      <Input
                        placeholder="e.g., 192.168.1.1, 10.0.0.1"
                        value={newProject.ip_addresses}
                        onChange={(e) => setNewProject({ ...newProject, ip_addresses: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated IP addresses or ranges</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-background"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {createStartDate ? format(createStartDate, 'PPP') : 'Select start date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={createStartDate}
                            onSelect={setCreateStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-background"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {createEndDate ? format(createEndDate, 'PPP') : 'Select end date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={createEndDate}
                            onSelect={setCreateEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Initial Status</Label>
                    <Select
                      value={newProject.status}
                      onValueChange={(v) => setNewProject({ ...newProject, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" className="gradient-technieum">Create Project</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              {projects.length === 0 ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary/30 flex items-center justify-center">
                    <Globe className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-medium">No projects yet</p>
                  <p className="text-sm mt-1">Create your first project to get started with security assessments</p>
                  {(role === 'admin' || role === 'manager') && (
                    <Button
                      className="gradient-technieum mt-4"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />Create Project
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No matching projects found</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
                </>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredProjects.map((project, index) => (
              <Card key={project.id} className="hover:border-primary/30 transition-all group" glow>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{project.client}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(project.status)}
                      {(role === 'admin' || role === 'manager') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openEditDialog(project)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Globe className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground truncate">
                        {project.domain || 'No domain set'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Server className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">
                        {project.ip_addresses?.length || 0} IP{project.ip_addresses?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm col-span-1">
                      <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-snug">
                        {formatDate(project.start_date)} – {formatDate(project.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <UsersIcon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">
                        {project.assignees_count ?? 0} Tester{project.assignees_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Description preview */}
                  {project.description && (
                    <div className="flex items-start gap-2 text-sm pt-1">
                      <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {project.description}
                      </p>
                    </div>
                  )}

                  {/* Findings summary - only show if there are findings */}
                  {project.findings_count && project.findings_count > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">Findings:</span>
                        {project.critical_count > 0 && (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                            {project.critical_count} Critical
                          </Badge>
                        )}
                        {project.high_count > 0 && (
                          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                            {project.high_count} High
                          </Badge>
                        )}
                        {project.medium_count > 0 && (
                          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            {project.medium_count} Medium
                          </Badge>
                        )}
                        {project.low_count > 0 && (
                          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            {project.low_count} Low
                          </Badge>
                        )}
                        {project.info_count > 0 && (
                          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                            {project.info_count} Info
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Total: {project.findings_count}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{project.findings_count ?? 0}</span>
                      <span className="text-sm text-muted-foreground">Total Findings</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(role === 'admin' || role === 'manager') && (
                        <Button variant="ghost" size="sm" onClick={() => openAssignDialog(project)}>
                          <UserPlus className="h-4 w-4 mr-1" />Assign
                        </Button>
                      )}
                      {role === 'admin' && (
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(project)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Link to={`/projects/${project.id}`}>
                        <Button variant="ghost" size="sm">
                          View Details <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Edit Project Dialog ── */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Edit Project
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditProject} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    placeholder="e.g., Security Assessment Q1 2026"
                    value={editProject.name}
                    onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input
                    placeholder="e.g., Acme Corporation"
                    value={editProject.client}
                    onChange={(e) => setEditProject({ ...editProject, client: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the project scope, objectives, and any special requirements..."
                  value={editProject.description}
                  onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Domain</Label>
                  <Input
                    placeholder="e.g., example.com"
                    value={editProject.domain}
                    onChange={(e) => setEditProject({ ...editProject, domain: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Primary domain for the assessment</p>
                </div>
                <div className="space-y-2">
                  <Label>Target IPs</Label>
                  <Input
                    placeholder="e.g., 192.168.1.1, 10.0.0.1"
                    value={editProject.ip_addresses}
                    onChange={(e) => setEditProject({ ...editProject, ip_addresses: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated IP addresses or ranges</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-background"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {editStartDate ? format(editStartDate, 'PPP') : 'Select start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editStartDate}
                        onSelect={setEditStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-background"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {editEndDate ? format(editEndDate, 'PPP') : 'Select end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editEndDate}
                        onSelect={setEditEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editProject.status}
                  onValueChange={(v) => setEditProject({ ...editProject, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="gradient-technieum" disabled={isEditing}>
                  {isEditing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Assign Testers Dialog (multi-select + remove) ── */}
        <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
          setIsAssignDialogOpen(open);
          if (!open) { setSelectedTesters([]); setUserSearchQuery(''); }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Manage Team — {selectedProject?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-2">

              {/* ── Current Assignees ── */}
              <div>
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Team ({currentAssignees.length})
                </Label>
                <div className="mt-2 space-y-1.5 min-h-[40px]">
                  {loadingAssignees ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />Loading team members…
                    </div>
                  ) : currentAssignees.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 px-1">No members assigned yet.</p>
                  ) : (
                    currentAssignees.map((assignee) => {
                      const name = assignee.username || String(assignee.user_id);
                      const isRemoving = removingUserId === assignee.user_id;
                      return (
                        <div key={assignee.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40 border border-border/40 group">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full gradient-technieum flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{name}</span>
                            <Badge variant="secondary" className="text-xs">Tester</Badge>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignee(assignee)}
                            disabled={isRemoving}
                            title="Remove from project"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                          >
                            {isRemoving
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <><UserMinus className="h-3.5 w-3.5" />Remove</>
                            }
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* ── Add New Members ── */}
              <div>
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Add Members
                </Label>

                {/* Search filter */}
                <div className="relative mt-2 mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search users…"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm bg-secondary/50"
                  />
                </div>

                {/* Selected pills */}
                {selectedTesters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedTesters.map(id => {
                      const p = profiles.find(pr => pr.id === id);
                      if (!p) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                          {p.username}
                          <button onClick={() => toggleTesterSelection(id)} className="hover:text-destructive transition-colors ml-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* User list */}
                <div className="border border-border/50 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {availableProfiles.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {userSearchQuery ? 'No users match your search' : 'All users are already assigned'}
                    </div>
                  ) : (
                    availableProfiles.map((profile) => {
                      const isSelected = selectedTesters.includes(profile.id);
                      return (
                        <button
                          key={profile.id}
                          onClick={() => toggleTesterSelection(profile.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-secondary/60 border-b border-border/30 last:border-0 ${isSelected ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${isSelected ? 'gradient-technieum text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                              {profile.username.charAt(0).toUpperCase()}
                            </div>
                            <span className={isSelected ? 'font-medium' : ''}>{profile.username}</span>
                            {profile.role === 'admin' && (
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            )}
                          </div>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  className="gradient-technieum"
                  onClick={handleAssignTesters}
                  disabled={isAssigning || selectedTesters.length === 0}
                >
                  {isAssigning
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning…</>
                    : <><UserPlus className="h-4 w-4 mr-2" />Add {selectedTesters.length > 0 ? `(${selectedTesters.length})` : ''}</>
                  }
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Project
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong className="text-foreground">{projectToDelete?.name}</strong>?
                <br /><br />
                This action cannot be undone. This will permanently remove:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>All findings associated with this project</li>
                  <li>All proof of concept (POC) images</li>
                  <li>All team assignments</li>
                  <li>All checklist progress</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleDeleteProject} disabled={isDeleting}>
                {isDeleting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</>
                  : <><Trash2 className="h-4 w-4 mr-2" />Delete Project</>
                }
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </DashboardLayout>
  );
}