"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserSelect } from "./user-select";
import type { Id } from "@/convex/_generated/dataModel";

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: Id<"users">;
  onCreateChat: (
    participantIds: Id<"users">[],
    chatName?: string
  ) => Promise<void>;
  mode?: "personal" | "group";
}

export function NewChatModal({
  open,
  onOpenChange,
  userId,
  onCreateChat,
  mode = "personal",
}: NewChatModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<Id<"users">[]>([]);
  const [chatName, setChatName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const isGroupChat = mode === "group" || selectedUserIds.length > 1;

  const handleUserToggle = (userId: Id<"users">) => {
    if (mode === "personal") {
      // In personal mode, only allow single selection - replace if already selected
      setSelectedUserIds((prev) => (prev.includes(userId) ? [] : [userId]));
    } else {
      // In group mode, allow multiple selections
      setSelectedUserIds((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleCreate = async () => {
    if (mode === "personal" && selectedUserIds.length !== 1) {
      return;
    }
    if (mode === "group" && selectedUserIds.length < 2) {
      return;
    }
    if (selectedUserIds.length === 0) return;
    if (isGroupChat && !chatName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateChat(
        selectedUserIds,
        isGroupChat ? chatName.trim() : undefined
      );
      setSelectedUserIds([]);
      setChatName("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] sm:max-h-[600px] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {mode === "group" ? "New Group Chat" : "New Chat"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "group"
              ? selectedUserIds.length === 0
                ? "Select at least 2 people to create a group"
                : selectedUserIds.length === 1
                  ? "Select at least one more person"
                  : `${selectedUserIds.length} people selected`
              : selectedUserIds.length === 0
                ? "Select a person to start a chat"
                : "1 person selected"}
          </p>
        </DialogHeader>
        {mode === "group" && (
          <div className="shrink-0">
            <Label htmlFor="chatName">Group Name *</Label>
            <Input
              id="chatName"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              placeholder="Enter group name..."
              className="mt-1"
            />
          </div>
        )}
        <div className="shrink-0">
          <Label>Participants *</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "group"
              ? "Search and select at least 2 users"
              : "Search and select one user"}
          </p>
        </div>
        <div className="flex-1 min-h-0 rounded-md border overflow-hidden">
          <UserSelect
            userId={userId}
            selectedUserIds={selectedUserIds}
            onUserToggle={handleUserToggle}
            allowMultiple={mode === "group"}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedUserIds([]);
              setChatName("");
            }}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              isCreating ||
              (mode === "personal" && selectedUserIds.length !== 1) ||
              (mode === "group" && selectedUserIds.length < 2) ||
              (mode === "group" && !chatName.trim())
            }
          >
            {isCreating
              ? "Creating..."
              : mode === "group"
                ? "Create Group"
                : "Create Chat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
