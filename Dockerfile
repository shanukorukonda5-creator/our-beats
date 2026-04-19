FROM oven/bun:1

WORKDIR /app

# Install yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y ffmpeg python3 curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy all workspace files
COPY . .

# Install dependencies
RUN bun install

WORKDIR /app/apps/server

EXPOSE 8080
ENV NODE_ENV=production
CMD ["bun", "run", "src/index.ts"]
