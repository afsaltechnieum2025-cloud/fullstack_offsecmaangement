import { useState, useEffect } from 'react';

const ASM_URL = 'http://43.205.213.93:8000/';

export default function ASM() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer   = setTimeout(() => setFadeOut(true), 3200);
    const removeTimer = setTimeout(() => setLoading(false), 3900);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#07080d',
          transition: 'opacity 0.7s ease',
          opacity: fadeOut ? 0 : 1,
          pointerEvents: fadeOut ? 'none' : 'all',
          overflow: 'hidden',
        }}>

          {/* Scan lines overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)',
            pointerEvents: 'none',
          }} />

          {/* Moving horizontal scan beam */}
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.6) 40%, rgba(251,146,60,1) 50%, rgba(249,115,22,0.6) 60%, transparent 100%)',
            animation: 'scanBeam 3s ease-in-out infinite',
            zIndex: 2,
          }} />

          {/* Grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            animation: 'gridPan 10s linear infinite',
          }} />

          {/* Radial vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(7,8,13,0.85) 100%)',
          }} />

          {/* Ambient glow */}
          <div style={{
            position: 'absolute',
            width: 'min(700px, 100vw)', height: 'min(400px, 60vh)',
            background: 'radial-gradient(ellipse, rgba(249,115,22,0.07) 0%, transparent 70%)',
            animation: 'glowPulse 2.5s ease-in-out infinite',
          }} />

          {/* Main content */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', width: '100%' }}>

            {/* Eyebrow */}
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 'clamp(9px, 1.8vw, 12px)',
              letterSpacing: '0.5em',
              color: 'rgba(249,115,22,0.5)',
              marginBottom: 'clamp(12px, 3vw, 20px)',
              animation: 'fadeUp 0.5s ease forwards',
              animationDelay: '0.1s',
              opacity: 0,
            }}>
              TECHNIEUM &nbsp;/&nbsp; OFFENSIVE SECURITY
            </div>

            {/* ASM glitch letters */}
            <div style={{ position: 'relative', display: 'inline-block' }}>

              {/* Ghost layer 1 — red shift */}
              <div style={{
                position: 'absolute', inset: 0,
                fontFamily: "'Courier New', monospace",
                fontSize: 'clamp(72px, 18vw, 180px)',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: 'rgba(239,68,68,0.4)',
                animation: 'glitchR 4s steps(1) infinite',
                userSelect: 'none',
              }}>ASM</div>

              {/* Ghost layer 2 — cyan shift */}
              <div style={{
                position: 'absolute', inset: 0,
                fontFamily: "'Courier New', monospace",
                fontSize: 'clamp(72px, 18vw, 180px)',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: 'rgba(34,211,238,0.35)',
                animation: 'glitchC 4s steps(1) infinite',
                userSelect: 'none',
              }}>ASM</div>

              {/* Main text */}
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 'clamp(72px, 18vw, 180px)',
                fontWeight: 900,
                letterSpacing: '0.08em',
                lineHeight: 1,
                background: 'linear-gradient(180deg, #ffffff 0%, #fb923c 40%, #f97316 70%, #ea580c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'fadeUp 0.6s ease forwards, textFlicker 6s steps(1) infinite',
                animationDelay: '0.3s, 1.5s',
                opacity: 0,
                position: 'relative',
                filter: 'drop-shadow(0 0 40px rgba(249,115,22,0.5)) drop-shadow(0 0 80px rgba(249,115,22,0.2))',
              }}>ASM</div>
            </div>

            {/* Subtitle */}
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 'clamp(10px, 2vw, 14px)',
              letterSpacing: '0.35em',
              color: 'rgba(249,115,22,0.7)',
              marginTop: 'clamp(8px, 2vw, 16px)',
              animation: 'fadeUp 0.6s ease forwards',
              animationDelay: '0.6s',
              opacity: 0,
            }}>
              ATTACK &nbsp;·&nbsp; SURFACE &nbsp;·&nbsp; MANAGEMENT
            </div>

            {/* Divider */}
            <div style={{
              margin: 'clamp(20px, 4vw, 32px) auto 0',
              width: 'clamp(120px, 30vw, 240px)',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)',
              animation: 'fadeUp 0.5s ease forwards',
              animationDelay: '0.8s',
              opacity: 0,
            }} />

            {/* Progress bar */}
            <div style={{
              margin: 'clamp(14px, 3vw, 20px) auto 0',
              width: 'clamp(180px, 35vw, 320px)',
              height: '3px',
              background: 'rgba(249,115,22,0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
              animation: 'fadeUp 0.5s ease forwards',
              animationDelay: '0.9s',
              opacity: 0,
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ea580c, #f97316, #fb923c)',
                borderRadius: '2px',
                animation: 'progressFill 2.8s ease forwards',
                animationDelay: '0.9s',
                width: '0%',
              }} />
            </div>

            {/* Status + cursor */}
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 'clamp(8px, 1.5vw, 11px)',
              letterSpacing: '0.2em',
              color: 'rgba(249,115,22,0.45)',
              marginTop: 'clamp(10px, 2vw, 16px)',
              animation: 'fadeUp 0.5s ease forwards',
              animationDelay: '1.2s',
              opacity: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}>
              <span>INITIALIZING RECON ENGINE</span>
              <span style={{
                display: 'inline-block', width: '8px', height: '14px',
                background: 'rgba(249,115,22,0.6)',
                animation: 'cursorBlink 0.8s step-end infinite',
              }} />
            </div>
          </div>

          {/* Corner brackets */}
          {([
            { top: 'clamp(20px,4vw,40px)',    left:  'clamp(20px,4vw,40px)',  borderTop: '2px solid rgba(249,115,22,0.5)', borderLeft:  '2px solid rgba(249,115,22,0.5)' },
            { top: 'clamp(20px,4vw,40px)',    right: 'clamp(20px,4vw,40px)', borderTop: '2px solid rgba(249,115,22,0.5)', borderRight: '2px solid rgba(249,115,22,0.5)' },
            { bottom: 'clamp(20px,4vw,40px)', left:  'clamp(20px,4vw,40px)', borderBottom: '2px solid rgba(249,115,22,0.5)', borderLeft:  '2px solid rgba(249,115,22,0.5)' },
            { bottom: 'clamp(20px,4vw,40px)', right: 'clamp(20px,4vw,40px)', borderBottom: '2px solid rgba(249,115,22,0.5)', borderRight: '2px solid rgba(249,115,22,0.5)' },
          ] as React.CSSProperties[]).map((style, i) => (
            <div key={i} style={{
              position: 'absolute', zIndex: 10,
              width: 'clamp(24px, 4vw, 40px)', height: 'clamp(24px, 4vw, 40px)',
              ...style,
              animation: 'cornerReveal 0.4s ease forwards',
              animationDelay: `${i * 0.06}s`,
              opacity: 0,
            }} />
          ))}

          {/* Side data streams — left */}
          <div style={{
            position: 'absolute', left: 'clamp(12px, 3vw, 24px)', top: '50%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10,
            animation: 'fadeUp 0.5s ease forwards', animationDelay: '1s', opacity: 0,
          }}>
            {['192.168.1.0/24', '10.0.0.0/8', 'CVE SCAN', 'PORT 443', 'DNS ENUM'].map((t, i) => (
              <div key={t} style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 'clamp(7px, 1.2vw, 9px)',
                color: 'rgba(249,115,22,0.25)',
                letterSpacing: '0.1em',
                animation: `dataFlicker ${1.5 + i * 0.3}s steps(1) infinite`,
                animationDelay: `${i * 0.2}s`,
              }}>{t}</div>
            ))}
          </div>

          {/* Side data streams — right */}
          <div style={{
            position: 'absolute', right: 'clamp(12px, 3vw, 24px)', top: '50%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10, textAlign: 'right',
            animation: 'fadeUp 0.5s ease forwards', animationDelay: '1.1s', opacity: 0,
          }}>
            {['SUBDOMAINS', 'OPEN PORTS', 'SSL CERTS', 'WHOIS', 'SHODAN'].map((t, i) => (
              <div key={t} style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 'clamp(7px, 1.2vw, 9px)',
                color: 'rgba(249,115,22,0.25)',
                letterSpacing: '0.1em',
                animation: `dataFlicker ${1.8 + i * 0.25}s steps(1) infinite`,
                animationDelay: `${i * 0.15}s`,
              }}>{t}</div>
            ))}
          </div>

          <style>{`
            @keyframes scanBeam {
              0%   { top: -2px; opacity: 0; }
              5%   { opacity: 1; }
              95%  { opacity: 1; }
              100% { top: 100vh; opacity: 0; }
            }
            @keyframes gridPan {
              from { background-position: 0 0; }
              to   { background-position: 48px 48px; }
            }
            @keyframes glowPulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%      { opacity: 0.6; transform: scale(1.1); }
            }
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes cornerReveal {
              from { opacity: 0; transform: scale(0.6); }
              to   { opacity: 1; transform: scale(1); }
            }
            @keyframes glitchR {
              0%,90%,100% { transform: translate(0,0); opacity: 0; }
              91% { transform: translate(-4px, 2px);  opacity: 0.4; }
              92% { transform: translate( 3px,-1px);  opacity: 0.3; }
              93% { transform: translate(-2px, 0);    opacity: 0;   }
            }
            @keyframes glitchC {
              0%,88%,100% { transform: translate(0,0); opacity: 0; }
              89% { transform: translate( 4px,-2px);  opacity: 0.35; }
              90% { transform: translate(-3px, 1px);  opacity: 0.25; }
              91% { transform: translate(0,0);        opacity: 0;    }
            }
            @keyframes textFlicker {
              0%,94%,96%,100% { opacity: 1;    }
              95%             { opacity: 0.85; }
            }
            @keyframes progressFill {
              0%   { width:  0%; }
              20%  { width: 15%; }
              45%  { width: 42%; }
              70%  { width: 71%; }
              88%  { width: 88%; }
              100% { width:100%; }
            }
            @keyframes cursorBlink {
              0%,100% { opacity: 1; }
              50%     { opacity: 0; }
            }
            @keyframes dataFlicker {
              0%,85%,100% { opacity: 0.25; }
              86% { opacity: 0.7; }
              87% { opacity: 0.2; }
              88% { opacity: 0.6; }
            }
          `}</style>
        </div>
      )}

      <iframe
        src={ASM_URL}
        title="Attack Surface Management"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          border: 'none', display: 'block', zIndex: 9999,
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}
        allow="same-origin"
      />
    </>
  );
}