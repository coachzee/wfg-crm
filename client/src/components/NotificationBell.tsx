import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

type NotificationType = 
  | "SYNC_COMPLETED"
  | "SYNC_FAILED"
  | "POLICY_ANNIVERSARY"
  | "AGENT_MILESTONE"
  | "CHARGEBACK_ALERT"
  | "NEW_POLICY"
  | "SYSTEM_ALERT"
  | "TASK_DUE"
  | "WELCOME";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string | null;
  linkLabel: string | null;
  priority: Priority;
  isRead: boolean;
  createdAt: Date;
}

const notificationIcons: Record<NotificationType, string> = {
  SYNC_COMPLETED: "✅",
  SYNC_FAILED: "❌",
  POLICY_ANNIVERSARY: "🎂",
  AGENT_MILESTONE: "🏆",
  CHARGEBACK_ALERT: "⚠️",
  NEW_POLICY: "📄",
  SYSTEM_ALERT: "🔔",
  TASK_DUE: "📋",
  WELCOME: "👋",
};

const priorityColors: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();
  
  // Fetch unread count
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30 seconds
  });
  
  // Fetch notifications when popover opens
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery(
    { limit: 20, isDismissed: false },
    { enabled: isOpen }
  );
  
  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  
  const dismissMutation = trpc.notifications.dismiss.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  
  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  const handleDismiss = (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissMutation.mutate({ notificationId });
  };
  
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.linkUrl) {
      setIsOpen(false);
    }
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDismiss={handleDismiss}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Link href="/notifications">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDismiss: (id: number, e: React.MouseEvent) => void;
  onClick: () => void;
}

function NotificationItem({ notification, onMarkAsRead, onDismiss, onClick }: NotificationItemProps) {
  const content = (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
        !notification.isRead && "bg-blue-50/50"
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0 text-xl">
        {notificationIcons[notification.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium leading-tight",
            !notification.isRead && "font-semibold"
          )}>
            {notification.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {notification.priority !== "MEDIUM" && (
              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", priorityColors[notification.priority])}>
                {notification.priority}
              </Badge>
            )}
          </div>
        </div>
        
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
          
          {notification.linkUrl && (
            <span className="text-[10px] text-primary flex items-center gap-0.5">
              {notification.linkLabel || "View"}
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      </div>
      
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="Mark as read"
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => onDismiss(notification.id, e)}
          title="Dismiss"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
  
  if (notification.linkUrl) {
    return (
      <Link href={notification.linkUrl} className="block cursor-pointer">
        {content}
      </Link>
    );
  }
  
  return content;
}

export default NotificationBell;
