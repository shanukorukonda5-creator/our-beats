import { IS_DEMO_MODE } from "@/demo";
import { globalManager } from "@/managers";
import { sendBroadcast } from "@/utils/responses";
import type { HandlerFunction } from "@/websocket/types";

type YoutubeUrlMessage = { type: "YOUTUBE_URL"; url: string };

export const handleYoutubeUrl: HandlerFunction<YoutubeUrlMessage> = async ({
  ws,
  message,
  server,
}) => {
  if (IS_DEMO_MODE) return;

  const roomId = ws.data.roomId;
  const room = globalManager.getRoom(roomId);
  if (!room) return;

  const url = message.url;
  const trackId = `yt-${Date.now()}`;

  room.addStreamJob(trackId);
  sendBroadcast({
    server, roomId,
    message: { type: "STREAM_JOB_UPDATE", activeJobCount: room.getActiveStreamJobCount() },
  });

  try {
    // Get direct audio stream URL from yt-dlp (no download needed)
    const proc = Bun.spawn(
      ["yt-dlp", "-f", "bestaudio", "--get-url", "--no-playlist", url],
      { stdout: "pipe", stderr: "pipe" }
    );
    await proc.exited;
    const streamUrl = (await new Response(proc.stdout).text()).trim();

    if (!streamUrl) throw new Error("yt-dlp returned no URL");

    // Use the direct stream URL — no file storage needed
    const sources = room.addAudioSource({ url: streamUrl });

    sendBroadcast({
      server, roomId,
      message: { type: "ROOM_EVENT", event: { type: "SET_AUDIO_SOURCES", sources } },
    });

    console.log(`YouTube stream URL added for room ${roomId}`);
  } catch (err) {
    console.error("handleYoutubeUrl error:", err);
  } finally {
    room.removeStreamJob(trackId);
    sendBroadcast({
      server, roomId,
      message: { type: "STREAM_JOB_UPDATE", activeJobCount: room.getActiveStreamJobCount() },
    });
  }
};
