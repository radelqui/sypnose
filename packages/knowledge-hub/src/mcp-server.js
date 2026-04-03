import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { kbSave, kbSearch, kbRead, kbList, kbContext, kbPrune } from './tools/index.js';
import { inboxCheck, inboxAck } from './inbox.js';
import { a2aSend, a2aMessages } from './a2a.js';
import { channelPublish, channelMessages } from './channels.js';

const server = new McpServer({
  name: 'knowledge-hub',
  version: '1.0.0',
});

// kb_save — Save knowledge entry
server.tool(
  'kb_save',
  'Save a knowledge entry (key-value with category and project)',
  {
    key: z.string().describe('Unique key for the entry'),
    value: z.string().describe('Content/value to store'),
    category: z.string().optional().default('general').describe('Category (e.g., decision, pattern, error, config)'),
    project: z.string().optional().describe('Project name (e.g., iatrader, gestoriard)'),
  },
  async ({ key, value, category, project }) => {
    const result = kbSave({ key, value, category, project: project || null });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// kb_search — Full-text search
server.tool(
  'kb_search',
  'Search knowledge base using full-text search (FTS5)',
  {
    query: z.string().describe('Search query (supports FTS5 syntax)'),
    project: z.string().optional().describe('Filter by project'),
    category: z.string().optional().describe('Filter by category'),
    limit: z.number().optional().default(10).describe('Max results'),
  },
  async ({ query, project, category, limit }) => {
    const result = kbSearch({ query, project: project || null, category: category || null, limit });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// kb_read — Read single entry by key
server.tool(
  'kb_read',
  'Read a specific knowledge entry by exact key',
  {
    key: z.string().describe('Key to look up'),
    project: z.string().optional().describe('Project scope'),
  },
  async ({ key, project }) => {
    const result = kbRead({ key, project: project || null });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// kb_list — List entries with filters
server.tool(
  'kb_list',
  'List knowledge entries with optional filters',
  {
    project: z.string().optional().describe('Filter by project'),
    category: z.string().optional().describe('Filter by category'),
    tier: z.enum(['HOT', 'WARM', 'COLD']).optional().describe('Filter by tier'),
    limit: z.number().optional().default(50).describe('Max entries'),
    offset: z.number().optional().default(0).describe('Pagination offset'),
  },
  async ({ project, category, tier, limit, offset }) => {
    const result = kbList({ project: project || null, category: category || null, tier: tier || null, limit, offset });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// kb_context — Get HOT entries as markdown context
server.tool(
  'kb_context',
  'Get top HOT knowledge entries formatted as markdown (for injecting into agent context)',
  {
    project: z.string().optional().describe('Filter by project'),
    category: z.string().optional().describe('Filter by category'),
    limit: z.number().optional().default(20).describe('Max entries'),
  },
  async ({ project, category, limit }) => {
    const result = kbContext({ project: project || null, category: category || null, limit });
    return { content: [{ type: 'text', text: result.markdown }] };
  }
);

// kb_prune — Degrade old entries
server.tool(
  'kb_prune',
  'Prune knowledge base: HOT entries >7d without access become WARM, WARM >90d become COLD',
  {
    dryRun: z.boolean().optional().default(false).describe('If true, only report what would change'),
  },
  async ({ dryRun }) => {
    const result = kbPrune({ dryRun });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// kb_inbox_check — Check unread inbox messages
server.tool(
  'kb_inbox_check',
  'Check unread inbox messages for an agent. Returns messages sorted by priority (alta first) then date.',
  {
    for: z.string().describe('Recipient agent ID (e.g., seguridad, iatrader, sm-claude-web)'),
    limit: z.number().optional().default(20).describe('Max messages to return'),
  },
  async ({ for: recipient, limit }) => {
    const result = inboxCheck({ for: recipient, limit: limit || 20 });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// kb_inbox_ack — Mark inbox message as read
server.tool(
  'kb_inbox_ack',
  'Mark an inbox message as read (acknowledged). Use after processing a message.',
  {
    id: z.number().describe('Message ID to acknowledge (from kb_inbox_check results)'),
  },
  async ({ id }) => {
    const result = inboxAck({ id });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// a2a_send — Send direct message between agents
server.tool(
  'a2a_send',
  'Send a direct message to another agent (A2A). Types: request (expect response), response (reply to request), notify (one-way). Cannot create tasks (SM exclusive).',
  {
    from: z.string().describe('Sender agent ID'),
    to: z.string().describe('Recipient agent ID'),
    type: z.enum(['request', 'response', 'notify']).optional().default('notify').describe('Message type'),
    payload: z.string().describe('Message content'),
    reply_to: z.number().optional().describe('ID of message being replied to'),
  },
  async ({ from, to, type, payload, reply_to }) => {
    const result = a2aSend({ from, to, type, payload, reply_to: reply_to || null });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// a2a_messages — Check A2A messages for an agent
server.tool(
  'a2a_messages',
  'Check direct messages for an agent. Filter by unread, type, sender.',
  {
    agent: z.string().describe('Agent ID to check messages for'),
    unread: z.boolean().optional().default(false).describe('Only unread messages'),
    type: z.enum(['request', 'response', 'notify']).optional().describe('Filter by type'),
    from: z.string().optional().describe('Filter by sender'),
    limit: z.number().optional().default(20).describe('Max messages'),
  },
  async ({ agent, unread, type, from, limit }) => {
    const result = a2aMessages({ agent, unread, type: type || null, from: from || null, limit });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// channel_publish — Publish message to broadcast channel
server.tool(
  'channel_publish',
  'Publish a message to a broadcast channel. All subscribers see the message.',
  {
    channel: z.string().describe('Channel name'),
    from: z.string().describe('Sender agent ID'),
    message: z.string().describe('Message content'),
  },
  async ({ channel, from, message }) => {
    const result = channelPublish({ channel, from, message });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// channel_read — Read messages from broadcast channel
server.tool(
  'channel_read',
  'Read messages from a broadcast channel. Optionally filter by date.',
  {
    channel: z.string().describe('Channel name'),
    since: z.string().optional().describe('ISO 8601 date to filter messages since'),
    limit: z.number().optional().default(50).describe('Max messages'),
  },
  async ({ channel, since, limit }) => {
    const result = channelMessages({ name: channel, since: since || null, limit });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('KnowledgeHub MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
