import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Bell, Check, Settings, Trash2, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  userId: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  actionUrl: string | null;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  metadata: any;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const PRIORITY_CONFIG = {
  critical: { bar: "bg-red-500",    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",    dot: "bg-red-500 animate-pulse" },
  high:     { bar: "bg-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300", dot: "bg-orange-500" },
  medium:   { bar: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300", dot: "bg-yellow-500" },
  low:      { bar: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",   dot: "bg-blue-400" },
};

function NotificationRow({ n, onMarkRead, onDelete, isDeleting, isMarking }: {
  n: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isMarking: boolean;
}) {
  const pc = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.low;
  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all",
        !n.isRead ? "bg-muted/50 border-border" : "bg-background border-border/50"
      )}
      data-testid={`notification-card-${n.id}`}
    >
      {/* Priority stripe */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", pc.bar)} />

      {/* Dot */}
      <div className="pl-3 pt-1 flex-shrink-0">
        <span className={cn("w-2 h-2 rounded-full block", !n.isRead ? pc.dot : "bg-muted-foreground/30")} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm">{n.title}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", pc.badge)}
            data-testid={`badge-priority-${n.id}`}>
            {n.priority}
          </span>
          {!n.isRead && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              data-testid={`badge-unread-${n.id}`}>
              New
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{n.message}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
          {n.readAt && <span>· Read {formatDistanceToNow(new Date(n.readAt), { addSuffix: true })}</span>}
        </div>
        {n.actionUrl && (
          <Link href={n.actionUrl}>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 mt-2 text-muted-foreground hover:text-foreground"
              data-testid={`button-view-${n.id}`}>
              View Details <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!n.isRead && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMarkRead(n.id)}
            disabled={isMarking} title="Mark as read" data-testid={`button-mark-read-${n.id}`}>
            <Check className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
          onClick={() => onDelete(n.id)} disabled={isDeleting} title="Delete"
          data-testid={`button-delete-${n.id}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const { toast } = useToast();

  const { data: allNotifications = [], isLoading: isLoadingAll } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });
  const { data: unreadNotifications = [], isLoading: isLoadingUnread } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/unread"],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
  };

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: invalidate,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("/api/notifications/mark-all-read", { method: "PATCH" }),
    onSuccess: () => { invalidate(); toast({ title: "All caught up!", description: "All notifications marked as read." }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/notifications/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const notifications = activeTab === "all" ? allNotifications : unreadNotifications;
  const isLoading = activeTab === "all" ? isLoadingAll : isLoadingUnread;

  return (
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Notifications</h1>
              <p className="text-sm text-muted-foreground">Stay updated with all alerts and updates</p>
            </div>
          </div>
          <Link href="/notification-preferences">
            <Button variant="outline" size="sm" className="h-8 text-xs" data-testid="button-settings">
              <Settings className="h-3.5 w-3.5 mr-1.5" />Preferences
            </Button>
          </Link>
        </div>

        {/* Tabs + actions */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unread")}>
          <div className="flex items-center justify-between gap-4">
            <TabsList data-testid="tabs-notifications" className="h-8">
              <TabsTrigger value="all" className="text-xs h-7" data-testid="tab-all">
                All ({allNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs h-7" data-testid="tab-unread">
                Unread {unreadNotifications.length > 0 && `(${unreadNotifications.length})`}
              </TabsTrigger>
            </TabsList>

            {unreadNotifications.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs"
                onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read">
                <Check className="h-3.5 w-3.5 mr-1.5" />Mark all read
              </Button>
            )}
          </div>

          {["all", "unread"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed text-center">
                  {tab === "unread"
                    ? <CheckCircle className="w-12 h-12 text-green-500 mb-3 opacity-60" />
                    : <Bell className="w-12 h-12 text-muted-foreground mb-3 opacity-40" />
                  }
                  <p className="font-semibold text-sm">
                    {tab === "unread" ? "All caught up!" : "No notifications yet"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tab === "unread" ? "You have no unread notifications." : "When you receive notifications, they'll appear here."}
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onMarkRead={(id) => markAsReadMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    isDeleting={deleteMutation.isPending}
                    isMarking={markAsReadMutation.isPending}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
  );
}
