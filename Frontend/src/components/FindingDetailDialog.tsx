import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  Shield,
  FileText,
  Wrench,
  Target,
  Upload,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

type Finding = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  cvss_score: number | null;
  status: string | null;
  created_at: string;
  created_by: string;
  steps_to_reproduce: string | null;
  impact: string | null;
  remediation: string | null;
  affected_component: string | null;
  cwe_id: string | null;
};

type POC = {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
  uploaded_by: string;
};

interface FindingDetailDialogProps {
  finding: Finding | null;
  open: boolean;
  onClose: () => void;
  creatorName?: string;
}

export default function FindingDetailDialog({
  finding,
  open,
  onClose,
  creatorName = 'Unknown',
}: FindingDetailDialogProps) {
  const { user } = useAuth();
  const [pocs, setPocs] = useState<POC[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPocs, setIsLoadingPocs] = useState(false);

  useEffect(() => {
    if (finding && open) {
      fetchPocs();
    }
  }, [finding, open]);

  const fetchPocs = async () => {
    if (!finding) return;
    setIsLoadingPocs(true);
    try {
      const res = await fetch(`${API_BASE}/findings/${finding.id}/pocs`);
      if (!res.ok) throw new Error('Failed to fetch POCs');
      const data = await res.json();
      setPocs(data || []);
    } catch (error) {
      console.error('Error fetching POCs:', error);
    } finally {
      setIsLoadingPocs(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !finding || !user) return;

    const file = e.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, JPG, and PNG files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaded_by', String(user.id));

      const res = await fetch(`${API_BASE}/findings/${finding.id}/pocs`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }

      toast.success('POC image uploaded successfully');
      fetchPocs();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload POC image');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePoc = async (poc: POC) => {
    if (!user || poc.uploaded_by !== String(user.id)) {
      toast.error('You can only delete POCs you uploaded');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/findings/${finding!.id}/pocs/${poc.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Delete failed');
      }

      toast.success('POC image deleted');
      fetchPocs();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete POC image');
    }
  };

  const getPocImageUrl = (filePath: string) => {
    // filePath is stored as /uploads/pocs/filename.png
    return `http://localhost:8080${filePath}`;
  };

  const getSeverityBadge = (severity: string) => {
    const variant = severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
    return <Badge variant={variant} className="text-sm">{severity}</Badge>;
  };

  if (!finding) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getSeverityBadge(finding.severity)}
                {finding.cvss_score && (
                  <Badge variant="outline" className="font-mono">
                    CVSS: {finding.cvss_score}
                  </Badge>
                )}
                <Badge variant={finding.status === 'Open' ? 'destructive' : 'secondary'}>
                  {finding.status}
                </Badge>
              </div>
              <DialogTitle className="text-xl">{finding.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Reported by {creatorName} on {new Date(finding.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 pt-4 space-y-6">
            {finding.description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {finding.description}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {finding.affected_component && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Affected Component
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-sm bg-secondary/50 px-2 py-1 rounded">
                      {finding.affected_component}
                    </code>
                  </CardContent>
                </Card>
              )}
              {finding.cwe_id && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      CWE ID
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-sm bg-secondary/50 px-2 py-1 rounded">
                      {finding.cwe_id}
                    </code>
                  </CardContent>
                </Card>
              )}
            </div>

            {finding.steps_to_reproduce && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Steps to Reproduce
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-4 rounded-lg overflow-x-auto">
                    {finding.steps_to_reproduce}
                  </pre>
                </CardContent>
              </Card>
            )}

            {finding.impact && (
              <Card className="border-destructive/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {finding.impact}
                  </p>
                </CardContent>
              </Card>
            )}

            {finding.remediation && (
              <Card className="border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-green-500">
                    <Wrench className="h-4 w-4" />
                    Remediation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {finding.remediation}
                  </p>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* POC Images Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Proof of Concept ({pocs.length})
                  </CardTitle>
                  <div>
                    <input
                      type="file"
                      id="poc-upload"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label htmlFor="poc-upload">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        asChild
                        disabled={isUploading}
                      >
                        <span>
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload POC
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingPocs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pocs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No POC images uploaded yet</p>
                    <p className="text-sm">Upload screenshots or evidence images</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pocs.map((poc) => (
                      <div
                        key={poc.id}
                        className="relative group rounded-lg overflow-hidden border"
                      >
                        <img
                          src={getPocImageUrl(poc.file_path)}
                          alt={poc.file_name}
                          className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(getPocImageUrl(poc.file_path), '_blank')}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <p className="text-white text-xs truncate">{poc.file_name}</p>
                          <p className="text-white/60 text-xs">
                            {new Date(poc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        {String(user?.id) === poc.uploaded_by && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={() => handleDeletePoc(poc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}