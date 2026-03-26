import { useState, useEffect } from 'react';

const ASM_URL = 'http://43.205.213.93:8000/';

const SCAN_LINES = [
  'Initializing recon modules...',
  'Loading subdomain enumeration engine...',
  'Connecting to threat intelligence feeds...',
  'Bootstrapping vulnerability scanner...',
  'Syncing attack surface database...',
  'Calibrating passive recon pipeline...',
  'Establishing secure tunnel...',
  'Attack Surface Management ready.',
];

export default function ASM() {
  const [loading, setLoading]       = useState(true);
  const [visible, setVisible]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [lineIndex, setLineIndex]   = useState(0);
  const [fadeOut, setFadeOut]       = useState(false);
  const [scanDots, setScanDots]     = useState('');

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

            {/* ASM label — same weight/style as portal headings */}
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
              Attack Surface{' '}
              <span style={{
                background: 'linear-gradient(90deg, #f97316, #fb923c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Management</span>
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
            {['RECON', 'INTEL', 'VULN SCAN', 'REPORTING'].map((phase, i) => (
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

      <iframe
        src={ASM_URL}
        title="Attack Surface Management"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          border: 'none',
          display: 'block',
          zIndex: 9998,
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.6s ease-out',
        }}
        allow="same-origin"
      />
    </>
  );
}