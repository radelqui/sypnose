---
name: openclaw-expert-brain
description: Query 185 curated OpenClaw sources via NotebookLM — grounded answers with real citations
version: 1.0.0
author: radelqui
tags: [claude-code, openclaw, notebooklm, ai-agents, knowledge-base]
---

# openclaw-expert-brain

Query the OpenClaw expert knowledge base with 185 curated sources.

## Usage

```
/openclaw-expert-brain [your question about OpenClaw]
```

## What this does

Queries a NotebookLM notebook containing:
- Full OpenClaw documentation (all versions)
- Observed behaviors and edge cases
- Known bugs and their solutions
- Configuration examples (working and broken, with notes)
- Integration patterns and troubleshooting guides

Returns an answer with citations from actual source documents.

## When to use this

- You're configuring OpenClaw and something isn't working
- You need to know if a specific feature exists
- An agent is hitting an error you haven't seen before
- You want to verify expected behavior before implementing
- You need to troubleshoot gateway, cron, or agent connection issues

## How it works

1. Your question is sent to NotebookLM via the `nlm` CLI
2. NotebookLM reasons across 185 curated sources
3. Returns a grounded answer with source citations
4. No browser, no Chromium — direct API call

## Requirements

```bash
pip install notebooklm-mcp-cli
nlm login  # one-time Google auth
```

## Install via ClawHub

```bash
clawhub install radelqui/openclaw-expert-brain
```

