import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search,
  Shield,
  Mail,
  Calendar,
  MoreVertical,
  UserPlus,
  Loader2,
  Plus,
  Trash2,
  FolderKanban,
  X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AppRole = 'admin' | 'manager' | 'tester';

interface UserWithRole {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  created_at: string;
  role: AppRole | null;
}

interface Project {
  id: string;
  name: string;
  client: string;
}

interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
}

export default function Users() {
  const { role, session } = useAuth();
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
    email: '',
    password: '',
    username: '',
    role: 'tester' as AppRole,
  });
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false);
  const [selectedUserForProjects, setSelectedUserForProjects] = useState<UserWithRole | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [userAssignments, setUserAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // Only admins can access this page
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          username: profile.username,
          full_name: profile.full_name,
          created_at: profile.created_at,
          role: userRole?.role as AppRole | null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      if (selectedUser.role) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', selectedUser.user_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: newRole });

        if (error) throw error;
      }

      toast.success('Role updated successfully');
      setIsRoleDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.username) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          username: newUser.username,
          role: newUser.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('User created successfully!');
      setIsCreateDialogOpen(false);
      setNewUser({ email: '', password: '', username: '', role: 'tester' });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.user_id },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('User deleted successfully!');
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
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
      // Fetch all projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client')
        .order('name');

      if (projectsError) throw projectsError;
      setAllProjects(projects || []);

      // Fetch user's current assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select('*')
        .eq('user_id', user.user_id);

      if (assignmentsError) throw assignmentsError;
      setUserAssignments(assignments || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const toggleProjectAssignment = async (projectId: string, isAssigned: boolean) => {
    if (!selectedUserForProjects) return;

    setIsSavingAssignments(true);
    try {
      if (isAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('project_assignments')
          .delete()
          .eq('user_id', selectedUserForProjects.user_id)
          .eq('project_id', projectId);

        if (error) throw error;
        setUserAssignments(prev => prev.filter(a => a.project_id !== projectId));
        toast.success('Project unassigned');
      } else {
        // Add assignment
        const { data, error } = await supabase
          .from('project_assignments')
          .insert({
            user_id: selectedUserForProjects.user_id,
            project_id: projectId,
          })
          .select()
          .single();

        if (error) throw error;
        setUserAssignments(prev => [...prev, data]);
        toast.success('Project assigned');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  const isProjectAssigned = (projectId: string) => {
    return userAssignments.some(a => a.project_id === projectId);
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (userRole: AppRole | null) => {
    if (!userRole) {
      return <Badge variant="outline" className="text-muted-foreground">No role</Badge>;
    }
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      admin: 'default',
      manager: 'secondary',
      tester: 'outline',
    };
    return <Badge variant={variants[userRole]}>{userRole}</Badge>;
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
    <DashboardLayout
      title="User Management"
      description="Manage team members and their roles"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold">{roleStats.admins}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Managers</p>
                  <p className="text-2xl font-bold">{roleStats.managers}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Testers</p>
                  <p className="text-2xl font-bold">{roleStats.testers}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="Enter username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(v) => setNewUser({ ...newUser, role: v as AppRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="tester">Tester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="gradient" onClick={handleCreateUser} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((member, index) => (
            <Card
              key={member.id}
              glow
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{member.username}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {member.full_name || 'No name set'}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleChangeRole(member)}>
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
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  {getRoleBadge(member.role)}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card className="p-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {users.length === 0 
                ? 'Create users via the backend to get started'
                : 'Try adjusting your search criteria'}
            </p>
          </Card>
        )}

        {/* Change Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role for {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="tester">Tester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={saveRole} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Role'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{userToDelete?.username}</strong>? 
                This action cannot be undone. All of the user's data, including their profile and role, will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Manage Projects Dialog */}
        <Dialog open={isProjectsDialogOpen} onOpenChange={setIsProjectsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Manage Projects for {selectedUserForProjects?.username}
              </DialogTitle>
              <DialogDescription>
                Assign or unassign projects for this user
              </DialogDescription>
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
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={project.id}
                            checked={assigned}
                            onCheckedChange={() => toggleProjectAssignment(project.id, assigned)}
                            disabled={isSavingAssignments}
                          />
                          <div>
                            <label
                              htmlFor={project.id}
                              className="font-medium cursor-pointer"
                            >
                              {project.name}
                            </label>
                            <p className="text-xs text-muted-foreground">{project.client}</p>
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
      </div>
    </DashboardLayout>
  );
}
