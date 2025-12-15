"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useChat } from "@/hooks/use-chat";
import { ChatList } from "@/components/chat/chat-list";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { NewChatModal } from "@/components/chat/new-chat-modal";
import { GroupManagementModal } from "@/components/chat/group-management-modal";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusIcon, Users, Settings } from "lucide-react";
import PageLayout from "@/components/layout/page-layout";
import type { Id } from "@/convex/_generated/dataModel";

const rolePriority: Record<
  "admin" | "frontdesk" | "driver" | "superadmin" | "guest",
  number
> = {
  superadmin: 4,
  admin: 3,
  frontdesk: 2,
  driver: 1,
  guest: 0,
};

export default function ChatPage() {
  const { user } = useAuthSession();
  const userId = user?.id as Id<"users"> | null;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupManagementOpen, setGroupManagementOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const chat = useChat(userId);
  const chatIdFromQuery = searchParams.get("chatId") as Id<"chats"> | null;

  const canCreateChat = user?.role !== "guest";
  const hasChattableUsers = (chat.chattableUsers?.length ?? 0) > 0;
  const showNewChatButton = canCreateChat && hasChattableUsers;

  useEffect(() => {
    if (chat.selectedChatId && userId) {
      chat.markAsViewed(chat.selectedChatId);
    }
  }, [chat.selectedChatId, userId]);

  useEffect(() => {
    if (!userId) return;
    if (chatIdFromQuery && chatIdFromQuery !== chat.selectedChatId) {
      chat.setSelectedChatId(chatIdFromQuery);
    }
  }, [chatIdFromQuery, chat.selectedChatId, chat, userId]);

  const updateChatQuery = (chatId: Id<"chats"> | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (chatId) {
      params.set("chatId", chatId);
    } else {
      params.delete("chatId");
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleSendMessage = async (
    content: string,
    fileIds?: Id<"files">[]
  ) => {
    if (!chat.selectedChatId) return;
    await chat.sendMessage(content, chat.selectedChatId, fileIds);
  };

  const handleCreateChat = async (
    participantIds: Id<"users">[],
    chatName?: string
  ) => {
    if (!userId) return;
    await chat.createChat(participantIds, undefined, chatName);
  };

  const handleLoadMoreMessages = (cursor: string) => {
    // Cursor is handled by MessageList component
  };

  const canDeleteChat =
    !!chat.selectedChat &&
    !!user &&
    chat.selectedChat.participants.some(
      (p: { id: Id<"users"> }) => p.id === userId
    ) &&
    (() => {
      const highest = chat.selectedChat!.participants.reduce(
        (
          acc: { role: string; score: number },
          p: { role: keyof typeof rolePriority }
        ) => {
          const score = rolePriority[p.role];
          if (score > acc.score) {
            return { role: p.role, score };
          }
          return acc;
        },
        { role: "guest", score: -1 }
      );
      return (
        rolePriority[user.role as keyof typeof rolePriority] === highest.score
      );
    })();

  const handleDeleteChat = async () => {
    if (!chat.selectedChatId) return;
    await chat.deleteChat(chat.selectedChatId);
    updateChatQuery(null);
    setConfirmDeleteOpen(false);
  };

  return (
    <PageLayout>
      <div className="flex h-[calc(100vh-4rem)] border rounded-lg overflow-hidden">
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-lg">Chats</h2>
            {showNewChatButton && (
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setNewChatOpen(true)}
                  title="New chat"
                >
                  <PlusIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setNewGroupOpen(true)}
                  title="New group"
                >
                  <Users className="size-4" />
                </Button>
              </div>
            )}
          </div>
          <ChatList
            chats={chat.chats}
            selectedChatId={chat.selectedChatId}
            currentUserId={userId!}
            currentUserRole={
              (user?.role as
                | "admin"
                | "frontdesk"
                | "driver"
                | "superadmin"
                | "guest") || "guest"
            }
            onSelectChat={(chatId) => {
              chat.setSelectedChatId(chatId);
              updateChatQuery(chatId);
            }}
          />
        </div>
        <div className="flex-1 flex flex-col">
          {chat.selectedChatId ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">
                  {chat.selectedChat?.isGroupChat && chat.selectedChat.chatName
                    ? chat.selectedChat.chatName
                    : chat.selectedChat?.participants
                        .filter((p: { id: Id<"users"> }) => p.id !== userId)
                        .map((p: { name: string }) => p.name)
                        .join(", ") || "Chat"}
                </h3>
                <div className="flex items-center gap-2">
                  {chat.selectedChat?.isGroupChat && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setGroupManagementOpen(true)}
                      title="Manage group"
                    >
                      <Settings className="size-4" />
                    </Button>
                  )}
                  {canDeleteChat && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDeleteOpen(true)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              <MessageList
                chatId={chat.selectedChatId}
                userId={userId!}
                isGroupChat={chat.selectedChat?.isGroupChat ?? false}
                onLoadMore={handleLoadMoreMessages}
              />
              <MessageInput
                chatId={chat.selectedChatId}
                onSend={handleSendMessage}
                onUploadFiles={chat.uploadFiles}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>
      {userId && (
        <>
          <NewChatModal
            open={newChatOpen}
            onOpenChange={setNewChatOpen}
            userId={userId}
            onCreateChat={handleCreateChat}
            mode="personal"
          />
          <NewChatModal
            open={newGroupOpen}
            onOpenChange={setNewGroupOpen}
            userId={userId}
            onCreateChat={handleCreateChat}
            mode="group"
          />
          {chat.selectedChat && chat.selectedChat.isGroupChat && (
            <GroupManagementModal
              open={groupManagementOpen}
              onOpenChange={setGroupManagementOpen}
              chat={chat.selectedChat}
              currentUserId={userId}
            />
          )}
          <AlertDialog
            open={confirmDeleteOpen}
            onOpenChange={setConfirmDeleteOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the chat and all messages for all
                  participants.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteChat}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </PageLayout>
  );
}
