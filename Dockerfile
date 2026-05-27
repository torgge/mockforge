# =============================================================================
# MockForge Docker Image
# =============================================================================
# Runs the Electron app inside a container with a virtual display, exposed
# via noVNC so users can access it through a browser at http://localhost:6080
# =============================================================================

FROM node:20-bookworm-slim AS build

WORKDIR /app

# Install build toolchain (needed by better-sqlite3 native compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies with full scripts. This:
#   1. Downloads the electron binary (electron's postinstall)
#   2. Compiles better-sqlite3 for Node.js (better-sqlite3's install)
#   3. Runs electron-rebuild for the correct Electron ABI (project postinstall)
# The resulting node_modules/ can be copied directly into the runtime stage.
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build the TypeScript
COPY . .
RUN npm run build

# =============================================================================
# Runtime stage
# =============================================================================
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    # Electron runtime dependencies
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxkbcommon0 \
    libpulse0 \
    libdbus-1-3 \
    # Virtual display + window manager
    xvfb \
    x11vnc \
    openbox \
    # noVNC (web-based VNC client)
    novnc \
    # Utilities
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Pre-create X11 socket directory with permissive permissions so Xvfb
# can start when running as non-root
RUN mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

# Create non-root user
RUN useradd -m -s /bin/bash mockforge

WORKDIR /app

# Copy build artifacts and node_modules from the build stage
# node_modules includes electron binary and compiled better-sqlite3
COPY --from=build --chown=mockforge:mockforge /app/out ./out
COPY --from=build --chown=mockforge:mockforge /app/node_modules ./node_modules
COPY --from=build --chown=mockforge:mockforge /app/package.json ./

# Create entrypoint directory
RUN mkdir -p /docker-entrypoint.d

# Copy entrypoint script
COPY --chown=mockforge:mockforge docker/entrypoint.sh /docker-entrypoint.d/entrypoint.sh
RUN chmod +x /docker-entrypoint.d/entrypoint.sh

# Data persistence: electron uses app.getPath('userData') which resolves to
# $XDG_CONFIG_HOME/<appname> or ~/.config/<appname> on Linux
ENV XDG_CONFIG_HOME=/data/config
RUN mkdir -p /data/config && chown -R mockforge:mockforge /data/config

# Electron environment
ENV ELECTRON_DISABLE_SANDBOX=1
ENV DISPLAY=:1
ENV VNC_PORT=5900
ENV NOVNC_PORT=6080
ENV VNC_RESOLUTION=1280x800
ENV VNC_DEPTH=24

USER mockforge

EXPOSE 5900 6080

ENTRYPOINT ["/docker-entrypoint.d/entrypoint.sh"]
