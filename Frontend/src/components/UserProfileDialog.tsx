import { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Download, Loader2, FolderKanban, Bug, Award,
    History, Calendar, Mail, User, Shield, TrendingUp,
    CheckCircle, XCircle, AlertCircle, Info, FileText
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

interface UserProfile {
    user: {
        id: number;
        name: string;
        full_name: string | null;
        email: string;
        role: string;
        created_at: string;
    };
    projects: any[];
    findings: any[];
    hofFindings: any[];
    retestedFindings: any[];
    timelineEvents: any[];
    stats: {
        totalProjects: number;
        totalFindings: number;
        totalHoFFindings: number;
        totalRetests: number;
        acceptedFindings: number;
        rejectedFindings: number;
        cvesCount: number;
        severityBreakdown: {
            critical: number;
            high: number;
            medium: number;
            low: number;
            info: number;
        };
        projectStatusBreakdown: Record<string, number>;
    };
}

interface UserProfileDialogProps {
    userId: number;
    userName: string;
    userFullName?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({ userId, userName, userFullName, open, onOpenChange }: UserProfileDialogProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (open && userId) {
            fetchUserProfile();
        }
    }, [open, userId]);

    const fetchUserProfile = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API}/users/${userId}/profile`);
            if (!res.ok) throw new Error('Failed to load profile');
            const data = await res.json();
            setProfile(data);
        } catch (err) {
            toast.error('Failed to load user profile');
        } finally {
            setIsLoading(false);
        }
    };

    const generateWordDocument = async () => {
        if (!profile) return;

        const displayName = userFullName || profile.user.full_name || userName;
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Build document children array
        const children: any[] = [];

        // Title
        children.push(
            new Paragraph({
                text: `User Activity Report: ${displayName}`,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            })
        );

        // Report Info
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Report Generated: ', bold: true }),
                    new TextRun({ text: currentDate })
                ],
                spacing: { after: 100 }
            })
        );

        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'User Email: ', bold: true }),
                    new TextRun({ text: profile.user.email })
                ],
                spacing: { after: 100 }
            })
        );

        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Role: ', bold: true }),
                    new TextRun({ text: profile.user.role.toUpperCase() })
                ],
                spacing: { after: 100 }
            })
        );

        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Member Since: ', bold: true }),
                    new TextRun({ text: new Date(profile.user.created_at).toLocaleDateString() })
                ],
                spacing: { after: 300 }
            })
        );

        // Statistics Section
        children.push(
            new Paragraph({
                text: 'Statistics Summary',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 100 }
            })
        );

        children.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 1 },
                    bottom: { style: BorderStyle.SINGLE, size: 1 },
                    left: { style: BorderStyle.SINGLE, size: 1 },
                    right: { style: BorderStyle.SINGLE, size: 1 },
                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                    insideVertical: { style: BorderStyle.SINGLE, size: 1 }
                },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Count', bold: true })] })] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('Total Projects')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.totalProjects))] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('Total Findings')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.totalFindings))] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('Hall of Fame Submissions')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.totalHoFFindings))] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('Accepted Findings')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.acceptedFindings))] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('CVEs Assigned')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.cvesCount))] })
                        ]
                    })
                ]
            })
        );

        // Severity Breakdown Section
        children.push(
            new Paragraph({
                text: 'Severity Distribution',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 300, after: 100 }
            })
        );

        children.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 1 },
                    bottom: { style: BorderStyle.SINGLE, size: 1 },
                    left: { style: BorderStyle.SINGLE, size: 1 },
                    right: { style: BorderStyle.SINGLE, size: 1 },
                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                    insideVertical: { style: BorderStyle.SINGLE, size: 1 }
                },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Severity', bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Count', bold: true })] })] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('Critical')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.severityBreakdown.critical))] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('High')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.severityBreakdown.high))] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('Medium')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.severityBreakdown.medium))] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('Low')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.severityBreakdown.low))] })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('Info')] }),
                            new TableCell({ children: [new Paragraph(String(profile.stats.severityBreakdown.info))] })
                        ]
                    })
                ]
            })
        );

        // Projects Section
        children.push(
            new Paragraph({
                text: 'Assigned Projects',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 300, after: 100 }
            })
        );

        if (profile.projects.length > 0) {
            const projectRows = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Project Name', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Client', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Assigned Date', bold: true })] })] })
                    ]
                })
            ];

            profile.projects.forEach(project => {
                projectRows.push(
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(project.name)] }),
                            new TableCell({ children: [new Paragraph(project.client)] }),
                            new TableCell({ children: [new Paragraph(project.status)] }),
                            new TableCell({ children: [new Paragraph(new Date(project.assigned_at).toLocaleDateString())] })
                        ]
                    })
                );
            });

            children.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
                    },
                    rows: projectRows
                })
            );
        } else {
            children.push(
                new Paragraph({
                    text: 'No projects assigned',
                    spacing: { after: 200 }
                })
            );
        }

        // Findings Section
        children.push(
            new Paragraph({
                text: 'Reported Findings',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 300, after: 100 }
            })
        );

        if (profile.findings.length > 0) {
            const findingsRows = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Title', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Severity', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Project', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })] })
                    ]
                })
            ];

            profile.findings.forEach(finding => {
                findingsRows.push(
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(finding.title)] }),
                            new TableCell({ children: [new Paragraph(finding.severity.toUpperCase())] }),
                            new TableCell({ children: [new Paragraph(finding.status)] }),
                            new TableCell({ children: [new Paragraph(finding.project_name)] }),
                            new TableCell({ children: [new Paragraph(new Date(finding.created_at).toLocaleDateString())] })
                        ]
                    })
                );
            });

            children.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
                    },
                    rows: findingsRows
                })
            );
        } else {
            children.push(
                new Paragraph({
                    text: 'No findings reported',
                    spacing: { after: 200 }
                })
            );
        }

        // Hall of Fame Section
        children.push(
            new Paragraph({
                text: 'Hall of Fame Submissions',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 300, after: 100 }
            })
        );

        if (profile.hofFindings.length > 0) {
            const hofRows = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Title', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Severity', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'CVE ID', bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Reported Date', bold: true })] })] })
                    ]
                })
            ];

            profile.hofFindings.forEach(finding => {
                hofRows.push(
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(finding.title)] }),
                            new TableCell({ children: [new Paragraph(finding.severity?.toUpperCase() || 'N/A')] }),
                            new TableCell({ children: [new Paragraph(finding.status)] }),
                            new TableCell({ children: [new Paragraph(finding.cve_id || 'Not Assigned')] }),
                            new TableCell({ children: [new Paragraph(finding.reported_at ? new Date(finding.reported_at).toLocaleDateString() : 'N/A')] })
                        ]
                    })
                );
            });

            children.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
                    },
                    rows: hofRows
                })
            );
        } else {
            children.push(
                new Paragraph({
                    text: 'No Hall of Fame submissions',
                    spacing: { after: 200 }
                })
            );
        }

        // Footer
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Report generated by Technieum OffSec Management Portal', bold: true })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: 'This report is automatically generated and contains all user activities within the system.', size: 20 })
                ],
                alignment: AlignmentType.CENTER
            })
        );

        // Create document with all children
        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        return doc;
    };

    const downloadWordReport = async () => {
        setIsDownloading(true);
        try {
            const doc = await generateWordDocument();
            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${userName}_profile_report_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Word report downloaded successfully');
        } catch (err) {
            console.error('Error generating report:', err);
            toast.error('Failed to generate report');
        } finally {
            setIsDownloading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        const colors: Record<string, string> = {
            critical: 'bg-red-500 text-white',
            high: 'bg-orange-500 text-white',
            medium: 'bg-yellow-500 text-white',
            low: 'bg-blue-500 text-white',
            info: 'bg-gray-500 text-white',
            informational: 'bg-gray-500 text-white'
        };
        return colors[severity?.toLowerCase()] || 'bg-gray-500 text-white';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            open: 'bg-red-100 text-red-700 border-red-200',
            in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            resolved: 'bg-green-100 text-green-700 border-green-200',
            accepted: 'bg-green-100 text-green-700 border-green-200',
            rejected: 'bg-red-100 text-red-700 border-red-200',
            submitted: 'bg-blue-100 text-blue-700 border-blue-200',
            triaged: 'bg-purple-100 text-purple-700 border-purple-200',
            duplicate: 'bg-gray-100 text-gray-700 border-gray-200'
        };
        return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getEventIcon = (eventType: string) => {
        const icons: Record<string, any> = {
            finding_created: <Bug className="h-4 w-4" />,
            finding_retested: <History className="h-4 w-4" />,
            hof_submitted: <Award className="h-4 w-4" />,
            project_assigned: <FolderKanban className="h-4 w-4" />
        };
        return icons[eventType] || <Info className="h-4 w-4" />;
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const displayName = userFullName || profile?.user.full_name || userName;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0">
                    <div className="flex items-start justify-around">
                        <div>
                            <DialogTitle className="text-2xl">{displayName}</DialogTitle>
                            <DialogDescription className="flex items-center gap-2 mt-1">
                                <Mail className="h-3 w-3" />
                                {profile?.user.email}
                                <span className="mx-2">•</span>
                                <Calendar className="h-3 w-3" />
                                Member since {profile?.user.created_at && formatDate(profile.user.created_at)}
                            </DialogDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={downloadWordReport}
                            disabled={isDownloading || !profile}
                            className="gap-2"
                        >
                            {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                            Download Report
                        </Button>
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : profile ? (
                    <ScrollArea className="h-[calc(90vh-100px)] px-6">
                        <div className="space-y-6 pb-6">
                            {/* Statistics Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-lg border bg-card">
                                    <div className="flex items-center justify-between">
                                        <FolderKanban className="h-8 w-8 text-primary opacity-70" />
                                        <span className="text-2xl font-bold">{profile.stats.totalProjects}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">Projects</p>
                                </div>
                                <div className="p-4 rounded-lg border bg-card">
                                    <div className="flex items-center justify-between">
                                        <Bug className="h-8 w-8 text-orange-500 opacity-70" />
                                        <span className="text-2xl font-bold">{profile.stats.totalFindings}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">Findings</p>
                                </div>
                                <div className="p-4 rounded-lg border bg-card">
                                    <div className="flex items-center justify-between">
                                        <Award className="h-8 w-8 text-yellow-500 opacity-70" />
                                        <span className="text-2xl font-bold">{profile.stats.acceptedFindings}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">Accepted Findings</p>
                                </div>
                                <div className="p-4 rounded-lg border bg-card">
                                    <div className="flex items-center justify-between">
                                        <Shield className="h-8 w-8 text-green-500 opacity-70" />
                                        <span className="text-2xl font-bold">{profile.stats.cvesCount}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">CVEs Assigned</p>
                                </div>
                            </div>

                            {/* Severity Breakdown */}
                            <div className="rounded-lg border p-4">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Severity Distribution
                                </h3>
                                <div className="space-y-2">
                                    {Object.entries(profile.stats.severityBreakdown).map(([severity, count]) => (
                                        count > 0 && (
                                            <div key={severity} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="capitalize">{severity}</span>
                                                    <span>{count}</span>
                                                </div>
                                                <Progress
                                                    value={(count / Math.max(...Object.values(profile.stats.severityBreakdown))) * 100}
                                                    className="h-2"
                                                />
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* Tabs for different sections */}
                            <Tabs defaultValue="projects" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="projects">Projects ({profile.projects.length})</TabsTrigger>
                                    <TabsTrigger value="findings">Findings ({profile.findings.length})</TabsTrigger>
                                    <TabsTrigger value="hof">Hall of Fame ({profile.hofFindings.length})</TabsTrigger>
                                    <TabsTrigger value="timeline">Timeline ({profile.timelineEvents.length})</TabsTrigger>
                                </TabsList>

                                {/* Projects Tab */}
                                <TabsContent value="projects" className="mt-4 space-y-3">
                                    {profile.projects.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>No projects assigned</p>
                                        </div>
                                    ) : (
                                        profile.projects.map((project, idx) => (
                                            <div key={idx} className="p-4 rounded-lg border hover:bg-secondary/30 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-medium">{project.name}</h4>
                                                        <p className="text-sm text-muted-foreground">Client: {project.client}</p>
                                                    </div>
                                                    <Badge variant="outline">{project.status}</Badge>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span>Assigned: {formatDate(project.assigned_at)}</span>
                                                    {project.start_date && (
                                                        <span>Period: {formatDate(project.start_date)} - {formatDate(project.end_date) || 'Ongoing'}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </TabsContent>

                                {/* Findings Tab */}
                                <TabsContent value="findings" className="mt-4 space-y-3">
                                    {profile.findings.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Bug className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>No findings reported</p>
                                        </div>
                                    ) : (
                                        profile.findings.map((finding, idx) => (
                                            <div key={idx} className="p-4 rounded-lg border hover:bg-secondary/30 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium">{finding.title}</h4>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Project: {finding.project_name}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Badge className={getSeverityColor(finding.severity)}>
                                                            {finding.severity}
                                                        </Badge>
                                                        <Badge className={getStatusColor(finding.status)}>
                                                            {finding.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {finding.cvss_score && (
                                                    <div className="mt-2 text-sm">
                                                        <span className="font-medium">CVSS:</span> {finding.cvss_score}
                                                    </div>
                                                )}
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    Reported: {formatDate(finding.created_at)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </TabsContent>

                                {/* Hall of Fame Tab */}
                                <TabsContent value="hof" className="mt-4 space-y-3">
                                    {profile.hofFindings.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>No Hall of Fame findings</p>
                                        </div>
                                    ) : (
                                        profile.hofFindings.map((finding, idx) => (
                                            <div key={idx} className="p-4 rounded-lg border hover:bg-secondary/30 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium">{finding.title}</h4>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Project: {finding.project_name || 'External Program'}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Badge className={getSeverityColor(finding.severity)}>
                                                            {finding.severity}
                                                        </Badge>
                                                        <Badge className={getStatusColor(finding.status)}>
                                                            {finding.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {finding.cve_id && (
                                                    <div className="mt-2 text-sm">
                                                        <span className="font-medium">CVE ID:</span> {finding.cve_id}
                                                    </div>
                                                )}
                                                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                                                    <span>Reported: {formatDate(finding.reported_at)}</span>
                                                    {finding.resolved_at && (
                                                        <span>Resolved: {formatDate(finding.resolved_at)}</span>
                                                    )}
                                                </div>
                                                {finding.rejection_reason && (
                                                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                                        <XCircle className="h-4 w-4 inline mr-1" />
                                                        Rejection Reason: {finding.rejection_reason}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </TabsContent>

                                {/* Timeline Tab */}
                                <TabsContent value="timeline" className="mt-4">
                                    {profile.timelineEvents.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>No activity recorded</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {profile.timelineEvents.map((event, idx) => (
                                                <div key={idx} className="flex gap-3">
                                                    <div className="flex-shrink-0 mt-1">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            {getEventIcon(event.event_type)}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 p-3 rounded-lg border">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <p className="font-medium">{event.title}</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {event.context && `in ${event.context}`}
                                                                </p>
                                                            </div>
                                                            <Badge variant="outline" className="text-xs">
                                                                {event.event_type.replace('_', ' ').toUpperCase()}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            {formatDate(event.event_date)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </ScrollArea>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}