FROM oven/bun:1

WORKDIR /app

# Install yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y ffmpeg python3 curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install dependencies
RUN bun install --production

# Copy source code
COPY apps/server/src ./apps/server/src
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

WORKDIR /app/apps/server

EXPOSE 8080
ENV NODE_ENV=production
CMD ["bun", "run", "src/index.ts"]
