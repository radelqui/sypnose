#!/usr/bin/env python3
"""Index project files for OpenClaw dashboard."""
import os
import json
import time
from datetime import datetime, timezone

PROJECTS = {
    "iatrader": "/home/gestoria/IATRADER/",
    "facturaia-mobile": "/home/gestoria/eas-builds/FacturaScannerApp/",
    "gestoriard": "/home/gestoria/gestion-contadoresrd/",
    "dgii-scraper": "/home/gestoria/dgii-scraper/",
    "dgii-scraper-v2": "/home/gestoria/dgii-scraper-v2/",
    "facturaia-ocr": "/home/gestoria/factory/apps/facturaia-ocr/",
    "servidor-infra": "/home/gestoria/servidor-infra/",
    "openclaw": "/home/<USUARIO>/openclaw/",
}

INCLUDE_EXT = {".py", ".js", ".ts", ".tsx", ".json", ".yaml", ".yml", ".md", ".sh", ".go", ".toml"}
EXCLUDE_DIRS = {"node_modules", "venv", ".git", "__pycache__", "logs", "dist", "build", ".next", ".cache", ".venv", "env"}

PRIORITY_NAMES = {"CLAUDE.md", "package.json", "config.json", "config.yaml", ".env.example",
                  "main.py", "index.js", "index.ts", "app.py", "server.py", "Dockerfile",
                  "docker-compose.yml", "requirements.txt", "tsconfig.json", "Makefile"}

OUTPUT = "/home/<USUARIO>/openclaw/data/project-index.json"

def index_project(name, path):
    if not os.path.isdir(path):
        return {"path": path, "total_files": 0, "key_files": [], "error": "directory not found"}

    all_files = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            _, ext = os.path.splitext(f)
            if ext in INCLUDE_EXT:
                rel = os.path.relpath(os.path.join(root, f), path)
                all_files.append(rel)

    # Prioritize key files
    key = []
    rest = []
    for f in all_files:
        basename = os.path.basename(f)
        if basename in PRIORITY_NAMES or f.startswith("scripts/") or f.startswith("config/"):
            key.append(f)
        else:
            rest.append(f)

    key_files = sorted(key)[:30]

    return {"path": path, "total_files": len(all_files), "key_files": key_files}

def main():
    result = {"indexed_at": datetime.now(timezone.utc).isoformat(), "projects": {}}
    for name, path in PROJECTS.items():
        result["projects"][name] = index_project(name, path)
        print(f"  {name}: {result['projects'][name]['total_files']} files")

    tmp = OUTPUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(result, f, indent=2)
    os.rename(tmp, OUTPUT)
    print(f"Index written to {OUTPUT}")

if __name__ == "__main__":
    main()
