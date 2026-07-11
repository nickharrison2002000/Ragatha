import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';


const TIER_LABELS = {
  base: '12B-CPU',
  advanced: '35B-CPU',
  gpu: 'GPU',
};

const TIER_TEXT = {
  base: 'text-tier-base',
  advanced: 'text-tier-advanced',
  gpu: 'text-tier-gpu',
};

const TIER_GLOW = {
  base: '#00BFFF',
  advanced: '#A020F0',
  gpu: '#39FF14',
};

function detectTier(name) {
  const lower = name.toLowerCase();
  if (lower.includes('gpu')) return 'gpu';
  if (lower.includes('35b') || lower.includes('20b') || lower.includes('229b') || lower.includes('480b')) return 'advanced';
  return 'base';
}

export default function CrateLoad() {
  const navigate = useNavigate();
  const [tier, setTier] = useState(null);
  const [state, setState] = useState('empty');
  const [error, setError] = useState('');

  const handleFile = useCallback((file) => {
    if (!file.name.toLowerCase().endsWith('.gguf')) {
      setError('The crate rejects this. Only .gguf files are accepted.');
      return;
    }
    setError('');
    const detected = detectTier(file.name);
    setTier(detected);
    setState('loading');
    localStorage.setItem('ragatha_tier', detected);
    localStorage.setItem('ragatha_model', file.name);

    setTimeout(() => setState('ready'), 2000);
    setTimeout(() => navigate('/suite'), 3500);
  }, [navigate]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setState((prev) => (prev === 'empty' ? 'dragging' : prev));
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setState((prev) => (prev === 'dragging' ? 'empty' : prev));
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const glowColor = tier ? TIER_GLOW[tier] : '#FF00FF';

  return (
    <div
      className="min-h-screen bg-background bg-grid flex flex-col items-center justify-center p-6 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl transition-colors duration-700"
          style={{ background: glowColor }}
        />
      </div>

      {/* Scan line during loading */}
      {state === 'loading' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-0 right-0 h-px bg-neon-cyan/30 animate-scan" />
        </div>
      )}

      {/* Logo */}
      <div className="relative z-10 mb-8 flex items-center justify-center">
        <div
          className="absolute inset-0 blur-3xl rounded-full opacity-20 transition-colors duration-700"
          style={{ background: glowColor }}
        />
        <img
          src="https://media.base44.com/images/public/6a4b5af38cd7ad6320a451b4/70cb94234_R-LOGO.png"
          alt="Ragatha"
          className={`relative w-full max-w-[280px] transition-all duration-700 ${state === 'dragging' ? 'animate-tremble scale-95' : ''} ${tier ? 'opacity-100' : 'opacity-50'}`}
          style={tier ? { filter: `drop-shadow(0 0 25px ${glowColor})` } : {}}
        />
      </div>

      {/* Text */}
      <div className="relative z-10 text-center max-w-md">
        {state === 'empty' && (
          <>
            <h1 className="font-heading text-4xl text-white tracking-[0.3em] mb-2">RAGATHA</h1>
            <p className="text-muted-foreground font-mono text-xs tracking-[0.4em] mb-8">LLM-SUITE</p>
            <p className="text-muted-foreground/60 font-mono text-xs leading-relaxed">
              The crate is empty. Drag your{' '}
              <span className="text-neon-magenta">.gguf</span> file here to awaken Ragatha.
            </p>
            <label
              htmlFor="crate-file-input"
              className="inline-block mt-4 text-xs font-mono text-muted-foreground/40 hover:text-muted-foreground cursor-pointer transition-colors underline underline-offset-4"
            >
              or click to browse
            </label>
          </>
        )}
        {state === 'dragging' && (
          <p className="font-mono text-sm text-neon-cyan tracking-widest animate-pulse">
            RELEASE TO OPEN THE CRATE...
          </p>
        )}
        {state === 'loading' && (
          <>
            <h1 className="font-heading text-4xl text-white tracking-[0.3em] mb-2">AWAKENING...</h1>
            <p className="font-mono text-sm text-muted-foreground tracking-wider mt-4">
              Loading <span className={TIER_TEXT[tier]}>{TIER_LABELS[tier]}</span>
            </p>
          </>
        )}
        {state === 'ready' && (
          <>
            <h1 className="font-heading text-4xl text-white tracking-[0.3em] mb-2">RAGATHA</h1>
            <p className={`font-mono text-sm tracking-widest ${TIER_TEXT[tier]} text-glow-sm`}>
              {TIER_LABELS[tier]} ONLINE
            </p>
          </>
        )}
        {error && (
          <p className="font-mono text-xs text-destructive mt-4">{error}</p>
        )}
      </div>

      <input
        type="file"
        accept=".gguf"
        id="crate-file-input"
        className="hidden"
        onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
