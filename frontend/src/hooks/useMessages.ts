import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { MessageResponse, ConversationResponse } from "@/lib/types";

export interface ConversationWithDetails {
  id: number;
  is_group: boolean;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
  unread_count: number;
  members: {
    user_id: number;
    username: string;
    full_name: string;
    avatar_url: string | null;
  }[];
}

export const useConversations = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<ConversationWithDetails[]> => {
      const data = await api.get<ConversationResponse[]>("/api/messages/conversations");
      return data.map((conv) => ({
        id: conv.user.id,
        is_group: false,
        name: conv.user.full_name,
        avatar_url: conv.user.profile_picture || null,
        created_at: conv.last_message?.created_at || "",
        updated_at: conv.last_message?.created_at || "",
        last_message: conv.last_message
          ? {
              content: conv.last_message.content,
              created_at: conv.last_message.created_at,
              sender_name: conv.last_message.sender.full_name,
            }
          : undefined,
        unread_count: conv.unread_count,
        members: [
          {
            user_id: conv.user.id,
            username: conv.user.username,
            full_name: conv.user.full_name,
            avatar_url: conv.user.profile_picture || null,
          },
        ],
      }));
    },
    enabled: !!user,
  });

  return { conversations: query.data || [], isLoading: query.isLoading, refetch: query.refetch };
};

export const useChatMessages = (userId: number | string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", userId],
    queryFn: async () => {
      const data = await api.get<MessageResponse[]>(`/api/messages/${userId}`);
      return data.map((m) => ({
        ...m,
        sender: {
          ...m.sender,
          avatar_url: m.sender.profile_picture || null,
        },
      }));
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return api.post<MessageResponse>("/api/messages/", {
        receiver_id: Number(userId),
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return { messages: query.data || [], isLoading: query.isLoading, sendMessage };
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId?: string | number }) => {
      // In the FastAPI backend, conversations are implicit (sender/receiver).
      // We just return the user ID as the "conversation" ID.
      return Number(targetUserId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
};
