import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AttemptLog({ attempts, running, phase }) {
  const reversed = [...attempts].reverse();

  return (
    <div className="space-y-3">
      {running && phase && (
        <div className="rounded-lg border border-neon-gold/30 bg-neon-gold/5 p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-neon-gold animate-spin" />
            <span className="font-mono text-xs text-neon-gold tracking-wider">
              {phase === 'rag' ? 'BUILDING RAG KNOWLEDGE...' : 'THINKING...'}
            </span>
          </div>
        </div>
      )}

      {reversed.map((attempt) => (
        <div
          key={attempt.id || attempt.attempt_number}
          className={`rounded-lg border p-4 ${
            attempt.succeeded
              ? 'border-neon-green/30 bg-neon-green/5'
              : 'border-border bg-card/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-muted-foreground tracking-wider">
              ATTEMPT #{attempt.attempt_number}
            </span>
            {attempt.succeeded ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-neon-green">
                <CheckCircle className="w-3 h-3" />
                SUCCEEDED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/50">
                <XCircle className="w-3 h-3" />
                FAILED
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground/50 font-mono">STRATEGY: </span>
              <span className="text-foreground/80">{attempt.strategy}</span>
            </div>
            <div>
              <span className="text-muted-foreground/50 font-mono">ACTION: </span>
              <span className="text-foreground/80">{attempt.action}</span>
            </div>
            <div>
              <span className="text-muted-foreground/50 font-mono">RESULT: </span>
              <span className="text-foreground/80">{attempt.result}</span>
            </div>
            <div>
              <span className="text-muted-foreground/50 font-mono">EVALUATION: </span>
              <span className="text-foreground/60">{attempt.evaluation}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
