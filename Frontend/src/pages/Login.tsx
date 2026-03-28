import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Mail, Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/technieum-logo.png';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─── Floating Orb Particle ─────────────────────────────────────────────── */
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

function ParticleField() {
  const particles: Particle[] = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 12 + 8,
    delay: Math.random() * 6,
    color: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#ef4444' : '#fbbf24',
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-0"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            animation: `floatParticle ${p.duration}s ${p.delay}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Animated Grid Lines ────────────────────────────────────────────────── */
function ScanGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#f97316" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

/* ─── Scan Line ──────────────────────────────────────────────────────────── */
function ScanLine() {
  return (
    <div
      className="absolute left-0 right-0 h-px pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent, #f97316 30%, #ef4444 70%, transparent)',
        animation: 'scanLine 6s linear infinite',
        opacity: 0.35,
        top: 0,
      }}
    />
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val && !EMAIL_REGEX.test(val)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (val && val.length < 8) {
      setPasswordHint('Password must be at least 8 characters');
    } else {
      setPasswordHint('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setPasswordHint('Password must be at least 8 characters');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { error } = await login(email, password);
      if (error) {
        setError(error);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
      <style>{`
        @keyframes floatParticle {
          0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
          20%  { opacity: 0.8; }
          50%  { transform: translateY(-60px) translateX(20px); opacity: 0.5; }
          80%  { opacity: 0.3; }
          100% { transform: translateY(-120px) translateX(-10px); opacity: 0; }
        }
        @keyframes scanLine {
          0%   { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50%       { transform: scale(1.2); opacity: 0.25; }
        }
        @keyframes btnGlow {
          0%, 100% { box-shadow: 0 0 10px #f9731460, 0 4px 20px #ef444430; }
          50%       { box-shadow: 0 0 22px #f9731480, 0 4px 30px #ef444450, 0 0 50px #f9731425; }
        }
        @keyframes btnShimmer {
          0%   { left: -100%; }
          60%  { left: 120%; }
          100% { left: 120%; }
        }

        .role-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .role-card:hover {
          transform: translateX(6px);
          box-shadow: -3px 0 0 #f97316, 0 0 20px #f9731620;
          border-color: #f9731650 !important;
        }

        .login-btn {
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          animation: btnGlow 3s ease-in-out infinite;
        }
        .login-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 55%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.20),
            transparent
          );
          transform: skewX(-18deg);
          animation: btnShimmer 3s ease-in-out infinite;
        }
        .login-btn:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 8px 30px #f9731460, 0 0 50px #ef444435 !important;
          filter: brightness(1.1);
          animation: none;
        }
        .login-btn:active {
          transform: translateY(0) scale(0.99);
          filter: brightness(0.95);
        }
        .login-btn:disabled {
          animation: none;
        }
        .validation-msg {
          animation: fadeUp 0.25s ease both;
        }
      `}</style>

      <div className="min-h-screen flex flex-col">
        <div className="flex flex-1">

          {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
          <div className="hidden lg:flex lg:w-1/2 bg-background relative overflow-hidden flex-col justify-center items-center p-12">
            <ScanGrid />
            <ScanLine />
            <ParticleField />

            <div
              className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
              style={{ animation: 'orbPulse 8s ease-in-out infinite' }}
            />
            <div
              className="absolute bottom-1/4 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl"
              style={{ animation: 'orbPulse 10s 2s ease-in-out infinite' }}
            />

            <div className="relative z-10 text-center max-w-md">
              <h1
                className="text-4xl font-bold mb-4"
                style={{ animation: mounted ? 'slideInLeft 0.8s 0.1s ease both' : 'none', opacity: mounted ? 1 : 0 }}
              >
                Welcome to
              </h1>
              <h2
                className="text-3xl font-bold text-gradient mb-6"
                style={{ animation: mounted ? 'slideInLeft 0.8s 0.25s ease both' : 'none', opacity: mounted ? 1 : 0 }}
              >
                Technieum OffSec
              </h2>
              <p
                className="text-xl text-muted-foreground mb-12"
                style={{ animation: mounted ? 'fadeUp 0.8s 0.4s ease both' : 'none', opacity: mounted ? 1 : 0 }}
              >
                Let's streamline your pentest operations
              </p>

              <div className="space-y-4 text-left">
                {[
                  { role: 'Manager', desc: 'Be on top of your projects', delay: '0.55s' },
                  { role: 'Pentester', desc: 'Let your team focus on finding bugs', delay: '0.7s' },
                  { role: 'Admin', desc: 'Seamless platform management', delay: '0.85s' },
                ].map(({ role, desc, delay }) => (
                  <div
                    key={role}
                    className="role-card bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 relative overflow-hidden"
                    style={{ animation: mounted ? `slideInLeft 0.7s ${delay} ease both` : 'none', opacity: mounted ? 1 : 0 }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
                      style={{ background: 'linear-gradient(180deg, #f97316, #ef4444)' }}
                    />
                    <h3 className="text-primary font-semibold mb-1 pl-2">{role}</h3>
                    <p className="text-sm text-muted-foreground pl-2">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL (original, untouched layout) ────────────────── */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-background via-card to-background relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-destructive/5" />

            <div className="relative z-10 w-full max-w-md">
              {/* Logo */}
              <div className="text-center mb-8 animate-fade-in">
                <div className="flex justify-center mb-4">
                  <img src={logo} alt="Technieum" className="h-20 w-auto" />
                </div>
                <h1 className="text-xl font-semibold text-gradient">OffSec Operations</h1>
              </div>

              {/* Card */}
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

                    {/* Email field */}
                    <div className="space-y-1">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          className={`pr-10 bg-secondary/50 border-border focus:border-primary ${
                            emailError ? 'border-destructive/70' : ''
                          }`}
                          required
                        />
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                      {emailError && (
                        <p className="validation-msg flex items-center gap-1 text-xs text-destructive mt-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {emailError}
                        </p>
                      )}
                    </div>

                    {/* Password field */}
                    <div className="space-y-1">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          className={`pr-10 bg-secondary/50 border-border focus:border-primary ${
                            passwordHint ? 'border-yellow-500/50' : ''
                          }`}
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
                      {passwordHint ? (
                        <p className="validation-msg flex items-center gap-1 text-xs text-yellow-500 mt-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {passwordHint}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/40 mt-1">
                          Minimum 8 characters required
                        </p>
                      )}
                    </div>

                    {/* Remember me */}
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
                    </div>

                    {/* Login button — uses your existing gradient-technieum class + effects */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="login-btn gradient-technieum w-full py-3 px-6 rounded-md font-semibold text-white text-sm tracking-wider uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Signing in...
                        </span>
                      ) : (
                        'LOGIN'
                      )}
                    </button>

                    <p className="text-center text-xs text-muted-foreground mt-4">
                      Contact your administrator for account access
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm py-4 px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Technieum" className="h-10 w-auto" />
              <span className="text-sm font-medium text-muted-foreground">OffSec Operations</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {currentYear} Technieum. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}