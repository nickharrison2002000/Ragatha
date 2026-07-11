import React from 'react';
import { Archive, ArchiveRestore, Trash2, FileText, Type, Link2 } from 'lucide-react';

const SOURCE_ICONS = {
  manual: Type,
  upload: FileText,
  url: Link2,
};

export default function KnowledgeCard({ entry, onDelete, onToggleArchive }) {
  const Icon = SOURCE_ICONS[entry.source_type] || Type;
  const isArchived = entry.status === 'archived';

  return (
    <div
      className={`rounded-lg border p-4 transition-opacity ${
        isArchived ? 'border-border/50 bg-card/20 opacity-50' : 'border-border bg-card/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <h3 className="font-mono text-sm text-foreground truncate">{entry.title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleArchive(entry)}
            className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title={isArchived ? 'Retain knowledge' : 'Lose knowledge'}
          >
            {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDelete(entry)}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/70 line-clamp-3 mb-2">{entry.content}</p>
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[9px] font-mono text-muted-foreground/50 border border-border/50 rounded px-1.5 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {isArchived && (
        <div className="mt-2 text-[9px] font-mono text-destructive/40 tracking-widest">
          ARCHIVED — KNOWLEDGE LOST
        </div>
      )}
    </div>
  );
}
