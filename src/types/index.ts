export type UserRole = 'admin' | 'manager' | 'tester';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export type ProjectStatus = 'active' | 'completed' | 'pending' | 'overdue';

export interface Project {
  id: string;
  name: string;
  description: string;
  client: string;
  targetDomain: string;
  targetIPs: string[];
  credentials?: {
    username: string;
    password: string;
    notes?: string;
  }[];
  assignedTesters: string[];
  managerId: string;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  findings: Finding[];
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: Severity;
  cvssScore?: number;
  stepsToReproduce: string;
  impact: string;
  remediation: string;
  affectedAssets: string[];
  evidence?: string[];
  status: 'open' | 'remediated' | 'accepted' | 'false_positive';
  reportedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  category: string;
  description: string;
  tools?: string[];
  techniques?: string[];
  references?: string[];
  submittedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: Date;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
}
