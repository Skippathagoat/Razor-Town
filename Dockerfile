# Razor Town — container image (works on Render, Railway, Fly, Koyeb, any VPS)
FROM node:20-slim

WORKDIR /app

# better-sqlite3 needs a toolchain only if no prebuilt binary matches the runtime
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

ENV PORT=8787
ENV DB_PATH=/data/world.db
EXPOSE 8787

# Put /data on a persistent volume/disk for saves to survive redeploys.
VOLUME ["/data"]

# server.js self-bootstraps an empty world (citizens, gangs, founder account) on boot.
CMD ["node", "server.js"]
