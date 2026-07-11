import React from 'react';
import { ChevronRight, CheckCircle, AlertCircle, Loader, Circle } from 'lucide-react';

const STATUS_STYLES = {
  idle: { color: 'text-muted-foreground', icon: Circle, label: 'IDLE' },
  running: { color: 'text-neon-gold', icon: Loader, label: 'RUNNING' },
  stopped: { color: 'text-muted-foreground', icon: AlertCircle, label: 'STOPPED' },
  succeeded: { color: 'text-neon-green', icon: CheckCircle, label: 'SUCCEEDED' },
  failed: { color: 'text-destructive', icon: AlertCircle, label: 'FAILED' },
};

export default function ProjectCard({ project, onClick }) {
  const status = STATUS_STYLES[project.insanity_status] || STATUS_STYLES.idle;
  const StatusIcon = status.icon;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border bg-card/50 p-4 hover:border-primary/30 hover:bg-card transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-mono text-sm text-foreground">{project.title}</h3>
        <div className={`flex items-center gap-1.5 text-[10px] font-mono ${status.color}`}>
          <StatusIcon className={`w-3 h-3 ${project.insanity_status === 'running' ? 'animate-spin' : ''}`} />
          {status.label}
        </div>
      </div>
      <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-3">{project.goal}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground/50">
          {project.insanity_attempts || 0} / {project.max_attempts || 50} attempts
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
      </div>
    </button>
  );
}
