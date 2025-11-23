"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EyeIcon, LoaderIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { Message } from "@/convex/chats";
import { cn } from "@/lib/utils";

function MessageAvatar({
  fileId,
  name,
}: {
  fileId: Id<"files"> | null;
  name: string;
}) {
  const profilePictureUrl = useQuery(
    api.files.getProfilePictureUrl,
    fileId ? { fileId } : "skip"
  );

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="size-8 shrink-0">
      <AvatarImage src={profilePictureUrl ?? undefined} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

function ViewedByIndicator({
  viewedBy,
  senderId,
  isGroupChat,
}: {
  viewedBy: Message["viewedBy"];
  senderId: Id<"users">;
  isGroupChat: boolean;
}) {
  if (viewedBy.length === 0) return null;

  // Filter out the sender from viewedBy list
  const otherViewers = viewedBy.filter((viewer) => viewer.id !== senderId);

  // In personal chats, just show "Seen"
  if (!isGroupChat) {
    return <span className="text-xs text-muted-foreground">Seen</span>;
  }

  // In group chats, show count and popover with names (excluding sender)
  if (otherViewers.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <EyeIcon className="size-3" />
          <span>{otherViewers.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-semibold mb-2">Viewed by</p>
          {otherViewers.map((viewer) => (
            <ViewedByUser
              key={viewer.id}
              name={viewer.name}
              profilePictureId={viewer.profilePictureId}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ViewedByUser({
  name,
  profilePictureId,
}: {
  name: string;
  profilePictureId: Id<"files"> | null;
}) {
  const profilePictureUrl = useQuery(
    api.files.getProfilePictureUrl,
    profilePictureId ? { fileId: profilePictureId } : "skip"
  );

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent">
      <Avatar className="size-6">
        <AvatarImage src={profilePictureUrl ?? undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{name}</span>
    </div>
  );
}

interface MessageListProps {
  chatId: Id<"chats">;
  userId: Id<"users">;
  isGroupChat: boolean;
  onLoadMore: (cursor: number) => void;
}

export function MessageList({
  chatId,
  userId,
  isGroupChat,
  onLoadMore,
}: MessageListProps) {
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [currentCursor, setCurrentCursor] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousChatIdRef = useRef<Id<"chats"> | null>(null);

  const latestMessages = useQuery(
    api.chats.getMessages,
    chatId && userId ? { chatId, userId, limit: 20 } : "skip"
  );

  // Reset older messages when chat changes
  useEffect(() => {
    if (previousChatIdRef.current !== chatId) {
      setOlderMessages([]);
      setCurrentCursor(null);
      previousChatIdRef.current = chatId;
    }
  }, [chatId]);

  // Update older messages when cursor changes
  const olderMessagesQuery = useQuery(
    api.chats.getMessages,
    chatId && userId && currentCursor
      ? { chatId, userId, limit: 20, cursor: currentCursor }
      : "skip"
  );

  // Update older messages state when query completes
  useEffect(() => {
    if (olderMessagesQuery?.messages) {
      setOlderMessages((prev) => {
        const newMessages = olderMessagesQuery.messages.filter(
          (msg) => !prev.some((m) => m.id === msg.id)
        );
        return [...newMessages, ...prev].sort(
          (a, b) => a.timestamp - b.timestamp
        );
      });
      setIsLoadingMore(false);
    }
  }, [olderMessagesQuery]);

  const allMessages = useMemo(() => {
    const messages: Message[] = [...olderMessages];

    if (latestMessages?.messages) {
      const latest = latestMessages.messages.filter(
        (msg) => !messages.some((m) => m.id === msg.id)
      );
      messages.push(...latest);
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  }, [latestMessages, olderMessages]);

  const hasMore = latestMessages?.nextCursor !== null;

  useEffect(() => {
    if (messagesEndRef.current && olderMessages.length === 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length, olderMessages.length]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || !latestMessages?.nextCursor) return;

    setIsLoadingMore(true);
    const nextCursor = latestMessages.nextCursor;
    setCurrentCursor(nextCursor);
    onLoadMore(nextCursor);
  }, [hasMore, isLoadingMore, latestMessages?.nextCursor, onLoadMore]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      date.toDateString() ===
      new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  if (!latestMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollAreaRef}>
      <div className="p-4 space-y-4">
        {hasMore && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                "Load older messages"
              )}
            </Button>
          </div>
        )}
        {allMessages.map((message: Message) => {
          const isOwn = message.senderId === userId;
          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}
            >
              {!isOwn && (
                <MessageAvatar
                  fileId={message.sender.profilePictureId}
                  name={message.sender.name}
                />
              )}
              <div
                className={cn(
                  "flex flex-col gap-1 max-w-[70%]",
                  isOwn ? "items-end" : "items-start"
                )}
              >
                {!isOwn && (
                  <span className="text-xs text-muted-foreground">
                    {message.sender.name}
                  </span>
                )}
                <div
                  className={cn(
                    "rounded-lg px-4 py-2",
                    isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap wrap-break-words">
                    {message.content}
                  </p>
                  {message.attachedFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachedFiles.map((file) => (
                        <div key={file.id} className="space-y-1">
                          {file.url && (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm underline break-all"
                            >
                              {file.uiName}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                  {isOwn && message.viewedBy.length > 0 && (
                    <ViewedByIndicator
                      viewedBy={message.viewedBy}
                      senderId={message.senderId}
                      isGroupChat={isGroupChat}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
