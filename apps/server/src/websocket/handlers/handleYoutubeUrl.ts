import { IS_DEMO_MODE } from "@/demo";
import { globalManager } from "@/managers";
import { sendBroadcast } from "@/utils/responses";
import type { HandlerFunction } from "@/websocket/types";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

type YoutubeUrlMessage = { type: "YOUTUBE_URL"; url: string };

// Local folder to store downloaded YouTube audio
export const YT_AUDIO_DIR = join(import.meta.dir, "../../../../yt-audio");

if (!existsSync(YT_AUDIO_DIR)) {
  mkdirSync(YT_AUDIO_DIR, { recursive: true });
}

export const handleYoutubeUrl: HandlerFunction<YoutubeUrlMessage> = async ({
  ws,
  message,
  server,
}) => {
  if (IS_DEMO_MODE) return;

  const roomId = ws.data.roomId;
  const room = globalManager.getRoom(roomId);
  if (!room) {
    console.error(`YouTube URL handler: Room ${roomId} not found`);
    return;
  }

  const url = message.url;
  const trackId = `yt-${Date.now()}`;

  room.addStreamJob(trackId);
  sendBroadcast({
    server,
    roomId,
    message: { type: "STREAM_JOB_UPDATE", activeJobCount: room.getActiveStreamJobCount() },
  });

  const fileName = `yt-${Date.now()}.mp3`;
  const outPath = join(YT_AUDIO_DIR, fileName);

  try {
    const titleProc = Bun.spawn(
      ["yt-dlp", "--print", "title", "--no-playlist", url],
      { stdout: "pipe", stderr: "pipe" }
    );
    await titleProc.exited;
    const title = (await new Response(titleProc.stdout).text()).trim() || "youtube-track";

    const dlProc = Bun.spawn(
      ["yt-dlp", "-x", "--audio-format", "mp3", "--audio-quality", "0", "--no-playlist", "-o", outPath, url],
      { stdout: "pipe", stderr: "pipe" }
    );

    const exitCode = await dlProc.exited;
    if (exitCode !== 0) {
      const errText = await new Response(dlProc.stderr).text();
      throw new Error(`yt-dlp failed (exit ${exitCode}): ${errText}`);
    }

    const localUrl = `http://localhost:8080/yt-audio/${encodeURIComponent(fileName)}`;
    const sources = room.addAudioSource({ url: localUrl });

    sendBroadcast({
      server,
      roomId,
      message: { type: "ROOM_EVENT", event: { type: "SET_AUDIO_SOURCES", sources } },
    });

    console.log(`YouTube track added: ${title}`);
  } catch (err) {
    console.error("handleYoutubeUrl error:", err);
  } finally {
    room.removeStreamJob(trackId);
    sendBroadcast({
      server,
      roomId,
      message: { type: "STREAM_JOB_UPDATE", activeJobCount: room.getActiveStreamJobCount() },
    });
  }
};
