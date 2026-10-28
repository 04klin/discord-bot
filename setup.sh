#!/usr/bin/env bash

# Usage:
#   ./setup.sh              Recreate the container and start the ngrok tunnel.
#   ./setup.sh --build      Rebuild the image, recreate the container, and start ngrok.
#   ./setup.sh --container  Rebuild the image and recreate the container without ngrok.
#
# The host port defaults to 3005. Override it with PORT, for example:
#   PORT=8080 ./setup.sh --container
#
# Before the first run, create the native Podman secret:
#   podman secret create discordbot-env /home/lobster/.secrets/.discordbot-env
#
# Rotate credentials:
#   podman secret rm discordbot-env
#   podman secret create discordbot-env /home/lobster/.secrets/.discordbot-env
#   podman restart discord-bot

set -euo pipefail

IMAGE_NAME="discord-bot"
CONTAINER_NAME="discord-bot"
SECRET_NAME="discordbot-env"
CONTAINER_SECRET_PATH="/run/secrets/${SECRET_NAME}"
PORT="${PORT:-3005}"

if [ "$#" -gt 1 ] || {
  [ "$#" -eq 1 ] &&
  [ "$1" != "--build" ] &&
  [ "$1" != "--container" ];
}; then
  echo "Usage: $0 [--build|--container]" >&2
  exit 2
fi

MODE="${1:-}"

if ! command -v podman >/dev/null 2>&1; then
  echo "Error: podman is not installed or is not on PATH." >&2
  exit 1
fi

if [ "$MODE" != "--container" ] && ! command -v ngrok >/dev/null 2>&1; then
  echo "Error: ngrok is not installed or is not on PATH." >&2
  exit 1
fi

if ! podman secret inspect "$SECRET_NAME" >/dev/null 2>&1; then
  echo "Error: Podman secret '$SECRET_NAME' does not exist." >&2
  echo "Create it with: podman secret create $SECRET_NAME /home/lobster/.secrets/.discordbot-env" >&2
  exit 1
fi

if [ "$MODE" = "--build" ] || [ "$MODE" = "--container" ]; then
  podman build --tag "$IMAGE_NAME" .
fi

if ! podman image exists "$IMAGE_NAME"; then
  echo "Error: image '$IMAGE_NAME' does not exist. Run '$0 --build' first." >&2
  exit 1
fi

if podman container exists "$CONTAINER_NAME"; then
  podman rm --force "$CONTAINER_NAME" >/dev/null
fi

podman run --detach \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --publish "${PORT}:3000" \
  --secret "${SECRET_NAME},type=mount,target=${CONTAINER_SECRET_PATH},uid=1000,gid=1000,mode=0400" \
  --env NODE_ENV=production \
  --env PORT=3000 \
  "$IMAGE_NAME" >/dev/null

echo "Waiting for the Discord bot on localhost:${PORT}..."
until [ "$(curl --silent --output /dev/null --write-out '%{http_code}' \
  "http://localhost:${PORT}/" 2>/dev/null || true)" != "000" ]; do
  sleep 0.5
done
echo "Discord bot is up!"

if [ "$MODE" = "--container" ]; then
  echo "Container is running on localhost:${PORT}; ngrok was not started."
  exit 0
fi

ngrok http "${PORT}" >/dev/null 2>&1 &
NGROK_PID=$!

cleanup() {
  kill "$NGROK_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Give ngrok time to start its local inspection API.
sleep 2

echo "Waiting for ngrok tunnel..."
NGROK_URL=""
while [ -z "$NGROK_URL" ]; do
  if ! kill -0 "$NGROK_PID" 2>/dev/null; then
    echo "Error: ngrok exited before a tunnel was established." >&2
    exit 1
  fi
  NGROK_URL=$(curl --fail --silent http://localhost:4040/api/tunnels 2>/dev/null |
    grep -o '"public_url":"https://[^"]*"' |
    head -1 |
    cut -d'"' -f4 || true)
  sleep 0.5
done

echo ""
echo "✔ Interactions endpoint: $NGROK_URL/interactions"
echo ""
echo "https://discord.com/developers/applications/1520508117857599671/information"
echo ""

wait "$NGROK_PID"
