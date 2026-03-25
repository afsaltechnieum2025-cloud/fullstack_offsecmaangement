import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Search, Plus, Filter, AlertTriangle, Trophy,
  ChevronDown, ChevronUp, ExternalLink, Trash2, X,
  ShieldCheck, Bug, Star, Award, TrendingUp,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
type Status = 'submitted' | 'triaged' | 'accepted' | 'rejected' | 'duplicate' | 'informative' | 'fixed';

interface HofFinding {
  id: number;
  user_id: number;
  project_id: string | null;
  researcher_name: string;
  researcher_full_name: string | null;
  researcher_role: string | null;
  program_name: string | null;
  platform: string | null;
  title: string;
  description: string | null;
  steps_to_reproduce: string | null;
  impact: string | null;
  severity: Severity;
  category: string | null;
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

interface AppUser {
  id: number;
  name: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  platform: string | null;
  status: string;
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

interface LeaderboardEntry {
  user_id: number;
  username: string;
  full_name: string | null;
  role: string;
  total_bounty: number;
  cve_count: number;
  finding_count: number;
  accepted_count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const HOF_API = `${API}/wof`;

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  low: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  informational: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
};

const STATUS_STYLES: Record<string, string> = {
  accepted: 'bg-green-500/10 text-green-500 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/30',
  submitted: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  triaged: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  duplicate: 'bg-secondary text-muted-foreground border-border',
  informative: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  fixed: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
};

const TL_COLOR: Record<string, string> = {
  accepted: 'bg-green-500', rejected: 'bg-red-500',
  triaged: 'bg-blue-500', fixed: 'bg-teal-500', default: 'bg-muted-foreground',
};

const AVATAR_COLORS = [
  'bg-red-500/20 text-red-400', 'bg-orange-500/20 text-orange-400',
  'bg-yellow-500/20 text-yellow-400', 'bg-green-500/20 text-green-400',
  'bg-blue-500/20 text-blue-400', 'bg-purple-500/20 text-purple-400',
  'bg-pink-500/20 text-pink-400', 'bg-teal-500/20 text-teal-400',
];

const avatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
const initials = (name: string) => (name ?? '?').slice(0, 2).toUpperCase();
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const displayName = (f: HofFinding) =>
  f.researcher_full_name
    ? `${f.researcher_full_name} (@${f.researcher_name})`
    : `@${f.researcher_name}`;

const getSeverityBadge = (severity: string) => {
  const s = severity?.toLowerCase() ?? 'informational';
  const style = SEVERITY_STYLES[s] ?? SEVERITY_STYLES.informational;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
};

const getStatusBadge = (status: string) => {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.submitted;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ─── Add Finding Modal — FULL FIELDS ─────────────────────────────────────────

function AddFindingModal({ users, projects, onClose, onSaved, token }: {
  users: AppUser[]; projects: Project[];
  onClose: () => void; onSaved: () => void; token: string;
}) {
  const [form, setForm] = useState({
    user_id: '',
    project_id: '',
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

  const setField = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title.trim() || !form.user_id) {
      toast.error('Title and researcher are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${HOF_API}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: Number(form.user_id),
          project_id: form.project_id === 'none' || !form.project_id ? null : form.project_id,
          title: form.title,
          description: form.description || null,
          steps_to_reproduce: form.steps_to_reproduce || null,
          impact: form.impact || null,
          severity: form.severity,
          category: form.category || null,
          status: form.status,
          bounty_amount: form.bounty_amount ? Number(form.bounty_amount) : null,
          cve_id: form.cve_id || null,
          reported_at: form.reported_at || null,
          public_url: form.public_url || null,
          rejection_reason: form.rejection_reason || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      toast.success('Finding added to Hall of Fame!');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save finding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Hall of Fame Finding</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 mt-4">

        {/* Row 1: Researcher + Project */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Researcher *</Label>
            <Select value={form.user_id} onValueChange={v => setForm(f => ({ ...f, user_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select researcher" /></SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.full_name ? `${u.full_name} (@${u.name})` : `@${u.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Project / Target</Label>
            <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            placeholder="e.g. IDOR in /api/users/:id allows horizontal privilege escalation"
            value={form.title}
            onChange={setField('title')}
          />
        </div>

        {/* Row 2: Category + Severity + Status */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Input placeholder="XSS, IDOR, RCE, SQLi…" value={form.category} onChange={setField('category')} />
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['critical', 'high', 'medium', 'low', 'informational'].map(s => (
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
                {['submitted', 'triaged', 'accepted', 'rejected', 'duplicate', 'informative', 'fixed'].map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description / Problem Statement</Label>
          <Textarea
            placeholder="What was the vulnerability? Describe the issue clearly."
            rows={3}
            value={form.description}
            onChange={setField('description')}
          />
        </div>

        {/* Steps to Reproduce */}
        <div className="space-y-2">
          <Label>Steps to Reproduce</Label>
          <Textarea
            placeholder="1. Login as user A&#10;2. Send GET /api/users/101&#10;3. Response returns user B full profile"
            rows={3}
            value={form.steps_to_reproduce}
            onChange={setField('steps_to_reproduce')}
          />
        </div>

        {/* Impact */}
        <div className="space-y-2">
          <Label>Impact</Label>
          <Textarea
            placeholder="Business / security impact of this vulnerability…"
            rows={2}
            value={form.impact}
            onChange={setField('impact')}
          />
        </div>

        {/* Row 3: Bounty + CVE */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bounty Amount ($)</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.bounty_amount}
              onChange={setField('bounty_amount')}
            />
          </div>
          <div className="space-y-2">
            <Label>CVE ID</Label>
            <Input
              placeholder="CVE-2025-XXXX"
              value={form.cve_id}
              onChange={setField('cve_id')}
            />
          </div>
        </div>

        {/* Row 4: Reported Date + Public URL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Reported Date</Label>
            <Input
              type="date"
              value={form.reported_at}
              onChange={setField('reported_at')}
            />
          </div>
          <div className="space-y-2">
            <Label>Public Disclosure URL</Label>
            <Input
              placeholder="https://hackerone.com/reports/…"
              value={form.public_url}
              onChange={setField('public_url')}
            />
          </div>
        </div>

        {/* Rejection Reason */}
        <div className="space-y-2">
          <Label>Rejection Reason <span className="text-muted-foreground text-xs">(if rejected)</span></Label>
          <Input
            placeholder="Out of scope, Duplicate, Insufficient impact…"
            value={form.rejection_reason}
            onChange={setField('rejection_reason')}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Internal Notes</Label>
          <Textarea
            placeholder="Any internal notes for the team…"
            rows={2}
            value={form.notes}
            onChange={setField('notes')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button className="gradient-technieum" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Submit Finding'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ finding, onClose, onUpdate, token }: {
  finding: HofFinding; onClose: () => void; onUpdate: () => void; token: string;
}) {
  const [statusVal, setStatusVal] = useState(finding.status);
  const [bountyVal, setBountyVal] = useState(finding.bounty_amount?.toString() ?? '');
  const [cveVal, setCveVal] = useState(finding.cve_id ?? '');
  const [rejectVal, setRejectVal] = useState(finding.rejection_reason ?? '');
  const [saving, setSaving] = useState(false);

  const patch = async () => {
    setSaving(true);
    try {
      await fetch(`${HOF_API}/findings/${finding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: statusVal,
          bounty_amount: bountyVal ? Number(bountyVal) : null,
          cve_id: cveVal || null,
          rejection_reason: rejectVal || null,
        }),
      });
      if (statusVal !== finding.status) {
        const evtMap: Record<string, string> = {
          accepted: bountyVal ? `Accepted — Bounty $${bountyVal} awarded` : 'Accepted',
          rejected: `Rejected${rejectVal ? ': ' + rejectVal : ''}`,
          triaged: 'Triaged by security team',
          fixed: 'Marked as fixed',
        };
        if (evtMap[statusVal]) {
          await fetch(`${HOF_API}/findings/${finding.id}/timeline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ event: evtMap[statusVal], actor: 'user' }),
          });
        }
      }
      toast.success('Finding updated!');
      onUpdate();
      onClose();
    } catch { toast.error('Failed to update.'); }
    finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold leading-snug pr-6">{finding.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-5 mt-2">
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
          {finding.category && <Badge variant="secondary" className="text-xs">{finding.category}</Badge>}
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(finding.researcher_name)}`}>
            {initials(finding.researcher_name)}
          </div>
          <div>
            <p className="text-sm font-semibold">{displayName(finding)}</p>
            <p className="text-xs text-muted-foreground">
              {finding.program_name && `${finding.program_name} · `}
              {fmtDate(finding.reported_at || finding.created_at)}
            </p>
          </div>
        </div>

        {finding.description && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-2">Problem Statement</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{finding.description}</p>
          </div>
        )}
        {finding.impact && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-2">Impact</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{finding.impact}</p>
          </div>
        )}
        {finding.steps_to_reproduce && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-2">Steps to Reproduce</h4>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-3 rounded-lg">
              {finding.steps_to_reproduce}
            </pre>
          </div>
        )}
        {finding.public_url && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-1">Public Disclosure</h4>
            <a href={finding.public_url} target="_blank" rel="noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />{finding.public_url}
            </a>
          </div>
        )}
        {finding.rejection_reason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-red-500 mb-1">Rejection Reason</h4>
            <p className="text-sm text-muted-foreground">{finding.rejection_reason}</p>
          </div>
        )}

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

        {/* Update status */}
        <div className="border-t border-border/50 pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-primary">Update Status</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusVal} onValueChange={v => setStatusVal(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['submitted', 'triaged', 'accepted', 'rejected', 'duplicate', 'informative', 'fixed'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bounty ($)</Label>
              <Input type="number" placeholder="0" value={bountyVal} onChange={e => setBountyVal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CVE ID</Label>
              <Input placeholder="CVE-2025-XXXX" value={cveVal} onChange={e => setCveVal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Input placeholder="Out of scope…" value={rejectVal} onChange={e => setRejectVal(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="gradient-technieum" disabled={saving} onClick={patch}>
              {saving ? 'Updating…' : 'Update Finding'}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Researcher Profile Modal ─────────────────────────────────────────────────

function ResearcherModal({ entry, allFindings, onClose, onOpenFinding }: {
  entry: LeaderboardEntry;
  allFindings: HofFinding[];
  onClose: () => void;
  onOpenFinding: (f: HofFinding) => void;
}) {
  const userFindings = allFindings.filter(f => f.user_id === entry.user_id);
  const cves = userFindings.filter(f => f.cve_id);

  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(entry.username)}`}>
            {initials(entry.username)}
          </div>
          <div>
            <p className="font-bold">{entry.full_name ?? `@${entry.username}`}</p>
            <p className="text-xs text-muted-foreground font-normal capitalize">
              @{entry.username} · {entry.role}
            </p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5 mt-2">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Bounty', value: `$${Number(entry.total_bounty).toLocaleString()}`, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            { label: 'Findings', value: entry.finding_count, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
            { label: 'Accepted', value: entry.accepted_count, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
            { label: 'CVEs', value: entry.cve_count, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} className={`rounded-lg border ${border} ${bg} p-3 text-center`}>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {cves.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">CVEs Assigned</p>
            <div className="flex flex-wrap gap-2">
              {cves.map(f => (
                <button key={f.id} onClick={() => { onClose(); onOpenFinding(f); }}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 transition-colors">
                  {f.cve_id}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            All Findings ({userFindings.length})
          </p>
          {userFindings.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No findings yet</p>
          ) : (
            <div className="space-y-2">
              {userFindings.map(f => (
                <button key={f.id} onClick={() => { onClose(); onOpenFinding(f); }}
                  className="w-full text-left p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-all group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getSeverityBadge(f.severity)}
                        {getStatusBadge(f.status)}
                        {f.cve_id && <span className="text-xs font-mono text-purple-400">{f.cve_id}</span>}
                        {f.bounty_amount && <span className="text-xs text-green-400 font-semibold">${Number(f.bounty_amount).toLocaleString()}</span>}
                      </div>
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{f.title}</p>
                      {f.program_name && <p className="text-xs text-muted-foreground mt-0.5">{f.program_name}</p>}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-1 transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{fmtDate(f.reported_at || f.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Finding Card ─────────────────────────────────────────────────────────────

function FindingCard({ f, index, onDetail, onDelete }: {
  f: HofFinding; index: number;
  onDetail: (f: HofFinding) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="animate-fade-in overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(p => !p)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
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
              {f.category && <Badge variant="secondary" className="text-xs">{f.category}</Badge>}
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            {f.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{f.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onDelete(f.id); }}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            {expanded
              ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
              : <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${avatarColor(f.researcher_name)}`}>
            {initials(f.researcher_name)}
          </div>
          <span className="text-xs text-muted-foreground">{displayName(f)}</span>
          {f.program_name && <span className="text-xs text-muted-foreground">· {f.program_name}</span>}
          {f.reported_at && <span className="text-xs text-muted-foreground ml-auto">{fmtDate(f.reported_at)}</span>}
        </div>
      </div>

      {expanded && (
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
                <ExternalLink className="h-3 w-3" />{f.public_url}
              </a>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              Reported: {fmtDate(f.reported_at || f.created_at)}
            </span>
            <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); onDetail(f); }}>
              View Full Details & Update
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HallofFame() {
  const { token, user } = useAuth();

  type TabType = 'all' | 'accepted' | 'cves' | 'rejected' | 'leaderboard';
  const [tab, setTab] = useState<TabType>('all');
  const [findings, setFindings] = useState<HofFinding[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const [showAdd, setShowAdd] = useState(false);
  const [detailFinding, setDetailFinding] = useState<HofFinding | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [profileEntry, setProfileEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterSev !== 'all') params.set('severity', filterSev);
      if (filterProject !== 'all') params.set('project_id', filterProject);

      const [fRes, uRes, pRes, sRes, lRes] = await Promise.all([
        fetch(`${HOF_API}/findings?${params}`, { headers }),
        fetch(`${API}/users`, { headers }),
        fetch(`${HOF_API}/projects`, { headers }),
        fetch(`${HOF_API}/stats`, { headers }),
        fetch(`${HOF_API}/leaderboard`, { headers }),
      ]);

      if (fRes.ok) setFindings(await fRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (pRes.ok) setProjects(await pRes.json());
      if (sRes.ok) setStats(await sRes.json());
      if (lRes.ok) setLeaderboard(await lRes.json());
    } catch { toast.error('Failed to load Hall of Fame data.'); }
    finally { setLoading(false); }
  }, [search, filterSev, filterProject, token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openDetail = async (f: HofFinding) => {
    try {
      const res = await fetch(`${HOF_API}/findings/${f.id}`, { headers });
      setDetailFinding(res.ok ? await res.json() : f);
    } catch { setDetailFinding(f); }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`${HOF_API}/findings/${deletingId}`, { method: 'DELETE', headers });
      toast.success('Finding deleted.');
      setDeletingId(null);
      loadAll();
    } catch { toast.error('Failed to delete.'); }
  };

  const tabFindings: Record<TabType, HofFinding[]> = {
    all: findings.filter(f => f.status !== 'rejected' && f.status !== 'duplicate'),
    accepted: findings.filter(f => f.status === 'accepted' || f.status === 'fixed'),
    cves: findings.filter(f => !!f.cve_id),
    rejected: findings.filter(f => f.status === 'rejected' || f.status === 'duplicate'),
    leaderboard: [],
  };

  const medals = ['🥇', '🥈', '🥉'];

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'all', label: 'All Findings', icon: <Bug className="h-3.5 w-3.5" />, count: tabFindings.all.length },
    { key: 'accepted', label: 'Accepted', icon: <ShieldCheck className="h-3.5 w-3.5" />, count: tabFindings.accepted.length },
    { key: 'cves', label: 'CVEs', icon: <Star className="h-3.5 w-3.5" />, count: tabFindings.cves.length },
    { key: 'rejected', label: 'Rejected', icon: <X className="h-3.5 w-3.5" />, count: tabFindings.rejected.length },
    { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="h-3.5 w-3.5" /> },
  ];

  return (
    <DashboardLayout
      title="Hall of Fame"
      description="Bug bounty & vulnerability hall of fame — every find, every researcher, every reward."
    >
      <div className="space-y-6">

        {/* ── Stats Cards ── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: 'Total Bounty', value: `$${Number(stats.total_bounty).toLocaleString()}`, sev: 'high' },
              { label: 'Accepted', value: stats.accepted, sev: 'low' },
              { label: 'CVEs Assigned', value: stats.cve_count, sev: 'critical' },
              { label: 'Critical / High', value: stats.critical_high, sev: 'critical' },
              { label: 'Projects', value: stats.program_count, sev: 'medium' },
              { label: 'Researchers', value: stats.researcher_count, sev: 'informational' },
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

        {/* ── Filters + Add ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search findings, researchers…" value={search}
              onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary/50" />
          </div>
          <Select value={filterSev} onValueChange={setFilterSev}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50">
              <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {['critical', 'high', 'medium', 'low', 'informational'].map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary/50">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <Button className="gradient-technieum" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-2" />New Finding
            </Button>
            {showAdd && (
              <AddFindingModal
                users={users} projects={projects}
                onClose={() => setShowAdd(false)}
                onSaved={loadAll} token={token ?? ''}
              />
            )}
          </Dialog>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg w-fit flex-wrap">
          {tabs.map(({ key, label, icon, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tab === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}>
              {icon}
              {label}
              {count !== undefined && count > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === key ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Leaderboard ── */}
        {tab === 'leaderboard' && (
          <div className="space-y-3">
            {loading ? (
              <Card className="p-12 text-center"><p className="text-sm text-muted-foreground">Loading leaderboard…</p></Card>
            ) : leaderboard.length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No researchers yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add findings to populate the leaderboard.</p>
              </Card>
            ) : leaderboard.map((r, i) => {
              const maxB = leaderboard[0]?.total_bounty ?? 1;
              const pct = maxB > 0 ? (r.total_bounty / maxB) * 100 : 0;
              return (
                <Card key={r.user_id}
                  className="p-4 cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => setProfileEntry(r)}>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold min-w-[32px] text-muted-foreground">
                      {medals[i] ?? `#${i + 1}`}
                    </span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(r.username)}`}>
                      {initials(r.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {r.full_name ?? `@${r.username}`}
                        </p>
                        <span className="text-xs text-muted-foreground">@{r.username}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{r.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.finding_count} findings · {r.accepted_count} accepted · {r.cve_count} CVEs
                      </p>
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden w-full max-w-xs">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary">${Number(r.total_bounty).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">total bounty</p>
                      <p className="text-xs text-primary/60 group-hover:text-primary transition-colors mt-1">Click to view →</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Findings list ── */}
        {tab !== 'leaderboard' && (
          <div className="space-y-3">
            {loading ? (
              <Card className="p-12 text-center"><p className="text-sm text-muted-foreground">Loading findings…</p></Card>
            ) : tabFindings[tab].length === 0 ? (
              <Card className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {tab === 'accepted' ? 'No accepted findings yet'
                    : tab === 'cves' ? 'No CVEs assigned yet'
                      : tab === 'rejected' ? 'No rejected or duplicate findings'
                        : 'No findings found'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tab === 'all' ? 'Add your first finding to get started.' : 'Findings will appear here once added.'}
                </p>
              </Card>
            ) : tabFindings[tab].map((f, index) => (
              <FindingCard
                key={f.id} f={f} index={index}
                onDetail={openDetail}
                onDelete={id => setDeletingId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailFinding} onOpenChange={open => !open && setDetailFinding(null)}>
        {detailFinding && (
          <DetailModal finding={detailFinding} onClose={() => setDetailFinding(null)}
            onUpdate={loadAll} token={token ?? ''} />
        )}
      </Dialog>

      {/* ── Researcher Profile Dialog ── */}
      <Dialog open={!!profileEntry} onOpenChange={open => !open && setProfileEntry(null)}>
        {profileEntry && (
          <ResearcherModal
            entry={profileEntry}
            allFindings={findings}
            onClose={() => setProfileEntry(null)}
            onOpenFinding={f => { setProfileEntry(null); setTimeout(() => openDetail(f), 100); }}
          />
        )}
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />Delete Finding
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This cannot be undone.</p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}