#!/bin/bash
set -e

PROJECT_DIR="/home/afroj/Desktop/Apurva pizza hub"
cd "$PROJECT_DIR"

echo "Stopping any previous running instances..."
pkill -f "cloudflared tunnel --url" || true
pkill -f "nodemon src/server.js" || true
pkill -f "node src/server.js" || true
pkill -f "vite" || true
sleep 2

echo "Starting Backend on port 5000..."
nohup npm --prefix backend run dev > /tmp/apurva-backend.log 2>&1 &

echo "Starting Customer Frontend on port 5173..."
nohup npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173 > /tmp/apurva-frontend.log 2>&1 &

echo "Starting Admin / Kitchen Frontend on port 3001..."
nohup npm --prefix admin-frontend run dev -- --host 0.0.0.0 --port 3001 > /tmp/apurva-admin.log 2>&1 &

echo "Waiting for local services to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:5000/api/health > /dev/null && \
     curl -s http://localhost:5173 > /dev/null && \
     curl -s http://localhost:3001 > /dev/null; then
    echo "All local services are healthy!"
    break
  fi
  sleep 1
done

echo "Starting Cloudflare Tunnels..."
rm -f /tmp/apurva-tunnel-frontend.log /tmp/apurva-tunnel-admin.log

nohup /home/afroj/.local/bin/cloudflared tunnel --metrics 127.0.0.1:20241 --no-autoupdate --url http://localhost:5173 > /tmp/apurva-tunnel-frontend.log 2>&1 &
nohup /home/afroj/.local/bin/cloudflared tunnel --metrics 127.0.0.1:20242 --no-autoupdate --url http://localhost:3001 > /tmp/apurva-tunnel-admin.log 2>&1 &

echo "Extracting public trycloudflare URLs..."
FRONTEND_URL=""
ADMIN_URL=""

for i in {1..40}; do
  if [ -z "$FRONTEND_URL" ]; then
    FRONTEND_URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' /tmp/apurva-tunnel-frontend.log | head -n 1 || true)
  fi
  if [ -z "$ADMIN_URL" ]; then
    ADMIN_URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' /tmp/apurva-tunnel-admin.log | head -n 1 || true)
  fi

  if [ -n "$FRONTEND_URL" ] && [ -n "$ADMIN_URL" ]; then
    break
  fi
  sleep 1
done

echo "Customer Storefront URL: $FRONTEND_URL"
echo "Admin / Staff Panel URL: $ADMIN_URL"

echo "Waiting for Cloudflare Tunnel edge routing to be fully active..."
for i in {1..40}; do
  FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || true)
  ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ADMIN_URL" || true)

  if [ "$FRONT_STATUS" = "200" ] && [ "$ADMIN_STATUS" = "200" ]; then
    echo "Both Cloudflare Tunnels are verified and reachable!"
    break
  fi
  sleep 2
done

cat <<EOF > /tmp/apurva-urls.txt
FRONTEND_URL=$FRONTEND_URL
ADMIN_URL=$ADMIN_URL
EOF

echo ""
echo "=========================================================="
echo "APURVA PIZZA HUB - CLOUDFLARE TUNNELS ESTABLISHED & LIVE!"
echo "=========================================================="
echo "Customer Storefront: $FRONTEND_URL"
echo "Admin / Staff Panel: $ADMIN_URL"
echo "=========================================================="

wait
