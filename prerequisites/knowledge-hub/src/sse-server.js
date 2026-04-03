import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { kbSave, kbSearch, kbRead, kbList, kbContext, kbPrune } from './tools/index.js';
import express from 'express';

const app = express();
const PORT = 18793;

// Store active transports
const transports = {};

// Create a fresh MCP server for each connection
function createServer() {
  const server = new McpServer({ name: 'knowledge-hub', version: '1.0.0' });

  server.tool('kb_save', 'Save a knowledge entry (key-value with category and project)', {
    key: z.string().describe('Unique key for the entry'),
    value: z.string().describe('Content/value to store'),
    category: z.string().optional().default('general').describe('Category'),
    project: z.string().optional().describe('Project name'),
  }, async ({ key, value, category, project }) => {
    return { content: [{ type: 'text', text: JSON.stringify(kbSave({ key, value, category, project: project || null }), null, 2) }] };
  });

  server.tool('kb_search', 'Search knowledge base using full-text search (FTS5)', {
    query: z.string().describe('Search query'),
    project: z.string().optional().describe('Filter by project'),
    category: z.string().optional().describe('Filter by category'),
    limit: z.number().optional().default(10).describe('Max results'),
  }, async ({ query, project, category, limit }) => {
    return { content: [{ type: 'text', text: JSON.stringify(kbSearch({ query, project: project || null, category: category || null, limit }), null, 2) }] };
  });

  server.tool('kb_read', 'Read a specific knowledge entry by exact key', {
    key: z.string().describe('Key to look up'),
    project: z.string().optional().describe('Project scope'),
  }, async ({ key, project }) => {
    return { content: [{ type: 'text', text: JSON.stringify(kbRead({ key, project: project || null }), null, 2) }] };
  });

  server.tool('kb_list', 'List knowledge entries with optional filters', {
    project: z.string().optional().describe('Filter by project'),
    category: z.string().optional().describe('Filter by category'),
    tier: z.enum(['HOT', 'WARM', 'COLD']).optional().describe('Filter by tier'),
    limit: z.number().optional().default(50).describe('Max entries'),
    offset: z.number().optional().default(0).describe('Pagination offset'),
  }, async ({ project, category, tier, limit, offset }) => {
    return { content: [{ type: 'text', text: JSON.stringify(kbList({ project: project || null, category: category || null, tier: tier || null, limit, offset }), null, 2) }] };
  });

  server.tool('kb_context', 'Get top HOT knowledge entries formatted as markdown', {
    project: z.string().optional().describe('Filter by project'),
    category: z.string().optional().describe('Filter by category'),
    limit: z.number().optional().default(20).describe('Max entries'),
  }, async ({ project, category, limit }) => {
    return { content: [{ type: 'text', text: JSON.stringify(kbContext({ project: project || null, category: category || null, limit }), null, 2) }] };
  });

  server.tool('kb_prune', 'Prune knowledge base: HOT >7d without access become WARM, WARM >90d become COLD', {
    dryRun: z.boolean().optional().default(false).describe('If true, only report what would change'),
  }, async ({ dryRun }) => {
    return { content: [{ type: 'text', text: JSON.stringify(kbPrune({ dryRun }), null, 2) }] };
  });

  return server;
}

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  
  res.on('close', () => {
    delete transports[transport.sessionId];
  });

  const server = createServer();
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (!transport) {
    res.status(400).json({ error: 'No transport found for sessionId' });
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.listen(PORT, '127.0.0.1', () => {
  console.log('KnowledgeHub SSE MCP server on 127.0.0.1:' + PORT);
});
