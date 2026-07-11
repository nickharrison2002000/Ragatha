import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Loader2, BookOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getRelevantKnowledge, buildRagContext } from '@/lib/rag';
import AttemptLog from '@/components/projects/AttemptLog';

const STATUS_CONFIG = {
  idle: { color: 'text-muted-foreground', border: 'border-border', label: 'IDLE' },
  running: { color: 'text-neon-gold', border: 'border-neon-gold/40', label: 'INSANITY MODE' },
  stopped: { color: 'text-muted-foreground', border: 'border-border', label: 'STOPPED' },
  succeeded: { color: 'text-neon-green', border: 'border-neon-green/40', label: 'SUCCEEDED' },
  failed: { color: 'text-destructive', border: 'border-destructive/40', label: 'FAILED' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(null);
  const [ragSources, setRagSources] = useState([]);
  const runningRef = useRef(false);

  const fetchProject = async () => {
    try {
      const p = await base44.entities.Project.get(id);
      if (p.insanity_status === 'running') {
        await base44.entities.Project.update(id, { insanity_status: 'stopped' });
        p.insanity_status = 'stopped';
      }
      setProject(p);
    } catch {}
    setLoading(false);
  };

  const fetchAttempts = async () => {
    try {
      const data = await base44.entities.ProjectAttempt.filter({ project_id: id });
      data.sort((a, b) => a.attempt_number - b.attempt_number);
      setAttempts(data);
    } catch {}
  };

  useEffect(() => {
    fetchProject();
    fetchAttempts();
    return () => {
      runningRef.current = false;
    };
  }, [id]);

  const startInsanity = async () => {
    if (!project || running) return;
    runningRef.current = true;
    setRunning(true);

    await base44.entities.Project.update(project.id, { insanity_status: 'running' });
    setProject((prev) => ({ ...prev, insanity_status: 'running' }));

    // Build RAG first — Ragatha learns before attempting
    setPhase('rag');
    setRagSources([]);
    let ragContext = '';
    try {
      const entries = await base44.entities.KnowledgeEntry.filter({ status: 'active' });
      const query = `${project.goal} ${project.success_criteria || ''}`;
      const relevant = await getRelevantKnowledge(query, entries);
      ragContext = buildRagContext(relevant);
      setRagSources(relevant.map((r) => r.title));
    } catch {}
    setPhase(null);

    // Load existing attempts for history
    const existing = await base44.entities.ProjectAttempt.filter({ project_id: project.id });
    existing.sort((a, b) => a.attempt_number - b.attempt_number);
    let history = [...existing];
    let attemptNum = history.length > 0 ? Math.max(...history.map((a) => a.attempt_number)) + 1 : 1;

    while (runningRef.current && attemptNum <= project.max_attempts) {
      setPhase('thinking');

      const historyText = history
        .slice(-10)
        .map(
          (a) =>
            `Attempt #${a.attempt_number} (succeeded: ${a.succeeded}):\nStrategy: ${a.strategy}\nResult: ${a.result}\nEvaluation: ${a.evaluation}`
        )
        .join('\n---\n');

      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `You are Ragatha in INSANITY MODE. You work on a task obsessively — trying over and over until you succeed. Giving up is not an option.

PROJECT GOAL: ${project.goal}
SUCCESS CRITERIA: ${project.success_criteria || 'Achieve the project goal'}

${ragContext ? `REFERENCE KNOWLEDGE:\n${ragContext}\n` : ''}

${historyText ? `PREVIOUS ATTEMPTS:\n${historyText}\n` : 'No previous attempts. This is your first try.'}

ATTEMPT #${attemptNum}:
Generate your next attempt. ${historyText ? 'Try a DIFFERENT strategy or a refined version of a previous one. Learn from what failed.' : 'Start with your best initial approach.'}

Return JSON with your strategy, action, result, evaluation, and whether it succeeded. Be realistic but persistent.`,
          response_json_schema: {
            type: 'object',
            properties: {
              strategy: { type: 'string', description: 'The approach for this attempt' },
              action: { type: 'string', description: 'What you specifically do' },
              result: { type: 'string', description: 'What happens when you try' },
              evaluation: { type: 'string', description: 'Does this meet the success criteria? Why or why not?' },
              succeeded: { type: 'boolean', description: 'Did this attempt achieve the goal?' },
            },
          },
        });

        setPhase(null);

        const attempt = {
          project_id: project.id,
          attempt_number: attemptNum,
          strategy: response.strategy,
          action: response.action,
          result: response.result,
          evaluation: response.evaluation,
          succeeded: response.succeeded,
        };

        await base44.entities.ProjectAttempt.create(attempt);
        history.push(attempt);
        setAttempts((prev) => [...prev, attempt]);

        await base44.entities.Project.update(project.id, { insanity_attempts: attemptNum });
        setProject((prev) => ({ ...prev, insanity_attempts: attemptNum }));

        if (response.succeeded) {
          await base44.entities.Project.update(project.id, {
            insanity_status: 'succeeded',
            status: 'completed',
          });
          setProject((prev) => ({ ...prev, insanity_status: 'succeeded', status: 'completed' }));
          break;
        }

        attemptNum++;
        await new Promise((r) => setTimeout(r, 800));
      } catch {
        setPhase(null);
        attemptNum++;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (runningRef.current && attemptNum > project.max_attempts) {
      await base44.entities.Project.update(project.id, { insanity_status: 'failed' });
      setProject((prev) => ({ ...prev, insanity_status: 'failed' }));
    }

    runningRef.current = false;
    setRunning(false);
    setPhase(null);
  };

  const stopInsanity = async () => {
    runningRef.current = false;
    setRunning(false);
    setPhase(null);
    await base44.entities.Project.update(project.id, { insanity_status: 'stopped' });
    setProject((prev) => ({ ...prev, insanity_status: 'stopped' }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-muted-foreground/50 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="font-mono text-sm text-muted-foreground/50">Project not found.</p>
        <button
          onClick={() => navigate('/suite/projects')}
          className="mt-4 text-xs font-mono text-primary hover:underline"
        >
          ← Back to projects
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[project.insanity_status] || STATUS_CONFIG.idle;
  const canStart = !running && project.insanity_status !== 'succeeded';

  return (
    <>
      <header
        className={`border-b ${status.border} px-6 py-3 bg-card/20 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/suite/projects')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="font-mono text-xs text-muted-foreground tracking-[0.2em]">
            {project.title.toUpperCase()}
          </h2>
        </div>
        <div
          className={`flex items-center gap-2 text-[10px] font-mono ${status.color} ${running ? 'animate-pulse' : ''}`}
        >
          {running && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-current"
              style={{ boxShadow: '0 0 6px currentColor' }}
            />
          )}
          {status.label}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Project info */}
          <div className="rounded-lg border border-border bg-card/30 p-5 space-y-4">
            <div>
              <div className="text-[10px] font-mono text-muted-foreground/50 tracking-wider mb-1">
                GOAL
              </div>
              <p className="text-sm text-foreground/90">{project.goal}</p>
            </div>
            {project.success_criteria && (
              <div>
                <div className="text-[10px] font-mono text-muted-foreground/50 tracking-wider mb-1">
                  SUCCESS CRITERIA
                </div>
                <p className="text-sm text-foreground/90">{project.success_criteria}</p>
              </div>
            )}
            <div className="flex items-center gap-6 pt-2 border-t border-border/50">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
                  ATTEMPTS
                </div>
                <div className="font-mono text-lg text-foreground">
                  {project.insanity_attempts || 0}{' '}
                  <span className="text-muted-foreground/40 text-sm">/ {project.max_attempts}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
                  RAG SOURCES
                </div>
                <div className="font-mono text-lg text-foreground">
                  {ragSources.length || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* RAG sources */}
          {ragSources.length > 0 && (
            <div className="rounded-lg border border-border bg-card/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                  RAG KNOWLEDGE ACTIVE
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {ragSources.map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono text-muted-foreground/40 border border-border/50 rounded px-1.5 py-0.5"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Insanity controls */}
          <div
            className={`rounded-lg border ${running ? 'border-neon-gold/30 bg-neon-gold/5' : 'border-border bg-card/20'} p-4`}
          >
            {running ? (
              <button
                onClick={stopInsanity}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm font-mono hover:bg-destructive/20 transition-colors"
              >
                <Square className="w-4 h-4" />
                STOP INSANITY
              </button>
            ) : (
              <button
                onClick={startInsanity}
                disabled={!canStart}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-primary/10 border border-primary/30 text-primary text-sm font-mono hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                {project.insanity_status === 'succeeded'
                  ? 'COMPLETED'
                  : project.insanity_attempts > 0
                  ? 'RESUME INSANITY'
                  : 'ENTER INSANITY MODE'}
              </button>
            )}
            {project.insanity_status === 'succeeded' && (
              <p className="text-center text-[10px] font-mono text-neon-green/60 mt-2">
                Goal achieved after {project.insanity_attempts} attempts.
              </p>
            )}
          </div>

          {/* Attempt log */}
          {attempts.length > 0 || running ? (
            <div>
              <h3 className="font-mono text-xs text-muted-foreground/60 tracking-wider mb-3">
                ATTEMPT LOG
              </h3>
              <AttemptLog attempts={attempts} running={running} phase={phase} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
