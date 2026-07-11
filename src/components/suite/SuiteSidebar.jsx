import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, FolderClosed, BookOpen, Settings, Power } from 'lucide-react';

const TIER_TEXT = {
  base: 'text-tier-base',
  advanced: 'text-tier-advanced',
  gpu: 'text-tier-gpu',
};

const TIER_LABELS = {
  base: '12B-CPU',
  advanced: 'CPU+',
  gpu: 'GPU',
};

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Chat', to: '/suite', end: true },
  { icon: FolderClosed, label: 'Projects', to: '/suite/projects' },
  { icon: BookOpen, label: 'Knowledge', to: '/suite/knowledge' },
  { icon: Settings, label: 'Settings', to: '/suite/settings', disabled: true },
];

export default function SuiteSidebar({ tier, modelName, onEject }) {
  return (
    <aside className="w-60 border-r border-border bg-card/30 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-border">
        <h1 className="font-heading text-xl text-white tracking-[0.2em]">RAGATHA</h1>
        <p className="text-[10px] text-muted-foreground font-mono tracking-[0.3em] mt-0.5">LLM-SUITE</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-mono transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'
              } ${item.disabled ? 'opacity-30 pointer-events-none' : ''}`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {item.disabled && <span className="ml-auto text-[9px] tracking-widest">SOON</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border space-y-2">
        <div className="text-[10px] text-muted-foreground/60 font-mono tracking-[0.2em]">LOADED MODEL</div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${TIER_TEXT[tier]}`}
            style={{ background: 'currentColor', boxShadow: '0 0 8px currentColor' }}
          />
          <span className={`font-mono text-sm ${TIER_TEXT[tier]}`}>{TIER_LABELS[tier]}</span>
        </div>
        <div className="text-[10px] text-muted-foreground/50 font-mono truncate">{modelName}</div>
        <button
          onClick={onEject}
          className="w-full flex items-center gap-2 px-3 py-1.5 mt-2 rounded text-xs font-mono text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 transition-colors"
        >
          <Power className="w-3 h-3" />
          Eject
        </button>
      </div>
    </aside>
  );
}
