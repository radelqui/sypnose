#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import net from 'net';

const SSH_HOST = process.env.SSH_HOST || '217.216.48.91';
const SSH_PORT = parseInt(process.env.SSH_PORT || '2024');
const SSH_USER = process.env.SSH_USER || 'gestoria';
const SSH_KEY_PATH = process.env.SSH_KEY_PATH || `${process.env.HOME || process.env.USERPROFILE}/.ssh/id_rsa`;

const TUNNEL_PORTS = [
  { local: 3000, remote: 3000, name: 'codeman' },
  { local: 3002, remote: 3002, name: 'sypnose-agent' },
  { local: 18793, remote: 18793, name: 'kb-sse' },
  { local: 8317, remote: 8317, name: 'cliproxyapi' },
  { local: 18791, remote: 18791, name: 'knowledge-hub' },
  { local: 8095, remote: 8095, name: 'sypnose-hub' },
];

const tunnelState = {};
const tunnelHandles = {};
let sshConn = null;

TUNNEL_PORTS.forEach(t => {
  tunnelState[t.name] = { port: t.local, connected: false, error: null };
});

function log(msg) {
  process.stderr.write(`[sypnose-tunnels] ${msg}\n`);
}

let privateKey;
try {
  privateKey = readFileSync(SSH_KEY_PATH);
} catch (e) {
  log(`Cannot read SSH key ${SSH_KEY_PATH}: ${e.message}`);
}

function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      log(`SSH connected to ${SSH_HOST}:${SSH_PORT}`);
      resolve(conn);
    });
    conn.on('error', (err) => {
      log(`SSH error: ${err.message}`);
      reject(err);
    });
    conn.connect({
      host: SSH_HOST,
      port: SSH_PORT,
      username: SSH_USER,
      privateKey,
      readyTimeout: 15000,
      keepaliveInterval: 30000,
    });
  });
}

function createLocalForward(conn, localPort, remotePort, name) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer((socket) => {
      conn.forwardOut('127.0.0.1', localPort, '127.0.0.1', remotePort, (err, stream) => {
        if (err) {
          log(`Forward error ${name}: ${err.message}`);
          socket.end();
          return;
        }
        socket.pipe(stream).pipe(socket);
        stream.on('error', () => socket.destroy());
        socket.on('error', () => stream.destroy());
      });
    });

    srv.on('error', (err) => {
      log(`Listen error ${name} port ${localPort}: ${err.message}`);
      tunnelState[name].connected = false;
      tunnelState[name].error = err.message;
      reject(err);
    });

    srv.listen(localPort, '127.0.0.1', () => {
      log(`Tunnel ${name}: localhost:${localPort} -> ${SSH_HOST}:${remotePort}`);
      tunnelState[name].connected = true;
      tunnelState[name].error = null;
      tunnelHandles[name] = srv;
      resolve(srv);
    });
  });
}

async function openAllTunnels() {
  log('Opening SSH tunnels...');

  if (!privateKey) {
    log('No SSH key available, cannot open tunnels');
    return;
  }

  try {
    if (sshConn) {
      try { sshConn.end(); } catch (e) {}
    }
    sshConn = await connectSSH();

    sshConn.on('error', (err) => {
      log(`SSH connection error: ${err.message}`);
      TUNNEL_PORTS.forEach(t => {
        tunnelState[t.name].connected = false;
        tunnelState[t.name].error = 'SSH connection lost';
      });
    });

    sshConn.on('close', () => {
      log('SSH connection closed');
      TUNNEL_PORTS.forEach(t => {
        tunnelState[t.name].connected = false;
      });
    });

    const results = await Promise.allSettled(
      TUNNEL_PORTS.map(t => createLocalForward(sshConn, t.local, t.remote, t.name))
    );

    const connected = results.filter(r => r.status === 'fulfilled').length;
    log(`${connected}/${TUNNEL_PORTS.length} tunnels open`);
  } catch (e) {
    log(`SSH connect failed: ${e.message}`);
    TUNNEL_PORTS.forEach(t => {
      tunnelState[t.name].error = `SSH: ${e.message}`;
    });
  }
}

async function closeAllTunnels() {
  for (const [name, srv] of Object.entries(tunnelHandles)) {
    try { srv.close(); } catch (e) {}
    tunnelState[name].connected = false;
    delete tunnelHandles[name];
  }
  if (sshConn) {
    try { sshConn.end(); } catch (e) {}
    sshConn = null;
  }
  log('All tunnels closed');
}

// MCP Server
const mcpServer = new Server(
  { name: 'sypnose-tunnels', version: '1.1.0' },
  { capabilities: { tools: {} } }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'tunnel_status',
      description: 'Get status of all SSH tunnels to Contabo server',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'tunnel_reconnect',
      description: 'Close and reopen all SSH tunnels',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'tunnel_status') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ tunnels: tunnelState, ssh_host: SSH_HOST }, null, 2),
      }],
    };
  }

  if (request.params.name === 'tunnel_reconnect') {
    await closeAllTunnels();
    await openAllTunnels();
    const connected = Object.values(tunnelState).filter(s => s.connected).length;
    return {
      content: [{
        type: 'text',
        text: `Reconnected ${connected}/${TUNNEL_PORTS.length} tunnels\n${JSON.stringify(tunnelState, null, 2)}`,
      }],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

process.on('SIGTERM', async () => { await closeAllTunnels(); process.exit(0); });
process.on('SIGINT', async () => { await closeAllTunnels(); process.exit(0); });
process.on('exit', () => {
  for (const srv of Object.values(tunnelHandles)) {
    try { srv.close(); } catch (e) {}
  }
  if (sshConn) try { sshConn.end(); } catch (e) {}
});

await openAllTunnels();

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
