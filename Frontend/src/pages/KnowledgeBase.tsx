import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { knowledgeBase, owaspChecklist, users } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Plus,
  BookOpen,
  CheckSquare,
  Wrench,
  ExternalLink,
  FileText,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function KnowledgeBase() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [checklistProgress, setChecklistProgress] = useState<Record<string, boolean>>({});

  const canAddArticles = user?.role === 'manager' || user?.role === 'admin';

  const filteredKnowledge = knowledgeBase.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleChecklistItem = (category: string, item: string) => {
    const key = `${category}-${item}`;
    setChecklistProgress(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getCategoryProgress = (category: string, items: string[]) => {
    const completed = items.filter(item => checklistProgress[`${category}-${item}`]).length;
    return { completed, total: items.length };
  };

  return (
    <DashboardLayout
      title="Knowledge Base"
      description="Security testing resources, techniques, and OWASP checklist"
    >
      <Tabs defaultValue="articles" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="articles" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              OWASP Checklist
            </TabsTrigger>
          </TabsList>
          {canAddArticles && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="gradient">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Knowledge Base Article</DialogTitle>
                </DialogHeader>
                <form className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input placeholder="Article title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input placeholder="e.g., Data Validation, Authentication" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Detailed description and documentation" rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tools (comma-separated)</Label>
                    <Input placeholder="e.g., Burp Suite, SQLMap, OWASP ZAP" />
                  </div>
                  <div className="space-y-2">
                    <Label>Techniques (comma-separated)</Label>
                    <Input placeholder="e.g., SQL Injection, XSS, CSRF" />
                  </div>
                  <div className="space-y-2">
                    <Label>References (one URL per line)</Label>
                    <Textarea placeholder="https://example.com/resource" rows={2} />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline">Cancel</Button>
                    <Button type="submit" variant="gradient">Submit Article</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="articles" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredKnowledge.map((item, index) => {
              const author = users.find(u => u.id === item.submittedBy);
              return (
                <Card
                  key={item.id}
                  glow
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="secondary" className="mb-2">{item.category}</Badge>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </div>
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{item.description}</p>

                    {item.tools && item.tools.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          Tools
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {item.tools.map((tool, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.techniques && item.techniques.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-primary mb-2">Techniques</p>
                        <div className="flex flex-wrap gap-2">
                          {item.techniques.map((tech, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.references && item.references.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-primary mb-2">References</p>
                        <div className="space-y-1">
                          {item.references.map((ref, i) => (
                            <a
                              key={i}
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {ref}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                      <span>By {author?.username}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredKnowledge.length === 0 && (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No articles found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {canAddArticles ? 'Try adjusting your search or add a new article' : 'Try adjusting your search criteria'}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                OWASP Web Application Security Testing Checklist
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comprehensive checklist based on OWASP testing guidelines. Track your testing progress for each engagement.
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {owaspChecklist.map((section) => {
                  const progress = getCategoryProgress(section.category, section.items);
                  const progressPercent = Math.round((progress.completed / progress.total) * 100);

                  return (
                    <AccordionItem
                      key={section.category}
                      value={section.category}
                      className="border border-border/50 rounded-lg px-4 bg-secondary/20"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">{section.category}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {progress.completed}/{progress.total}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {section.items.map((item) => {
                            const key = `${section.category}-${item}`;
                            const isChecked = checklistProgress[key] || false;

                            return (
                              <label
                                key={item}
                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleChecklistItem(section.category, item)}
                                  className="mt-0.5"
                                />
                                <span className={`text-sm ${isChecked ? 'text-muted-foreground line-through' : ''}`}>
                                  {item}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
