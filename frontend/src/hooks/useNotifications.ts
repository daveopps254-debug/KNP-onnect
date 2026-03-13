import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { NotificationResponse } from "@/lib/types";

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const data = await api.get<NotificationResponse[]>("/api/notifications");
      return data.map((n) => ({
        ...n,
        sender: n.sender
          ? {
              ...n.sender,
              avatar_url: n.sender.profile_picture || null,
            }
          : null,
      }));
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const unreadCount = (query.data || []).filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (notifId?: number | string) => {
      if (notifId) {
        return api.put(`/api/notifications/${notifId}/read`);
      } else {
        return api.put("/api/notifications/read-all");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { notifications: query.data || [], unreadCount, isLoading: query.isLoading, markAsRead };
};
