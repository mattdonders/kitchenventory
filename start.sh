#!/bin/bash
# Start kitchenventory server in the background

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$SCRIPT_DIR/server.pid"
LOGFILE="$SCRIPT_DIR/server.log"

# Kill any existing instance
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stopping existing server (PID $OLD_PID)..."
    kill "$OLD_PID"
    sleep 1
  fi
  rm -f "$PIDFILE"
fi

# Start server in background
echo "Starting kitchenventory on http://localhost:8000..."
nohup "$SCRIPT_DIR/.venv/bin/python" "$SCRIPT_DIR/run.py" >> "$LOGFILE" 2>&1 &
echo $! > "$PIDFILE"
echo "Server started (PID $(cat $PIDFILE)). Logs: $LOGFILE"
