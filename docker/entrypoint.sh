#!/bin/bash
# =============================================================================
# MockForge Docker Entrypoint
# =============================================================================
# Orchestrates startup of the virtual display, window manager, VNC server,
# noVNC proxy, and the MockForge Electron application.
# =============================================================================
set -e

echo "=== MockForge Docker Entrypoint ==="

# -----------------------------------------------------------------------------
# Cleanup handler — stop background processes on exit
# -----------------------------------------------------------------------------
cleanup() {
  echo ">>> Shutting down..."
  [ -n "$ELECTRON_PID" ] && kill "$ELECTRON_PID" 2>/dev/null || true
  [ -n "$NOVNC_PID"   ] && kill "$NOVNC_PID"   2>/dev/null || true
  [ -n "$X11VNC_PID"  ] && kill "$X11VNC_PID"  2>/dev/null || true
  [ -n "$XVFB_PID"    ] && kill "$XVFB_PID"    2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# -----------------------------------------------------------------------------
# Clean up stale X lock files from previous runs (container restarts)
# -----------------------------------------------------------------------------
rm -f /tmp/.X1-lock /tmp/.X11-unix/X1 2>/dev/null || true

# -----------------------------------------------------------------------------
# 1. Start Xvfb (virtual framebuffer) on DISPLAY=:1
# -----------------------------------------------------------------------------
echo ">>> Starting Xvfb on :1 (${VNC_RESOLUTION}x${VNC_DEPTH})"
Xvfb :1 -screen 0 "${VNC_RESOLUTION}x${VNC_DEPTH}" -ac +extension RANDR &
XVFB_PID=$!
sleep 1

# -----------------------------------------------------------------------------
# 2. Start lightweight window manager (openbox)
#     openbox reads the DISPLAY env var; do NOT pass --display
# -----------------------------------------------------------------------------
echo ">>> Starting openbox window manager"
openbox --sm-disable &
sleep 1

# -----------------------------------------------------------------------------
# 3. Start x11vnc server attached to the Xvfb display
# -----------------------------------------------------------------------------
echo ">>> Starting x11vnc server (port ${VNC_PORT})"
x11vnc \
  -display :1 \
  -rfbport "${VNC_PORT}" \
  -forever \
  -shared \
  -nopw \
  -quiet \
  -xkb &
X11VNC_PID=$!
sleep 1

# -----------------------------------------------------------------------------
# 4. Start noVNC (websockify -> x11vnc) for browser access
# -----------------------------------------------------------------------------
echo ">>> Starting noVNC (http://0.0.0.0:${NOVNC_PORT})"
websockify \
  --web=/usr/share/novnc \
  "${NOVNC_PORT}" \
  "localhost:${VNC_PORT}" &
NOVNC_PID=$!
sleep 1

echo ""
echo "============================================================================"
echo "  MockForge is ready!"
echo "  Open your browser at: http://localhost:${NOVNC_PORT}/vnc.html"
echo "  (native VNC client can connect to: localhost:${VNC_PORT})"
echo "============================================================================"
echo ""

# -----------------------------------------------------------------------------
# 5. Start the MockForge Electron application
# -----------------------------------------------------------------------------
echo ">>> Starting MockForge Electron app"
npx electron /app \
  --no-sandbox \
  --disable-gpu \
  &
ELECTRON_PID=$!

# Wait for the Electron process to exit
wait "$ELECTRON_PID"

echo ">>> Electron process exited."
cleanup
