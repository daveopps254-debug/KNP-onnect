import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Story {
  id: string;
  image_url: string | null;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
}

interface StoryGroup {
  user: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
  stories: Story[];
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

const StoryViewer = ({ groups, initialGroupIndex, onClose }: StoryViewerProps) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [groupIndex, storyIndex]);

  const handleNext = () => {
    if (storyIndex < (currentGroup?.stories.length || 0) - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStoryIndex(0);
    }
  };

  if (!currentStory) return null;

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 px-2 pt-2 safe-top">
        <div className="flex gap-1">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{
                  width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 mt-3 px-2">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            {currentGroup.user.avatar_url ? (
              <img src={currentGroup.user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full knp-gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
                {currentGroup.user.full_name?.charAt(0) || "U"}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">{currentGroup.user.full_name}</p>
            <p className="text-white/60 text-[10px]">{formatTime(currentStory.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Story content */}
      <div className="w-full h-full flex items-center justify-center">
        {currentStory.image_url ? (
          <img src={currentStory.image_url} alt="" className="w-full h-full object-contain" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: currentStory.background_color || "#1a1a2e" }}
          >
            <p className="text-white text-2xl font-bold text-center leading-relaxed">
              {currentStory.text_content}
            </p>
          </div>
        )}
      </div>

      {/* Tap zones */}
      <button
        onClick={handlePrev}
        className="absolute left-0 top-20 bottom-0 w-1/3 z-20"
        aria-label="Previous"
      />
      <button
        onClick={handleNext}
        className="absolute right-0 top-20 bottom-0 w-1/3 z-20"
        aria-label="Next"
      />
    </div>
  );
};

export default StoryViewer;
