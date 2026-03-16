import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil } from 'lucide-react';

export default function ContentCreation() {
  return (
    <DashboardLayout
      title="Content Creation"
      description='"Great content is not written, it is assembled — from research, clarity, and intention."'
    >
      <Card className="p-12 text-center">
        <Pencil className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Welcome to Content Creation</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your workspace for checklists, templates, and content workflows is being set up.
        </p>
      </Card>
    </DashboardLayout>
  );
}