import React, { useState, useEffect } from 'react';
import { Upload, Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import KnowledgeCard from '@/components/knowledge/KnowledgeCard';

export default function Knowledge() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchEntries = async () => {
    try {
      const data = await base44.entities.KnowledgeEntry.list('-updated_date');
      setEntries(data);
    } catch {
      setError('Failed to load knowledge base.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    setError('');
    try {
      const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await base44.entities.KnowledgeEntry.create({
        title: title.trim(),
        content: content.trim(),
        source_type: 'manual',
        tags: tagArray,
        status: 'active',
      });
      setTitle('');
      setContent('');
      setTags('');
      fetchEntries();
    } catch {
      setError('Failed to add knowledge entry.');
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            content: { type: 'string' },
          },
        },
      });
      if (result.status === 'success' && result.output) {
        const extractedContent =
          typeof result.output === 'string'
            ? result.output
            : result.output.content || JSON.stringify(result.output);
        await base44.entities.KnowledgeEntry.create({
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: extractedContent,
          source_type: 'upload',
          tags: [],
          status: 'active',
        });
        fetchEntries();
      } else {
        setError('Could not extract content from this file.');
      }
    } catch {
      setError('Upload failed. Supported: PDF, TXT, CSV, JSON, HTML, images.');
    }
    setUploading(false);
  };

  const handleDelete = async (entry) => {
    await base44.entities.KnowledgeEntry.delete(entry.id);
    fetchEntries();
  };

  const handleToggleArchive = async (entry) => {
    const newStatus = entry.status === 'archived' ? 'active' : 'archived';
    await base44.entities.KnowledgeEntry.update(entry.id, { status: newStatus });
    fetchEntries();
  };

  const activeEntries = entries.filter((e) => e.status !== 'archived');
  const archivedEntries = entries.filter((e) => e.status === 'archived');

  return (
    <>
      <header className="border-b border-border px-6 py-3 bg-card/20">
        <h2 className="font-mono text-xs text-muted-foreground tracking-[0.2em]">KNOWLEDGE BASE</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add entry + upload */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-lg border border-border bg-card/30 p-4 space-y-3">
              <h3 className="font-mono text-xs text-foreground tracking-wider">ADD KNOWLEDGE</h3>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Knowledge content..."
                rows={5}
                className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
              />
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={handleAdd}
                disabled={!title.trim() || !content.trim()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-primary/10 border border-primary/30 text-primary text-sm font-mono hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card/30 p-4 space-y-3">
              <h3 className="font-mono text-xs text-foreground tracking-wider">UPLOAD FILE</h3>
              <label className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-dashed border-border text-muted-foreground text-sm font-mono hover:border-primary/50 hover:text-primary cursor-pointer transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Document
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.txt,.csv,.json,.html,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
              <p className="text-[10px] text-muted-foreground/40 font-mono">
                PDF, TXT, CSV, JSON, HTML, images
              </p>
            </div>

            {error && <p className="text-xs text-destructive font-mono">{error}</p>}
          </div>

          {/* Entry list */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-muted-foreground/50 animate-spin" />
              </div>
            ) : (
              <>
                {activeEntries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-xs text-muted-foreground/60 tracking-wider">
                        ACTIVE ({activeEntries.length})
                      </h3>
                      <span className="text-[10px] font-mono text-neon-green/60">RETAINED</span>
                    </div>
                    {activeEntries.map((entry) => (
                      <KnowledgeCard
                        key={entry.id}
                        entry={entry}
                        onDelete={handleDelete}
                        onToggleArchive={handleToggleArchive}
                      />
                    ))}
                  </div>
                )}

                {archivedEntries.length > 0 && (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-xs text-muted-foreground/40 tracking-wider">
                        ARCHIVED ({archivedEntries.length})
                      </h3>
                      <span className="text-[10px] font-mono text-destructive/50">LOST</span>
                    </div>
                    {archivedEntries.map((entry) => (
                      <KnowledgeCard
                        key={entry.id}
                        entry={entry}
                        onDelete={handleDelete}
                        onToggleArchive={handleToggleArchive}
                      />
                    ))}
                  </div>
                )}

                {entries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="font-mono text-sm text-muted-foreground/40">
                      The knowledge base is empty.
                    </p>
                    <p className="font-mono text-xs text-muted-foreground/30 mt-1">
                      Add entries or upload files to give Ragatha knowledge.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
