import express from 'express';
import { v4 as uuidv4 } from 'crypto';

const app = express();
app.use(express.json());

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// In-memory storage (resets on server restart)
const db = {
  conversations: [
    {
      id: uuidv4(),
      title: 'Welcome to Ragatha',
      created_at: new Date(),
      updated_at: new Date(),
      messages: [
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Welcome to Ragatha, your LLM suite. I\'m ready to assist you with conversations, projects, and knowledge management.',
          created_at: new Date(),
        },
      ],
    },
  ],
  projects: [
    {
      id: uuidv4(),
      title: 'Example Project',
      goal: 'Build a working local backend for Ragatha',
      success_criteria: 'Chat, Projects, and Knowledge endpoints are functional',
      max_attempts: 50,
      status: 'active',
      insanity_status: 'idle',
      insanity_attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  knowledge_entries: [
    {
      id: uuidv4(),
      title: 'Ragatha Documentation',
      content: 'Ragatha is an LLM suite with chat, project management, and knowledge base features.',
      source_type: 'manual',
      tags: ['ragatha', 'docs'],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
};

// ============ CONVERSATIONS ============

// Get all conversations
app.get('/api/conversations', (req, res) => {
  const sorted = [...db.conversations].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  res.json(sorted);
});

// Get single conversation
app.get('/api/conversations/:id', (req, res) => {
  const conv = db.conversations.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json(conv);
});

// Create conversation
app.post('/api/conversations', (req, res) => {
  const conv = {
    id: uuidv4(),
    title: req.body.title || 'New Conversation',
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
  };
  db.conversations.push(conv);
  res.json(conv);
});

// Add message to conversation
app.post('/api/conversations/:id/messages', (req, res) => {
  const conv = db.conversations.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });

  const message = {
    id: uuidv4(),
    role: req.body.role || 'user',
    content: req.body.content,
    created_at: new Date(),
  };

  conv.messages.push(message);
  conv.updated_at = new Date();

  // Simulate assistant response
  if (message.role === 'user') {
    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: `I received your message: "${message.content}". This is a mock response from the local backend.`,
      created_at: new Date(),
    };
    conv.messages.push(assistantMessage);
  }

  res.json(conv);
});

// ============ PROJECTS ============

// Get all projects
app.get('/api/projects', (req, res) => {
  const sorted = [...db.projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  res.json(sorted);
});

// Get single project
app.get('/api/projects/:id', (req, res) => {
  const proj = db.projects.find((p) => p.id === req.params.id);
  if (!proj) return res.status(404).json({ error: 'Not found' });
  res.json(proj);
});

// Create project
app.post('/api/projects', (req, res) => {
  const proj = {
    id: uuidv4(),
    title: req.body.title,
    goal: req.body.goal,
    success_criteria: req.body.success_criteria || '',
    max_attempts: req.body.max_attempts || 50,
    status: req.body.status || 'active',
    insanity_status: req.body.insanity_status || 'idle',
    insanity_attempts: req.body.insanity_attempts || 0,
    created_at: new Date(),
    updated_at: new Date(),
  };
  db.projects.push(proj);
  res.status(201).json(proj);
});

// Update project
app.put('/api/projects/:id', (req, res) => {
  const proj = db.projects.find((p) => p.id === req.params.id);
  if (!proj) return res.status(404).json({ error: 'Not found' });

  Object.assign(proj, req.body, { updated_at: new Date() });
  res.json(proj);
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  const idx = db.projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  db.projects.splice(idx, 1);
  res.status(204).send();
});

// ============ KNOWLEDGE BASE ============

// Get all knowledge entries
app.get('/api/knowledge', (req, res) => {
  const sorted = [...db.knowledge_entries].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  res.json(sorted);
});

// Get single knowledge entry
app.get('/api/knowledge/:id', (req, res) => {
  const entry = db.knowledge_entries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

// Create knowledge entry
app.post('/api/knowledge', (req, res) => {
  const entry = {
    id: uuidv4(),
    title: req.body.title,
    content: req.body.content,
    source_type: req.body.source_type || 'manual',
    tags: req.body.tags || [],
    status: req.body.status || 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };
  db.knowledge_entries.push(entry);
  res.status(201).json(entry);
});

// Update knowledge entry
app.put('/api/knowledge/:id', (req, res) => {
  const entry = db.knowledge_entries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });

  Object.assign(entry, req.body, { updated_at: new Date() });
  res.json(entry);
});

// Delete knowledge entry
app.delete('/api/knowledge/:id', (req, res) => {
  const idx = db.knowledge_entries.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  db.knowledge_entries.splice(idx, 1);
  res.status(204).send();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Local backend running on http://localhost:${PORT}`);
  console.log(`✓ Endpoints: /api/conversations, /api/projects, /api/knowledge`);
});
