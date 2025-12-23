
"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface GroupManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: {
    id: Id<"chats">;
    participants: Array<{
      id: Id<"users">;
      name: string;
      email: string;
      role: "guest" | "admin" | "frontdesk" | "driver" | "superadmin";
      profilePictureId: Id<"files"> | null;
    }>;
    chatName: string | null;
    isGroupChat: boolean;
  };
  currentUserId: Id<"users">;
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

export function GroupManagementModal({
  open,
  onOpenChange,
  chat,
  currentUserId,
}: GroupManagementModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Id<"users">[]>([]);

  const addParticipantsMutation = useMutation(
    api.chats.index.addParticipantsToGroup
  );
  const removeParticipantMutation = useMutation(
    api.chats.index.removeParticipantFromGroup
  );

  const chattableUsers = useQuery(api.chats.index.getChattableUsers, {
    userId: currentUserId,
  });

  const currentParticipants = chat.participants;
  const currentParticipantIds = new Set(currentParticipants.map((p) => p.id));

  const availableUsers = useMemo(() => {
    if (!chattableUsers) return [];
    return chattableUsers.filter((user) => !currentParticipantIds.has(user.id));
  }, [chattableUsers, currentParticipantIds]);

  const filteredAvailableUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  const handleAddUsers = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      await addParticipantsMutation({
        chatId: chat.id,
        userId: currentUserId,
        participantIds: selectedUserIds,
      });
      setSelectedUserIds([]);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to add participants:", error);
    }
  };

  const handleRemoveUser = async (participantId: Id<"users">) => {
    if (participantId === currentUserId) {
      // User cannot remove themselves
      return;
    }

    try {
      await removeParticipantMutation({
        chatId: chat.id,
        userId: currentUserId,
        participantIdToRemove: participantId,
      });
    } catch (error) {
      console.error("Failed to remove participant:", error);
    }
  };

  const handleUserToggle = (userId: Id<"users">) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Group: {chat.chatName}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {currentParticipants.length} members
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
          <div className="flex flex-col border-r pr-4">
            <h4 className="font-medium mb-2">Current Members</h4>
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {currentParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-accent"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <UserAvatar
                        fileId={participant.profilePictureId}
                        name={participant.name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {participant.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {participant.email}
                        </div>
                      </div>
                    </div>
                    {participant.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => handleRemoveUser(participant.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col">
            <h4 className="font-medium mb-2">Add Members</h4>
            <div className="mb-2">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {filteredAvailableUsers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    {searchQuery ? "No users found" : "No users available"}
                  </div>
                ) : (
                  filteredAvailableUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleUserToggle(user.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${
                          isSelected
                            ? "bg-primary/10 border border-primary"
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
                          <div className="size-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <span className="text-primary-foreground text-xs">
                              ✓
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            {selectedUserIds.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <Button
                  onClick={handleAddUsers}
                  className="w-full"
                  disabled={selectedUserIds.length === 0}
                >
                  Add {selectedUserIds.length} member
                  {selectedUserIds.length > 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
