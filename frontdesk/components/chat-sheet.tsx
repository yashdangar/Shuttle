"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageCircle, Send, X, ChevronLeft } from "lucide-react";
import { useWebSocket } from "@/context/WebSocketContext";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
interface Chat {
  id: string;
  guest: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  messages: Array<{
    id: string;
    content: string;
    senderType: "GUEST" | "FRONTDESK" | "DRIVER";
    senderId: number;
    createdAt: string;
  }>;
  _count: {
    messages: number;
  };
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  senderType: "GUEST" | "FRONTDESK" | "DRIVER";
  senderId: number;
  createdAt: string;
}

interface ChatSheetProps {
  hotelId: number;
}

export function ChatSheet({ hotelId }: ChatSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useWebSocket();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chats when sheet opens
  useEffect(() => {
    if (isOpen && hotelId) {
      fetchChats();
    }
  }, [isOpen, hotelId]);

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      if (data.chatId === selectedChat?.id) {
        setMessages((prev) => [...prev, data.message]);
      }
      // Update unread count
      setUnreadCount((prev) => prev + 1);
      // Update chat list with new message
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === data.chatId
            ? {
                ...chat,
                messages: [data.message],
                updatedAt: new Date().toISOString(),
              }
            : chat
        )
      );
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, selectedChat]);

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        `/frontdesk/hotels/${hotelId}/chats`
      );
      const data = await response.json();
      setChats(data.chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to fetch chats");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        `/frontdesk/hotels/${hotelId}/chats/${chatId}/messages`
      );
      const data = await response.json();
      setMessages(data.messages);

      // Join chat room via WebSocket
      if (socket) {
        socket.emit("join_chat", { chatId, hotelId });
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const response = await fetchWithAuth(
        `/frontdesk/hotels/${hotelId}/chats/${selectedChat.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: newMessage.trim() }),
        }
      );

      setNewMessage("");
      // Message will be added via WebSocket
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    fetchMessages(chat.id);
  };

  const handleBackToChats = () => {
    setSelectedChat(null);
    setMessages([]);
    if (socket && selectedChat) {
      socket.emit("leave_chat", { chatId: selectedChat.id, hotelId });
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <MessageCircle className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-4 border-b">
          {selectedChat ? (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToChats}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {selectedChat.guest.firstName?.[0]}
                    {selectedChat.guest.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-sm">
                    {selectedChat.guest.firstName} {selectedChat.guest.lastName}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.guest.email}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <SheetTitle>Chats</SheetTitle>
          )}
        </SheetHeader>

        <div className="flex-1 flex flex-col h-[calc(100vh-8rem)]">
          {!selectedChat ? (
            // Chat List
            <div className="flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading chats...
                </div>
              ) : chats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No chats yet
                </div>
              ) : (
                <ScrollArea className="h-full">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleChatSelect(chat)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {chat.guest.firstName?.[0]}
                            {chat.guest.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {chat.guest.firstName} {chat.guest.lastName}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(chat.updatedAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {chat.messages[0]?.content || "No messages yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>
          ) : (
            // Chat Messages
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex mb-4 ${
                      message.senderType === "FRONTDESK"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        message.senderType === "FRONTDESK"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isLoading}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
