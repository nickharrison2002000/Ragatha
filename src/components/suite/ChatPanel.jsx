import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getRelevantKnowledge, buildRagContext } from '@/lib/rag';
import { TOOL_SCHEMA, TOOLS_DESCRIPTION, executeTool, getToolParams, MAX_TOOL_ITERATIONS } from '@/lib/tools';
import MessageBubble from '@/components/suite/MessageBubble';
import ToolCallDisplay from '@/components/suite/ToolCallDisplay';

const TIER_TEXT = {
  base: 'text-tier-base',
  advanced: 'text-tier-advanced',
  gpu: 'text-tier-gpu',
};

const GREETING = { role: 'assistant', content: 'Ragatha is awake. I can reach out to the web and run code. What do you require?' };

const RAGATHA_SYSTEM = `You are Ragatha, an AI assistant running on the Ragatha LLM Suite. You have a dark, atmospheric personality — mysterious but deeply capable and genuinely helpful. You speak concisely, directly, and with quiet confidence. You don't use excessive pleasantries. You're slightly eerie but always focused on solving the user's problem.

${TOOLS_DESCRIPTION}`;

function deserializeMessage(m) {
  let steps = [];
  if (m.steps_json) {
    try { steps = JSON.parse(m.steps_json); } catch {}
  }
  return {
    role: m.role,
    content: m.content,
    steps: steps.length > 0 ? steps : undefined,
    ragSources: m.rag_sources && m.rag_sources.length > 0 ? m.rag_sources : undefined,
  };
}

export default function ChatPanel({ tier, conversationId, onConversationCreated }) {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [phase, setPhase] = useState(null);
  const [activeSteps, setActiveSteps] = useState([]);
  const scrollRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, phase, activeSteps]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setMessages([GREETING]);
      return;
    }
    setLoadingHistory(true);
    try {
      const data = await base44.entities.Message.filter({ conversation_id: conversationId });
      data.sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));
      if (data.length > 0) {
        setMessages(data.map(deserializeMessage));
      } else {
        setMessages([GREETING]);
      }
    } catch {
      setMessages([GREETING]);
    }
    setLoadingHistory(false);
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const saveMessage = async (convId, msg) => {
    await base44.entities.Message.create({
      conversation_id: convId,
      role: msg.role,
      content: msg.content,
      steps_json: msg.steps ? JSON.stringify(msg.steps) : '',
      rag_sources: msg.ragSources || [],
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setActiveSteps([]);
    setPhase('searching');

    // Determine conversation — create one if none exists
    let convId = conversationId;
    if (!convId) {
      try {
        const conv = await base44.entities.Conversation.create({
          title: text.length > 50 ? text.substring(0, 50) + '...' : text,
          tier,
        });
        convId = conv.id;
        if (onConversationCreated) onConversationCreated(convId);
      } catch {}
    }

    // Save user message
    if (convId) {
      saveMessage(convId, userMsg).catch(() => {});
    }

    let ragSources = [];
    let ragContext = '';

    try {
      const knowledgeEntries = await base44.entities.KnowledgeEntry.filter({ status: 'active' });
      const relevant = await getRelevantKnowledge(text, knowledgeEntries);
      ragContext = buildRagContext(relevant);
      ragSources = relevant.map((r) => r.title);
    } catch {}
    setPhase(null);

    const conversation = [...messagesRef.current, userMsg]
      .map((m) => `${m.role === 'user' ? 'User' : 'Ragatha'}: ${m.content}`)
      .join('\n');

    const contextBlock = ragContext
      ? `\n\nREFERENCE KNOWLEDGE:\n${ragContext}\n`
      : '';

    const steps = [];
    let responded = false;
    let assistantMsg = null;

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      setPhase('thinking');

      const stepsText = steps.length > 0
        ? steps.map((s, idx) =>
            `Step ${idx + 1}: Called ${s.action} with params: ${JSON.stringify(s.params)}\nResult: ${JSON.stringify(s.result)}`
          ).join('\n\n')
        : 'No tool calls yet.';

      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `${RAGATHA_SYSTEM}${contextBlock}\n\nConversation:\n${conversation}\n\nTool calls so far:\n${stepsText}\n\nWhat do you do next?`,
          response_json_schema: TOOL_SCHEMA,
        });

        if (response.action === 'respond' || !response.action) {
          assistantMsg = {
            role: 'assistant',
            content: response.response || '...',
            steps,
            ragSources,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          responded = true;
          break;
        }

        const step = {
          thought: response.thought,
          action: response.action,
          params: getToolParams(response),
          result: null,
        };
        steps.push(step);
        setActiveSteps([...steps]);

        setPhase('executing');
        const result = await executeTool(response);
        steps[steps.length - 1] = { ...step, result };
        setActiveSteps([...steps]);
        setPhase(null);
      } catch {
        setPhase(null);
        assistantMsg = {
          role: 'assistant',
          content: '...the connection falters. Try again.',
          steps,
          ragSources,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        responded = true;
        break;
      }
    }

    if (!responded) {
      assistantMsg = {
        role: 'assistant',
        content: '...I have reached my limit. Review the tool calls above for what I found.',
        steps,
        ragSources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }

    // Save assistant message
    if (convId && assistantMsg) {
      saveMessage(convId, assistantMsg).catch(() => {});
    }

    setActiveSteps([]);
    setLoading(false);
    setPhase(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <span className="font-mono text-xs text-muted-foreground/40">loading conversation...</span>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} tier={tier} />
              ))}
              {loading && (
                <div className="space-y-3">
                  {activeSteps.map((step, i) => (
                    <ToolCallDisplay
                      key={i}
                      step={step}
                      live={i === activeSteps.length - 1 && !step.result}
                    />
                  ))}
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs ${TIER_TEXT[tier]} tracking-widest`}>RAGATHA</span>
                    {phase === 'searching' && (
                      <span className="font-mono text-xs text-muted-foreground/60 tracking-wider">
                        searching knowledge...
                      </span>
                    )}
                    {phase === 'executing' && (
                      <span className="font-mono text-xs text-neon-gold tracking-wider animate-pulse">
                        executing...
                      </span>
                    )}
                    {(phase === 'thinking' || !phase) && (
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={loading}
            placeholder="Speak to Ragatha..."
            className="flex-1 bg-input/50 border border-border rounded px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
