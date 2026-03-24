import { useState, useEffect } from 'react';

const ASM_URL = 'http://43.205.213.93:8000/';

export default function ASM() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2.5s, then remove loader
    const fadeTimer = setTimeout(() => setFadeOut(true), 2500);
    const removeTimer = setTimeout(() => setLoading(false), 3100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <>
      {/* Animated Loader */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background, #0a0a0f)',
            transition: 'opacity 0.6s ease',
            opacity: fadeOut ? 0 : 1,
            pointerEvents: fadeOut ? 'none' : 'all',
          }}
        >
          {/* Scanning grid background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'gridPan 8s linear infinite',
          }} />

          {/* Radial glow */}
          <div style={{
            position: 'absolute',
            width: 'min(600px, 90vw)',
            height: 'min(600px, 90vw)',
            background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite',
          }} />

          {/* Outer ring */}
          <div style={{
            position: 'relative',
            width: 'min(160px, 35vw)',
            height: 'min(160px, 35vw)',
            marginBottom: 'clamp(24px, 5vw, 40px)',
          }}>
            {/* Spinning outer ring */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'var(--primary, #f97316)',
              borderRightColor: 'var(--primary, #f97316)',
              animation: 'spinOuter 1.2s linear infinite',
            }} />
            {/* Counter-spinning inner ring */}
            <div style={{
              position: 'absolute',
              inset: '14px',
              borderRadius: '50%',
              border: '1.5px solid transparent',
              borderBottomColor: 'rgba(249,115,22,0.5)',
              borderLeftColor: 'rgba(249,115,22,0.5)',
              animation: 'spinInner 0.8s linear infinite reverse',
            }} />
            {/* Center dot */}
            <div style={{
              position: 'absolute',
              inset: '50%',
              width: 'clamp(8px, 2vw, 12px)',
              height: 'clamp(8px, 2vw, 12px)',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'var(--primary, #f97316)',
              boxShadow: '0 0 20px rgba(249,115,22,0.8)',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
            {/* Radar sweep */}
            <div style={{
              position: 'absolute',
              inset: '8px',
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, rgba(249,115,22,0.15) 0deg, transparent 90deg)',
              animation: 'spinOuter 2s linear infinite',
            }} />
          </div>

          {/* Text block */}
          <div style={{
            position: 'relative',
            textAlign: 'center',
            padding: '0 clamp(16px, 5vw, 32px)',
          }}>
            {/* TECHNIEUM label */}
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 'clamp(10px, 2vw, 13px)',
              letterSpacing: '0.3em',
              color: 'rgba(249,115,22,0.6)',
              marginBottom: 'clamp(6px, 1.5vw, 10px)',
              animation: 'fadeSlideUp 0.6s ease forwards',
              animationDelay: '0.2s',
              opacity: 0,
            }}>
              TECHNIEUM
            </div>

            {/* ASM title */}
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 'clamp(28px, 7vw, 56px)',
              fontWeight: 800,
              letterSpacing: '0.12em',
              lineHeight: 1,
              background: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'fadeSlideUp 0.7s ease forwards',
              animationDelay: '0.4s',
              opacity: 0,
              filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.4))',
            }}>
              ASM
            </div>

            {/* Subtitle */}
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 'clamp(9px, 1.8vw, 12px)',
              letterSpacing: '0.2em',
              color: 'rgba(249,115,22,0.5)',
              marginTop: 'clamp(6px, 1.5vw, 10px)',
              animation: 'fadeSlideUp 0.7s ease forwards',
              animationDelay: '0.6s',
              opacity: 0,
            }}>
              ATTACK SURFACE MANAGEMENT
            </div>

            {/* Scanning bar */}
            <div style={{
              marginTop: 'clamp(16px, 4vw, 28px)',
              width: 'clamp(160px, 40vw, 280px)',
              height: '2px',
              background: 'rgba(249,115,22,0.15)',
              borderRadius: '2px',
              overflow: 'hidden',
              animation: 'fadeSlideUp 0.7s ease forwards',
              animationDelay: '0.8s',
              opacity: 0,
              margin: 'clamp(16px, 4vw, 28px) auto 0',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, transparent, var(--primary, #f97316), transparent)',
                animation: 'scan 1.5s ease-in-out infinite',
              }} />
            </div>

            {/* Status text */}
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 'clamp(8px, 1.5vw, 10px)',
              letterSpacing: '0.15em',
              color: 'rgba(249,115,22,0.4)',
              marginTop: 'clamp(10px, 2vw, 14px)',
              animation: 'blink 1s step-end infinite, fadeSlideUp 0.7s ease forwards',
              animationDelay: '1s, 1s',
              opacity: 0,
            }}>
              INITIALIZING RECON ENGINE...
            </div>
          </div>

          {/* Corner decorations */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
            <div key={corner} style={{
              position: 'absolute',
              width: 'clamp(20px, 4vw, 32px)',
              height: 'clamp(20px, 4vw, 32px)',
              ...(corner.includes('top') ? { top: 'clamp(16px, 4vw, 32px)' } : { bottom: 'clamp(16px, 4vw, 32px)' }),
              ...(corner.includes('left') ? { left: 'clamp(16px, 4vw, 32px)' } : { right: 'clamp(16px, 4vw, 32px)' }),
              borderTop: corner.includes('top') ? '1.5px solid rgba(249,115,22,0.4)' : 'none',
              borderBottom: corner.includes('bottom') ? '1.5px solid rgba(249,115,22,0.4)' : 'none',
              borderLeft: corner.includes('left') ? '1.5px solid rgba(249,115,22,0.4)' : 'none',
              borderRight: corner.includes('right') ? '1.5px solid rgba(249,115,22,0.4)' : 'none',
              animation: 'fadeSlideUp 0.5s ease forwards',
              animationDelay: '0.1s',
              opacity: 0,
            }} />
          ))}

          <style>{`
            @keyframes spinOuter {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes spinInner {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              50%       { opacity: 0.6; transform: translate(-50%, -50%) scale(1.3); }
            }
            @keyframes scan {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0; }
            }
            @keyframes gridPan {
              from { backgroundPosition: 0 0; }
              to   { backgroundPosition: 40px 40px; }
            }
          `}</style>
        </div>
      )}

      {/* ASM iframe */}
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
          zIndex: 9999,
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.4s ease',
        }}
        allow="same-origin"
      />
    </>
  );
}