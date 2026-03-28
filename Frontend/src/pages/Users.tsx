import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, 
  Mail, 
  Calendar, 
  MoreVertical,
  UserPlus, 
  Loader2, 
  Plus, 
  Trash2, 
  FolderKanban,
  Users as UsersIcon,
  Crown,
  Briefcase,
  ShieldCheck,
  UserCog,
  UserCheck,
  UserX,
  AtSign,
  Clock,
  Settings,
  Star
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { triggerNotifyRefresh } from '@/utils/notifyRefresh';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

type AppRole = 'admin' | 'manager' | 'tester';

interface UserWithRole {
  id: number;
  name: string;
  full_name: string | null;
  email: string;
  role: AppRole | null;
  created_at: string;
}

interface Project {
  id: number;
  name: string;
  client: string;
}

interface ProjectAssignment {
  id: number;
  project_id: number;
  user_id: number;
}

// Helper function to capitalize role
const capitalizeRole = (role: AppRole | null): string => {
  if (!role) return 'No role';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

export default function Users() {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('tester');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [newUser, setNewUser] = useState({
    name: '', email: '', password: '', full_name: '', role: 'tester' as AppRole,
  });
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false);
  const [selectedUserForProjects, setSelectedUserForProjects] = useState<UserWithRole | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [userAssignments, setUserAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // New state for user profile dialog
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<UserWithRole | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // Only admins can access this page
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole(user.role || 'tester');
    setIsRoleDialogOpen(true);
  };

  const saveRole = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      toast.success('Role updated successfully');
      setIsRoleDialogOpen(false);
      fetchUsers();
      triggerNotifyRefresh();
    } catch {
      toast.error('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('User created successfully!');
      setIsCreateDialogOpen(false);
      setNewUser({ name: '', email: '', password: '', full_name: '', role: 'tester' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`${API}/users/${userToDelete.id}`, { method: 'DELETE' });
      toast.success('User deleted successfully!');
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
      triggerNotifyRefresh();
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const openProjectsDialog = async (user: UserWithRole) => {
    setSelectedUserForProjects(user);
    setIsProjectsDialogOpen(true);
    setIsLoadingProjects(true);
    try {
      const [projectsRes, assignmentsRes] = await Promise.all([
        fetch(`${API}/projects`),
        fetch(`${API}/users/${user.id}/projects`),
      ]);
      setAllProjects(await projectsRes.json());
      setUserAssignments(await assignmentsRes.json());
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const toggleProjectAssignment = async (projectId: number, isAssigned: boolean) => {
    if (!selectedUserForProjects) return;
    setIsSavingAssignments(true);
    try {
      if (isAssigned) {
        await fetch(`${API}/users/${selectedUserForProjects.id}/projects/${projectId}`, { method: 'DELETE' });
        setUserAssignments(prev => prev.filter(a => a.project_id !== projectId));
        toast.success('Project unassigned');
        triggerNotifyRefresh();
      } else {
        const res = await fetch(`${API}/users/${selectedUserForProjects.id}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId }),
        });
        const data = await res.json();
        setUserAssignments(prev => [...prev, { id: data.id, user_id: selectedUserForProjects.id, project_id: projectId }]);
        toast.success('Project assigned');
        triggerNotifyRefresh();
      }
    } catch {
      toast.error('Failed to update assignment');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  const isProjectAssigned = (projectId: number) =>
    userAssignments.some(a => a.project_id === projectId);

  const openUserProfile = (user: UserWithRole, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserForProfile(user);
    setIsProfileDialogOpen(true);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (userRole: AppRole | null) => {
    if (!userRole) return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-border text-muted-foreground">
        No role
      </span>
    );

    const displayRole = capitalizeRole(userRole);
    const styles: Record<AppRole, string> = {
      admin:   'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30',
      manager: 'bg-primary/15 text-primary border-primary/40',
      tester:  'bg-secondary text-muted-foreground border-border',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[userRole]}`}>
        {displayRole}
      </span>
    );
  };

  const getRoleIcon = (userRole: AppRole | null) => {
    switch (userRole) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'manager':
        return <Briefcase className="h-4 w-4" />;
      case 'tester':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <UserCog className="h-4 w-4" />;
    }
  };

  const roleStats = {
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    testers: users.filter(u => u.role === 'tester').length,
  };

  if (isLoading) {
    return (
      <DashboardLayout title="User Management" description="Manage team members and their roles">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Management" description="Manage team members and their roles">
      <div className="space-y-6 px-4 sm:px-0">

        {/* Stats - Responsive grid with improved icons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="animate-fade-in hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Crown className="h-3 w-3 text-primary" />
                    Admins
                  </p>
                  <p className="text-2xl font-bold mt-1">{roleStats.admins}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in hover:shadow-lg transition-all" style={{ animationDelay: '50ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-blue-500" />
                    Managers
                  </p>
                  <p className="text-2xl font-bold mt-1">{roleStats.managers}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in hover:shadow-lg transition-all sm:col-span-2 lg:col-span-1" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    Testers
                  </p>
                  <p className="text-2xl font-bold mt-1">{roleStats.testers}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters + Add User - Responsive layout */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 w-full"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="w-full sm:w-auto">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Create New User
                </DialogTitle>
                <DialogDescription>
                  Add a new team member to the platform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <AtSign className="h-3 w-3" />
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input placeholder="Enter username" value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Full Name
                  </Label>
                  <Input placeholder="Enter full name" value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input type="email" placeholder="Enter email address" value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input type="password" placeholder="Enter password" value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <UserCog className="h-3 w-3" />
                    Role
                  </Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as AppRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-primary" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-500" />
                          Manager
                        </div>
                      </SelectItem>
                      <SelectItem value="tester">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          Tester
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="gradient" onClick={handleCreateUser} disabled={isCreating}>
                    {isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create User'}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Grid - Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((member, index) => (
            <Card
              key={member.id}
              glow
              className="animate-fade-in cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group"
              onClick={() => openUserProfile(member, { stopPropagation: () => { } } as React.MouseEvent)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-lg shadow-lg shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate flex items-center gap-1">
                        {member.name}
                        {member.role === 'admin' && (
                          <Crown className="h-3 w-3 text-primary inline-block" />
                        )}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate text-xs">{member.email}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleChangeRole(member)}>
                        <UserCog className="h-4 w-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openProjectsDialog(member)}>
                        <FolderKanban className="h-4 w-4 mr-2" />
                        Manage Projects
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(member)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    {getRoleBadge(member.role)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card className="p-8 sm:p-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {users.length === 0 ? 'Add a user to get started' : 'Try adjusting your search'}
            </p>
          </Card>
        )}

        {/* Change Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                Change Role for {selectedUser?.name}
              </DialogTitle>
              <DialogDescription>
                Update the user's role and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select New Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-primary" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-blue-500" />
                        Manager
                      </div>
                    </SelectItem>
                    <SelectItem value="tester">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        Tester
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={saveRole} disabled={isSaving}>
                  {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Role'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-destructive" />
                Delete User
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong className="text-foreground">{userToDelete?.name}</strong>?
                This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
                {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" />Delete User</>}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Manage Projects Dialog */}
        <Dialog open={isProjectsDialogOpen} onOpenChange={setIsProjectsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                Manage Projects for {selectedUserForProjects?.name}
              </DialogTitle>
              <DialogDescription>Assign or unassign projects for this user</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No projects available</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {allProjects.map((project) => {
                    const assigned = isProjectAssigned(project.id);
                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            id={String(project.id)}
                            checked={assigned}
                            onCheckedChange={() => toggleProjectAssignment(project.id, assigned)}
                            disabled={isSavingAssignments}
                          />
                          <div className="min-w-0">
                            <label htmlFor={String(project.id)} className="font-medium cursor-pointer truncate block">
                              {project.name}
                            </label>
                            <p className="text-xs text-muted-foreground truncate">{project.client}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsProjectsDialogOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Profile Dialog */}
        <UserProfileDialog
          userId={selectedUserForProfile?.id || 0}
          userName={selectedUserForProfile?.name || ''}
          userFullName={selectedUserForProfile?.full_name || undefined}
          open={isProfileDialogOpen}
          onOpenChange={setIsProfileDialogOpen}
        />

      </div>
    </DashboardLayout>
  );
}