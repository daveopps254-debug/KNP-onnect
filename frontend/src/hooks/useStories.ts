import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { StoryGroupResponse } from "@/lib/types";

export const useStories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const data = await api.get<StoryGroupResponse[]>("/api/stories");
      return data.map((group) => ({
        user: {
          ...group.user,
          avatar_url: group.user.profile_picture || null,
        },
        stories: group.stories.map((s) => ({
          ...s,
          author: {
            ...s.author,
            avatar_url: s.author.profile_picture || null,
          },
        })),
      }));
    },
    enabled: !!user,
  });

  const createStory = useMutation({
    mutationFn: async ({ imageUrl, textContent, bgColor }: { imageUrl?: string; textContent?: string; bgColor?: string }) => {
      return api.post("/api/stories/", {
        image_url: imageUrl || null,
        text_content: textContent || null,
        background_color: bgColor || "#1a1a2e",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story posted!");
    },
  });

  return { storyGroups: query.data || [], isLoading: query.isLoading, createStory };
};
