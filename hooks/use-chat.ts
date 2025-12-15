"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useChat(userId: Id<"users"> | null) {
  const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(
    null
  );
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

  const chats = useQuery(
    api.chats.index.getChatsForUser,
    userId ? { userId } : "skip"
  );

  const selectedChat = useQuery(
    api.chats.index.getChatById,
    selectedChatId && userId ? { chatId: selectedChatId, userId } : "skip"
  );

  const messages = useQuery(
    api.chats.index.getMessages,
    selectedChatId && userId
      ? { chatId: selectedChatId, userId, limit: 20 }
      : "skip"
  );

  const chattableUsers = useQuery(
    api.chats.index.getChattableUsers,
    userId ? { userId } : "skip"
  );

  const createChatMutation = useMutation(api.chats.index.createChat);
  const sendMessageMutation = useMutation(api.chats.index.sendMessage);
  const markAsViewedMutation = useMutation(
    api.chats.index.markMessagesAsViewed
  );
  const addParticipantsMutation = useMutation(
    api.chats.index.addParticipantsToGroup
  );
  const removeParticipantMutation = useMutation(
    api.chats.index.removeParticipantFromGroup
  );
  const deleteChatMutation = useMutation(api.chats.index.deleteChat);
  const generateUploadUrl = useMutation(api.files.index.generateUploadUrl);
  const uploadChatFile = useMutation(api.files.index.uploadChatFile);

  const sendMessage = useCallback(
    async (
      content: string,
      chatId: Id<"chats">,
      fileIds?: Id<"files">[]
    ): Promise<void> => {
      if (!userId) return;

      await sendMessageMutation({
        chatId,
        senderId: userId,
        content,
        attachedFileIds: fileIds,
      });
    },
    [userId, sendMessageMutation]
  );

  const uploadFiles = useCallback(
    async (files: File[]): Promise<Id<"files">[]> => {
      if (!userId || files.length === 0) return [];

      const fileIds: Id<"files">[] = [];

      for (const file of files) {
        try {
          const postUrl = await generateUploadUrl();
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok) {
            throw new Error(`Upload failed: ${result.statusText}`);
          }

          const { storageId } = await result.json();
          const fileId = await uploadChatFile({
            storageId,
            userId,
            fileName: file.name,
          });

          fileIds.push(fileId);
        } catch (error) {
          console.error("File upload error:", error);
          throw error;
        }
      }

      return fileIds;
    },
    [userId, generateUploadUrl, uploadChatFile]
  );

  const loadMoreMessages = useCallback(
    (chatId: Id<"chats">, cursor: string | null) => {
      if (!userId || !cursor) return null;
      return cursor;
    },
    [userId]
  );

  const createChat = useCallback(
    async (
      participantIds: Id<"users">[],
      bookingId?: Id<"bookings">,
      chatName?: string
    ): Promise<Id<"chats">> => {
      if (!userId) throw new Error("User not authenticated");

      const chatId = await createChatMutation({
        userId,
        participantIds,
        bookingId,
        chatName,
      });

      setSelectedChatId(chatId);
      return chatId;
    },
    [userId, createChatMutation]
  );

  const markAsViewed = useCallback(
    async (chatId: Id<"chats">) => {
      if (!userId) return;

      await markAsViewedMutation({ chatId, userId });
    },
    [userId, markAsViewedMutation]
  );

  const messagesList = useMemo(() => {
    return messages?.messages ?? [];
  }, [messages]);

  const hasMoreMessages = useMemo(() => {
    return messages?.nextCursor !== null;
  }, [messages]);

  const addParticipants = useCallback(
    async (
      chatId: Id<"chats">,
      participantIds: Id<"users">[]
    ): Promise<void> => {
      if (!userId) return;
      await addParticipantsMutation({
        chatId,
        userId,
        participantIds,
      });
    },
    [userId, addParticipantsMutation]
  );

  const removeParticipant = useCallback(
    async (
      chatId: Id<"chats">,
      participantIdToRemove: Id<"users">
    ): Promise<void> => {
      if (!userId) return;
      await removeParticipantMutation({
        chatId,
        userId,
        participantIdToRemove,
      });
    },
    [userId, removeParticipantMutation]
  );

  const deleteChat = useCallback(
    async (chatId: Id<"chats">): Promise<void> => {
      if (!userId) return;
      await deleteChatMutation({ chatId, userId });
      setSelectedChatId(null);
    },
    [userId, deleteChatMutation]
  );

  return {
    chats: chats ?? [],
    selectedChatId,
    setSelectedChatId,
    selectedChat,
    messages: messagesList,
    hasMoreMessages,
    nextCursor: messages?.nextCursor ?? null,
    chattableUsers: chattableUsers ?? [],
    sendMessage,
    uploadFiles,
    loadMoreMessages,
    createChat,
    markAsViewed,
    addParticipants,
    removeParticipant,
    deleteChat,
    uploadingFiles,
    setUploadingFiles,
  };
}
