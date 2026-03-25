import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Plus, ExternalLink, ImageIcon, X, FileText, Pencil, Trash2,
  Cloud, Shield, Brain, Network, Globe, Cpu, Layers, Bot, Package,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/trending`
  : 'http://localhost:5000/api/trending';

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',                  label: 'All',                 icon: Layers,  color: 'text-muted-foreground'  },
  { key: 'aws',                  label: 'Cloud (AWS)',          icon: Cloud,   color: 'text-orange-400'        },
  { key: 'azure',                label: 'Cloud (Azure)',        icon: Cloud,   color: 'text-sky-400'           },
  { key: 'sast',                 label: 'SAST',                 icon: Shield,  color: 'text-green-400'         },
  { key: 'llm',                  label: 'LLM',                  icon: Brain,   color: 'text-purple-400'        },
  { key: 'toip',                 label: 'TOIP',                 icon: Network, color: 'text-blue-400'          },
  { key: 'asm',                  label: 'ASM',                  icon: Cpu,     color: 'text-red-400'           },
  { key: 'ai_pentest',           label: 'AI Pentest',           icon: Bot,     color: 'text-pink-400'          },
  { key: 'technieum_products',   label: 'Technieum Products',   icon: Package, color: 'text-primary'           },
  { key: 'others',               label: 'Others',               icon: Globe,   color: 'text-yellow-400'        },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

const CATEGORY_SELECT_OPTIONS = CATEGORIES.filter(c => c.key !== 'all');

const emptyForm = {
  name: '',
  link: '',
  description: '',
  category: 'others' as Exclude<CategoryKey, 'all'>,
  photo: null as File | null,
  photoPreview: null as string | null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Trending() {
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeTab, setActiveTab]       = useState<CategoryKey>('all');
  const [notes, setNotes]               = useState<any[]>([]);
  const [open, setOpen]                 = useState(false);
  const [loading, setLoading]           = useState(false);
  const [deleteId, setDeleteId]         = useState<number | null>(null);
  const [editNote, setEditNote]         = useState<any | null>(null);
  const [form, setForm]                 = useState(emptyForm);
  const [dragOver, setDragOver]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    try {
      const res  = await fetch(API);
      const data = await res.json();
      setNotes(data);
    } catch (err) { console.error('Failed to fetch notes:', err); }
  };

  // ─── Photo handling — fixed for mobile + desktop ──────────────────────────

  const processFile = (file: File) => {
    if (!file) return;
    // Accept all image types including HEIC from iPhone
    if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif|jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
      alert('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, photo: file, photoPreview: ev.target?.result as string }));
    };
    reader.onerror = () => console.error('Failed to read file');
    reader.readAsDataURL(file);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ─── Dialog helpers ───────────────────────────────────────────────────────

  const handleOpenAdd = () => {
    setEditNote(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (note: any) => {
    setEditNote(note);
    setForm({
      name: note.name,
      link: note.link || '',
      description: note.description,
      category: note.category || 'others',
      photo: null,
      photoPreview: note.photoPreview || null,
    });
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditNote(null);
    setForm(emptyForm);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('link', form.link);
      formData.append('description', form.description);
      formData.append('category', form.category);
      if (form.photo) formData.append('photo', form.photo);

      if (editNote) {
        await fetch(`${API}/${editNote.id}`, { method: 'PUT', body: formData });
      } else {
        await fetch(API, { method: 'POST', body: formData });
      }

      handleCloseDialog();
      fetchNotes();
    } catch (err) { console.error('Failed to save note:', err); }
    finally { setLoading(false); }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;
    try {
      await fetch(`${API}/${deleteId}`, { method: 'DELETE' });
      fetchNotes();
    } catch (err) { console.error('Failed to delete note:', err); }
    finally { setDeleteId(null); }
  };

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filtered = notes.filter(n => {
    const matchSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'all' || (n.category || 'others') === activeTab;
    return matchSearch && matchTab;
  });

  const countForTab = (key: CategoryKey) =>
    key === 'all'
      ? notes.length
      : notes.filter(n => (n.category || 'others') === key).length;

  // ─── Category meta ────────────────────────────────────────────────────────

  const getCategoryMeta = (key: string) =>
    CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      title="Trending"
      description='"The quieter you become, the more you are able to hear — what matters most often hides in plain sight."'
    >
      <div className="space-y-5">

        {/* ── Delete Confirmation ── */}
        <AlertDialog open={deleteId !== null} onOpenChange={o => { if (!o) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note</AlertDialogTitle>
              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Add / Edit Dialog ── */}
        <Dialog open={open} onOpenChange={o => { if (!o) handleCloseDialog(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">

              {/* Name */}
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Note name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select
                  value={form.category}
                  onValueChange={v => setForm(f => ({ ...f, category: v as any }))}
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_SELECT_OPTIONS.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <SelectItem key={cat.key} value={cat.key}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                            {cat.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Link */}
              <div className="space-y-2">
                <Label>Link <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="https://..."
                  value={form.link}
                  onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="What's this note about?"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Photo — fixed for mobile + desktop + drag & drop */}
              <div className="space-y-2">
                <Label>Photo</Label>
                {form.photoPreview ? (
                  <div className="relative w-full h-44 rounded-lg overflow-hidden border border-border/50">
                    <img src={form.photoPreview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, photo: null, photoPreview: null }))}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors border border-border/50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`flex flex-col items-center justify-center w-full h-36 rounded-lg border-2 border-dashed cursor-pointer transition-all select-none ${
                      dragOver
                        ? 'border-primary/70 bg-primary/5'
                        : 'border-border/50 hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40'
                    }`}
                  >
                    <ImageIcon className={`h-8 w-8 mb-2 transition-colors ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm text-muted-foreground font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Supports JPG, PNG, HEIC, WebP — from any device</p>
                  </div>
                )}
                {/* Hidden input — capture="environment" helps mobile camera, multiple false for single file */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,image/heic,image/heif"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button
                  className="gradient-technieum"
                  onClick={handleSubmit}
                  disabled={!form.name.trim() || !form.description.trim() || loading}
                >
                  {loading ? 'Saving...' : editNote ? 'Update Note' : 'Save Note'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Top bar: search + add ── */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <Button className="gradient-technieum shrink-0" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Notes
          </Button>
        </div>

        {/* ── Category tabs ── */}
        <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg overflow-x-auto scrollbar-hide flex-nowrap">
          {CATEGORIES.map(cat => {
            const Icon  = cat.icon;
            const count = countForTab(cat.key);
            const isActive = activeTab === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? cat.color : ''}`} />
                {cat.label}
                {count > 0 && (
                  <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Notes list ── */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((note, i) => {
              const catMeta = getCategoryMeta(note.category || 'others');
              const CatIcon = catMeta.icon;
              return (
                <Card
                  key={note.id}
                  glow
                  className="animate-fade-in group"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Photo */}
                      {note.photoPreview && (
                        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border/50">
                          <img
                            src={note.photoPreview}
                            alt={note.name}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-semibold text-base leading-tight truncate">{note.name}</p>
                            {/* Category pill */}
                            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-secondary/50 border-border/40 ${catMeta.color}`}>
                              <CatIcon className="h-3 w-3" />
                              {catMeta.label}
                            </span>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {note.link && (
                              <a
                                href={note.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                title="Open link"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleOpenEdit(note)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(note.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground line-clamp-3">{note.description}</p>

                        {/* Link */}
                        {note.link && (
                          <a
                            href={note.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary/70 hover:text-primary truncate block transition-colors"
                          >
                            {note.link}
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {searchQuery
                ? 'No notes found'
                : activeTab === 'all'
                  ? 'No notes yet'
                  : `No notes in ${getCategoryMeta(activeTab).label}`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? 'Try a different search term'
                : 'Click "Notes" to add your first note'}
            </p>
            {!searchQuery && activeTab !== 'all' && (
              <Button variant="outline" size="sm" className="mt-4" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add to {getCategoryMeta(activeTab).label}
              </Button>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}