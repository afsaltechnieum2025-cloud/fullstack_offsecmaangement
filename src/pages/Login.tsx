import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, User, AlertCircle, Mail, Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/technieum-logo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Welcome Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-background relative overflow-hidden flex-col justify-center items-center p-12">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-hero-gradient opacity-30" />
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to
          </h1>
          <h2 className="text-3xl font-bold text-gradient mb-6">
            Technieum OffSec
          </h2>
          <p className="text-xl text-muted-foreground mb-12">
            Let's streamline your pentest operations
          </p>
          
          {/* Role Cards */}
          <div className="space-y-4 text-left">
            <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h3 className="text-primary font-semibold mb-1">Manager</h3>
              <p className="text-sm text-muted-foreground">Be on top of your projects</p>
            </div>
            <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h3 className="text-primary font-semibold mb-1">Pentester</h3>
              <p className="text-sm text-muted-foreground">Let your team focus on finding bugs</p>
            </div>
            <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h3 className="text-primary font-semibold mb-1">Admin</h3>
              <p className="text-sm text-muted-foreground">Seamless platform management</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-background via-card to-background relative">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-destructive/5" />
        
        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="Technieum" className="h-12 w-auto" />
            </div>
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur-xl animate-slide-up">
            <CardHeader className="space-y-1 pb-4 text-center">
              <CardTitle className="text-2xl text-gradient">LOGIN</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="username">Email</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pr-10 bg-secondary/50 border-border focus:border-primary"
                      required
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 bg-secondary/50 border-border focus:border-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-secondary accent-primary"
                    />
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                  <button type="button" className="text-sm text-muted-foreground hover:text-primary">
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-technieum text-primary-foreground font-semibold"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'LOGIN'
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Demo Credentials:</p>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-muted-foreground">Tester: <span className="text-foreground">robertaaron / robert123</span></p>
                  <p className="text-muted-foreground">Admin: <span className="text-foreground">robertadmin / robert123</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
