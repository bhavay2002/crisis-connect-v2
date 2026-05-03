/**
 * ChatPage — composition-only page.
 * All API calls live in features/chat/services/chat.api.ts
 * All WS logic lives in useChatSocket
 * All mutations live in useChatActions
 * All state lives in useChatStore
 * This page only wires them together.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageSquare, Send } from "lucide-react";

// ── Feature imports (all logic lives here, not in this page) ──────────────────
import {
  useChatSocket,
  useChatActions,
  useChatStore,
  MessageBubble,
  PinnedBar,
  QuickActions,
  RoomList,
  fetchMessages,
  fetchPinnedMessages,
  fetchRooms,
} from "@/features/chat";

import type { ChatRoom, ChatMessage } from "@/features/chat";

export default function ChatPage() {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageInput,   setMessageInput]   = useState("");

  // ── Feature store (typing state) ──────────────────────────────────────────
  const typingUserIds = useChatStore(s => s.typingUserIds);

  // ── Queries — data fetching ───────────────────────────────────────────────
  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
    queryFn:  fetchRooms,
    enabled:  !!user,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "messages"],
    queryFn:  () => selectedRoomId ? fetchMessages(selectedRoomId) : Promise.resolve([]),
    enabled:  !!selectedRoomId,
    refetchInterval: false,
  });

  const { data: pinnedMessages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "pinned"],
    queryFn:  () => selectedRoomId ? fetchPinnedMessages(selectedRoomId) : Promise.resolve([]),
    enabled:  !!selectedRoomId,
  });

  // ── Feature hooks (business logic) ────────────────────────────────────────
  const { send, pin, executeAction, handleInputActivity, stopTyping, isSending, isExecuting } =
    useChatActions(selectedRoomId);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useChatSocket({
    selectedRoomId,
    currentUserId: user?.id,
    onNewMessage:  () => { refetchMessages(); scrollToBottom(); },
  });

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = () => {
    if (!messageInput.trim() || !selectedRoomId) return;
    send(messageInput.trim());
    setMessageInput("");
    stopTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    handleInputActivity();
  };

  const selectedRoom   = rooms.find(r => r.id === selectedRoomId);
  const sortedMessages = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const criticalCount  = sortedMessages.filter(m => m.isPriority && m.priority === "critical").length;

  return (
    <div className="flex h-full bg-slate-900">
      {/* ── Room list — feature component ── */}
      <RoomList
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelect={setSelectedRoomId}
        onCreateRoom={() => {
          const name = prompt("Channel name:");
          if (name) {
            import("@/features/chat").then(m =>
              m.createRoom(name).then(() =>
                window.location.reload()
              )
            );
          }
        }}
      />

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

            {/* Pinned bar — feature component */}
            <PinnedBar messages={pinnedMessages} />

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {sortedMessages.map((msg, i) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isOwn={msg.senderId === user?.id}
                      showAvatar={i === 0 || sortedMessages[i-1].senderId !== msg.senderId}
                      onPin={(messageId, isPinned) => pin(messageId, isPinned)}
                    />
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Typing indicator */}
            {typingUserIds.length > 0 && (
              <div className="px-4 py-1 text-xs text-muted-foreground flex-shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {[0,1,2].map(i => (
                      <motion.span key={i} className="w-1 h-1 rounded-full bg-muted-foreground"
                        animate={{ y: [0,-3,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i*0.15 }} />
                    ))}
                  </span>
                  {typingUserIds.length === 1 ? "Someone is typing…" : `${typingUserIds.length} people are typing…`}
                </span>
              </div>
            )}

            {/* Quick actions toolbar — feature component */}
            <QuickActions onAction={executeAction} disabled={isExecuting} />

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
                disabled={!messageInput.trim() || isSending}
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
