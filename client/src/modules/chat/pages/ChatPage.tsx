/**
 * ChatPage — composition-only page with virtualized message list.
 *
 * Performance stack applied:
 *   • useVirtualList → only ~20 DOM nodes rendered regardless of message count
 *   • MessageBubble → React.memo with custom equality (no wasted re-renders)
 *   • useChatSocket → WS logic extracted; handler via ref (no re-subscriptions)
 *   • useChatActions → stable useCallback mutations
 *   • useChatStore → granular Zustand selector (typingUserIds only)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { AlertTriangle, MessageSquare, Send } from "lucide-react";

// ── Feature imports ────────────────────────────────────────────────────────────
import {
  useChatSocket, useChatActions, useChatStore,
  MessageBubble, PinnedBar, QuickActions, RoomList,
  fetchMessages, fetchPinnedMessages, fetchRooms, createRoom,
} from "@/features/chat";
import type { ChatRoom, ChatMessage } from "@/features/chat";

// ── Shared performance hook ────────────────────────────────────────────────────
import { useVirtualList } from "@/shared/hooks";

export default function ChatPage() {
  const { user } = useAuth();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageInput,   setMessageInput]   = useState("");

  // Granular selector — only subscribes to typingUserIds, not full store
  const typingUserIds = useChatStore(s => s.typingUserIds);

  // ── Queries ───────────────────────────────────────────────────────────────
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
    // select: sort once at query layer, not on every render
    select: useCallback(
      (data: ChatMessage[]) =>
        [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      []
    ),
  });

  const { data: pinnedMessages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "pinned"],
    queryFn:  () => selectedRoomId ? fetchPinnedMessages(selectedRoomId) : Promise.resolve([]),
    enabled:  !!selectedRoomId,
  });

  // ── Feature hooks ─────────────────────────────────────────────────────────
  const { send, pin, executeAction, handleInputActivity, stopTyping, isSending, isExecuting } =
    useChatActions(selectedRoomId);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => virtualizer.scrollToIndex(messages.length - 1, { align: "end" }), 50);
  }, [messages.length]); // eslint-disable-line

  useChatSocket({
    selectedRoomId,
    currentUserId: user?.id,
    onNewMessage:  () => { refetchMessages(); scrollToBottom(); },
  });

  // ── Virtualized message list ───────────────────────────────────────────────
  // Estimates 60px per message — virtualizer adjusts dynamically after measuring.
  // With 500 messages this renders ~20 DOM nodes instead of 500.
  const { parentRef, virtualizer } = useVirtualList(messages, 60, { overscan: 8 });

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
    }
  }, [messages.length]); // eslint-disable-line

  const handleSend = useCallback(() => {
    if (!messageInput.trim() || !selectedRoomId) return;
    send(messageInput.trim());
    setMessageInput("");
    stopTyping();
  }, [messageInput, selectedRoomId, send, stopTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    handleInputActivity();
  }, [handleInputActivity]);

  const handlePin = useCallback((messageId: string, isPinned: boolean) => {
    pin(messageId, isPinned);
  }, [pin]);

  const selectedRoom  = rooms.find(r => r.id === selectedRoomId);
  const criticalCount = messages.filter(m => m.isPriority && m.priority === "critical").length;

  return (
    <div className="flex h-full bg-slate-900">
      {/* ── Room list ── */}
      <RoomList
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelect={setSelectedRoomId}
        onCreateRoom={() => {
          const name = prompt("Channel name:");
          if (name) createRoom(name).then(() => window.location.reload());
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
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{messages.length} messages</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </div>
              </div>
            </div>

            {/* Pinned bar */}
            <PinnedBar messages={pinnedMessages} />

            {/* ── Virtualized message list ─────────────────────────────────── */}
            {/* parentRef attaches to the scroll container                      */}
            {/* totalHeight sets the "phantom" scrollable space                 */}
            {/* Only virtualItems are mounted in the DOM                        */}
            <div
              ref={parentRef}
              className="flex-1 overflow-auto"
              style={{ contain: "strict" }}
            >
              <div
                style={{
                  height:   virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const msg         = messages[virtualRow.index];
                  const prevMsg     = messages[virtualRow.index - 1];
                  const isOwn       = msg.senderId === user?.id;
                  const showAvatar  = !prevMsg || prevMsg.senderId !== msg.senderId;

                  return (
                    <div
                      key={msg.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position:  "absolute",
                        top:       0,
                        width:     "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        padding:   "2px 16px",
                      }}
                    >
                      <MessageBubble
                        msg={msg}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        onPin={handlePin}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Typing indicator */}
            <AnimatePresence>
              {typingUserIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-1 text-xs text-muted-foreground flex-shrink-0"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="flex gap-0.5">
                      {[0,1,2].map(i => (
                        <motion.span key={i} className="w-1 h-1 rounded-full bg-muted-foreground block"
                          animate={{ y: [0,-3,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i*0.15 }} />
                      ))}
                    </span>
                    {typingUserIds.length === 1 ? "Someone is typing…" : `${typingUserIds.length} people are typing…`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick actions toolbar */}
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
