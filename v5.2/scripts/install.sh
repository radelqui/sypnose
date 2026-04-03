#!/bin/bash
set -e
echo "=== SYPNOSE v5.2 INSTALL ==="
[ "$(id -u)" -ne 0 ] && echo "ERROR: sudo bash install.sh" && exit 1

if ! curl -s http://localhost:18791/health >/dev/null 2>&1; then
  echo "⚠️  KB not running on :18791"; read -rp "Continue? (y/N) " a; [ "$a" != "y" ] && exit 1
fi
if [ -f /opt/sypnose/core/loop.js ]; then
  echo "⚠️  SYPNOSE already installed"; read -rp "Overwrite? (y/N) " a; [ "$a" != "y" ] && exit 1
fi

apt-get update -qq && apt-get install -y -qq curl wget git tmux jq python3 build-essential
if ! command -v node &>/dev/null; then curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs; fi
echo "  Node: $(node --version)"

mkdir -p /opt/sypnose/{core,lib,bin,config,scripts,server,mcp}
mkdir -p /var/log/sypnose/{audit,events}
cd /opt/sypnose && npm install --production --silent
chmod +x bin/start.js scripts/*.js scripts/*.sh 2>/dev/null || true
chmod 600 .env 2>/dev/null || true

systemctl daemon-reload
for svc in sypnose-coordinator sypnose-sse; do
  [ -f /etc/systemd/system/${svc}.service ] && systemctl enable $svc && echo "  ✅ $svc enabled"
done

(crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/node /opt/sypnose/scripts/kb-janitor.js >> /var/log/sypnose/janitor.log 2>&1") | sort -u | crontab -
(crontab -l 2>/dev/null; echo "30 3 * * * /usr/bin/node /opt/sypnose/scripts/autodream-cli.js >> /var/log/sypnose/dream.log 2>&1") | sort -u | crontab -
echo "  ✅ Crontab set"

npm test 2>&1 | head -20
echo ""
echo "NEXT: edit .env, start services, run verify-kb-integrity.sh"
