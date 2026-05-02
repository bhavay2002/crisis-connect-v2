import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send,
  MessageSquare,
  Pin,
  AlertTriangle,
  Plus,
  Users,
  Check,
  CheckCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ChatRoom {
  id: string;
  name: string | null;
  type: "direct" | "group" | "report";
  createdAt: string;
}

interface Message {
  id: string;
  chatRoomId: string;
  senderId: string | null;
  content: string;
  messageType: string;
  status: string;
  isPinned: boolean;
  isPriority: boolean;
  createdAt: string;
}

function MessageStatusIcon({ status }: { status: string }) {
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
  return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, NodeJS.Timeout>>({});
  const [typingDisplay, setTypingDisplay] = useState<string[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: !!user,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "messages"],
    queryFn: async () => {
      if (!selectedRoomId) return [];
      const res = await fetch(`/api/chat/rooms/${selectedRoomId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return res.json();
    },
    enabled: !!selectedRoomId,
    refetchInterval: false,
  });

  const { data: pinnedMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "pinned"],
    queryFn: async () => {
      if (!selectedRoomId) return [];
      const res = await fetch(`/api/chat/rooms/${selectedRoomId}/messages/pinned`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return res.json();
    },
    enabled: !!selectedRoomId && showPinned,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/chat/rooms/${selectedRoomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, messageType: "text" }),
      });
    },
    onSuccess: () => {
      refetchMessages();
      scrollToBottom();
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("/api/chat/rooms", {
        method: "POST",
        body: JSON.stringify({ name, type: "group" }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] }),
  });

  const pinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      return apiRequest(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}/pin`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoomId, "pinned"] });
      refetchMessages();
    },
  });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendTyping = useCallback(async (isTyping: boolean) => {
    if (!selectedRoomId) return;
    try {
      await fetch(`/api/chat/rooms/${selectedRoomId}/typing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ isTyping }),
      });
    } catch {}
  }, [selectedRoomId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    sendTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleSend = () => {
    if (!messageInput.trim() || !selectedRoomId) return;
    sendMessageMutation.mutate(messageInput.trim());
    setMessageInput("");
    sendTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  useRealtimeMessage((parsed: any) => {
      if (parsed.type !== "chat_message") return;

      if (parsed.event === "RECEIVE_MESSAGE" && parsed.data?.roomId === selectedRoomId) {
        refetchMessages();
        scrollToBottom();
        if (parsed.data.senderId !== user?.id) {
          fetch(`/api/chat/rooms/${selectedRoomId}/messages/${parsed.data.id}/deliver`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          }).catch(() => {});
        }
      }

      if ((parsed.event === "TYPING_START" || parsed.event === "TYPING_STOP") &&
          parsed.data?.roomId === selectedRoomId &&
          parsed.data?.userId !== user?.id) {
        const typingUserId: string = parsed.data.userId;
        if (parsed.event === "TYPING_START") {
          setTypingDisplay(prev => prev.includes(typingUserId) ? prev : [...prev, typingUserId]);
          setTypingUsers(prev => {
            if (prev[typingUserId]) clearTimeout(prev[typingUserId]);
            const timer = setTimeout(() => {
              setTypingDisplay(d => d.filter(u => u !== typingUserId));
            }, 3000);
            return { ...prev, [typingUserId]: timer };
          });
        } else {
          setTypingDisplay(prev => prev.filter(u => u !== typingUserId));
        }
      }

      if (parsed.event === "READ_RECEIPT" && parsed.data?.roomId === selectedRoomId) {
        refetchMessages();
      }
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const sortedMessages = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        <div className="w-72 border-r flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Messages</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                const name = prompt("Group name:");
                if (name) createGroupMutation.mutate(name);
              }}
              title="New group channel"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {rooms.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No conversations yet.
              </div>
            )}
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors ${
                  selectedRoomId === room.id ? "bg-muted" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {room.type === "group" ? (
                    <Users className="w-4 h-4 text-primary" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {room.name || (room.type === "direct" ? "Direct Message" : "Group Chat")}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{room.type}</p>
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {!selectedRoomId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-14 border-b px-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {selectedRoom?.name || (selectedRoom?.type === "direct" ? "Direct Message" : "Group Chat")}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedRoom?.type}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPinned(!showPinned)}
                    className={showPinned ? "text-primary" : ""}
                  >
                    <Pin className="w-4 h-4 mr-1" />
                    Pinned {pinnedMessages.length > 0 && `(${pinnedMessages.length})`}
                  </Button>
                </div>
              </div>

              {showPinned && pinnedMessages.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border-b px-4 py-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Pinned Messages</p>
                  {pinnedMessages.map(msg => (
                    <div key={msg.id} className="text-xs text-muted-foreground flex items-start gap-2">
                      <Pin className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
                      <span className="truncate">{msg.content}</span>
                    </div>
                  ))}
                </div>
              )}

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {sortedMessages.map((msg, i) => {
                    const isOwn = msg.senderId === user?.id;
                    const showAvatar = i === 0 || sortedMessages[i - 1].senderId !== msg.senderId;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2 group`}>
                        {!isOwn && showAvatar && (
                          <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                            <AvatarFallback className="text-xs">
                              {msg.senderId?.slice(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwn && !showAvatar && <div className="w-7" />}

                        <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                          {msg.isPriority && (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Priority</span>
                            </div>
                          )}
                          <div className={`relative px-3 py-2 rounded-2xl text-sm ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted rounded-tl-sm"
                          } ${msg.isPinned ? "ring-1 ring-amber-400" : ""}`}>
                            {msg.content}
                            {msg.isPinned && (
                              <Pin className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-500" />
                            )}
                          </div>
                          <div className={`flex items-center gap-1 text-xs text-muted-foreground ${isOwn ? "flex-row-reverse" : ""}`}>
                            <span>{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                            {isOwn && <MessageStatusIcon status={msg.status} />}
                          </div>
                        </div>

                        {isOwn && (
                          <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 justify-center transition-opacity">
                            <button
                              onClick={() => pinMutation.mutate({ messageId: msg.id, isPinned: !msg.isPinned })}
                              className="text-muted-foreground hover:text-foreground"
                              title={msg.isPinned ? "Unpin" : "Pin"}
                            >
                              <Pin className={`w-3.5 h-3.5 ${msg.isPinned ? "text-amber-500" : ""}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {typingDisplay.length > 0 && (
                <div className="px-4 py-1 text-xs text-muted-foreground">
                  {typingDisplay.length === 1
                    ? "Someone is typing..."
                    : `${typingDisplay.length} people are typing...`}
                </div>
              )}

              <div className="border-t p-3 flex gap-2 flex-shrink-0">
                <Input
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
