import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Image, Video, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { PostResponse } from "@/lib/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const CreatePost = () => {
  const [searchParams] = useSearchParams();
  const isReel = searchParams.get("type") === "reel";
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = type === "video" ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File must be under ${type === "video" ? "50MB" : "5MB"}`);
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setMediaType(type);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      toast.error("Add some content to your post");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("content", content.trim() || (isReel ? "Reel" : ""));

      if (isReel) {
        formData.append("post_type", "reel");
      }

      if (mediaFile) {
        formData.append("file", mediaFile);
      }

      await api.postForm<PostResponse>("/api/posts/", formData);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["reels"] });

      toast.success(isReel ? "Reel uploaded!" : "Post created!");
      navigate(isReel ? "/reels" : "/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create post";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">{isReel ? "Create Reel" : "Create Post"}</h1>
          <button
            onClick={handleSubmit}
            disabled={uploading || (!content.trim() && !mediaFile)}
            className="px-4 py-1.5 rounded-full knp-gradient-bg text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
          </button>
        </div>
      </header>

      <main className="pt-14 pb-6 max-w-lg mx-auto px-4">
        <div className="flex gap-3 pt-4">
          <div className="w-10 h-10 rounded-full knp-gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isReel ? "Add a caption for your reel..." : "What's happening at KNP?"}
              className="w-full min-h-[120px] bg-transparent text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none"
              autoFocus
            />

            {mediaPreview && (
              <div className="relative mt-2 rounded-xl overflow-hidden">
                {mediaType === "video" ? (
                  <video src={mediaPreview} className="w-full max-h-64 object-cover rounded-xl" controls />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-cover rounded-xl" />
                )}
                <button
                  onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border mt-4 pt-4 flex gap-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaSelect(e, "image")} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleMediaSelect(e, "video")} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-primary text-sm font-medium">
            <Image className="w-5 h-5" />
            Photo
          </button>
          <button onClick={() => videoRef.current?.click()} className="flex items-center gap-2 text-accent text-sm font-medium">
            <Video className="w-5 h-5" />
            Video
          </button>
        </div>
      </main>
    </div>
  );
};

export default CreatePost;
