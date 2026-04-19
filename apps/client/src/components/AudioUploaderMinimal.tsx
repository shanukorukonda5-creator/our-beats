"use client";

import { uploadAudioFile } from "@/lib/api";
import { cn, trimFileName } from "@/lib/utils";
import { useCanMutate } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { useGlobalStore } from "@/store/global";
import { sendWSRequest } from "@/utils/ws";
import { ClientActionEnum } from "@beatsync/shared";
import { CloudUpload, Plus, Youtube } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function isYoutubeUrl(url: string) {
  return /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/.test(url.trim());
}

export const AudioUploaderMinimal = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showYtInput, setShowYtInput] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const canMutate = useCanMutate();
  const roomId = useRoomStore((state) => state.roomId);
  const socket = useGlobalStore((state) => state.socket);

  const isDisabled = !canMutate;

  const handleFileUpload = async (file: File) => {
    if (isDisabled) return;

    // Store file name for display
    setFileName(file.name);

    try {
      setIsUploading(true);

      // Upload the file to the server as binary
      await uploadAudioFile({
        file,
        roomId,
      });

      setTimeout(() => setFileName(null), 3000);
    } catch (err) {
      console.error("Error during upload:", err);
      toast.error("Failed to upload audio file");
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileUpload(file);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const onDropEvent = (event: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    // make sure we only allow audio files
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    handleFileUpload(file);
  };

  const handleYoutubeSubmit = () => {
    if (isDisabled || !socket) return;
    const trimmed = ytUrl.trim();
    if (!trimmed) return;
    if (!isYoutubeUrl(trimmed)) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    sendWSRequest({
      ws: socket,
      request: { type: ClientActionEnum.enum.YOUTUBE_URL, url: trimmed },
    });
    toast.success("YouTube track queued — downloading audio...");
    setYtUrl("");
    setShowYtInput(false);
  };

  return (
    <div
      className={cn(
        "border border-neutral-700/50 rounded-md mx-2 transition-all overflow-hidden",
        isDisabled ? "bg-neutral-800/20 opacity-50" : "bg-neutral-800/30 hover:bg-neutral-800/50",
        isDragging && !isDisabled ? "outline outline-primary-400 outline-dashed" : "outline-none"
      )}
      id="drop_zone"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragLeave}
      onDrop={onDropEvent}
      title={isDisabled ? "Admin-only mode - only admins can upload" : undefined}
    >
      <label htmlFor="audio-upload" className={cn("block w-full", isDisabled ? "" : "cursor-pointer")}>
        <div className="p-3 flex items-center gap-3">
          <div
            className={cn(
              "p-1.5 rounded-md flex-shrink-0",
              isDisabled ? "bg-neutral-600 text-neutral-400" : "bg-primary-700 text-white"
            )}
          >
            {isUploading ? <CloudUpload className="h-4 w-4 animate-pulse" /> : <Plus className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {isUploading ? "Uploading..." : fileName ? trimFileName(fileName) : "Upload audio"}
            </div>
            {!isUploading && !fileName && (
              <div className={cn("text-xs truncate", isDisabled ? "text-neutral-500" : "text-neutral-400")}>
                {isDisabled ? "Must be an admin to upload" : "Add music to queue"}
              </div>
            )}
          </div>
        </div>
      </label>

      <input
        id="audio-upload"
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/aac,audio/ogg,audio/webm,audio/flac,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac"
        onChange={onInputChange}
        disabled={isUploading || isDisabled}
        className="hidden"
      />

      {/* YouTube URL row */}
      <div className="border-t border-neutral-700/50">
        {showYtInput ? (
          <div className="p-2 flex items-center gap-2">
            <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleYoutubeSubmit();
                if (e.key === "Escape") { setShowYtInput(false); setYtUrl(""); }
              }}
              placeholder="Paste YouTube URL..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-neutral-500 focus:outline-none min-w-0"
            />
            <button
              onClick={handleYoutubeSubmit}
              className="text-xs text-primary-400 hover:text-white transition-colors flex-shrink-0"
              type="button"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => !isDisabled && setShowYtInput(true)}
            disabled={isDisabled}
            className={cn(
              "w-full p-2.5 flex items-center gap-2 text-xs transition-colors",
              isDisabled ? "text-neutral-600 cursor-not-allowed" : "text-neutral-400 hover:text-white"
            )}
            type="button"
          >
            <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span>Paste YouTube URL</span>
          </button>
        )}
      </div>
    </div>
  );
};
