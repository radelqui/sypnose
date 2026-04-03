#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

// Database file path
const DB_PATH = process.env.TASKMASTER_DB || path.join(process.cwd(), "tasks.json");

// Initialize or load tasks
function loadTasks() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading tasks:", e);
  }
  return { tasks: [], nextId: 1 };
}

function saveTasks(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Create server
const server = new Server(
  { name: "taskmaster-local", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "task_create",
        description: "Create a new task with title, description, priority (high/medium/low), and optional dependencies",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title" },
            description: { type: "string", description: "Task description" },
            priority: { type: "string", enum: ["high", "medium", "low"], description: "Task priority" },
            dependencies: { type: "array", items: { type: "number" }, description: "IDs of tasks this depends on" },
            tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" }
          },
          required: ["title"]
        }
      },
      {
        name: "task_list",
        description: "List all tasks with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked", "all"], description: "Filter by status" },
            priority: { type: "string", enum: ["high", "medium", "low"], description: "Filter by priority" },
            tag: { type: "string", description: "Filter by tag" }
          }
        }
      },
      {
        name: "task_get",
        description: "Get details of a specific task by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "Task ID" }
          },
          required: ["id"]
        }
      },
      {
        name: "task_update",
        description: "Update a task's status, priority, or other fields",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "Task ID" },
            status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked"], description: "New status" },
            priority: { type: "string", enum: ["high", "medium", "low"], description: "New priority" },
            title: { type: "string", description: "New title" },
            description: { type: "string", description: "New description" }
          },
          required: ["id"]
        }
      },
      {
        name: "task_delete",
        description: "Delete a task by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "Task ID" }
          },
          required: ["id"]
        }
      },
      {
        name: "task_next",
        description: "Get the next task to work on based on priority and dependencies",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "task_analyze",
        description: "Analyze task complexity and suggest breakdown if needed",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "Task ID to analyze" }
          },
          required: ["id"]
        }
      },
      {
        name: "task_breakdown",
        description: "Break down a complex task into subtasks",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "Parent task ID" },
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              },
              description: "Subtasks to create"
            }
          },
          required: ["id", "subtasks"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const data = loadTasks();

  switch (name) {
    case "task_create": {
      const task = {
        id: data.nextId++,
        title: args.title,
        description: args.description || "",
        priority: args.priority || "medium",
        status: "pending",
        dependencies: args.dependencies || [],
        tags: args.tags || [],
        parentId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      data.tasks.push(task);
      saveTasks(data);
      return { content: [{ type: "text", text: `✅ Task #${task.id} created: ${task.title}` }] };
    }

    case "task_list": {
      let tasks = data.tasks;
      if (args.status && args.status !== "all") {
        tasks = tasks.filter(t => t.status === args.status);
      }
      if (args.priority) {
        tasks = tasks.filter(t => t.priority === args.priority);
      }
      if (args.tag) {
        tasks = tasks.filter(t => t.tags?.includes(args.tag));
      }

      if (tasks.length === 0) {
        return { content: [{ type: "text", text: "No tasks found." }] };
      }

      const statusEmoji = { pending: "⏳", in_progress: "🔄", completed: "✅", blocked: "🚫" };
      const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };

      const list = tasks.map(t =>
        `${statusEmoji[t.status] || "❓"} #${t.id} [${priorityEmoji[t.priority] || "⚪"}] ${t.title}${t.parentId ? ` (subtask of #${t.parentId})` : ""}`
      ).join("\n");

      return { content: [{ type: "text", text: `📋 Tasks (${tasks.length}):\n${list}` }] };
    }

    case "task_get": {
      const task = data.tasks.find(t => t.id === args.id);
      if (!task) {
        return { content: [{ type: "text", text: `❌ Task #${args.id} not found` }] };
      }

      const details = `
📌 Task #${task.id}: ${task.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Description: ${task.description || "None"}
🎯 Priority: ${task.priority}
📊 Status: ${task.status}
🏷️ Tags: ${task.tags?.join(", ") || "None"}
🔗 Dependencies: ${task.dependencies?.length ? task.dependencies.join(", ") : "None"}
📅 Created: ${task.createdAt}
🔄 Updated: ${task.updatedAt}
${task.subtasks?.length ? `📦 Subtasks: ${task.subtasks.join(", ")}` : ""}
`.trim();

      return { content: [{ type: "text", text: details }] };
    }

    case "task_update": {
      const task = data.tasks.find(t => t.id === args.id);
      if (!task) {
        return { content: [{ type: "text", text: `❌ Task #${args.id} not found` }] };
      }

      if (args.status) task.status = args.status;
      if (args.priority) task.priority = args.priority;
      if (args.title) task.title = args.title;
      if (args.description) task.description = args.description;
      task.updatedAt = new Date().toISOString();

      saveTasks(data);
      return { content: [{ type: "text", text: `✅ Task #${task.id} updated` }] };
    }

    case "task_delete": {
      const index = data.tasks.findIndex(t => t.id === args.id);
      if (index === -1) {
        return { content: [{ type: "text", text: `❌ Task #${args.id} not found` }] };
      }

      data.tasks.splice(index, 1);
      saveTasks(data);
      return { content: [{ type: "text", text: `🗑️ Task #${args.id} deleted` }] };
    }

    case "task_next": {
      const pending = data.tasks.filter(t =>
        t.status === "pending" &&
        (!t.dependencies?.length || t.dependencies.every(depId =>
          data.tasks.find(dt => dt.id === depId)?.status === "completed"
        ))
      );

      if (pending.length === 0) {
        const inProgress = data.tasks.filter(t => t.status === "in_progress");
        if (inProgress.length > 0) {
          return { content: [{ type: "text", text: `🔄 Continue with: #${inProgress[0].id} - ${inProgress[0].title}` }] };
        }
        return { content: [{ type: "text", text: "✨ No pending tasks! All done or blocked." }] };
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      pending.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      const next = pending[0];
      return { content: [{ type: "text", text: `🎯 Next task: #${next.id} - ${next.title} [${next.priority}]` }] };
    }

    case "task_analyze": {
      const task = data.tasks.find(t => t.id === args.id);
      if (!task) {
        return { content: [{ type: "text", text: `❌ Task #${args.id} not found` }] };
      }

      const descLength = task.description?.length || 0;
      const hasSubtasks = task.subtasks?.length > 0;

      let complexity = "simple";
      let suggestion = "Task looks straightforward.";

      if (descLength > 200 || task.title.split(" ").length > 8) {
        complexity = "complex";
        suggestion = "Consider breaking this task into smaller subtasks using task_breakdown.";
      } else if (descLength > 100) {
        complexity = "medium";
        suggestion = "Task has moderate complexity. May benefit from subtasks.";
      }

      return { content: [{ type: "text", text: `
📊 Analysis for Task #${task.id}
━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Complexity: ${complexity}
📝 Description length: ${descLength} chars
📦 Has subtasks: ${hasSubtasks ? "Yes" : "No"}
💡 Suggestion: ${suggestion}
`.trim() }] };
    }

    case "task_breakdown": {
      const parent = data.tasks.find(t => t.id === args.id);
      if (!parent) {
        return { content: [{ type: "text", text: `❌ Task #${args.id} not found` }] };
      }

      const subtaskIds = [];
      for (const sub of args.subtasks) {
        const subtask = {
          id: data.nextId++,
          title: sub.title,
          description: sub.description || "",
          priority: parent.priority,
          status: "pending",
          dependencies: [],
          tags: parent.tags || [],
          parentId: parent.id,
          subtasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        data.tasks.push(subtask);
        subtaskIds.push(subtask.id);
      }

      parent.subtasks = [...(parent.subtasks || []), ...subtaskIds];
      parent.updatedAt = new Date().toISOString();
      saveTasks(data);

      return { content: [{ type: "text", text: `✅ Created ${subtaskIds.length} subtasks for #${parent.id}: ${subtaskIds.join(", ")}` }] };
    }

    default:
      return { content: [{ type: "text", text: `❌ Unknown tool: ${name}` }] };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Taskmaster Local MCP server running");
}

main().catch(console.error);
