import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Flag } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, API_BASE_URL } from "@/lib/api";
import { useComments } from "@/hooks/usePosts";
import { toast } from "sonner";
import type { PostWithAuthor } from "@/hooks/usePosts";

interface PostCardProps {
  post: PostWithAuthor;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

const PostCard = ({ post, onLike, onDelete }: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { comments, addComment } = useComments(post.id);

  const isOwner = user?.id === post.user_id;

  const getImageUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync(newComment.trim());
    setNewComment("");
  };

  const handleReport = async () => {
    try {
      await api.post("/api/reports", {
        reported_entity_type: "post",
        reported_entity_id: Number(post.id),
        reason: "Inappropriate content",
      });
      toast.success("Post reported");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to report";
      toast.error(message);
    }
    setShowMenu(false);
  };

  return (
    <article className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(`/user/${post.user_id}`)}
          className="w-10 h-10 rounded-full knp-gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0 overflow-hidden"
        >
          {post.author.avatar_url ? (
            <img src={getImageUrl(post.author.avatar_url)} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            post.author.full_name?.charAt(0) || "U"
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate(`/user/${post.user_id}`)} className="text-sm font-semibold text-foreground truncate hover:underline">
              {post.author.full_name}
            </button>
            {post.author.is_verified && (
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-primary/15 text-primary">Verified</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">@{post.author.username} · {formatTime(post.created_at)}</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-card border border-border rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
              {(isOwner || isAdmin) && (
                <button onClick={() => { onDelete?.(post.id); setShowMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary w-full">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
              {!isOwner && (
                <button onClick={handleReport} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary w-full">
                  <Flag className="w-4 h-4" /> Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Media */}
      {post.video_url && (
        <div className="w-full max-h-80 overflow-hidden">
          <video src={getImageUrl(post.video_url) || undefined} className="w-full h-full object-cover" controls playsInline />
        </div>
      )}
      {post.image_url && !post.video_url && (
        <div className="w-full max-h-80 overflow-hidden">
          <img src={getImageUrl(post.image_url) || undefined} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <span>{post.likes_count} likes</span>
        <span>{post.comments_count} comments</span>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-border">
        <button
          onClick={() => onLike(post.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            post.user_has_liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className={`w-4 h-4 ${post.user_has_liked ? "fill-current" : ""}`} />
          Like
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="w-4 h-4" />
          Comment
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ text: post.content, url: window.location.origin });
            } else {
              navigator.clipboard.writeText(`${post.content}\n${window.location.origin}`);
              toast.success("Link copied!");
            }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border px-4 py-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                {c.author?.full_name?.charAt(0) || "U"}
              </div>
              <div className="bg-secondary rounded-xl px-3 py-1.5 flex-1">
                <p className="text-[11px] font-semibold text-foreground">{c.author?.full_name || "Unknown"}</p>
                <p className="text-xs text-foreground/80">{c.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="Write a comment..."
              className="flex-1 h-8 px-3 rounded-full bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button onClick={handleComment} disabled={!newComment.trim()} className="px-3 h-8 rounded-full knp-gradient-bg text-primary-foreground text-xs font-semibold disabled:opacity-50">
              Post
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;
