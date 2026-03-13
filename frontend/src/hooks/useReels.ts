import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { PostResponse } from "@/lib/types";
import type { PostWithAuthor } from "@/hooks/usePosts";

function mapReelToAuthor(post: PostResponse): PostWithAuthor {
  return {
    id: post.id,
    content: post.content,
    image_url: post.image_url,
    video_url: post.video_url,
    post_type: post.post_type,
    is_pinned: post.is_pinned,
    created_at: post.created_at,
    user_id: post.author?.id ?? 0,
    author: {
      username: post.author?.username ?? "unknown",
      full_name: post.author?.full_name ?? "Unknown",
      avatar_url: post.author?.profile_picture ?? null,
      is_verified: post.author?.is_verified ?? false,
    },
    likes_count: post.likes_count,
    comments_count: post.comments_count,
    user_has_liked: post.is_liked,
    user_reaction: post.user_reaction,
  };
}

export const useReels = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const reelsQuery = useQuery({
    queryKey: ["reels"],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      const posts = await api.get<PostResponse[]>("/api/posts/reels", { limit: 50 });
      return posts.map(mapReelToAuthor);
    },
    enabled: !!user,
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId }: { postId: number | string }) => {
      return api.post(`/api/posts/${postId}/like`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reels"] }),
  });

  return { reels: reelsQuery.data || [], isLoading: reelsQuery.isLoading, toggleLike };
};
