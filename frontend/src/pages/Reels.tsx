import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Music, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useReels } from "@/hooks/useReels";

const Reels = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reels, isLoading, toggleLike } = useReels();
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / height);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, reels.length]);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === currentIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex]);

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/30 text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-white">Reels</h1>
          <button
            onClick={() => navigate("/create-post?type=reel")}
            className="p-2 rounded-full bg-black/30 text-white"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {reels.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-white/70 gap-3">
          <p className="text-4xl">🎬</p>
          <p className="text-sm">No reels yet. Be the first to share!</p>
          <button
            onClick={() => navigate("/create-post?type=reel")}
            className="mt-2 px-4 py-2 rounded-full knp-gradient-bg text-primary-foreground text-sm font-semibold"
          >
            Create Reel
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        >
          {reels.map((reel, index) => (
            <div key={reel.id} className="h-screen w-full snap-start relative">
              {/* Video */}
              {reel.video_url ? (
                <video
                  ref={(el) => { videoRefs.current[index] = el; }}
                  src={reel.video_url}
                  className="w-full h-full object-cover"
                  loop
                  muted={index !== currentIndex}
                  playsInline
                  onClick={(e) => {
                    const video = e.currentTarget;
                    video.paused ? video.play() : video.pause();
                  }}
                />
              ) : reel.image_url ? (
                <img src={reel.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center p-8"
                  style={{ background: "linear-gradient(135deg, hsl(190 85% 30%), hsl(135 70% 30%), hsl(30 90% 35%))" }}
                >
                  <p className="text-white text-xl font-bold text-center leading-relaxed">{reel.content}</p>
                </div>
              )}

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

              {/* Right actions */}
              <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-20">
                <button
                  onClick={() => toggleLike.mutate({ postId: reel.id })}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    reel.user_has_liked ? "bg-red-500/20" : "bg-black/30"
                  }`}>
                    <Heart className={`w-5 h-5 ${reel.user_has_liked ? "text-red-500 fill-current" : "text-white"}`} />
                  </div>
                  <span className="text-white text-[10px] font-semibold">{formatCount(reel.likes_count)}</span>
                </button>

                <button className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-[10px] font-semibold">{formatCount(reel.comments_count)}</span>
                </button>

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ text: reel.content, url: window.location.origin });
                    } else {
                      navigator.clipboard.writeText(`${reel.content}\n${window.location.origin}`);
                    }
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-[10px] font-semibold">Share</span>
                </button>
              </div>

              {/* Bottom info */}
              <div className="absolute left-4 right-16 bottom-24 z-20">
                <button
                  onClick={() => navigate(`/user/${reel.user_id}`)}
                  className="flex items-center gap-2 mb-2"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50 shrink-0">
                    {reel.author.avatar_url ? (
                      <img src={reel.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full knp-gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {reel.author.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                  <span className="text-white text-sm font-semibold">@{reel.author.username}</span>
                </button>
                <p className="text-white/90 text-xs leading-relaxed line-clamp-2">{reel.content}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Music className="w-3 h-3 text-white/60" />
                  <span className="text-white/60 text-[10px]">KNP Connect · Original Audio</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reels;