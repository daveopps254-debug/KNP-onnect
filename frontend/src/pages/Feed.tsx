import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import StoryCircle from "@/components/StoryCircle";
import CreatePostFAB from "@/components/CreatePostFAB";
import StoryViewer from "@/components/StoryViewer";
import CreateStoryModal from "@/components/CreateStoryModal";
import { usePosts } from "@/hooks/usePosts";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";

const Feed = () => {
  const { posts, isLoading, toggleLike, deletePost } = usePosts();
  const { storyGroups } = useStories();
  const { profile } = useAuth();
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [showCreateStory, setShowCreateStory] = useState(false);

  const handleViewStory = (index: number) => {
    setStoryViewerIndex(index);
    setShowStoryViewer(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-14 pb-20 max-w-lg mx-auto">
        {/* Stories */}
        <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-none border-b border-border/50">
          <StoryCircle name="You" isOwn onClick={() => setShowCreateStory(true)} />
          {storyGroups.map((group, i) => (
            <StoryCircle
              key={i}
              name={group.user.full_name?.split(" ")[0] || "User"}
              hasStatus
              avatarUrl={group.user.avatar_url}
              onClick={() => handleViewStory(i)}
            />
          ))}
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-3 px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              <p className="text-2xl mb-2">📝</p>
              <p>No posts yet. Be the first to post!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={(id) => toggleLike.mutate({ postId: id })}
                onDelete={(id) => deletePost.mutate(id)}
              />
            ))
          )}
        </div>
      </main>

      <CreatePostFAB />
      <BottomNav />

      {/* Story Viewer */}
      {showStoryViewer && storyGroups.length > 0 && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={storyViewerIndex}
          onClose={() => setShowStoryViewer(false)}
        />
      )}

      {/* Create Story */}
      <CreateStoryModal open={showCreateStory} onClose={() => setShowCreateStory(false)} />
    </div>
  );
};

export default Feed;
