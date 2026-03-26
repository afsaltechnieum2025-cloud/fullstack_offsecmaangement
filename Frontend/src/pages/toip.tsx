import { useState, useEffect } from 'react';

const TOIP_URL = ''; // Add your TOIP URL here when available

const SCAN_LINES = [
  'Initializing threat intelligence modules...',
  'Loading adversary tracking engine...',
  'Connecting to dark web monitoring feeds...',
  'Bootstrapping IOC correlation pipeline...',
  'Syncing MITRE ATT&CK framework...',
  'Calibrating TTP mapping algorithms...',
  'Loading exploit intelligence database...',
  'Offensive Intelligence Portal ready.',
];

export default function TOIP() {
  const [loading, setLoading]     = useState(true);
  const [visible, setVisible]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [fadeOut, setFadeOut]     = useState(false);
  const [scanDots, setScanDots]   = useState('');

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Animate scan dots
  useEffect(() => {
    const t = setInterval(() => {
      setScanDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(t);
  }, []);

  // Progress bar + log lines
  useEffect(() => {
    let current = 0;
    const totalDuration = 3200; // ms
    const steps = 80;
    const stepMs = totalDuration / steps;

    const interval = setInterval(() => {
      current += 1;
      // Ease-out curve: fast at first, slows near end
      const eased = Math.round(100 * (1 - Math.pow(1 - current / steps, 2.2)));
      setProgress(Math.min(eased, 100));

      // Advance log line roughly every 12 steps
      setLineIndex(Math.min(Math.floor((current / steps) * SCAN_LINES.length), SCAN_LINES.length - 1));

      if (current >= steps) {
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => setLoading(false), 600);
        }, 500);
      }
    }, stepMs);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: '#0a0b0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          opacity: fadeOut ? 0 : visible ? 1 : 0,
          transition: 'opacity 0.6s ease',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          overflow: 'hidden',
        }}>

          {/* Subtle grid background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            pointerEvents: 'none',
          }} />

          {/* Radial glow center */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Main content */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0',
            width: 'min(480px, 90vw)',
          }}>

            {/* Logo mark + wordmark row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '40px',
            }}>
              {/* T logo — matches the portal */}
              <div style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-1px',
                flexShrink: 0,
                boxShadow: '0 0 20px rgba(249,115,22,0.3)',
              }}>T</div>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#f97316',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}>TECHNIEUM</div>
                <div style={{
                  fontSize: '9px',
                  fontWeight: 500,
                  color: 'rgba(249,115,22,0.5)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginTop: '3px',
                }}>OffSec Portal</div>
              </div>
            </div>

            {/* TOIP label — matches ASM style */}
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.25em',
              color: 'rgba(249,115,22,0.5)',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>Loading Module</div>

            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              marginBottom: '32px',
              lineHeight: 1.1,
            }}>
              Offensive{' '}
              <span style={{
                background: 'linear-gradient(90deg, #f97316, #fb923c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Intelligence</span>
            </div>

            {/* Progress bar — matches portal's thin style */}
            <div style={{ width: '100%', marginBottom: '12px' }}>
              <div style={{
                height: '2px',
                background: 'rgba(249,115,22,0.12)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ea580c, #f97316, #fb923c)',
                  borderRadius: '2px',
                  transition: 'width 0.12s linear',
                  boxShadow: '0 0 8px rgba(249,115,22,0.6)',
                }} />
              </div>
            </div>

            {/* Progress % and status row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginBottom: '24px',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(249,115,22,0.7)',
                letterSpacing: '0.05em',
                fontVariantNumeric: 'tabular-nums',
              }}>{progress}%</div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.03em',
              }}>
                {progress < 100 ? `SCANNING${scanDots}` : 'COMPLETE'}
              </div>
            </div>

            {/* Terminal log block */}
            <div style={{
              width: '100%',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(249,115,22,0.1)',
              borderRadius: '8px',
              padding: '14px 16px',
              minHeight: '120px',
            }}>
              <div style={{
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.2em',
                color: 'rgba(249,115,22,0.4)',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}>System Log</div>
              {SCAN_LINES.slice(0, lineIndex + 1).map((line, i) => {
                const isCurrent = i === lineIndex;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '5px',
                    opacity: isCurrent ? 1 : 0.35,
                    transition: 'opacity 0.3s ease',
                  }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: isCurrent ? '#f97316' : 'rgba(249,115,22,0.4)',
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 0 6px #f97316' : 'none',
                      transition: 'all 0.3s ease',
                    }} />
                    <span style={{
                      fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
                      fontSize: '11px',
                      color: isCurrent ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.02em',
                    }}>
                      {line}
                      {isCurrent && progress < 100 && (
                        <span style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '11px',
                          background: '#f97316',
                          marginLeft: '3px',
                          verticalAlign: 'middle',
                          animation: 'blink 0.9s step-end infinite',
                        }} />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Bottom bar — matches portal footer style */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
          }}>
            {['INTEL', 'IOC', 'TTP', 'REPORT'].map((phase, i) => (
              <div key={phase} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: progress > i * 25 ? 1 : 0.2,
                transition: 'opacity 0.4s ease',
              }}>
                <div style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: progress > i * 25 ? '#f97316' : 'rgba(255,255,255,0.2)',
                  boxShadow: progress > i * 25 ? '0 0 5px #f97316' : 'none',
                  transition: 'all 0.4s ease',
                }} />
                <span style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  color: progress > i * 25 ? 'rgba(249,115,22,0.7)' : 'rgba(255,255,255,0.2)',
                  textTransform: 'uppercase',
                  transition: 'color 0.4s ease',
                }}>{phase}</span>
              </div>
            ))}
          </div>

          <style>{`
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {!loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#0a0b0f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          animation: 'contentFadeIn 0.6s ease-out',
        }}>
          {/* Subtle grid background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            pointerEvents: 'none',
          }} />

          {/* Radial glow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Main content */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            maxWidth: '720px',
            padding: '0 clamp(24px, 6vw, 48px)',
          }}>
            {/* Logo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '32px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 800,
                color: '#fff',
                boxShadow: '0 0 20px rgba(249,115,22,0.3)',
              }}>T</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#f97316',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>TECHNIEUM</div>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(249,115,22,0.5)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginTop: '4px',
                }}>OffSec Portal</div>
              </div>
            </div>

            {/* TOIP title */}
            <div style={{
              fontSize: 'clamp(48px, 12vw, 96px)',
              fontWeight: 800,
              letterSpacing: '0.08em',
              lineHeight: 1,
              background: 'linear-gradient(180deg, #ffffff 0%, #fb923c 40%, #f97316 70%, #ea580c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 40px rgba(249,115,22,0.4))',
              marginBottom: '16px',
            }}>TOIP</div>

            {/* Full name */}
            <div style={{
              fontSize: 'clamp(11px, 2vw, 14px)',
              letterSpacing: '0.25em',
              color: 'rgba(249,115,22,0.7)',
              marginBottom: '12px',
              fontWeight: 500,
              textTransform: 'uppercase',
            }}>
              OFFENSIVE SECURITY INTELLIGENCE PORTAL
            </div>

            {/* Tagline */}
            <div style={{
              fontSize: 'clamp(13px, 1.8vw, 16px)',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '32px',
              lineHeight: 1.6,
            }}>
              Adversary intelligence. Unified. Actionable. Offensive-ready.
            </div>

            {/* Divider */}
            <div style={{
              width: '80px',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)',
              margin: '0 auto 32px',
            }} />

            {/* Status badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 24px',
              border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: '4px',
              background: 'rgba(249,115,22,0.04)',
              marginBottom: '48px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#f97316',
                boxShadow: '0 0 8px rgba(249,115,22,0.8)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: '11px',
                letterSpacing: '0.15em',
                color: 'rgba(249,115,22,0.6)',
                textTransform: 'uppercase',
              }}>
                PLATFORM UNDER CONSTRUCTION — COMING SOON
              </span>
            </div>

            {/* Feature pills */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'center',
            }}>
              {['IOC Correlation', 'Adversary Tracking', 'Exploit Intel', 'TTP Mapping', 'Dark Web Monitoring', 'CVE Intelligence', 'Attack Playbooks', 'MITRE ATT&CK'].map(feat => (
                <div key={feat} style={{
                  padding: '6px 16px',
                  border: '1px solid rgba(249,115,22,0.15)',
                  borderRadius: '4px',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'rgba(249,115,22,0.4)',
                  background: 'rgba(249,115,22,0.02)',
                  textTransform: 'uppercase',
                  fontFamily: "'SF Mono', monospace",
                }}>
                  {feat}
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes contentFadeIn {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.3;
                transform: scale(0.8);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}