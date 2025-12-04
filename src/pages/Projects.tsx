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
import { supabase } from '@/integrations/supabase/client';
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
  created_by: string | null;
  findings_count?: number;
  critical_count?: number;
  assignees_count?: number;
};

type Profile = {
  id: string;
  user_id: string;
  username: string;
};

export default function Projects() {
  const { role, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTester, setSelectedTester] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Form state for new project
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    description: '',
    targetDomain: '',
    targetIPs: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) throw projectsError;

      // Fetch findings count per project
      const { data: findingsData } = await supabase
        .from('findings')
        .select('project_id, severity');

      // Fetch project assignments count
      const { data: assignmentsData } = await supabase
        .from('project_assignments')
        .select('project_id');

      // Fetch profiles for tester assignment
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*');

      setProfiles(profilesData || []);

      // Combine data
      const projectsWithCounts = (projectsData || []).map(project => {
        const projectFindings = findingsData?.filter(f => f.project_id === project.id) || [];
        const criticalFindings = projectFindings.filter(f => f.severity === 'critical');
        const assignees = assignmentsData?.filter(a => a.project_id === project.id) || [];

        return {
          ...project,
          findings_count: projectFindings.length,
          critical_count: criticalFindings.length,
          assignees_count: assignees.length,
        };
      });

      setProjects(projectsWithCounts);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, 'active' | 'completed' | 'pending' | 'overdue'> = {
      active: 'active',
      completed: 'completed',
      pending: 'pending',
      overdue: 'overdue',
    };
    return <Badge variant={variants[status || 'pending'] || 'secondary'}>{status || 'pending'}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.name || !newProject.client || !newProject.targetDomain) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          name: newProject.name,
          client: newProject.client,
          domain: newProject.targetDomain,
          ip_addresses: newProject.targetIPs ? newProject.targetIPs.split(',').map(ip => ip.trim()) : null,
          start_date: newProject.startDate || null,
          end_date: newProject.endDate || null,
          created_by: user?.id,
          status: 'active',
        });

      if (error) throw error;

      toast.success('Project created successfully!');
      setIsDialogOpen(false);
      setNewProject({
        name: '',
        client: '',
        description: '',
        targetDomain: '',
        targetIPs: '',
        startDate: '',
        endDate: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleAssignTester = async () => {
    if (!selectedProject || !selectedTester) {
      toast.error('Please select a tester');
      return;
    }

    setIsAssigning(true);
    try {
      // Get the user_id from the profile
      const profile = profiles.find(p => p.id === selectedTester);
      if (!profile) {
        toast.error('Tester not found');
        return;
      }

      const { error } = await supabase
        .from('project_assignments')
        .insert({
          project_id: selectedProject.id,
          user_id: profile.user_id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Tester is already assigned to this project');
        } else {
          throw error;
        }
      } else {
        toast.success('Tester assigned successfully!');
        setIsAssignDialogOpen(false);
        setSelectedTester('');
        fetchData();
      }
    } catch (error) {
      console.error('Error assigning tester:', error);
      toast.error('Failed to assign tester');
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignDialog = (project: Project) => {
    setSelectedProject(project);
    setSelectedTester('');
    setIsAssignDialogOpen(true);
  };

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
    <DashboardLayout
      title="Projects"
      description="Manage and track all penetration testing engagements"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
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
                <Button variant="gradient">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project Name *</Label>
                      <Input 
                        placeholder="e.g., Security Assessment"
                        value={newProject.name}
                        onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Name *</Label>
                      <Input 
                        placeholder="e.g., Acme Corp"
                        value={newProject.client}
                        onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Project description and scope"
                      value={newProject.description}
                      onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Domain *</Label>
                      <Input 
                        placeholder="e.g., example.com"
                        value={newProject.targetDomain}
                        onChange={(e) => setNewProject({...newProject, targetDomain: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target IPs (comma-separated)</Label>
                      <Input 
                        placeholder="e.g., 192.168.1.1, 192.168.1.2"
                        value={newProject.targetIPs}
                        onChange={(e) => setNewProject({...newProject, targetIPs: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input 
                        type="date"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input 
                        type="date"
                        value={newProject.endDate}
                        onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" variant="gradient">Create Project</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProjects.map((project, index) => (
            <Card
              key={project.id}
              glow
              className="animate-fade-in hover:border-primary/30 transition-all"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{project.client}</p>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground truncate">{project.domain || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Server className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{project.ip_addresses?.length || 0} IPs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {formatDate(project.start_date)} - {formatDate(project.end_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {project.assignees_count} Testers
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{project.findings_count}</span>
                    <span className="text-sm text-muted-foreground">Findings</span>
                    {(project.critical_count || 0) > 0 && (
                      <Badge variant="critical" className="text-xs">
                        {project.critical_count} Critical
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(role === 'admin' || role === 'manager') && (
                      <Button variant="ghost" size="sm" onClick={() => openAssignDialog(project)}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    )}
                    <Link to={`/projects/${project.id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No projects found</p>
              <p className="text-sm mt-1">
                {projects.length === 0 
                  ? 'Create a new project to get started'
                  : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          </Card>
        )}

        {/* Assign Tester Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Tester to {selectedProject?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Tester</Label>
                <Select value={selectedTester} onValueChange={setSelectedTester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tester" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleAssignTester} disabled={isAssigning}>
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Tester'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
