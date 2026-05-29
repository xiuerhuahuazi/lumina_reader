#!/bin/bash
# Lumina Reader + RSSHub 统一启动脚本
# RSSHub 启动在 1201 端口，Lumina Reader 启动在 3000 端口
# Lumina Reader 代理 /rss/* 到 RSSHub

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RSSHUB_DIR="$SCRIPT_DIR/../RSSHub"

echo "=== Starting RSSHub on port 1201 ==="
cd "$RSSHUB_DIR"
PORT=1201 NODE_ENV=dev NODE_OPTIONS='--max-http-header-size=32768' npx tsx lib/index.ts &
RSSHUB_PID=$!

echo "Waiting for RSSHub..."
for i in $(seq 1 30); do
  if curl -s http://localhost:1201/routes.json > /dev/null 2>&1; then
    echo "RSSHub ready!"
    break
  fi
  sleep 2
done

echo "=== Starting Lumina Reader on port 3000 ==="
cd "$SCRIPT_DIR"
NODE_ENV=development node --import tsx/esm server.ts &
LUMINA_PID=$!

sleep 3
echo ""
echo "=== All services started ==="
echo "Lumina Reader:  http://localhost:3000"
echo "RSSHub (proxy): http://localhost:3000/rss/*"
echo ""
echo "PIDs: RSSHub=$RSSHUB_PID, Lumina=$LUMINA_PID"

wait
