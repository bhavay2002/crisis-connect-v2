import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send, MessageSquare, Pin, AlertTriangle, Plus, Users,
  Check, CheckCheck, MapPin, Shield, CheckCircle2,
  Radio, Info, Zap,
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
  priority?: "normal" | "high" | "critical";
  actions?: { id: string; label: string }[];
  createdAt: string;
}

const QUICK_ACTIONS = [
  { id: "send_location",   label: "Send Location",   icon: MapPin,       color: "text-blue-500",   bg: "hover:bg-blue-500/10"   },
  { id: "request_backup",  label: "Request Backup",  icon: Shield,       color: "text-orange-500", bg: "hover:bg-orange-500/10" },
  { id: "mark_resolved",   label: "Mark Resolved",   icon: CheckCircle2, color: "text-green-500",  bg: "hover:bg-green-500/10"  },
  { id: "broadcast_alert", label: "Broadcast Alert", icon: Radio,        color: "text-red-500",    bg: "hover:bg-red-500/10"    },
];

function MessageStatusIcon({ status }: { status: string }) {
  if (status === "read")      return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
  return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
}

function SystemMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-center my-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/40 rounded-full px-3 py-1">
        <Info className="w-3 h-3 text-cyan-500 flex-shrink-0" />
        <span>{msg.content}</span>
      </div>
    </div>
  );
}

function PriorityMessage({ msg, isOwn, onPin }: { msg: Message; isOwn: boolean; onPin: () => void }) {
  const isCritical = msg.priority === "critical" || (msg.isPriority && msg.content.toLowerCase().includes("critical"));
  return (
    <div className={`my-1 rounded-xl border-l-4 p-3 ${
      isCritical
        ? "border-red-500 bg-red-500/10"
        : "border-orange-500 bg-orange-500/10"
    }`}>
      <div className="flex items-center gap-1.5 text-xs font-bold mb-1 ${isCritical ? 'text-red-500' : 'text-orange-500'}">
        {isCritical ? (
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </motion.div>
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
        )}
        <span className={isCritical ? "text-red-500" : "text-orange-500"}>
          {isCritical ? "CRITICAL" : "PRIORITY"}
        </span>
      </div>
      <p className="text-sm">{msg.content}</p>
      {msg.actions?.length ? (
        <div className="flex gap-1.5 mt-2">
          {msg.actions.map(a => (
            <button key={a.id} className="text-xs font-semibold px-2 py-1 rounded-lg bg-background border hover:bg-muted transition-colors">
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageInput,   setMessageInput]   = useState("");
  const [typingDisplay,  setTypingDisplay]  = useState<string[]>([]);
  const [typingUsers,    setTypingUsers]    = useState<Record<string, NodeJS.Timeout>>({});
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

  // Pinned messages — always fetched when room selected
  const { data: pinnedMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "pinned"],
    queryFn: async () => {
      if (!selectedRoomId) return [];
      const res = await fetch(`/api/chat/rooms/${selectedRoomId}/messages/pinned`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return res.json();
    },
    enabled: !!selectedRoomId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, messageType = "text" }: { content: string; messageType?: string }) =>
      apiRequest(`/api/chat/rooms/${selectedRoomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, messageType }),
      }),
    onSuccess: () => { refetchMessages(); scrollToBottom(); },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const chatActionMutation = useMutation({
    mutationFn: async (actionId: string) =>
      apiRequest(`/api/chat/rooms/${selectedRoomId}/action`, {
        method: "POST",
        body: JSON.stringify({ actionId }),
      }),
    onSuccess: () => { refetchMessages(); scrollToBottom(); },
    onError: (err: any) => {
      toast({ title: `Action logged: ${err?.message || "recorded"}` });
      refetchMessages();
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) =>
      apiRequest("/api/chat/rooms", { method: "POST", body: JSON.stringify({ name, type: "group" }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] }),
  });

  const pinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) =>
      apiRequest(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}/pin`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned }),
      }),
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
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
    sendMessageMutation.mutate({ content: messageInput.trim() });
    setMessageInput("");
    sendTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuickAction = (actionId: string) => {
    if (!selectedRoomId) return;
    chatActionMutation.mutate(actionId);
  };

  useRealtimeMessage((parsed: any) => {
    if (parsed.type !== "chat_message") return;
    if (parsed.event === "RECEIVE_MESSAGE" && parsed.data?.roomId === selectedRoomId) {
      refetchMessages(); scrollToBottom();
      if (parsed.data.senderId !== user?.id) {
        fetch(`/api/chat/rooms/${selectedRoomId}/messages/${parsed.data.id}/deliver`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }).catch(() => {});
      }
    }
    if ((parsed.event === "TYPING_START" || parsed.event === "TYPING_STOP") &&
        parsed.data?.roomId === selectedRoomId && parsed.data?.userId !== user?.id) {
      const uid: string = parsed.data.userId;
      if (parsed.event === "TYPING_START") {
        setTypingDisplay(prev => prev.includes(uid) ? prev : [...prev, uid]);
        setTypingUsers(prev => {
          if (prev[uid]) clearTimeout(prev[uid]);
          const timer = setTimeout(() => setTypingDisplay(d => d.filter(u => u !== uid)), 3000);
          return { ...prev, [uid]: timer };
        });
      } else {
        setTypingDisplay(prev => prev.filter(u => u !== uid));
      }
    }
    if (parsed.event === "READ_RECEIPT" && parsed.data?.roomId === selectedRoomId) refetchMessages();
  });

  const selectedRoom   = rooms.find(r => r.id === selectedRoomId);
  const sortedMessages = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const criticalCount  = sortedMessages.filter(m => m.isPriority && m.priority === "critical").length;

  return (
    <div className="flex h-full bg-slate-900">
      {/* ── Sidebar ── */}
      <div className="w-72 border-r border-border/60 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm">Ops Channels</h2>
            <p className="text-xs text-muted-foreground">{rooms.length} room{rooms.length !== 1 ? "s" : ""}</p>
          </div>
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => { const name = prompt("Channel name:"); if (name) createGroupMutation.mutate(name); }}
            title="New channel"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {rooms.length === 0 && (
            <div className="p-6 text-xs text-muted-foreground text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No channels yet.
            </div>
          )}
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors border-b border-border/30 ${
                selectedRoomId === room.id ? "bg-red-600/10 border-l-2 border-l-red-600" : ""
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                room.type === "group" ? "bg-purple-500/15" : room.type === "report" ? "bg-red-500/15" : "bg-blue-500/15"
              }`}>
                {room.type === "group"
                  ? <Users className="w-4 h-4 text-purple-400" />
                  : room.type === "report"
                  ? <AlertTriangle className="w-4 h-4 text-red-400" />
                  : <MessageSquare className="w-4 h-4 text-blue-400" />}
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

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedRoomId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="font-semibold text-sm">Select a channel</p>
              <p className="text-xs mt-1">Operational communication begins here</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-14 border-b border-border/60 px-4 flex items-center justify-between flex-shrink-0 bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {selectedRoom?.name || (selectedRoom?.type === "direct" ? "Direct Message" : "Group Chat")}
                </span>
                <Badge variant="outline" className="text-xs capitalize h-5">{selectedRoom?.type}</Badge>
                {criticalCount > 0 && (
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {criticalCount} critical
                  </motion.div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>

            {/* Pinned bar — always visible when pinned messages exist */}
            <AnimatePresence>
              {pinnedMessages.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-amber-500/20 bg-amber-500/5 flex-shrink-0 overflow-hidden"
                >
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500 mb-1">
                      📌 Pinned Instructions ({pinnedMessages.length})
                    </p>
                    <div className="space-y-0.5">
                      {pinnedMessages.slice(0, 3).map(msg => (
                        <div key={msg.id} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Pin className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" />
                          <span className="truncate">{msg.content}</span>
                        </div>
                      ))}
                      {pinnedMessages.length > 3 && (
                        <p className="text-[10px] text-amber-500 ml-4.5">+{pinnedMessages.length - 3} more</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {sortedMessages.map((msg, i) => {
                    const isOwn      = msg.senderId === user?.id;
                    const isSystem   = msg.messageType === "system" || msg.messageType === "ai_assistant";
                    const isPriority = msg.isPriority;
                    const showAvatar = !isOwn && (i === 0 || sortedMessages[i - 1].senderId !== msg.senderId);

                    if (isSystem) return (
                      <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <SystemMessage msg={msg} />
                      </motion.div>
                    );

                    if (isPriority) return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <PriorityMessage
                          msg={msg} isOwn={isOwn}
                          onPin={() => pinMutation.mutate({ messageId: msg.id, isPinned: !msg.isPinned })}
                        />
                      </motion.div>
                    );

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2 group`}
                      >
                        {!isOwn && showAvatar && (
                          <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                            <AvatarFallback className="text-xs bg-slate-700">
                              {msg.senderId?.slice(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwn && !showAvatar && <div className="w-7" />}

                        <div className={`max-w-[72%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                          <div className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                            isOwn
                              ? "bg-red-600 text-white rounded-tr-sm"
                              : "bg-slate-800 rounded-tl-sm"
                          } ${msg.isPinned ? "ring-1 ring-amber-400" : ""}`}>
                            {msg.content}
                            {msg.isPinned && (
                              <Pin className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-500" />
                            )}
                            {/* Embedded action buttons */}
                            {msg.actions?.length ? (
                              <div className="flex gap-1.5 mt-2">
                                {msg.actions.map(a => (
                                  <button
                                    key={a.id}
                                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                  >
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className={`flex items-center gap-1 text-[10px] text-muted-foreground ${isOwn ? "flex-row-reverse" : ""}`}>
                            <span>{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                            {isOwn && <MessageStatusIcon status={msg.status} />}
                          </div>
                        </div>

                        {/* Pin on hover */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                          <button
                            onClick={() => pinMutation.mutate({ messageId: msg.id, isPinned: !msg.isPinned })}
                            className="p-1 text-muted-foreground hover:text-foreground rounded"
                            title={msg.isPinned ? "Unpin" : "Pin"}
                          >
                            <Pin className={`w-3.5 h-3.5 ${msg.isPinned ? "text-amber-500" : ""}`} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Typing indicator */}
            {typingDisplay.length > 0 && (
              <div className="px-4 py-1 text-xs text-muted-foreground flex-shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {[0,1,2].map(i => (
                      <motion.span key={i} className="w-1 h-1 rounded-full bg-muted-foreground"
                        animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                    ))}
                  </span>
                  {typingDisplay.length === 1 ? "Someone is typing…" : `${typingDisplay.length} people are typing…`}
                </span>
              </div>
            )}

            {/* Quick Actions toolbar */}
            <div className="border-t border-border/60 px-4 pt-2 pb-1 flex gap-1.5 flex-shrink-0 flex-wrap">
              {QUICK_ACTIONS.map(({ id, label, icon: Icon, color, bg }) => (
                <button
                  key={id}
                  onClick={() => handleQuickAction(id)}
                  disabled={chatActionMutation.isPending}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-border/40 bg-muted/20 ${bg} transition-colors disabled:opacity-50`}
                >
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  {label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-border/60 p-3 flex gap-2 flex-shrink-0">
              <Input
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message the team…"
                className="flex-1 bg-slate-800 border-slate-700"
              />
              <Button
                onClick={handleSend}
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
                size="icon"
                className="bg-red-600 hover:bg-red-700 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
