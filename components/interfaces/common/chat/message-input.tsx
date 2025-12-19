"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PaperclipIcon, XIcon, SendIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface MessageInputProps {
  chatId: Id<"chats">;
  onSend: (content: string, fileIds?: Id<"files">[]) => Promise<void>;
  onUploadFiles: (files: File[]) => Promise<Id<"files">[]>;
  disabled?: boolean;
}

export function MessageInput({
  chatId,
  onSend,
  onUploadFiles,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFileIds, setUploadingFileIds] = useState<Id<"files">[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILES = 5;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_FILES - selectedFiles.length;

    if (remainingSlots <= 0) {
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    setSelectedFiles((prev) => [...prev, ...filesToAdd]);

    if (files.length > remainingSlots) {
      // Could show a toast/alert here if needed
      console.warn(
        `Only ${remainingSlots} file(s) can be added. Maximum ${MAX_FILES} files allowed.`
      );
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!content.trim() && selectedFiles.length === 0) || isSending) return;

    setIsSending(true);
    try {
      let fileIds: Id<"files">[] = [];

      if (selectedFiles.length > 0) {
        fileIds = await onUploadFiles(selectedFiles);
        setUploadingFileIds(fileIds);
      }

      await onSend(content, fileIds.length > 0 ? fileIds : undefined);
      setContent("");
      setSelectedFiles([]);
      setUploadingFileIds([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4 space-y-2">
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-accent rounded-md px-2 py-1 text-sm"
              >
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>
          {selectedFiles.length >= MAX_FILES && (
            <p className="text-xs text-muted-foreground">
              Maximum {MAX_FILES} files allowed
            </p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending || selectedFiles.length >= MAX_FILES}
          title={
            selectedFiles.length >= MAX_FILES
              ? `Maximum ${MAX_FILES} files allowed`
              : "Attach files"
          }
        >
          <PaperclipIcon className="size-4" />
        </Button>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 min-h-[60px] max-h-[120px] resize-none"
          disabled={disabled || isSending}
        />
        <Button
          onClick={handleSend}
          disabled={
            disabled ||
            isSending ||
            (!content.trim() && selectedFiles.length === 0)
          }
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
