import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook for managing notifications with real-time polling
 */
export function useNotifications(options?: {
  pollingInterval?: number;
}) {
  const { pollingInterval = 30000 } = options ?? {};
  const utils = trpc.useUtils();
  
  // Fetch unread count with polling
  const { data: unreadCount = 0, refetch: refetchCount } = trpc.notifications.unreadCount.useQuery(
    undefined,
    {
      refetchInterval: pollingInterval,
      staleTime: pollingInterval / 2,
    }
  );
  
  // Fetch notifications list
  const {
    data: notifications = [],
    isLoading,
    refetch: refetchNotifications,
  } = trpc.notifications.list.useQuery(
    { limit: 50, isDismissed: false },
    {
      refetchInterval: pollingInterval,
      staleTime: pollingInterval / 2,
    }
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
  
  const dismissAllMutation = trpc.notifications.dismissAll.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  
  // Actions
  const markAsRead = useCallback((notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  }, [markAsReadMutation]);
  
  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);
  
  const dismiss = useCallback((notificationId: number) => {
    dismissMutation.mutate({ notificationId });
  }, [dismissMutation]);
  
  const dismissAll = useCallback(() => {
    dismissAllMutation.mutate();
  }, [dismissAllMutation]);
  
  const refresh = useCallback(() => {
    refetchCount();
    refetchNotifications();
  }, [refetchCount, refetchNotifications]);
  
  return {
    // Data
    notifications,
    unreadCount,
    isLoading,
    
    // Actions
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
    refresh,
    
    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDismissing: dismissMutation.isPending,
    isDismissingAll: dismissAllMutation.isPending,
  };
}

export default useNotifications;
