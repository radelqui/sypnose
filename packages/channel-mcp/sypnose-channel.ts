#!/usr/bin/env bun
/**
 * sypnose-channel — MCP Server con claude/channel
 * Se suscribe al SSE de sypnose-hub y pushea notificaciones live a Claude Code.
 * Tools: reply_to_agent, agent_status
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const HUB_URL = process.env.SYPNOSE_HUB_URL || "http://localhost:8095";
const HUB_TOKEN = process.env.SYPNOSE_HUB_TOKEN || "CAMBIAR_TOKEN";
const RECONNECT_DELAY = 5000;

const server = new McpServer({
  name: "sypnose-channel",
  version: "1.0.0",
});

let lastEventId = 0;
let connected = false;
let eventCount = 0;

// --- SSE Client ---

async function connectSSE(): Promise<void> {
  const url = `${HUB_URL}/stream?last_id=${lastEventId}`;
  console.error(`[sypnose-channel] Connecting SSE: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${HUB_TOKEN}`,
        Accept: "text/event-stream",
      },
    });

    if (!response.ok) {
      console.error(`[sypnose-channel] SSE connect failed: ${response.status}`);
      scheduleReconnect();
      return;
    }

    connected = true;
    console.error(`[sypnose-channel] SSE connected`);

    const reader = response.body?.getReader();
    if (!reader) {
      console.error(`[sypnose-channel] No readable stream`);
      scheduleReconnect();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventData = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          eventData += line.slice(6);
        } else if (line === "" && eventData) {
          try {
            const event = JSON.parse(eventData);
            lastEventId = event.id || lastEventId;
            eventCount++;
            console.error(
              `[sypnose-channel] Event #${eventCount}: ${event.title || event.agent || "unknown"}`
            );

            // Send as notification via stderr (Claude Code reads this)
            const notification = {
              type: "notification",
              source: "sypnose-channel",
              agent: event.agent,
              title: event.title,
              message: event.message,
              priority: event.priority || "normal",
              project: event.project,
              timestamp: event.timestamp,
            };
            console.error(
              `[sypnose-channel] PUSH: ${JSON.stringify(notification)}`
            );
          } catch (e) {
            console.error(`[sypnose-channel] Parse error: ${e}`);
          }
          eventData = "";
        }
      }
    }
  } catch (err: any) {
    console.error(`[sypnose-channel] SSE error: ${err.message}`);
  }

  connected = false;
  scheduleReconnect();
}

function scheduleReconnect(): void {
  console.error(
    `[sypnose-channel] Reconnecting in ${RECONNECT_DELAY / 1000}s...`
  );
  setTimeout(connectSSE, RECONNECT_DELAY);
}

// --- MCP Tools ---

server.tool(
  "reply_to_agent",
  "Send a message to an agent via sypnose-hub. The agent receives it as a push notification.",
  {
    agent: z.string().describe("Agent name (e.g. seguridad, iatrader, gestoriard)"),
    message: z.string().describe("Message content to send"),
    priority: z
      .enum(["low", "normal", "high", "critical"])
      .optional()
      .describe("Priority level"),
    project: z.string().optional().describe("Project scope"),
  },
  async ({ agent, message, priority, project }) => {
    try {
      const res = await fetch(`${HUB_URL}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent,
          title: `reply-to-${agent}`,
          message,
          priority: priority || "normal",
          project: project || "",
        }),
      });

      const data = await res.json();
      return {
        content: [
          {
            type: "text" as const,
            text: `Sent to ${agent}: ${res.ok ? "OK" : "FAILED"} (${data.clients || 0} clients connected)`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error sending to ${agent}: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "agent_status",
  "Get the status of sypnose-hub: connected clients, last check time, buffered events.",
  {},
  async () => {
    try {
      const res = await fetch(`${HUB_URL}/health`);
      const data = await res.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                hub: data,
                channel: {
                  connected,
                  lastEventId,
                  eventsReceived: eventCount,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Hub unreachable: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Start ---

async function main() {
  console.error("[sypnose-channel] Starting MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[sypnose-channel] MCP server connected via stdio");

  // Start SSE listener in background
  connectSSE();
}

main().catch((err) => {
  console.error(`[sypnose-channel] Fatal: ${err.message}`);
  process.exit(1);
});
