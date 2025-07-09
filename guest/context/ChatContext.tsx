import React, {
  createContext,
  useReducer,
  useContext,
  useCallback,
  useEffect,
} from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";

// Types
export interface Message {
  id: string;
  content: string;
  senderType: "GUEST" | "FRONTDESK" | "DRIVER";
  senderId: number;
  createdAt: string;
  optimistic?: boolean; // for optimistic UI
}

export interface Chat {
  id: string;
  frontDesk?: {
    id: number;
    name: string;
    email: string;
  };
  driver?: {
    id: number;
    name: string;
    email: string;
  };
  messages: Message[];
  _count: { messages: number };
  updatedAt: string;
}

interface ChatState {
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  selectedChatId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  chats: [],
  messages: {},
  selectedChatId: null,
  isLoading: false,
  error: null,
};

type Action =
  | { type: "SET_CHATS"; chats: Chat[] }
  | { type: "SET_MESSAGES"; chatId: string; messages: Message[] }
  | { type: "ADD_MESSAGE"; chatId: string; message: Message }
  | { type: "SELECT_CHAT"; chatId: string | null }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "UPDATE_CHAT_LAST_MESSAGE"; chatId: string; message: Message }
  | { type: "REMOVE_OPTIMISTIC_MESSAGE"; chatId: string; tempId: string };

function chatReducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "SET_CHATS":
      return { ...state, chats: action.chats };
    case "SET_MESSAGES":
      return {
        ...state,
        messages: { ...state.messages, [action.chatId]: action.messages },
      };
    case "ADD_MESSAGE": {
      const prev = state.messages[action.chatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.chatId]: [...prev, action.message],
        },
      };
    }
    case "SELECT_CHAT":
      return { ...state, selectedChatId: action.chatId };
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "UPDATE_CHAT_LAST_MESSAGE":
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.chatId
            ? {
                ...chat,
                messages: [action.message],
                updatedAt: new Date().toISOString(),
              }
            : chat
        ),
      };
    case "REMOVE_OPTIMISTIC_MESSAGE": {
      const prev = state.messages[action.chatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.chatId]: prev.filter((msg) => msg.id !== action.tempId),
        },
      };
    }
    default:
      return state;
  }
}

interface ChatContextProps extends ChatState {
  fetchChats: (hotelId: number) => Promise<void>;
  fetchMessages: (hotelId: number, chatId: string) => Promise<void>;
  sendMessage: (
    hotelId: number,
    chatId: string,
    content: string,
    senderId: number,
    senderType: Message["senderType"]
  ) => Promise<void>;
  selectChat: (chatId: string | null) => void;
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

// Accept hotelId and guestId as props, but they can be undefined
export const ChatProvider: React.FC<{
  hotelId?: number;
  guestId?: number;
  children: React.ReactNode;
}> = ({ hotelId, guestId, children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { socket } = useWebSocket();

  // Fetch chat list and preload messages for all chats
  const fetchChats = useCallback(async (hotelId: number) => {
    dispatch({ type: "SET_LOADING", isLoading: true });
    try {
      const data = await api.get(`/guest/hotels/${hotelId}/chats`);
      dispatch({ type: "SET_CHATS", chats: data.chats });
      // Preload messages for all chats in parallel
      const messageResults = await Promise.all(
        data.chats.map(async (chat: Chat) => {
          try {
            const msgData = await api.get(
              `/guest/hotels/${hotelId}/chats/${chat.id}/messages`
            );
            return { chatId: chat.id, messages: msgData.messages };
          } catch {
            return { chatId: chat.id, messages: [] };
          }
        })
      );
      // Store all messages in context
      messageResults.forEach(({ chatId, messages }) => {
        dispatch({ type: "SET_MESSAGES", chatId, messages });
      });
    } catch (error: any) {
      dispatch({
        type: "SET_ERROR",
        error: error.message || "Failed to fetch chats",
      });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, []);

  // Fetch messages for a chat
  const fetchMessages = useCallback(
    async (hotelId: number, chatId: string) => {
      dispatch({ type: "SET_LOADING", isLoading: true });
      try {
        const data = await api.get(
          `/guest/hotels/${hotelId}/chats/${chatId}/messages`
        );
        dispatch({ type: "SET_MESSAGES", chatId, messages: data.messages });
        // Join chat room via WebSocket
        if (socket) {
          socket.emit("join_chat", { chatId, hotelId });
        }
      } catch (error: any) {
        dispatch({
          type: "SET_ERROR",
          error: error.message || "Failed to fetch messages",
        });
      } finally {
        dispatch({ type: "SET_LOADING", isLoading: false });
      }
    },
    [socket]
  );

  // Send message (optimistic UI)
  const sendMessage = useCallback(
    async (
      hotelId: number,
      chatId: string,
      content: string,
      senderId: number,
      senderType: Message["senderType"]
    ) => {
      // Optimistic message
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempId,
        content,
        senderType,
        senderId,
        createdAt: new Date().toISOString(),
        optimistic: true,
      };
      dispatch({ type: "ADD_MESSAGE", chatId, message: optimisticMsg });
      dispatch({
        type: "UPDATE_CHAT_LAST_MESSAGE",
        chatId,
        message: optimisticMsg,
      });
      try {
        const data = await api.post(
          `/guest/hotels/${hotelId}/chats/${chatId}/messages`,
          { content }
        );
        // Remove optimistic message
        dispatch({ type: "REMOVE_OPTIMISTIC_MESSAGE", chatId, tempId });
        // Add confirmed message
        dispatch({ type: "ADD_MESSAGE", chatId, message: data.message });
        dispatch({
          type: "UPDATE_CHAT_LAST_MESSAGE",
          chatId,
          message: data.message,
        });
      } catch (error: any) {
        dispatch({ type: "REMOVE_OPTIMISTIC_MESSAGE", chatId, tempId });
        dispatch({
          type: "SET_ERROR",
          error: error.message || "Failed to send message",
        });
      }
    },
    []
  );

  // Select chat
  const selectChat = useCallback((chatId: string | null) => {
    dispatch({ type: "SELECT_CHAT", chatId });
  }, []);

  // WebSocket: handle incoming messages
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (data: any) => {
      const { chatId, message } = data;
      dispatch({ type: "ADD_MESSAGE", chatId, message });
      dispatch({ type: "UPDATE_CHAT_LAST_MESSAGE", chatId, message });
    };
    socket.on("new_message", handleNewMessage);
    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket]);

  const value: ChatContextProps = {
    ...state,
    fetchChats,
    fetchMessages,
    sendMessage,
    selectChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
