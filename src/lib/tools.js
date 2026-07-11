import { base44 } from '@/api/base44Client';

export const MAX_TOOL_ITERATIONS = 10;

export const TOOL_SCHEMA = {
  type: 'object',
  properties: {
    thought: { type: 'string', description: 'Your reasoning about what to do next' },
    action: { type: 'string', enum: ['respond', 'http_request', 'run_code', 'web_search'], description: 'respond = give final answer to user, http_request = make an HTTP request, run_code = execute JavaScript code, web_search = search the live web for current information' },
    response: { type: 'string', description: 'Your response to the user (when action is respond)' },
    http_url: { type: 'string', description: 'Full URL for the HTTP request (when action is http_request)' },
    http_method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method (when action is http_request)' },
    http_headers: { type: 'object', description: 'HTTP headers as key-value pairs (when action is http_request)' },
    http_body: { type: 'string', description: 'Request body as a JSON string (when action is http_request, for POST/PUT/PATCH)' },
    code: { type: 'string', description: 'JavaScript code to execute. Write complete, self-contained scripts. Use return to return a final value. console.log() is available for debugging. Async/await is supported. Available globals: JSON, Math, Date, Array, Object, String, Number, Boolean, Map, Set, parseInt, parseFloat, isNaN, fetch (async HTTP), btoa, atob, encodeURIComponent, decodeURIComponent. (when action is run_code)' },
    search_query: { type: 'string', description: 'The search query to look up on the live web (when action is web_search)' },
  },
  required: ['thought', 'action'],
};

export const TOOLS_DESCRIPTION = `You have access to tools. Use them when they help you answer the user's question or complete a task.

Available tools:

1. web_search — Search the live web via Google for the most current, up-to-date information available. This is your primary tool for anything that requires recent data — news, stock prices, current events, latest releases, weather, sports scores, or any fact you're not confident is current. ALWAYS prefer web_search over relying on your training data when the user asks about something time-sensitive or recent. The results come from Google Search in real time.
   Set: action="web_search", search_query

2. http_request — Make an HTTP request to any URL. Use this to fetch data from specific APIs, check websites, or interact with web services when you already know the exact URL. Note: browser CORS restrictions may block some requests — if a request fails, try a different URL or approach.
   Set: action="http_request", http_url, http_method, http_headers (optional), http_body (optional)

3. run_code — Execute JavaScript code directly. This is one of your most powerful tools — use it proactively to:
   - Test logic and verify algorithms before presenting them
   - Solve mathematical or computational problems with exact precision
   - Process, transform, or analyze data structures
   - Prototype functions and validate they work correctly
   - Format or generate structured output (JSON, CSV, etc.)
   - Make fetch() calls to APIs when you need to process the response in code
   - Debug by logging intermediate values with console.log()
   
   Write complete, self-contained scripts. Use return to pass the result back. If your code has an error, you will see the error message with line numbers — fix it and try again. You can call run_code multiple times to iterate on a solution. console.log() output is returned alongside the result.
   Set: action="run_code", code

To give your final answer to the user: set action="respond" and put your answer in "response".

You can use tools multiple times in sequence. After each tool call, you'll receive the result and can decide what to do next. Use tool results to inform your next step or your final response.`;

export async function executeHttp(request) {
  const { http_url, http_method, http_headers, http_body } = request;
  try {
    const response = await fetch(http_url, {
      method: http_method || 'GET',
      headers: http_headers || {},
      body: http_method !== 'GET' ? http_body : undefined,
    });
    const text = await response.text();
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: text.substring(0, 4000),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

const CODE_TIMEOUT_MS = 10000;

function formatValue(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'function') return '[Function]';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, (key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof Error) return value.toString();
        return value;
      }, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export async function executeCode(code) {
  const logs = [];
  const mockConsole = {
    log: (...args) => logs.push(args.map((a) => formatValue(a)).join(' ')),
    error: (...args) => logs.push('[ERROR] ' + args.map((a) => formatValue(a)).join(' ')),
    warn: (...args) => logs.push('[WARN] ' + args.map((a) => formatValue(a)).join(' ')),
    info: (...args) => logs.push(args.map((a) => formatValue(a)).join(' ')),
    table: (data) => logs.push(formatValue(data)),
  };

  try {
    const fn = new Function(
      'console', 'fetch', 'JSON', 'Math', 'Date', 'Array', 'Object',
      'String', 'Number', 'Boolean', 'Map', 'Set', 'parseInt', 'parseFloat',
      'isNaN', 'btoa', 'atob', 'encodeURIComponent', 'decodeURIComponent',
      'Promise',
      'return (async () => {\n' + code + '\n})()'
    );

    const resultPromise = fn(
      mockConsole, fetch, JSON, Math, Date, Array, Object,
      String, Number, Boolean, Map, Set, parseInt, parseFloat,
      isNaN, btoa, atob, encodeURIComponent, decodeURIComponent,
      Promise
    );

    const result = await Promise.race([
      resultPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timed out after ' + CODE_TIMEOUT_MS / 1000 + 's')), CODE_TIMEOUT_MS)
      ),
    ]);

    return {
      success: true,
      result: result === undefined ? 'undefined' : formatValue(result),
      logs: logs.join('\n'),
    };
  } catch (e) {
    let errorDetail = e.message;
    if (e.stack) {
      const match = e.stack.match(/<anonymous>:(\d+):(\d+)/);
      if (match) {
        errorDetail = e.message + ' (line ' + (parseInt(match[1]) - 3) + ', col ' + match[2] + ')';
      }
    }
    return {
      success: false,
      error: errorDetail,
      logs: logs.join('\n'),
    };
  }
}

export async function executeWebSearch(query) {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Search the web for the most current, up-to-date information about: "${query}". 

Return a detailed summary of what you find, including specific facts, numbers, dates, and source names. Focus on the most RECENT information available — do not include outdated or backdated information. If there are developments from today or this week, prioritize those.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Detailed summary of current findings' },
          sources: { type: 'array', items: { type: 'string' }, description: 'Names or URLs of sources' },
        },
      },
    });

    return {
      success: true,
      summary: result.summary,
      sources: result.sources || [],
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function executeTool(response) {
  if (response.action === 'http_request') {
    return await executeHttp(response);
  }
  if (response.action === 'run_code') {
    return await executeCode(response.code);
  }
  if (response.action === 'web_search') {
    return await executeWebSearch(response.search_query);
  }
  return { success: false, error: 'Unknown action' };
}

export function getToolParams(response) {
  if (response.action === 'http_request') {
    return {
      url: response.http_url,
      method: response.http_method || 'GET',
      headers: response.http_headers,
      body: response.http_body,
    };
  }
  if (response.action === 'run_code') {
    return { code: response.code };
  }
  if (response.action === 'web_search') {
    return { query: response.search_query };
  }
  return {};
}
