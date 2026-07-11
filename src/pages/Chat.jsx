import React, { useState } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import ChatPanel from '@/components/suite/ChatPanel';
import ConversationList from '@/components/suite/ConversationList';

export default function Chat() {
  const { tier } = useOutletContext();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [showListMobile, setShowListMobile] = useState(false);

  const handleSelect = (id) => {
    if (id) {
      navigate(`/suite/chat/${id}`);
    } else {
      navigate('/suite');
    }
    setShowListMobile(false);
  };

  return (
    <>
      <header className="border-b border-border px-6 py-3 bg-card/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowListMobile(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h2 className="font-mono text-xs text-muted-foreground tracking-[0.2em]">CHAT</h2>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop conversation list */}
        <div className="hidden lg:block">
          <ConversationList activeId={conversationId} onSelect={handleSelect} />
        </div>

        {/* Mobile conversation list overlay */}
        {showListMobile && (
          <div className="absolute inset-0 z-20 flex lg:hidden">
            <ConversationList
              activeId={conversationId}
              onSelect={handleSelect}
              onClose={() => setShowListMobile(false)}
            />
            <div
              className="flex-1 bg-background/80"
              onClick={() => setShowListMobile(false)}
            />
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <ChatPanel
            tier={tier}
            conversationId={conversationId}
            onConversationCreated={(id) => navigate(`/suite/chat/${id}`)}
          />
        </div>
      </div>
    </>
  );
}
