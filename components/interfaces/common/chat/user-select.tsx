"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface UserSelectProps {
  userId: Id<"users">;
  selectedUserIds: Id<"users">[];
  onUserToggle: (userId: Id<"users">) => void;
  allowMultiple?: boolean;
}

function UserAvatar({
  fileId,
  name,
}: {
  fileId: Id<"files"> | null;
  name: string;
}) {
  const profilePictureUrl = useQuery(
    api.files.index.getProfilePictureUrl,
    fileId ? { fileId } : "skip"
  );

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="size-10">
      <AvatarImage src={profilePictureUrl ?? undefined} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

export function UserSelect({
  userId,
  selectedUserIds,
  onUserToggle,
  allowMultiple = true,
}: UserSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const chattableUsers = useQuery(api.chats.index.getChattableUsers, {
    userId,
  });

  const filteredUsers = useMemo(() => {
    if (!chattableUsers) return [];
    if (!searchQuery.trim()) return chattableUsers;

    const query = searchQuery.toLowerCase();
    return chattableUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [chattableUsers, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchQuery ? "No users found" : "No users available"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                const isDisabled =
                  !allowMultiple && selectedUserIds.length > 0 && !isSelected;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onUserToggle(user.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-primary/10 border border-primary"
                        : isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-accent"
                    }`}
                  >
                    <UserAvatar
                      fileId={user.profilePictureId}
                      name={user.name}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground text-xs">
                          ✓
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
