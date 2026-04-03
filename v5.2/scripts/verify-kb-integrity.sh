#!/bin/bash
echo "=== BORIS KB INTEGRITY CHECK ==="
echo -n "KB health: "
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18791/health 2>/dev/null)
[ "$HTTP" = "200" ] && echo "OK" || echo "FAIL $HTTP"

echo -n "KB write/read: "
TK="boris:test:$(date +%s)"
W=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:18791/api/save -H "Content-Type: application/json" -d "{\"key\":\"$TK\",\"value\":\"test-ok\"}" 2>/dev/null)
R=$(curl -s "http://localhost:18791/api/read?key=$TK" 2>/dev/null | python3 -c "import sys,json;j=json.load(sys.stdin);print(j.get('entry',{}).get('value',j.get('value','')))" 2>/dev/null)
[ "$W" = "200" ] && [ "$R" = "test-ok" ] && echo "OK" || echo "FAIL w=$W r=$R"

echo ""
echo "Namespaces:"
for NS in mailbox task mem notification report config; do
  COUNT=$(curl -s "http://localhost:18791/api/list?category=$NS&limit=1" 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
  printf "  %-25s %s entries\n" "$NS" "${COUNT:-0}"
done

echo -n "SypnoseProxy: "
P=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8317/ 2>/dev/null)
[ "$P" = "200" ] && echo "OK" || echo "FAIL $P"
echo "=== DONE ==="
