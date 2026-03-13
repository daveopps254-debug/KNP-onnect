import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PostResponse, CommentResponse } from "@/lib/types";

export interface PostWithAuthor {
  id: number;
  content: string;
  image_url: string | null;
  video_url: string | null;
  post_type: string | null;
  is_pinned: boolean;
  created_at: string;
  user_id: number;
  author: {
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  user_reaction: string | null;
}

function mapPostToAuthor(post: PostResponse): PostWithAuthor {
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

export const usePosts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      const posts = await api.get<PostResponse[]>("/api/posts", { limit: 50 });
      return posts.map(mapPostToAuthor);
    },
    enabled: !!user,
  });

  const createPost = useMutation({
    mutationFn: async ({ content, imageUrl, postType }: { content: string; imageUrl?: string; postType?: string }) => {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("post_type", postType || "regular");
      return api.postForm<PostResponse>("/api/posts/", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post created!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId }: { postId: number | string }) => {
      return api.post(`/api/posts/${postId}/like`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: number | string) => {
      return api.delete(`/api/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted");
    },
  });

  return { posts: postsQuery.data || [], isLoading: postsQuery.isLoading, createPost, toggleLike, deletePost, refetch: postsQuery.refetch };
};

export const useComments = (postId: number | string) => {
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const comments = await api.get<CommentResponse[]>(`/api/posts/${postId}/comments`);
      return comments.map((c) => ({
        ...c,
        author: {
          username: c.author.username,
          full_name: c.author.full_name,
          avatar_url: c.author.profile_picture,
        },
      }));
    },
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      return api.post<CommentResponse>(`/api/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return { comments: commentsQuery.data || [], isLoading: commentsQuery.isLoading, addComment };
};
