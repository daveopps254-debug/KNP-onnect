import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { UserResponse, UserProfileResponse } from "@/lib/types";

export const useFollow = (targetUserId?: number | string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isFollowingQuery = useQuery({
    queryKey: ["follow", user?.id, targetUserId],
    queryFn: async () => {
      if (!targetUserId) return false;
      const profile = await api.get<UserProfileResponse>(`/api/users/${targetUserId}`);
      return profile.is_following;
    },
    enabled: !!user && !!targetUserId && String(user.id) !== String(targetUserId),
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!targetUserId) return;
      return api.post(`/api/users/${targetUserId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["suggested-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { isFollowing: isFollowingQuery.data ?? false, toggleFollow, isLoading: isFollowingQuery.isLoading };
};

export const useFollowCounts = (userId?: number | string) => {
  const query = useQuery({
    queryKey: ["followers", userId],
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0 };
      const profile = await api.get<UserResponse>(`/api/users/${userId}`);
      return { followers: profile.followers_count, following: profile.following_count };
    },
    enabled: !!userId,
  });

  return {
    followers: query.data?.followers ?? 0,
    following: query.data?.following ?? 0,
  };
};

export const useSuggestedUsers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["suggested-users", user?.id],
    queryFn: async () => {
      const users = await api.get<UserResponse[]>("/api/users", { limit: 10 });
      return users
        .filter((u) => u.id !== user?.id)
        .map((u) => ({
          user_id: u.id,
          username: u.username,
          full_name: u.full_name,
          avatar_url: u.profile_picture || null,
          is_verified: u.is_verified,
        }));
    },
    enabled: !!user,
  });
};
