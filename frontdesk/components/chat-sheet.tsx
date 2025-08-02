"use client";

import { useEffect, useRef, useState } from "react";
import { useHotelId } from "@/hooks/use-hotel-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageCircle, Send, ChevronLeft } from "lucide-react";
import { useChat } from "@/context/ChatContext";

export function ChatSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { hotelId, loading: hotelIdLoading } = useHotelId();
  const {
    chats,
    messages,
    selectedChatId,
    isLoading,
    fetchChats,
    fetchMessages,
    sendMessage,
    selectChat,
  } = useChat();

  // Find selected chat object
  const selectedChat = chats.find((c) => c.id === selectedChatId) || null;
  const chatMessages = selectedChatId ? messages[selectedChatId] || [] : [];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Only fetch chats if not already loaded
  useEffect(() => {
    if (isOpen && hotelId && chats.length === 0) {
      fetchChats(hotelId);
    }
  }, [isOpen, hotelId, fetchChats, chats.length]);

  // Unread count (simple: count all messages in all chats)
  const unreadCount = 0; // You can implement this if you have unread logic

  const handleChatSelect = (chatId: string) => {
    selectChat(chatId);
    if (hotelId) fetchMessages(hotelId, chatId);
  };

  const handleBackToChats = () => {
    selectChat(null);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !hotelId) return;
    const msg = newMessage.trim();
    setNewMessage(""); // Clear input immediately (optimistic)
    await sendMessage(hotelId, selectedChat.id, msg, "FRONTDESK");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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
                    {selectedChat.guest?.firstName?.[0] ||
                      selectedChat.guest?.lastName?.[0] ||
                      selectedChat.driver?.name?.[0] ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-sm">
                    {selectedChat.guest
                      ? `${selectedChat.guest.firstName || ""} ${
                          selectedChat.guest.lastName || ""
                        }`.trim()
                      : selectedChat.driver?.name || "Unknown"}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.guest?.email ||
                      selectedChat.driver?.email ||
                      ""}
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
            <div className="flex-1 overflow-hidden">
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
                      onClick={() => handleChatSelect(chat.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {chat.guest?.firstName?.[0] ||
                              chat.guest?.lastName?.[0] ||
                              chat.driver?.name?.[0] ||
                              "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {chat.guest
                                ? `${chat.guest.firstName || ""} ${
                                    chat.guest.lastName || ""
                                  }`.trim()
                                : chat.driver?.name || "Unknown"}
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
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.createdAt}-${index}`}
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
                          {message.optimistic && (
                            <span className="ml-1 text-yellow-500">...</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
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
