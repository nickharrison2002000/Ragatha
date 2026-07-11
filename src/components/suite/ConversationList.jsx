import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ConversationList({ activeId, onSelect, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const data = await base44.entities.Conversation.list('-updated_date', 100);
      setConversations(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [activeId]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await base44.entities.Message.deleteMany({ conversation_id: id });
      await base44.entities.Conversation.delete(id);
      if (activeId === id) onSelect(null);
      fetchConversations();
    } catch {}
  };

  return (
    <div className="w-56 border-r border-border bg-card/20 flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground tracking-[0.2em]">CONVERSATIONS</span>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground lg:hidden">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="px-3 py-2">
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-mono border transition-colors ${
            !activeId
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'text-muted-foreground border-border hover:text-foreground hover:bg-muted/30'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          NEW CONVERSATION
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {loading ? (
          <div className="px-3 py-4 text-center">
            <span className="font-mono text-[10px] text-muted-foreground/40">loading...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <span className="font-mono text-[10px] text-muted-foreground/40">no conversations yet</span>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full group flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
                activeId === conv.id
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/30 border border-transparent'
              }`}
            >
              <MessageSquare className={`w-3 h-3 shrink-0 ${activeId === conv.id ? 'text-primary' : 'text-muted-foreground/50'}`} />
              <span className={`flex-1 truncate text-xs ${activeId === conv.id ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                {conv.title}
              </span>
              <span
                onClick={(e) => handleDelete(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
