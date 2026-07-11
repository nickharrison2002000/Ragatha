import React from 'react';
import { BookOpen, Wrench } from 'lucide-react';
import ToolCallDisplay from '@/components/suite/ToolCallDisplay';

const TIER_TEXT = {
  base: 'text-tier-base',
  advanced: 'text-tier-advanced',
  gpu: 'text-tier-gpu',
};

export default function MessageBubble({ msg, tier }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-mono text-xs ${TIER_TEXT[tier]} tracking-widest`}>RAGATHA</span>
          {msg.ragSources && msg.ragSources.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 border border-border rounded px-1.5 py-0.5">
              <BookOpen className="w-2.5 h-2.5" />
              {msg.ragSources.length} source{msg.ragSources.length > 1 ? 's' : ''}
            </span>
          )}
          {msg.steps && msg.steps.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-neon-cyan/60 border border-border rounded px-1.5 py-0.5">
              <Wrench className="w-2.5 h-2.5" />
              {msg.steps.length} tool{msg.steps.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {msg.steps && msg.steps.length > 0 && (
          <div className="mb-2 space-y-2">
            {msg.steps.map((step, i) => (
              <ToolCallDisplay key={i} step={step} />
            ))}
          </div>
        )}
        <div className="px-4 py-3 rounded-lg bg-card border border-border text-sm text-foreground/90 whitespace-pre-wrap">
          {msg.content}
        </div>
        {msg.ragSources && msg.ragSources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {msg.ragSources.map((s, i) => (
              <span key={i} className="text-[9px] font-mono text-muted-foreground/40">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
