import React, { useState } from 'react';
import { Globe, Code2, Search, ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const ACTION_CONFIG = {
  http_request: { icon: Globe, color: 'text-neon-cyan', label: 'HTTP REQUEST', isHttp: true },
  run_code: { icon: Code2, color: 'text-neon-green', label: 'RUN CODE', isCode: true },
  web_search: { icon: Search, color: 'text-neon-magenta', label: 'WEB SEARCH', isSearch: true },
};

export default function ToolCallDisplay({ step, live = false }) {
  const [expanded, setExpanded] = useState(true);
  const config = ACTION_CONFIG[step.action] || ACTION_CONFIG.run_code;
  const Icon = config.icon;

  const result = step.result;
  const hasResult = !!result;
  const succeeded = result?.success !== false;

  return (
    <div className="rounded border border-border bg-card/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-card/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
        <Icon className={`w-3.5 h-3.5 shrink-0 ${config.color}`} />
        <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
          {config.label}
        </span>
        {live && !hasResult && (
          <Loader2 className="w-3 h-3 text-neon-gold animate-spin ml-auto" />
        )}
        {hasResult && (
          <span
            className={`ml-auto flex items-center gap-1 text-[9px] font-mono ${succeeded ? 'text-neon-green' : 'text-destructive'}`}
          >
            {succeeded ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
            {config.isHttp ? `${result.status}` : succeeded ? 'OK' : 'ERROR'}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          {step.thought && (
            <div>
              <span className="text-muted-foreground/50 font-mono">REASONING: </span>
              <span className="text-foreground/70">{step.thought}</span>
            </div>
          )}
          {config.isHttp && (
            <div>
              <span className="text-muted-foreground/50 font-mono">REQUEST: </span>
              <span className="text-neon-cyan font-mono">{step.params.method}</span>{' '}
              <span className="text-foreground/70 font-mono break-all">{step.params.url}</span>
              {step.params.body && (
                <pre className="mt-1 p-2 bg-background/50 rounded text-[10px] font-mono text-foreground/60 overflow-x-auto whitespace-pre-wrap">
                  {step.params.body}
                </pre>
              )}
            </div>
          )}
          {config.isCode && (
            <div>
              <span className="text-muted-foreground/50 font-mono">CODE:</span>
              <pre className="mt-1 p-2 bg-background/50 rounded text-[10px] font-mono text-neon-green/70 overflow-x-auto whitespace-pre-wrap">
                {step.params.code}
              </pre>
            </div>
          )}
          {config.isSearch && (
            <div>
              <span className="text-muted-foreground/50 font-mono">QUERY: </span>
              <span className="text-neon-magenta font-mono">{step.params.query}</span>
            </div>
          )}
          {hasResult && (
            <div>
              <span className="text-muted-foreground/50 font-mono">RESULT:</span>
              <pre className="mt-1 p-2 bg-background/50 rounded text-[10px] font-mono text-foreground/60 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {config.isHttp
                  ? result.body
                  : config.isSearch
                  ? result.summary || result.error
                  : result.error || result.result}
              </pre>
              {config.isSearch && result.sources && result.sources.length > 0 && (
                <div>
                  <span className="text-muted-foreground/50 font-mono">SOURCES:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.sources.map((s, i) => (
                      <span key={i} className="text-[9px] font-mono text-muted-foreground/40 border border-border/50 rounded px-1.5 py-0.5">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.logs && (
                <div>
                  <span className="text-muted-foreground/50 font-mono">LOGS:</span>
                  <pre className="mt-1 p-2 bg-background/50 rounded text-[10px] font-mono text-muted-foreground/50 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {result.logs}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
