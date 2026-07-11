import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, FolderClosed } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProjectCard from '@/components/projects/ProjectCard';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(50);

  const fetchProjects = async () => {
    try {
      const data = await base44.entities.Project.list('-updated_date');
      setProjects(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !goal.trim()) return;
    setCreating(true);
    try {
      const project = await base44.entities.Project.create({
        title: title.trim(),
        goal: goal.trim(),
        success_criteria: successCriteria.trim(),
        max_attempts: maxAttempts,
        status: 'active',
        insanity_status: 'idle',
        insanity_attempts: 0,
      });
      navigate(`/suite/projects/${project.id}`);
    } catch {}
    setCreating(false);
  };

  return (
    <>
      <header className="border-b border-border px-6 py-3 bg-card/20 flex items-center justify-between">
        <h2 className="font-mono text-xs text-muted-foreground tracking-[0.2em]">PROJECTS</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Project
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {showCreate && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-card/30 p-5 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project title"
                className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What is the goal of this project?"
                rows={3}
                className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
              />
              <textarea
                value={successCriteria}
                onChange={(e) => setSuccessCriteria(e.target.value)}
                placeholder="Success criteria — how do we know when it's done?"
                rows={2}
                className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
              />
              <div className="flex items-center gap-3">
                <label className="text-xs font-mono text-muted-foreground">Max attempts</label>
                <input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 50)}
                  min="1"
                  max="200"
                  className="w-24 bg-input/50 border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!title.trim() || !goal.trim() || creating}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-primary/10 border border-primary/30 text-primary text-sm font-mono hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded border border-border text-muted-foreground text-sm font-mono hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-muted-foreground/50 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderClosed className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="font-mono text-sm text-muted-foreground/40">No projects yet.</p>
              <p className="font-mono text-xs text-muted-foreground/30 mt-1">
                Create a project to enter insanity mode.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => navigate(`/suite/projects/${p.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
