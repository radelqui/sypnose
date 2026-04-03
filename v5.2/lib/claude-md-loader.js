'use strict';
const fs = require('fs'), path = require('path');

function loadClaudeMdHierarchy(projectDir) {
  const levels = [
    { path: '/opt/sypnose/CLAUDE.md', level: 'global' },
    { path: path.join(process.env.HOME || '/root', '.claude/CLAUDE.md'), level: 'user' },
    { path: path.join(projectDir, 'CLAUDE.md'), level: 'project' },
    { path: path.join(projectDir, 'CLAUDE.local.md'), level: 'local' },
  ];
  const loaded = [];
  for (const l of levels) { try { loaded.push({ level: l.level, content: fs.readFileSync(l.path, 'utf-8') }); } catch {} }
  try { const rd = path.join(projectDir, '.claude', 'rules'); for (const f of fs.readdirSync(rd).filter(f => f.endsWith('.md'))) loaded.push({ level: 'rule', content: fs.readFileSync(path.join(rd, f), 'utf-8') }); } catch {}
  return loaded;
}

function mergeClaudeMd(dir) { return loadClaudeMdHierarchy(dir).map(h => `<!-- ${h.level} -->\n${h.content}`).join('\n---\n'); }

module.exports = { loadClaudeMdHierarchy, mergeClaudeMd };
