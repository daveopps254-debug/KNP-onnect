import { useState, useRef } from "react";
import { X, Image, Type, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";
import { toast } from "sonner";

interface CreateStoryModalProps {
  open: boolean;
  onClose: () => void;
}

const bgColors = [
  "#1a1a2e", "#16213e", "#0f3460", "#533483",
  "#e94560", "#2b9348", "#ff6b35", "#1b4332",
];

const CreateStoryModal = ({ open, onClose }: CreateStoryModalProps) => {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [textContent, setTextContent] = useState("");
  const [bgColor, setBgColor] = useState(bgColors[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { createStory } = useStories();

  if (!open) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setMode("image");
    }
  };

  const handlePost = async () => {
    if (mode === "text" && !textContent.trim()) {
      toast.error("Add some text to your story");
      return;
    }
    if (mode === "image" && !imageFile) {
      toast.error("Select an image");
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const result = await api.postForm<{ url: string }>("/api/stories/upload", formData);
        imageUrl = result.url;
      }

      await createStory.mutateAsync({
        imageUrl,
        textContent: mode === "text" ? textContent.trim() : undefined,
        bgColor: mode === "text" ? bgColor : undefined,
      });

      onClose();
      setTextContent("");
      setImageFile(null);
      setImagePreview(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create story";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 safe-top shrink-0">
        <button onClick={onClose} className="p-2 text-white">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-base font-bold text-white">Create Story</h2>
        <button
          onClick={handlePost}
          disabled={loading}
          className="px-4 py-1.5 rounded-full knp-gradient-bg text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share"}
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 px-4 pb-3">
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            mode === "text" ? "bg-white text-black" : "bg-white/20 text-white"
          }`}
        >
          <Type className="w-3.5 h-3.5" /> Text
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            mode === "image" ? "bg-white text-black" : "bg-white/20 text-white"
          }`}
        >
          <Image className="w-3.5 h-3.5" /> Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      </div>

      {/* Preview */}
      <div className="flex-1 mx-4 mb-4 rounded-2xl overflow-hidden flex items-center justify-center">
        {mode === "image" && imagePreview ? (
          <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: bgColor }}
          >
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Type your story..."
              className="w-full text-center text-2xl font-bold text-white bg-transparent resize-none focus:outline-none placeholder:text-white/40"
              rows={4}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Color picker (text mode only) */}
      {mode === "text" && (
        <div className="flex gap-2 px-4 pb-4 justify-center safe-bottom">
          {bgColors.map((color) => (
            <button
              key={color}
              onClick={() => setBgColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                bgColor === color ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CreateStoryModal;
