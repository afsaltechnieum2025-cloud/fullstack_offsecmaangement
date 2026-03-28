import { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Loader2, FolderKanban, Bug, Award,
    History, Calendar, Mail, Shield, TrendingUp,
    XCircle, Info, FileText, Crown, Briefcase, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Document, Packer, Paragraph, TextRun,
    Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType
} from 'docx';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

/* ─── Types ──────────────────────────────────────────────────────────────── */
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

/* ─── docx helpers ───────────────────────────────────────────────────────── */
function makeCell(children: Paragraph[]) {
    return new TableCell({
        children,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
    });
}

const orangeTableBorders = {
    top:              { style: BorderStyle.SINGLE, size: 2, color: 'f97316' },
    bottom:           { style: BorderStyle.SINGLE, size: 2, color: 'f97316' },
    left:             { style: BorderStyle.SINGLE, size: 2, color: 'f97316' },
    right:            { style: BorderStyle.SINGLE, size: 2, color: 'f97316' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '334155' },
    insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: '334155' },
};

/* ─── Badge helpers — mirrors Users.tsx getRoleBadge exactly ────────────── */

/**
 * Severity badges — matches the visual weight used for role badges in Users.tsx:
 *   critical  → primary style  (solid orange, like "Admin")
 *   high      → primary/15     (tinted orange, like "Manager")
 *   medium    → primary/10     (lighter tint)
 *   low       → secondary      (muted, like "Tester")
 *   info      → secondary      (muted)
 */
const getSeverityBadgeClass = (severity: string): string => ({
    critical:      'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30',
    high:          'bg-primary/15 text-primary border-primary/40',
    medium:        'bg-primary/10 text-primary border-primary/30',
    low:           'bg-secondary text-muted-foreground border-border',
    info:          'bg-secondary text-muted-foreground border-border',
    informational: 'bg-secondary text-muted-foreground border-border',
}[severity?.toLowerCase()] ?? 'bg-secondary text-muted-foreground border-border');

/**
 * Status badges — uses the same semantic colour language the rest of the app uses.
 * Active / resolved / accepted → green tint
 * In-progress / submitted / triaged → blue / purple tints
 * Open / rejected / overdue → destructive tint
 * Pending → yellow tint
 * Duplicate → secondary (muted)
 */
const getStatusBadgeClass = (status: string): string => ({
    open:        'bg-destructive/15 text-destructive border-destructive/30',
    in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    resolved:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    accepted:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected:    'bg-destructive/15 text-destructive border-destructive/30',
    submitted:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
    triaged:     'bg-purple-500/15 text-purple-400 border-purple-500/30',
    duplicate:   'bg-secondary text-muted-foreground border-border',
    active:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    completed:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
    pending:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    overdue:     'bg-destructive/15 text-destructive border-destructive/30',
}[status?.toLowerCase()] ?? 'bg-secondary text-muted-foreground border-border');

/* Severity progress-bar colours — same hue family as badge colours */
const severityBarClass: Record<string, string> = {
    critical: 'bg-primary',
    high:     'bg-primary/80',
    medium:   'bg-primary/60',
    low:      'bg-primary/30',
    info:     'bg-muted-foreground/40',
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export function UserProfileDialog({
    userId, userName, userFullName, open, onOpenChange
}: UserProfileDialogProps) {
    const [profile, setProfile]             = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading]         = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (open && userId) fetchUserProfile();
    }, [open, userId]);

    const fetchUserProfile = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API}/users/${userId}/profile`);
            if (!res.ok) throw new Error();
            setProfile(await res.json());
        } catch {
            toast.error('Failed to load user profile');
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Word document ───────────────────────────────────────────────────── */
    const generateWordDocument = async () => {
        if (!profile) return;
        const displayName = userFullName || profile.user.full_name || userName;
        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const sectionHeading = (text: string) =>
            new Paragraph({
                spacing: { before: 300, after: 120 },
                children: [new TextRun({ text, bold: true, size: 28, color: 'f97316' })],
            });

        const metaLine = (label: string, value: string) =>
            new Paragraph({
                spacing: { after: 60 },
                children: [
                    new TextRun({ text: `${label}: `, bold: true, color: 'f97316' }),
                    new TextRun({ text: value }),
                ],
            });

        const headerRow = (...labels: string[]) =>
            new TableRow({
                tableHeader: true,
                children: labels.map(l =>
                    makeCell([new Paragraph({ children: [new TextRun({ text: l, bold: true, color: 'f97316' })] })])
                ),
            });

        const dataRow = (...values: string[]) =>
            new TableRow({
                children: values.map(v =>
                    makeCell([new Paragraph({ children: [new TextRun(v)] })])
                ),
            });

        const severityColors: Record<string, string> = {
            critical: 'ef4444', high: 'f97316', medium: 'fb923c', low: 'facc15', info: '6b7280',
        };

        const children: any[] = [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: 'TECHNIEUM', bold: true, size: 48, color: 'f97316' })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80  }, children: [new TextRun({ text: 'USER ACTIVITY REPORT', bold: true, size: 32 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: displayName, bold: true, size: 28 })] }),
            metaLine('Report Generated', currentDate),
            metaLine('User Email', profile.user.email),
            metaLine('Role', profile.user.role.toUpperCase()),
            metaLine('Member Since', new Date(profile.user.created_at).toLocaleDateString()),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun('')] }),

            sectionHeading('Statistics Summary'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: orangeTableBorders,
                rows: [
                    headerRow('Metric', 'Count'),
                    ...([
                        ['Total Projects',           String(profile.stats.totalProjects)],
                        ['Total Findings',           String(profile.stats.totalFindings)],
                        ['Hall of Fame Submissions', String(profile.stats.totalHoFFindings)],
                        ['Accepted Findings',        String(profile.stats.acceptedFindings)],
                        ['Rejected Findings',        String(profile.stats.rejectedFindings)],
                        ['CVEs Assigned',            String(profile.stats.cvesCount)],
                        ['Total Retests',            String(profile.stats.totalRetests)],
                    ] as [string, string][]).map(([l, v]) => dataRow(l, v)),
                ],
            }),

            sectionHeading('Severity Distribution'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: orangeTableBorders,
                rows: [
                    headerRow('Severity', 'Count'),
                    ...(Object.entries(profile.stats.severityBreakdown) as [string, number][]).map(([sev, count]) =>
                        new TableRow({
                            children: [
                                makeCell([new Paragraph({ children: [new TextRun({ text: sev.charAt(0).toUpperCase() + sev.slice(1), bold: true, color: severityColors[sev] ?? '374151' })] })]),
                                makeCell([new Paragraph({ children: [new TextRun({ text: String(count), bold: true })] })]),
                            ],
                        })
                    ),
                ],
            }),
        ];

        if (profile.projects.length > 0) {
            children.push(
                sectionHeading('Assigned Projects'),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: orangeTableBorders,
                    rows: [
                        headerRow('Project Name', 'Client', 'Status', 'Assigned Date'),
                        ...profile.projects.map(p => dataRow(p.name, p.client ?? '', p.status, new Date(p.assigned_at).toLocaleDateString())),
                    ],
                })
            );
        }

        if (profile.findings.length > 0) {
            children.push(
                sectionHeading('Reported Findings'),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: orangeTableBorders,
                    rows: [
                        headerRow('Title', 'Severity', 'Status', 'Project', 'Date'),
                        ...profile.findings.map(f => dataRow(f.title, f.severity?.toUpperCase() ?? '', f.status, f.project_name ?? '', new Date(f.created_at).toLocaleDateString())),
                    ],
                })
            );
        }

        if (profile.hofFindings.length > 0) {
            children.push(
                sectionHeading('Hall of Fame Submissions'),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: orangeTableBorders,
                    rows: [
                        headerRow('Title', 'Severity', 'Status', 'CVE ID', 'Reported Date'),
                        ...profile.hofFindings.map(f => dataRow(f.title, f.severity?.toUpperCase() ?? 'N/A', f.status, f.cve_id ?? 'Not Assigned', f.reported_at ? new Date(f.reported_at).toLocaleDateString() : 'N/A')),
                    ],
                })
            );
        }

        children.push(
            new Paragraph({ spacing: { before: 400 }, children: [new TextRun('')] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CONFIDENTIAL – Technieum Security Assessment Services', bold: true, color: 'f97316' })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Generated on: ${currentDate}`, size: 18, color: '6b7280' })] }),
        );

        return new Document({ sections: [{ properties: {}, children }] });
    };

    const downloadWordReport = async () => {
        setIsDownloading(true);
        try {
            const doc = await generateWordDocument();
            if (!doc) return;
            const blob = await Packer.toBlob(doc);
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `${userName}_profile_report_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Word report downloaded successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate report');
        } finally {
            setIsDownloading(false);
        }
    };

    /* ── Role icon — white variant for use inside the orange header ─────── */
    const getRoleIcon = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':   return <Crown       className="h-4 w-4 text-white/90" />;
            case 'manager': return <Briefcase   className="h-4 w-4 text-white/90" />;
            case 'tester':  return <ShieldCheck className="h-4 w-4 text-white/90" />;
            default:        return <Shield      className="h-4 w-4 text-white/90" />;
        }
    };

    /* ── Timeline event icon ─────────────────────────────────────────────── */
    const getEventIcon = (t: string) => ({
        finding_created:  <Bug         className="h-4 w-4 text-primary" />,
        finding_retested: <History     className="h-4 w-4 text-blue-400" />,
        hof_submitted:    <Award       className="h-4 w-4 text-yellow-400" />,
        project_assigned: <FolderKanban className="h-4 w-4 text-purple-400" />,
    }[t] ?? <Info className="h-4 w-4 text-muted-foreground" />);

    const formatDate = (d: string) => {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const displayName = userFullName || profile?.user.full_name || userName;

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="
                w-screen h-screen rounded-none p-0 overflow-hidden
                sm:w-[95vw] sm:h-auto sm:max-h-[90vh] sm:rounded-xl
                md:max-w-4xl lg:max-w-5xl
                bg-background border border-border
            ">
                {/* ── Header — gradient-primary matching the portal's Add User button ── */}
                <div className="gradient-primary px-4 py-4 sm:px-6 sm:py-5 flex-shrink-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            {/* Logo row — white only, sits on orange gradient */}
                            <div className="flex items-center gap-2 mb-1">
                                {/* <div className="h-7 w-7 rounded-md bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                                    <Shield className="h-4 w-4 text-white" />
                                </div> */}
                                <span className="text-white font-bold text-xs tracking-[0.18em] uppercase">
                                    Technieum
                                </span>
                            </div>

                            <DialogTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight truncate">
                                {displayName}
                            </DialogTitle>

                            <DialogDescription asChild>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-white/80 text-xs sm:text-sm">
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate max-w-[200px] sm:max-w-none">{profile?.user.email}</span>
                                    </span>
                                    <span className="hidden sm:inline text-white/40">•</span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 flex-shrink-0" />
                                        {profile?.user.created_at && `Since ${formatDate(profile.user.created_at)}`}
                                    </span>
                                    {profile?.user.role && (
                                        <>
                                            <span className="hidden sm:inline text-white/40">•</span>
                                            <span className="flex items-center gap-1 capitalize font-medium text-white/90">
                                                {getRoleIcon(profile.user.role)}
                                                {profile.user.role}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </DialogDescription>
                        </div>

                        <Button
                            variant="secondary"
                            onClick={downloadWordReport}
                            disabled={isDownloading || !profile}
                            size="sm"
                            className="gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 self-start sm:self-auto flex-shrink-0 text-xs sm:text-sm"
                        >
                            {isDownloading
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <FileText className="h-3 w-3" />
                            }
                            Download Report
                        </Button>
                    </div>
                </div>

                {/* ── Body ─────────────────────────────────────────────── */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : profile ? (
                    <ScrollArea className="h-[calc(100vh-130px)] sm:h-[calc(90vh-130px)]">
                        <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6 pb-8">

                            {/* ── Stat cards ───────────────────────────── */}
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {[
                                    { icon: FolderKanban, label: 'Projects',  value: profile.stats.totalProjects },
                                    { icon: Bug,          label: 'Findings',  value: profile.stats.totalFindings },
                                    { icon: Award,        label: 'Accepted',  value: profile.stats.acceptedFindings },
                                    { icon: Shield,       label: 'CVEs',      value: profile.stats.cvesCount },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div
                                        key={label}
                                        className="p-3 sm:p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                                            <span className="text-xl sm:text-2xl font-bold text-primary">
                                                {value}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-muted-foreground mt-2">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Severity distribution ─────────────────── */}
                            <div className="rounded-lg bg-secondary/50 border border-border p-4">
                                <h3 className="font-semibold mb-3 flex items-center gap-2 text-primary text-sm sm:text-base">
                                    <TrendingUp className="h-4 w-4" />
                                    Severity Distribution
                                </h3>
                                <div className="space-y-3">
                                    {(Object.entries(profile.stats.severityBreakdown) as [string, number][]).map(([severity, count]) => {
                                        const max = Math.max(...Object.values(profile.stats.severityBreakdown), 1);
                                        return count > 0 && (
                                            <div key={severity} className="space-y-1">
                                                <div className="flex justify-between text-xs sm:text-sm">
                                                    <span className="capitalize text-foreground font-medium">{severity}</span>
                                                    <span className="font-bold text-foreground">{count}</span>
                                                </div>
                                                <div className="h-1.5 sm:h-2 w-full rounded-full bg-border">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${severityBarClass[severity] ?? 'bg-primary'}`}
                                                        style={{ width: `${(count / max) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Tabs ─────────────────────────────────── */}
                            <Tabs defaultValue="projects" className="w-full">
                                <TabsList className="grid grid-cols-2 gap-1 h-auto p-1 sm:grid-cols-4 bg-secondary/50 border border-border rounded-lg">
                                    {[
                                        { value: 'projects', label: 'Projects',     count: profile.projects.length },
                                        { value: 'findings', label: 'Findings',     count: profile.findings.length },
                                        { value: 'hof',      label: 'Hall of Fame', count: profile.hofFindings.length },
                                        { value: 'timeline', label: 'Timeline',     count: profile.timelineEvents.length },
                                    ].map(({ value, label, count }) => (
                                        <TabsTrigger
                                            key={value}
                                            value={value}
                                            className="
                                                data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground
                                                text-muted-foreground hover:text-foreground
                                                text-xs sm:text-sm py-1.5 sm:py-2
                                                flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1
                                                rounded-md transition-all
                                            "
                                        >
                                            <span>{label}</span>
                                            <span className="text-[10px] opacity-70">({count})</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* Projects */}
                                <TabsContent value="projects" className="mt-4 space-y-3">
                                    {profile.projects.length === 0
                                        ? <EmptyState icon={FolderKanban} message="No projects assigned" />
                                        : profile.projects.map((project, idx) => (
                                            <ProfileCard key={idx}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="font-medium text-primary truncate text-sm sm:text-base">{project.name}</h4>
                                                        <p className="text-xs sm:text-sm text-muted-foreground">Client: {project.client}</p>
                                                    </div>
                                                    <Badge className={`${getStatusBadgeClass(project.status)} text-xs flex-shrink-0 border`}>
                                                        {project.status}
                                                    </Badge>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                    <span>Assigned: {formatDate(project.assigned_at)}</span>
                                                    {project.start_date && (
                                                        <span>Period: {formatDate(project.start_date)} – {formatDate(project.end_date) || 'Ongoing'}</span>
                                                    )}
                                                </div>
                                            </ProfileCard>
                                        ))
                                    }
                                </TabsContent>

                                {/* Findings */}
                                <TabsContent value="findings" className="mt-4 space-y-3">
                                    {profile.findings.length === 0
                                        ? <EmptyState icon={Bug} message="No findings reported" />
                                        : profile.findings.map((finding, idx) => (
                                            <ProfileCard key={idx}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-medium text-primary text-sm sm:text-base leading-snug">{finding.title}</h4>
                                                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Project: {finding.project_name}</p>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
                                                        <Badge className={`${getSeverityBadgeClass(finding.severity)} text-xs border`}>{finding.severity}</Badge>
                                                        <Badge className={`${getStatusBadgeClass(finding.status)} text-xs border`}>{finding.status}</Badge>
                                                    </div>
                                                </div>
                                                {finding.cvss_score && (
                                                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                                                        <span className="font-medium text-foreground">CVSS:</span> {finding.cvss_score}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-xs text-muted-foreground">Reported: {formatDate(finding.created_at)}</p>
                                            </ProfileCard>
                                        ))
                                    }
                                </TabsContent>

                                {/* Hall of Fame */}
                                <TabsContent value="hof" className="mt-4 space-y-3">
                                    {profile.hofFindings.length === 0
                                        ? <EmptyState icon={Award} message="No Hall of Fame findings" />
                                        : profile.hofFindings.map((finding, idx) => (
                                            <ProfileCard key={idx}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-medium text-primary text-sm sm:text-base">{finding.title}</h4>
                                                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                                            Project: {finding.project_name || 'External Program'}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
                                                        <Badge className={`${getSeverityBadgeClass(finding.severity)} text-xs border`}>{finding.severity}</Badge>
                                                        <Badge className={`${getStatusBadgeClass(finding.status)} text-xs border`}>{finding.status}</Badge>
                                                    </div>
                                                </div>
                                                {finding.cve_id && (
                                                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                                                        <span className="font-medium text-foreground">CVE ID:</span> {finding.cve_id}
                                                    </p>
                                                )}
                                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                    <span>Reported: {formatDate(finding.reported_at)}</span>
                                                    {finding.resolved_at && <span>Resolved: {formatDate(finding.resolved_at)}</span>}
                                                </div>
                                                {finding.rejection_reason && (
                                                    <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                                                        <XCircle className="h-3 w-3 inline mr-1" />
                                                        {finding.rejection_reason}
                                                    </div>
                                                )}
                                            </ProfileCard>
                                        ))
                                    }
                                </TabsContent>

                                {/* Timeline */}
                                <TabsContent value="timeline" className="mt-4">
                                    {profile.timelineEvents.length === 0
                                        ? <EmptyState icon={History} message="No activity recorded" />
                                        : (
                                            <div className="space-y-3">
                                                {profile.timelineEvents.map((event, idx) => (
                                                    <ProfileCard key={idx}>
                                                        {/* Icon + badge row */}
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                                                    {getEventIcon(event.event_type)}
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px] border-primary/30 text-primary px-1.5 py-0"
                                                                >
                                                                    {event.event_type.replace(/_/g, ' ').toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground flex-shrink-0">
                                                                {formatDate(event.event_date)}
                                                            </p>
                                                        </div>
                                                        {/* Title + context */}
                                                        <p className="font-medium text-primary text-sm leading-snug">
                                                            {event.title}
                                                        </p>
                                                        {event.context && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">in {event.context}</p>
                                                        )}
                                                    </ProfileCard>
                                                ))}
                                            </div>
                                        )
                                    }
                                </TabsContent>
                            </Tabs>
                        </div>
                    </ScrollArea>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

/* ─── Profile card — uses design-system tokens like the user cards ───────── */
function ProfileCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`
            p-3 sm:p-4 rounded-lg
            bg-secondary/50 border border-border
            hover:border-primary/30 hover:shadow-lg
            transition-all duration-200
            ${className}
        `}>
            {children}
        </div>
    );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */
function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
    return (
        <div className="text-center py-10 text-muted-foreground">
            <Icon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{message}</p>
        </div>
    );
}