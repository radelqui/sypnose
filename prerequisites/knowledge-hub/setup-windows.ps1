# KnowledgeHub MCP — Setup for Windows Claude Code
# Run this in PowerShell on your Windows machine

$claudeJsonPath = "$env:USERPROFILE\.claude.json"

if (-not (Test-Path $claudeJsonPath)) {
    Write-Host "ERROR: $claudeJsonPath not found" -ForegroundColor Red
    exit 1
}

$config = Get-Content $claudeJsonPath -Raw | ConvertFrom-Json

# Add knowledge-hub MCP server
$knowledgeHub = @{
    command = "ssh"
    args = @("-p", "2024", "-o", "StrictHostKeyChecking=no", "gestoria@217.216.48.91", "node", "/opt/knowledge-hub/src/mcp-server.js")
    env = @{}
}

if (-not $config.mcpServers) {
    $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue @{}
}

$config.mcpServers | Add-Member -NotePropertyName "knowledge-hub" -NotePropertyValue $knowledgeHub -Force

$config | ConvertTo-Json -Depth 10 | Set-Content $claudeJsonPath -Encoding UTF8

Write-Host "KnowledgeHub MCP added to $claudeJsonPath" -ForegroundColor Green
Write-Host "Restart Claude Code for changes to take effect." -ForegroundColor Yellow
