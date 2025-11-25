import { query, mutation, action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id, Doc } from "../_generated/dataModel";

export type ChatPreview = {
  id: Id<"chats">;
  participantIds: Id<"users">[];
  participants: Array<{
    id: Id<"users">;
    name: string;
    email: string;
    role: Doc<"users">["role"];
    profilePictureId: Id<"files"> | null;
  }>;
  lastMessage: {
    content: string;
    timestamp: string;
    senderId: Id<"users">;
  } | null;
  unreadCount: number;
  bookingId: Id<"bookings"> | null;
  chatName: string | null;
  isGroupChat: boolean;
};

export type Message = {
  id: Id<"messages">;
  chatId: Id<"chats">;
  senderId: Id<"users">;
  sender: {
    id: Id<"users">;
    name: string;
    profilePictureId: Id<"files"> | null;
  };
  content: string;
  timestamp: string;
  viewedByUserIds: Id<"users">[];
  viewedBy: Array<{
    id: Id<"users">;
    name: string;
    profilePictureId: Id<"files"> | null;
  }>;
  attachedFileIds: Id<"files">[];
  attachedFiles: Array<{
    id: Id<"files">;
    uiName: string;
    url: string | null;
  }>;
};

export type ChattableUser = {
  id: Id<"users">;
  name: string;
  email: string;
  role: Doc<"users">["role"];
  profilePictureId: Id<"files"> | null;
};

export const getChatsForUser = query({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return [];
    }

    const chatIds = user.chatIds || [];
    const chats: ChatPreview[] = [];

    for (const chatId of chatIds) {
      const chat = await ctx.db.get(chatId);
      if (!chat || !chat.isOpen) {
        continue;
      }

      const participants: ChatPreview["participants"] = [];
      for (const participantId of chat.participantIds) {
        const participant = await ctx.db.get(participantId);
        if (participant) {
          participants.push({
            id: participant._id,
            name: participant.name,
            email: participant.email,
            role: participant.role,
            profilePictureId: participant.profilePictureId ?? null,
          });
        }
      }

      const lastMessage = await ctx.db
        .query("messages")
        .withIndex("by_chat_time", (q) => q.eq("chatId", chatId))
        .order("desc")
        .first();

      let unreadCount = 0;
      if (lastMessage) {
        const allMessages = await ctx.db
          .query("messages")
          .withIndex("by_chat", (q) => q.eq("chatId", chatId))
          .collect();
        const unreadMessages = allMessages.filter(
          (msg) => !msg.viewedByUserIds.includes(args.userId)
        );
        unreadCount = unreadMessages.length;
      }

      chats.push({
        id: chat._id,
        participantIds: chat.participantIds,
        participants,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              timestamp: lastMessage.timestamp,
              senderId: lastMessage.senderId,
            }
          : null,
        unreadCount,
        bookingId: chat.bookingId ?? null,
        chatName: chat.chatName ?? null,
        isGroupChat: chat.isGroupChat,
      });
    }

    chats.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return (
        new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
      )
    });

    return chats;
  },
});

export const getChatById = query({
  args: {
    chatId: v.id("chats"),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.isOpen) {
      return null;
    }

    if (!chat.participantIds.includes(args.userId)) {
      return null;
    }

    const participants: ChatPreview["participants"] = [];
    for (const participantId of chat.participantIds) {
      const participant = await ctx.db.get(participantId);
      if (participant) {
        participants.push({
          id: participant._id,
          name: participant.name,
          email: participant.email,
          role: participant.role,
          profilePictureId: participant.profilePictureId ?? null,
        });
      }
    }

    return {
      id: chat._id,
      participantIds: chat.participantIds,
      participants,
      bookingId: chat.bookingId ?? null,
      chatName: chat.chatName ?? null,
      isGroupChat: chat.isGroupChat,
    };
  },
});

export const getMessages = query({
  args: {
    chatId: v.id("chats"),
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.participantIds.includes(args.userId)) {
      return {
        messages: [],
        nextCursor: null,
      };
    }

    const pageSize = Math.max(1, Math.min(args.limit ?? 20, 50));
    let query = ctx.db
      .query("messages")
      .withIndex("by_chat_time", (q) => q.eq("chatId", args.chatId));

    if (args.cursor) {
      query = query.filter((q) => q.lt(q.field("timestamp"), args.cursor!));
    }

    const messages = await query.order("desc").take(pageSize);

    const formattedMessages: Message[] = [];

    for (const message of messages.reverse()) {
      const sender = await ctx.db.get(message.senderId);
      if (!sender) continue;

      const attachedFiles: Message["attachedFiles"] = [];
      for (const fileId of message.attachedFileIds) {
        const file = await ctx.db.get(fileId);
        if (file) {
          const url = await ctx.storage.getUrl(file.storageId);
          attachedFiles.push({
            id: file._id,
            uiName: file.uiName,
            url,
          });
        }
      }

      const viewedBy: Message["viewedBy"] = [];
      for (const viewerId of message.viewedByUserIds) {
        const viewer = await ctx.db.get(viewerId);
        if (viewer) {
          viewedBy.push({
            id: viewer._id,
            name: viewer.name,
            profilePictureId: viewer.profilePictureId ?? null,
          });
        }
      }

      formattedMessages.push({
        id: message._id,
        chatId: message.chatId,
        senderId: message.senderId,
        sender: {
          id: sender._id,
          name: sender.name,
          profilePictureId: sender.profilePictureId ?? null,
        },
        content: message.content,
        timestamp: message.timestamp,
        viewedByUserIds: message.viewedByUserIds,
        viewedBy,
        attachedFileIds: message.attachedFileIds,
        attachedFiles,
      });
    }

    const nextCursor =
      formattedMessages.length > 0 ? formattedMessages[0].timestamp : null;

    return {
      messages: formattedMessages,
      nextCursor,
    };
  },
});

export const getChattableUsers = query({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return [];
    }

    const chattableUsers: ChattableUser[] = [];

    switch (user.role) {
      case "admin": {
        const hotel = user.hotelId ? await ctx.db.get(user.hotelId) : null;

        const superadmins = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "superadmin"))
          .collect();
        chattableUsers.push(
          ...superadmins.map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            profilePictureId: u.profilePictureId ?? null,
          }))
        );

        if (hotel) {
          const frontdesks = await ctx.db
            .query("users")
            .withIndex("by_hotel", (q) => q.eq("hotelId", hotel._id))
            .filter((q) => q.eq(q.field("role"), "frontdesk"))
            .collect();
          chattableUsers.push(
            ...frontdesks.map((u) => ({
              id: u._id,
              name: u.name,
              email: u.email,
              role: u.role,
              profilePictureId: u.profilePictureId ?? null,
            }))
          );

          const drivers = await ctx.db
            .query("users")
            .withIndex("by_hotel", (q) => q.eq("hotelId", hotel._id))
            .filter((q) => q.eq(q.field("role"), "driver"))
            .collect();
          chattableUsers.push(
            ...drivers.map((u) => ({
              id: u._id,
              name: u.name,
              email: u.email,
              role: u.role,
              profilePictureId: u.profilePictureId ?? null,
            }))
          );
        }
        break;
      }
      case "frontdesk": {
        const hotel = user.hotelId ? await ctx.db.get(user.hotelId) : null;

        if (hotel) {
          const admins = await ctx.db
            .query("users")
            .withIndex("by_hotel", (q) => q.eq("hotelId", hotel._id))
            .filter((q) => q.eq(q.field("role"), "admin"))
            .collect();
          chattableUsers.push(
            ...admins.map((u) => ({
              id: u._id,
              name: u.name,
              email: u.email,
              role: u.role,
              profilePictureId: u.profilePictureId ?? null,
            }))
          );

          const drivers = await ctx.db
            .query("users")
            .withIndex("by_hotel", (q) => q.eq("hotelId", hotel._id))
            .filter((q) => q.eq(q.field("role"), "driver"))
            .collect();
          chattableUsers.push(
            ...drivers.map((u) => ({
              id: u._id,
              name: u.name,
              email: u.email,
              role: u.role,
              profilePictureId: u.profilePictureId ?? null,
            }))
          );
        }
        break;
      }
      case "driver": {
        const hotel = user.hotelId ? await ctx.db.get(user.hotelId) : null;

        if (hotel) {
          const frontdesks = await ctx.db
            .query("users")
            .withIndex("by_hotel", (q) => q.eq("hotelId", hotel._id))
            .filter((q) => q.eq(q.field("role"), "frontdesk"))
            .collect();
          chattableUsers.push(
            ...frontdesks.map((u) => ({
              id: u._id,
              name: u.name,
              email: u.email,
              role: u.role,
              profilePictureId: u.profilePictureId ?? null,
            }))
          );

          const admins = await ctx.db
            .query("users")
            .withIndex("by_hotel", (q) => q.eq("hotelId", hotel._id))
            .filter((q) => q.eq(q.field("role"), "admin"))
            .collect();
          chattableUsers.push(
            ...admins.map((u) => ({
              id: u._id,
              name: u.name,
              email: u.email,
              role: u.role,
              profilePictureId: u.profilePictureId ?? null,
            }))
          );
        }
        break;
      }
      case "superadmin": {
        const admins = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .collect();
        chattableUsers.push(
          ...admins.map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            profilePictureId: u.profilePictureId ?? null,
          }))
        );
        break;
      }
      case "guest":
        return [];
    }

    // Filter out current user
    let filteredUsers = chattableUsers.filter((u) => u.id !== args.userId);

    // Get all existing personal chats for this user
    const allChats = await ctx.db
      .query("chats")
      .filter((q) =>
        q.and(
          q.eq(q.field("isOpen"), true),
          q.eq(q.field("isGroupChat"), false)
        )
      )
      .collect();

    const userChats = allChats.filter((chat) =>
      chat.participantIds.includes(args.userId)
    );

    // Extract user IDs that already have personal chats with current user
    const usersWithExistingChats = new Set<Id<"users">>();
    for (const chat of userChats) {
      // Personal chat has exactly 2 participants
      if (chat.participantIds.length === 2) {
        const otherParticipantId = chat.participantIds.find(
          (id) => id !== args.userId
        );
        if (otherParticipantId) {
          usersWithExistingChats.add(otherParticipantId);
        }
      }
    }

    // Filter out users who already have personal chats
    filteredUsers = filteredUsers.filter(
      (u) => !usersWithExistingChats.has(u.id)
    );

    return filteredUsers;
  },
});

export const createChat = mutation({
  args: {
    userId: v.id("users"),
    participantIds: v.array(v.id("users")),
    bookingId: v.optional(v.id("bookings")),
    chatName: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const allParticipantIds = [args.userId, ...args.participantIds];
    const uniqueParticipantIds = Array.from(new Set(allParticipantIds));

    if (uniqueParticipantIds.length < 2) {
      throw new Error("Chat must have at least 2 participants");
    }

    for (const participantId of uniqueParticipantIds) {
      const participant = await ctx.db.get(participantId);
      if (!participant) {
        throw new Error(`Participant ${participantId} not found`);
      }
    }

    const isGroupChat = uniqueParticipantIds.length > 2;

    // For group chats, chatName is required
    if (isGroupChat && !args.chatName?.trim()) {
      throw new Error("Group chat name is required");
    }

    // For personal chats, check if chat already exists
    if (!isGroupChat) {
      const allPersonalChats = await ctx.db
        .query("chats")
        .filter((q) =>
          q.and(
            q.eq(q.field("isOpen"), true),
            q.eq(q.field("isGroupChat"), false),
            q.eq(q.field("bookingId"), args.bookingId ?? undefined)
          )
        )
        .collect();

      const existingPersonalChats = allPersonalChats.filter((chat) =>
        chat.participantIds.includes(args.userId)
      );

      for (const chat of existingPersonalChats) {
        if (chat.participantIds.length === 2) {
          const chatParticipantIds = new Set(chat.participantIds);
          const requestedParticipantIds = new Set(uniqueParticipantIds);
          if (
            chatParticipantIds.size === requestedParticipantIds.size &&
            [...chatParticipantIds].every((id) =>
              requestedParticipantIds.has(id)
            )
          ) {
            return chat._id;
          }
        }
      }
    } else {
      // For group chats, check if a group with same name and participants exists
      const allGroupChats = await ctx.db
        .query("chats")
        .filter((q) =>
          q.and(
            q.eq(q.field("isOpen"), true),
            q.eq(q.field("isGroupChat"), true),
            q.eq(q.field("chatName"), args.chatName)
          )
        )
        .collect();

      const existingGroupChats = allGroupChats.filter((chat) =>
        chat.participantIds.includes(args.userId)
      );

      for (const chat of existingGroupChats) {
        const chatParticipantIds = new Set(chat.participantIds);
        const requestedParticipantIds = new Set(uniqueParticipantIds);
        if (
          chatParticipantIds.size === requestedParticipantIds.size &&
          [...chatParticipantIds].every((id) => requestedParticipantIds.has(id))
        ) {
          return chat._id;
        }
      }
    }

    const chatId = await ctx.db.insert("chats", {
      participantIds: uniqueParticipantIds,
      isOpen: true,
      bookingId: args.bookingId,
      chatName: isGroupChat ? args.chatName : undefined,
      isGroupChat,
    });

    for (const participantId of uniqueParticipantIds) {
      const participant = await ctx.db.get(participantId);
      if (participant) {
        await ctx.db.patch(participantId, {
          chatIds: [...(participant.chatIds || []), chatId],
        });
      }
    }

    return chatId;
  },
});

export const sendMessage = mutation({
  args: {
    chatId: v.id("chats"),
    senderId: v.id("users"),
    content: v.string(),
    attachedFileIds: v.optional(v.array(v.id("files"))),
  },
  async handler(ctx, args) {
    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.isOpen) {
      throw new Error("Chat not found or closed");
    }

    if (!chat.participantIds.includes(args.senderId)) {
      throw new Error("User is not a participant in this chat");
    }

    if (
      !args.content.trim() &&
      (!args.attachedFileIds || args.attachedFileIds.length === 0)
    ) {
      throw new Error("Message must have content or files");
    }

    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      senderId: args.senderId,
      content: args.content.trim(),
      timestamp: new Date().toISOString(),
      viewedByUserIds: [args.senderId],
      attachedFileIds: args.attachedFileIds || [],
    });

    return messageId;
  },
});

export const markMessagesAsViewed = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.participantIds.includes(args.userId)) {
      return;
    }

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    const unreadMessages = allMessages.filter(
      (msg) => !msg.viewedByUserIds.includes(args.userId)
    );

    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, {
        viewedByUserIds: [...message.viewedByUserIds, args.userId],
      });
    }
  },
});

export const addParticipantsToGroup = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.id("users"),
    participantIds: v.array(v.id("users")),
  },
  async handler(ctx, args) {
    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.isOpen) {
      throw new Error("Chat not found or closed");
    }

    if (!chat.isGroupChat) {
      throw new Error("Can only add participants to group chats");
    }

    if (!chat.participantIds.includes(args.userId)) {
      throw new Error("User is not a participant in this chat");
    }

    const newParticipantIds = args.participantIds.filter(
      (id) => !chat.participantIds.includes(id)
    );

    if (newParticipantIds.length === 0) {
      return;
    }

    const allParticipantIds = [...chat.participantIds, ...newParticipantIds];

    await ctx.db.patch(args.chatId, {
      participantIds: allParticipantIds,
    });

    for (const participantId of newParticipantIds) {
      const participant = await ctx.db.get(participantId);
      if (participant) {
        await ctx.db.patch(participantId, {
          chatIds: [...(participant.chatIds || []), args.chatId],
        });
      }
    }
  },
});

export const removeParticipantFromGroup = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.id("users"),
    participantIdToRemove: v.id("users"),
  },
  async handler(ctx, args) {
    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.isOpen) {
      throw new Error("Chat not found or closed");
    }

    if (!chat.isGroupChat) {
      throw new Error("Can only remove participants from group chats");
    }

    if (!chat.participantIds.includes(args.userId)) {
      throw new Error("User is not a participant in this chat");
    }

    if (!chat.participantIds.includes(args.participantIdToRemove)) {
      throw new Error("Participant is not in this chat");
    }

    if (chat.participantIds.length <= 2) {
      throw new Error(
        "Cannot remove participant. Group must have at least 2 members"
      );
    }

    const updatedParticipantIds = chat.participantIds.filter(
      (id) => id !== args.participantIdToRemove
    );

    await ctx.db.patch(args.chatId, {
      participantIds: updatedParticipantIds,
    });

    const participant = await ctx.db.get(args.participantIdToRemove);
    if (participant) {
      await ctx.db.patch(args.participantIdToRemove, {
        chatIds: (participant.chatIds || []).filter((id) => id !== args.chatId),
      });
    }
  },
});
