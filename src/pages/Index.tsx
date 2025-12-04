import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Bug,
  FileText,
  Users,
  BarChart3,
  BookOpen,
  ChevronRight,
  Lock,
} from 'lucide-react';
import logo from '@/assets/technieum-logo.png';
import { useEffect } from 'react';

export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: Bug,
      title: 'Vulnerability Tracking',
      description: 'Log and manage findings with severity, CVSS scores, and detailed remediation guidance',
    },
    {
      icon: FileText,
      title: 'Automated Reports',
      description: 'Generate technical and management reports with a single click',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Assign multiple testers to projects and track progress in real-time',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Visualize security posture with interactive charts and insights',
    },
    {
      icon: BookOpen,
      title: 'Knowledge Base',
      description: 'Build and share security techniques, tools, and OWASP checklists',
    },
    {
      icon: Lock,
      title: 'Role-Based Access',
      description: 'Admin, Manager, and Tester roles with appropriate permissions',
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Technieum" className="h-10 w-auto" />
              <div>
                <span className="font-bold text-lg text-gradient">OffSec Operations</span>
                <Badge variant="secondary" className="ml-2 text-xs">Beta</Badge>
              </div>
            </div>
            <Button variant="gradient" onClick={() => navigate('/login')}>
              Sign In
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </nav>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <Badge variant="outline" className="mb-6 px-4 py-1">
              <Shield className="h-3 w-3 mr-2" />
              Penetration Testing Management
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Streamline Your <span className="text-gradient glow-text">Pentest</span> Operations
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A unified platform for managing penetration testing projects, tracking vulnerabilities, 
              generating reports, and fostering collaboration among security professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="gradient" onClick={() => navigate('/login')} className="text-lg px-8">
                Get Started
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A comprehensive suite of tools designed specifically for offensive security teams
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                glow
                className="animate-slide-up bg-card/50 backdrop-blur-sm"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20">
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Pentest Workflow?</h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join security teams who are already using Technieum OffSec Operations to deliver 
                better pentests faster.
              </p>
              <Button size="lg" variant="gradient" onClick={() => navigate('/login')} className="px-8">
                Start Now
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Technieum" className="h-6 w-auto" />
              <span className="text-sm text-muted-foreground">
                © 2024 Technieum. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
