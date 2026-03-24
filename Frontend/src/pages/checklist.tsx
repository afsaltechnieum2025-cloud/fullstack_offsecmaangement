import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Search, Plus, Filter, AlertTriangle, Trophy,
  ChevronDown, ChevronUp, ExternalLink, Trash2,
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
  DialogClose,
} from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
type Status   = 'submitted' | 'triaged' | 'accepted' | 'rejected' | 'duplicate' | 'informative' | 'fixed';

interface Finding {
  id: number;
  researcher_id: number;
  program_id: number;
  researcher_name: string;
  program_name: string;
  platform: string;
  title: string;
  description: string;
  steps_to_reproduce: string;
  impact: string;
  severity: Severity;
  category: string;
  status: Status;
  bounty_amount: number | null;
  cve_id: string | null;
  reported_at: string | null;
  resolved_at: string | null;
  public_url: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  timeline?: TimelineEvent[];
}

interface TimelineEvent {
  id: number;
  event: string;
  event_date: string;
  actor: string;
}

interface Researcher {
  id: number;
  username: string;
  total_bounty: number;
  cve_count: number;
  finding_count: number;
  accepted_count: number;
}

interface Program {
  id: number;
  name: string;
  type: string;
  platform: string;
}

interface Stats {
  total_findings: number;
  accepted: number;
  rejected: number;
  submitted: number;
  triaged: number;
  cve_count: number;
  critical_high: number;
  total_bounty: number;
  program_count: number;
  researcher_count: number;
  acceptance_rate: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = 'http://localhost:5000/api/wof';

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical:      { bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/30'    },
  high:          { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  medium:        { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  low:           { bg: 'bg-green-500/10',  text: 'text-green-500',  border: 'border-green-500/30'  },
  informational: { bg: 'bg-blue-500/10',   text: 'text-blue-500',   border: 'border-blue-500/30'   },
};

const STATUS_STYLES: Record<string, string> = {
  accepted:    'bg-green-500/10 text-green-500 border-green-500/30',
  rejected:    'bg-red-500/10 text-red-500 border-red-500/30',
  submitted:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  triaged:     'bg-blue-500/10 text-blue-500 border-blue-500/30',
  duplicate:   'bg-secondary text-muted-foreground border-border',
  informative: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  fixed:       'bg-teal-500/10 text-teal-500 border-teal-500/30',
};

const TL_COLOR: Record<string, string> = {
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  triaged:  'bg-blue-500',
  fixed:    'bg-teal-500',
  default:  'bg-muted-foreground',
};

const AVATAR_COLORS = [
  'bg-red-500/10 text-red-500',
  'bg-orange-500/10 text-orange-500',
  'bg-yellow-500/10 text-yellow-500',
  'bg-green-500/10 text-green-500',
  'bg-blue-500/10 text-blue-500',
  'bg-purple-500/10 text-purple-500',
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return (name ?? '?').slice(0, 2).toUpperCase();
}

function fmtDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getSeverityBadge(severity: string) {
  const s = severity?.toLowerCase() ?? 'informational';
  const style = SEVERITY_STYLES[s] ?? SEVERITY_STYLES.informational;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function getStatusBadge(status: string) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.submitted;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function getSeverityIcon(severity: string) {
  const s = severity?.toLowerCase() ?? 'informational';
  const style = SEVERITY_STYLES[s] ?? SEVERITY_STYLES.informational;
  return <AlertTriangle className={`h-5 w-5 ${style.text}`} />;
}

// ─── Add Finding Modal ────────────────────────────────────────────────────────

interface AddFindingModalProps {
  researchers: Researcher[];
  programs: Program[];
  onClose: () => void;
  onSaved: () => void;
  token: string;
}

function AddFindingModal({ researchers, programs, onClose, onSaved, token }: AddFindingModalProps) {
  const [form, setForm] = useState({
    researcher_id: '',
    program_id: '',
    title: '',
    description: '',
    steps_to_reproduce: '',
    impact: '',
    severity: 'medium',
    category: '',
    status: 'submitted',
    bounty_amount: '',
    cve_id: '',
    reported_at: '',
    public_url: '',
    rejection_reason: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title || !form.researcher_id) {
      toast.error('Title and researcher are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          researcher_id: Number(form.researcher_id),
          program_id: form.program_id ? Number(form.program_id) : null,
          bounty_amount: form.bounty_amount ? Number(form.bounty_amount) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Finding added successfully!');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to save finding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Finding</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 mt-4">
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Researcher *</Label>
            <Select value={form.researcher_id} onValueChange={v => setForm(f => ({ ...f, researcher_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select researcher" /></SelectTrigger>
              <SelectContent>
                {researchers.map(r => <SelectItem key={r.id} value={String(r.id)}>@{r.username}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Program / Target</Label>
            <Select value={form.program_id} onValueChange={v => setForm(f => ({ ...f, program_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
              <SelectContent>
                {programs.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input placeholder="e.g. IDOR in /api/users/:id" value={form.title} onChange={set('title')} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input placeholder="XSS, IDOR, RCE, SQLi..." value={form.category} onChange={set('category')} />
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['critical','high','medium','low','informational'].map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['submitted','triaged','accepted','rejected','duplicate','informative','fixed'].map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Problem Statement / Description</Label>
          <Textarea placeholder="What was the vulnerability?" rows={3} value={form.description} onChange={set('description')} />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <Label>Steps to Reproduce</Label>
          <Textarea placeholder="1. Login as user A..." rows={3} value={form.steps_to_reproduce} onChange={set('steps_to_reproduce')} />
        </div>

        {/* Impact */}
        <div className="space-y-2">
          <Label>Impact</Label>
          <Textarea placeholder="Business / security impact..." rows={2} value={form.impact} onChange={set('impact')} />
        </div>

        {/* Bounty + CVE */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bounty Amount ($)</Label>
            <Input type="number" placeholder="0" value={form.bounty_amount} onChange={set('bounty_amount')} />
          </div>
          <div className="space-y-2">
            <Label>CVE ID</Label>
            <Input placeholder="CVE-2025-XXXX" value={form.cve_id} onChange={set('cve_id')} />
          </div>
        </div>

        {/* Reported date + public URL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Reported Date</Label>
            <Input type="date" value={form.reported_at} onChange={set('reported_at')} />
          </div>
          <div className="space-y-2">
            <Label>Public Disclosure URL</Label>
            <Input placeholder="https://hackerone.com/reports/..." value={form.public_url} onChange={set('public_url')} />
          </div>
        </div>

        {/* Rejection reason */}
        <div className="space-y-2">
          <Label>Rejection Reason</Label>
          <Input placeholder="Out of scope, Duplicate, Insufficient impact..." value={form.rejection_reason} onChange={set('rejection_reason')} />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Internal Notes</Label>
          <Textarea placeholder="Any internal notes..." rows={2} value={form.notes} onChange={set('notes')} />
        </div>

        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button className="gradient-technieum" disabled={saving} onClick={save}>
            {saving ? 'Saving...' : 'Submit Finding'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  finding: Finding;
  onClose: () => void;
  onUpdate: () => void;
  token: string;
}

function DetailModal({ finding, onClose, onUpdate, token }: DetailModalProps) {
  const [statusVal, setStatusVal]   = useState(finding.status);
  const [bountyVal, setBountyVal]   = useState(finding.bounty_amount?.toString() ?? '');
  const [cveVal, setCveVal]         = useState(finding.cve_id ?? '');
  const [rejectVal, setRejectVal]   = useState(finding.rejection_reason ?? '');
  const [saving, setSaving]         = useState(false);

  const patch = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/findings/${finding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: statusVal,
          bounty_amount: bountyVal ? Number(bountyVal) : null,
          cve_id: cveVal || null,
          rejection_reason: rejectVal || null,
        }),
      });
      // Add timeline event
      const evtMap: Record<string, string> = {
        accepted:   bountyVal ? `Accepted — Bounty $${bountyVal} awarded` : 'Accepted',
        rejected:   `Rejected${rejectVal ? ': ' + rejectVal : ''}`,
        triaged:    'Triaged by security team',
        duplicate:  'Marked as duplicate',
        fixed:      'Marked as fixed',
      };
      if (evtMap[statusVal] && statusVal !== finding.status) {
        await fetch(`${API}/findings/${finding.id}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ event: evtMap[statusVal], actor: 'user' }),
        });
      }
      toast.success('Finding updated!');
      onUpdate();
      onClose();
    } catch {
      toast.error('Failed to update finding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold leading-snug pr-6">{finding.title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 mt-2">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {getSeverityBadge(finding.severity)}
          {getStatusBadge(finding.status)}
          {finding.cve_id && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-purple-500/10 text-purple-500 border-purple-500/30">
              {finding.cve_id}
            </span>
          )}
          {finding.bounty_amount && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-500/10 text-green-500 border-green-500/30">
              ${Number(finding.bounty_amount).toLocaleString()}
            </span>
          )}
          {finding.category && (
            <Badge variant="secondary" className="text-xs">{finding.category}</Badge>
          )}
        </div>

        {/* Researcher */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(finding.researcher_name)}`}>
            {initials(finding.researcher_name)}
          </div>
          <div>
            <p className="text-sm font-semibold">@{finding.researcher_name}</p>
            <p className="text-xs text-muted-foreground">
              {finding.program_name} · {finding.platform} · {fmtDate(finding.reported_at || finding.created_at)}
            </p>
          </div>
        </div>

        {/* Problem statement */}
        {finding.description && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-2">Problem Statement</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{finding.description}</p>
          </div>
        )}

        {/* Impact */}
        {finding.impact && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-2">Impact</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{finding.impact}</p>
          </div>
        )}

        {/* Steps */}
        {finding.steps_to_reproduce && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-2">Steps to Reproduce</h4>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-3 rounded-lg">
              {finding.steps_to_reproduce}
            </pre>
          </div>
        )}

        {/* Public URL */}
        {finding.public_url && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-1">Public Disclosure</h4>
            <a href={finding.public_url} target="_blank" rel="noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {finding.public_url}
            </a>
          </div>
        )}

        {/* Rejection */}
        {finding.rejection_reason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-red-500 mb-1">Rejection Reason</h4>
            <p className="text-sm text-muted-foreground">{finding.rejection_reason}</p>
          </div>
        )}

        {/* Timeline */}
        {finding.timeline && finding.timeline.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-3">Timeline</h4>
            <div className="space-y-3">
              {finding.timeline.map(t => {
                const key = t.event.toLowerCase().includes('accept') ? 'accepted'
                  : t.event.toLowerCase().includes('reject') ? 'rejected'
                  : t.event.toLowerCase().includes('triage') ? 'triaged'
                  : t.event.toLowerCase().includes('fix') ? 'fixed'
                  : 'default';
                return (
                  <div key={t.id} className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${TL_COLOR[key]}`} />
                    <div>
                      <p className="text-sm">{t.event}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(t.event_date)} · {t.actor}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Update status section */}
        <div className="border-t border-border/50 pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-primary">Update Status</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusVal} onValueChange={v => setStatusVal(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['submitted','triaged','accepted','rejected','duplicate','informative','fixed'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bounty Amount ($)</Label>
              <Input type="number" placeholder="0" value={bountyVal} onChange={e => setBountyVal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CVE ID</Label>
              <Input placeholder="CVE-2025-XXXX" value={cveVal} onChange={e => setCveVal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Input placeholder="Out of scope..." value={rejectVal} onChange={e => setRejectVal(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="gradient-technieum" disabled={saving} onClick={patch}>
              {saving ? 'Updating...' : 'Update Finding'}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HallofFame() {
  const { token } = useAuth();

  const [tab, setTab] = useState<'findings' | 'leaderboard' | 'rejected'>('findings');
  const [findings, setFindings]       = useState<Finding[]>([]);
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [programs, setPrograms]       = useState<Program[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);

  const [search, setSearch]           = useState('');
  const [filterSev, setFilterSev]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');

  const [showAdd, setShowAdd]         = useState(false);
  const [detailFinding, setDetailFinding] = useState<Finding | null>(null);
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [deletingId, setDeletingId]   = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterSev !== 'all') params.set('severity', filterSev);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterProgram !== 'all') params.set('program_id', filterProgram);

      const [fRes, rRes, pRes, sRes] = await Promise.all([
        fetch(`${API}/findings?${params}`, { headers }),
        fetch(`${API}/researchers`, { headers }),
        fetch(`${API}/programs`, { headers }),
        fetch(`${API}/stats`, { headers }),
      ]);
      setFindings(await fRes.json());
      setResearchers(await rRes.json());
      setPrograms(await pRes.json());
      setStats(await sRes.json());
    } catch {
      toast.error('Failed to load Hall of Fame data.');
    } finally {
      setLoading(false);
    }
  }, [search, filterSev, filterStatus, filterProgram, token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openDetail = async (f: Finding) => {
    const res = await fetch(`${API}/findings/${f.id}`, { headers });
    const data = await res.json();
    setDetailFinding(data);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`${API}/findings/${deletingId}`, { method: 'DELETE', headers });
      toast.success('Finding deleted.');
      setDeletingId(null);
      loadAll();
    } catch {
      toast.error('Failed to delete finding.');
    }
  };

  const rejected = findings.filter(f => f.status === 'rejected' || f.status === 'duplicate');
  const activeFindings = tab === 'rejected'
    ? rejected
    : findings.filter(f => f.status !== 'rejected' && f.status !== 'duplicate');

  const maxBounty = researchers[0]?.total_bounty ?? 1;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <DashboardLayout
      title="Hall of Fame"
      description="Bug bounty & vulnerability hall of fame — every find, every researcher, every reward."
    >
      <div className="space-y-6">

        {/* Stats Cards — matches Findings page style */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: 'Total Bounty',   value: `$${Number(stats.total_bounty).toLocaleString()}`, sev: 'high' },
              { label: 'Accepted',       value: stats.accepted,       sev: 'low' },
              { label: 'CVEs Assigned',  value: stats.cve_count,      sev: 'critical' },
              { label: 'Critical / High',value: stats.critical_high,  sev: 'critical' },
              { label: 'Programs',       value: stats.program_count,  sev: 'medium' },
              { label: 'Researchers',    value: stats.researcher_count, sev: 'informational' },
            ].map(({ label, value, sev }) => {
              const style = SEVERITY_STYLES[sev];
              return (
                <Card key={label} className={`p-4 border ${style.border} ${style.bg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-2xl font-bold ${style.text}`}>{value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                    <AlertTriangle className={`h-5 w-5 ${style.text}`} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Filters + Add button row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search findings, researchers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>

          <Select value={filterSev} onValueChange={setFilterSev}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {['critical','high','medium','low','informational'].map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tab === 'findings' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40 bg-secondary/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {['submitted','triaged','accepted','fixed'].map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filterProgram} onValueChange={setFilterProgram}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary/50">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <Button className="gradient-technieum" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Finding
            </Button>
            {showAdd && (
              <AddFindingModal
                researchers={researchers}
                programs={programs}
                onClose={() => setShowAdd(false)}
                onSaved={loadAll}
                token={token ?? ''}
              />
            )}
          </Dialog>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/50 overflow-x-auto">
          {(['findings', 'leaderboard', 'rejected'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'findings' ? 'All Findings' : t === 'leaderboard' ? 'Leaderboard' : 'Rejected / Duplicates'}
              {t === 'rejected' && rejected.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {rejected.length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* ── LEADERBOARD ── */}
        {tab === 'leaderboard' && (
          <div className="space-y-3">
            {researchers.map((r, i) => {
              const pct = maxBounty > 0 ? (r.total_bounty / maxBounty) * 100 : 0;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold min-w-[32px] text-muted-foreground">
                      {medals[i] ?? `#${i + 1}`}
                    </span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(r.username)}`}>
                      {initials(r.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">@{r.username}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.finding_count} findings · {r.accepted_count} accepted · {r.cve_count} CVEs
                      </p>
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden w-full max-w-xs">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary">
                        ${Number(r.total_bounty).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">total bounty</p>
                    </div>
                  </div>
                </Card>
              );
            })}
            {researchers.length === 0 && (
              <Card className="p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No researchers yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add findings to populate the leaderboard.</p>
              </Card>
            )}
          </div>
        )}

        {/* ── FINDINGS / REJECTED ── */}
        {tab !== 'leaderboard' && (
          <div className="space-y-3">
            {loading ? (
              <Card className="p-12 text-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </Card>
            ) : activeFindings.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No findings found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tab === 'rejected' ? 'No rejected or duplicate findings.' : 'Try adjusting your search or filter criteria.'}
                </p>
              </Card>
            ) : (
              activeFindings.map((f, index) => {
                const isExpanded = expandedId === f.id;
                return (
                  <Card
                    key={f.id}
                    className="animate-fade-in overflow-hidden"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Card header — click to expand */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : f.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getSeverityBadge(f.severity)}
                            {getStatusBadge(f.status)}
                            {f.cve_id && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-purple-500/10 text-purple-500 border-purple-500/30">
                                {f.cve_id}
                              </span>
                            )}
                            {f.bounty_amount && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-500/10 text-green-500 border-green-500/30">
                                ${Number(f.bounty_amount).toLocaleString()}
                              </span>
                            )}
                            {f.category && (
                              <Badge variant="secondary" className="text-xs">{f.category}</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold mt-2">{f.title}</h3>
                          {f.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{f.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => { e.stopPropagation(); setDeletingId(f.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          {isExpanded
                            ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            : <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          }
                        </div>
                      </div>

                      {/* Researcher + program row */}
                      <div className="flex items-center gap-2 mt-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${avatarColor(f.researcher_name)}`}>
                          {initials(f.researcher_name)}
                        </div>
                        <span className="text-xs text-muted-foreground">@{f.researcher_name}</span>
                        {f.program_name && (
                          <span className="text-xs text-muted-foreground">· {f.program_name}</span>
                        )}
                        {f.reported_at && (
                          <span className="text-xs text-muted-foreground ml-auto">{fmtDate(f.reported_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 animate-fade-in">
                        {f.impact && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary mb-2">Impact</h4>
                            <p className="text-sm text-muted-foreground">{f.impact}</p>
                          </div>
                        )}
                        {f.steps_to_reproduce && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary mb-2">Steps to Reproduce</h4>
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-3 rounded-lg">
                              {f.steps_to_reproduce}
                            </pre>
                          </div>
                        )}
                        {f.rejection_reason && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-red-500 mb-1">Rejection Reason</h4>
                            <p className="text-sm text-muted-foreground">{f.rejection_reason}</p>
                          </div>
                        )}
                        {f.public_url && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary mb-1">Public Disclosure</h4>
                            <a href={f.public_url} target="_blank" rel="noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              {f.public_url}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">
                            Reported: {fmtDate(f.reported_at || f.created_at)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => { e.stopPropagation(); openDetail(f); }}
                          >
                            View Full Details & Update
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailFinding} onOpenChange={open => !open && setDetailFinding(null)}>
        {detailFinding && (
          <DetailModal
            finding={detailFinding}
            onClose={() => setDetailFinding(null)}
            onUpdate={loadAll}
            token={token ?? ''}
          />
        )}
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
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
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}