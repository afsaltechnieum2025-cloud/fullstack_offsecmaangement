import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { projects, users } from '@/data/mockData';
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

export default function Projects() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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

  const userProjects = user?.role === 'tester'
    ? projects.filter(p => p.assignedTesters.includes(user.id))
    : projects;

  const filteredProjects = userProjects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'active' | 'completed' | 'pending' | 'overdue'> = {
      active: 'active',
      completed: 'completed',
      pending: 'pending',
      overdue: 'overdue',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.name || !newProject.client || !newProject.targetDomain) {
      toast.error('Please fill in all required fields');
      return;
    }

    // In a real app, this would make an API call
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
  };

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
          {(user?.role === 'admin' || user?.role === 'manager') && (
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
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground truncate">{project.targetDomain}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Server className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{project.targetIPs.length} IPs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {formatDate(project.startDate)} - {formatDate(project.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {project.assignedTesters.length} Testers
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{project.findings.length}</span>
                    <span className="text-sm text-muted-foreground">Findings</span>
                    {project.findings.filter(f => f.severity === 'critical').length > 0 && (
                      <Badge variant="critical" className="text-xs">
                        {project.findings.filter(f => f.severity === 'critical').length} Critical
                      </Badge>
                    )}
                  </div>
                  <Link to={`/projects/${project.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No projects found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
