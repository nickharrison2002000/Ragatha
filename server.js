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

// ============ LLM INFERENCE ============

/**
 * Main LLM inference endpoint
 * Expects: { prompt, response_json_schema? }
 * Returns: JSON response matching the schema
 */
app.post('/api/llm/invoke', async (req, res) => {
  const { prompt, response_json_schema } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    // For now, return a structured response that matches the expected schema
    // The frontend will call the actual GGUF model when it's available
    const response = generateLLMResponse(prompt, response_json_schema);
    res.json(response);
  } catch (error) {
    console.error('LLM inference error:', error);
    res.status(500).json({ error: 'LLM inference failed', details: error.message });
  }
});

/**
 * Generate a response from the prompt
 * This is a placeholder that will be replaced with actual GGUF inference
 */
function generateLLMResponse(prompt, schema) {
  // Extract the last user message from the prompt
  const userMatch = prompt.match(/User:\s*(.+?)(?:\n|$)/i);
  const userInput = userMatch ? userMatch[1].trim() : prompt.substring(0, 100);

  // Generate contextual response
  const response = generateSmartResponse(userInput);

  // Return in schema format if requested
  if (schema) {
    return {
      thought: `Processing: "${userInput.substring(0, 50)}..."`,
      action: 'respond',
      response: response,
      search_query: null,
      http_url: null,
      http_method: null,
      code: null,
    };
  }

  return { text: response };
}

/**
 * Generate intelligent responses based on user input
 */
function generateSmartResponse(input) {
  const lower = input.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('greet')) {
    return 'Greetings, traveler. Ragatha is ready to assist you with analysis, coding, calculations, and problem-solving.';
  }

  if (lower.includes('time') || lower.includes('date')) {
    return `The current time is ${new Date().toLocaleString()}.`;
  }

  if (lower.includes('help')) {
    return 'I can assist with: code execution, calculations, reasoning through problems, analysis, and technical explanations. What would you like help with?';
  }

  if (lower.includes('code') || lower.includes('program') || lower.includes('write') || lower.includes('function')) {
    return 'I can help with coding tasks. I can provide explanations, code examples, algorithms, and best practices. What would you like to build or understand?';
  }

  if (lower.includes('calculate') || lower.includes('math') || lower.includes('solve') || lower.includes('equation')) {
    return 'I can help with mathematical problems and calculations. Describe the problem you\'d like to solve.';
  }

  if (lower.includes('search') || lower.includes('find') || lower.includes('look') || lower.includes('research')) {
    return 'In offline mode, I can help you reason through problems and analyze information you provide. What are you trying to find or understand?';
  }

  if (lower.includes('what is') || lower.includes('explain') || lower.includes('define') || lower.includes('tell me')) {
    const topic = input.substring(input.indexOf('what') + 5).trim().substring(0, 40);
    return `Regarding ${topic || 'that'}: I can provide detailed explanations and analysis. What specific aspect would you like to know more about?`;
  }

  // Default intelligent response
  return `I understand your query about "${input.substring(0, 40)}...". Let me help you with that. Could you provide more details about what you're trying to accomplish?`;
}

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

  // If it's a user message, generate an LLM response
  if (message.role === 'user') {
    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: generateSmartResponse(message.content),
      created_at: new Date(),
    };
    conv.messages.push(assistantMessage);
  }

  res.json(conv);
});

// ============ ENTITIES (for base44 compatibility) ============

// Messages endpoints
app.post('/api/entities/messages', (req, res) => {
  const { conversation_id, role, content, steps_json, rag_sources } = req.body;
  
  const conv = db.conversations.find((c) => c.id === conversation_id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const message = {
    id: uuidv4(),
    conversation_id,
    role,
    content,
    steps_json: steps_json || '',
    rag_sources: rag_sources || [],
    created_date: new Date().toISOString(),
  };

  conv.messages.push({
    ...message,
    created_at: new Date(),
  });
  conv.updated_at = new Date();

  res.json(message);
});

app.get('/api/entities/messages', (req, res) => {
  const { conversation_id } = req.query;
  
  if (!conversation_id) {
    return res.status(400).json({ error: 'Missing conversation_id' });
  }

  const conv = db.conversations.find((c) => c.id === conversation_id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const messages = conv.messages.map((m) => ({
    id: m.id,
    conversation_id,
    role: m.role,
    content: m.content,
    steps_json: m.steps_json || '',
    rag_sources: m.rag_sources || [],
    created_date: m.created_date || m.created_at.toISOString(),
  }));

  res.json(messages);
});

// Conversations endpoints (entity style)
app.post('/api/entities/conversations', (req, res) => {
  const { title, tier } = req.body;
  
  const conv = {
    id: uuidv4(),
    title: title || 'New Conversation',
    tier,
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    messages: [],
  };

  db.conversations.push(conv);
  res.json(conv);
});

// Knowledge entries endpoints
app.get('/api/entities/knowledge-entries', (req, res) => {
  const { status } = req.query;
  
  let entries = db.knowledge_entries;
  if (status) {
    entries = entries.filter((e) => e.status === status);
  }

  res.json(entries);
});

app.post('/api/entities/knowledge-entries', (req, res) => {
  const { title, content, source_type, tags, status } = req.body;
  
  const entry = {
    id: uuidv4(),
    title,
    content,
    source_type: source_type || 'manual',
    tags: tags || [],
    status: status || 'active',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  };

  db.knowledge_entries.push(entry);
  res.json(entry);
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
  res.json({ status: 'ok', llm: 'ready' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Local backend running on http://localhost:${PORT}`);
  console.log(`✓ LLM inference: POST /api/llm/invoke`);
  console.log(`✓ Endpoints: /api/conversations, /api/projects, /api/knowledge`);
  console.log(`✓ All Base44 dependencies removed - running fully local`);
});
