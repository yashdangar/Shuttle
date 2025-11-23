"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import type { ChatPreview } from "@/convex/chats";
import { Search } from "lucide-react";

function ChatAvatar({
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
    <Avatar className="size-12 shrink-0">
      <AvatarImage src={profilePictureUrl ?? undefined} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

interface ChatListProps {
  chats: ChatPreview[];
  selectedChatId: Id<"chats"> | null;
  currentUserId: Id<"users">;
  currentUserRole: "admin" | "frontdesk" | "driver" | "superadmin" | "guest";
  onSelectChat: (chatId: Id<"chats">) => void;
}

export function ChatList({
  chats,
  selectedChatId,
  currentUserId,
  currentUserRole,
  onSelectChat,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const getFilterOptions = () => {
    const baseFilters = [
      { value: "all", label: "All" },
      { value: "groups", label: "Groups" },
    ];

    switch (currentUserRole) {
      case "admin":
        return [
          ...baseFilters,
          { value: "frontdesk", label: "Frontdesk" },
          { value: "driver", label: "Driver" },
          { value: "superadmin", label: "Superadmin" },
        ];
      case "frontdesk":
        return [
          ...baseFilters,
          { value: "driver", label: "Driver" },
          { value: "admin", label: "Admin" },
          { value: "booking", label: "Booking" },
        ];
      case "driver":
        return [
          ...baseFilters,
          { value: "frontdesk", label: "Frontdesk" },
          { value: "admin", label: "Admin" },
          { value: "booking", label: "Booking" },
        ];
      case "superadmin":
        return baseFilters;
      default:
        return baseFilters;
    }
  };

  const filterOptions = getFilterOptions();

  const filteredAndSearchedChats = useMemo(() => {
    let filtered = chats;

    // Apply filter
    if (filter !== "all") {
      filtered = chats.filter((chat) => {
        if (filter === "booking") {
          return chat.bookingId !== null;
        }
        if (filter === "groups") {
          return chat.isGroupChat;
        }
        // Filter by participant role
        const otherParticipants = chat.participants.filter(
          (p) => p.id !== currentUserId
        );
        return otherParticipants.some((p) => p.role === filter);
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((chat) => {
        // Search in group name
        if (chat.chatName?.toLowerCase().includes(query)) {
          return true;
        }
        // Search in participant names and emails
        return chat.participants.some(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.email.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [chats, filter, searchQuery, currentUserId]);
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getChatDisplayName = (chat: ChatPreview) => {
    if (chat.isGroupChat && chat.chatName) {
      return chat.chatName;
    }
    const otherParticipant =
      chat.participants.find((p) => p.id !== currentUserId) ||
      chat.participants[0];
    return otherParticipant.name;
  };

  const getChatAvatar = (chat: ChatPreview) => {
    if (chat.isGroupChat) {
      return null;
    }
    return (
      chat.participants.find((p) => p.id !== currentUserId) ||
      chat.participants[0]
    );
  };

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No chats yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {filterOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "rounded-full",
                  filter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredAndSearchedChats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {searchQuery || filter !== "all"
                ? "No chats found"
                : "No chats yet"}
            </div>
          ) : (
            filteredAndSearchedChats.map((chat) => {
              const displayName = getChatDisplayName(chat);
              const avatarParticipant = getChatAvatar(chat);
              const isSelected = selectedChatId === chat.id;

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => onSelectChat(chat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                    isSelected
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-accent"
                  )}
                >
                  {avatarParticipant ? (
                    <ChatAvatar
                      fileId={avatarParticipant.profilePictureId}
                      name={avatarParticipant.name}
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center relative">
                      <span className="text-primary font-semibold text-sm">
                        {chat.chatName?.[0]?.toUpperCase() || "G"}
                      </span>
                      {chat.isGroupChat && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full size-5 flex items-center justify-center border-2 border-background">
                          {chat.participants.length}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {displayName}
                      </span>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage?.content || "No messages yet"}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge variant="default" className="shrink-0">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
