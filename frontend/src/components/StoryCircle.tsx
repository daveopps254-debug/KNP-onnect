import { useAuth } from "@/contexts/AuthContext";

interface StoryCircleProps {
  name: string;
  isOwn?: boolean;
  hasStatus?: boolean;
  avatarUrl?: string | null;
  onClick?: () => void;
}

const StoryCircle = ({ name, isOwn = false, hasStatus = true, avatarUrl, onClick }: StoryCircleProps) => {
  const { profile } = useAuth();

  const displayAvatar = isOwn ? profile?.avatar_url : avatarUrl;
  const displayInitial = isOwn ? (profile?.full_name?.charAt(0) || "U") : (name?.charAt(0) || "U");

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 min-w-[60px]">
      <div
        className={`w-14 h-14 rounded-full p-[2px] ${
          isOwn
            ? "border-2 border-dashed border-muted-foreground"
            : hasStatus
              ? "knp-gradient-bg"
              : "border-2 border-border"
        }`}
      >
        <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden relative">
          {displayAvatar ? (
            <img src={displayAvatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-foreground">{displayInitial}</span>
          )}
          {isOwn && (
            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold border border-background">
              +
            </div>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[56px]">
        {isOwn ? "My Status" : name}
      </span>
    </button>
  );
};

export default StoryCircle;
