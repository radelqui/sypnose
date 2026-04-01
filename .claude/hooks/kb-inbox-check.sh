#!/bin/bash
# Hook: KB Inbox Check — UserPromptSubmit
# Usa /api/inbox/check, muestra notificaciones, AUTO-ACK después de mostrar.

INBOX=$(curl -s --connect-timeout 1 --max-time 2 \
    "http://localhost:18791/api/inbox/check?for=sm-claude-web&limit=10" 2>/dev/null)

[ -z "$INBOX" ] && exit 0

UNREAD=$(echo "$INBOX" | jq -r '.unread // 0' 2>/dev/null)
[ -z "$UNREAD" ] || [ "$UNREAD" = "0" ] && exit 0

COUNT=$(echo "$INBOX" | jq '.messages | length' 2>/dev/null)
[ -z "$COUNT" ] || [ "$COUNT" = "0" ] && exit 0

echo "=== KB NOTIFICACIONES ($UNREAD pendientes) ==="

for i in $(seq 0 $((COUNT-1))); do
    ID=$(echo "$INBOX" | jq -r ".messages[$i].id // 0" 2>/dev/null)
    SENDER=$(echo "$INBOX" | jq -r ".messages[$i].sender // \"?\"" 2>/dev/null)
    MSG=$(echo "$INBOX" | jq -r ".messages[$i].message // \"\"" 2>/dev/null)
    TS_RAW=$(echo "$INBOX" | jq -r ".messages[$i].created_at // \"\"" 2>/dev/null)

    if [ -n "$TS_RAW" ]; then
        TS="[$(echo "$TS_RAW" | sed 's/T/ /' | cut -c12-16)]"
    else
        TS="[--:--]"
    fi

    echo "${TS} [${SENDER}] $(echo "$MSG" | tr '\n' ' ' | cut -c1-120)"

    # Auto-ACK: marca como leída después de mostrar
    [ "$ID" != "0" ] && curl -s --connect-timeout 1 --max-time 1 \
        -X POST "http://localhost:18791/api/inbox/ack" \
        -H "Content-Type: application/json" \
        -d "{\"id\":$ID}" > /dev/null 2>&1 &
done

# Esperar auto-acks en background (max 2s)
wait

echo "=== FIN (auto-ack: $COUNT leidas) ==="
