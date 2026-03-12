import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, ExternalLink, ImageIcon, X, FileText, Pencil, Trash2 } from 'lucide-react';

const API = 'http://localhost:5000/api/trending';

const emptyForm = {
  name: '',
  link: '',
  description: '',
  photo: null as File | null,
  photoPreview: null as string | null,
};

export default function Trending() {
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setForm(f => ({ ...f, photo: file, photoPreview: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  // Open dialog for adding
  const handleOpenAdd = () => {
    setEditNote(null);
    setForm(emptyForm);
    setOpen(true);
  };

  // Open dialog for editing
  const handleOpenEdit = (note: any) => {
    setEditNote(note);
    setForm({
      name: note.name,
      link: note.link || '',
      description: note.description,
      photo: null,
      photoPreview: note.photoPreview || null,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('link', form.link);
      formData.append('description', form.description);
      if (form.photo) formData.append('photo', form.photo);

      if (editNote) {
        // Edit mode — PUT request
        await fetch(`${API}/${editNote.id}`, { method: 'PUT', body: formData });
      } else {
        // Add mode — POST request
        await fetch(API, { method: 'POST', body: formData });
      }

      setForm(emptyForm);
      setEditNote(null);
      setOpen(false);
      fetchNotes();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;
    try {
      await fetch(`${API}/${deleteId}`, { method: 'DELETE' });
      fetchNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = notes.filter(n =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Trending"
      description='"The quieter you become, the more you are able to hear — what matters most often hides in plain sight."'
    >
      <div className="space-y-6">

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this note? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add / Edit Dialog */}
        <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setEditNote(null); setForm(emptyForm); } else setOpen(true); }}>

          {/* Top bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Button variant="gradient" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Notes
            </Button>
          </div>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Note name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Link <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="https://..."
                  value={form.link}
                  onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="What's this note about?"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Photo</Label>
                {form.photoPreview ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border/50">
                    <img src={form.photoPreview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, photo: null, photoPreview: null }))}
                      className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/40"
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload photo</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setOpen(false); setEditNote(null); setForm(emptyForm); }}>
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleSubmit}
                  disabled={!form.name.trim() || !form.description.trim() || loading}
                >
                  {loading ? 'Saving...' : editNote ? 'Update Note' : 'Save Note'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notes List */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((note, i) => (
              <Card
                key={note.id}
                glow
                className="animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {note.photoPreview && (
                      <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border/50">
                        <img src={note.photoPreview} alt={note.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-base leading-tight">{note.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {note.link && (
                            <a href={note.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(note)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteId(note.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{note.description}</p>
                      {note.link && (
                        <a href={note.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary/70 hover:text-primary truncate block transition-colors">
                          {note.link}
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? 'Try a different search term' : 'Click "Notes" to add your first note'}
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}