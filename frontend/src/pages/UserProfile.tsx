import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Calendar, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow, useFollowCounts } from "@/hooks/useFollow";
import { useCreateConversation } from "@/hooks/useMessages";
import BottomNav from "@/components/BottomNav";
import type { UserResponse } from "@/lib/types";

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const createConversation = useCreateConversation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      return api.get<UserResponse>(`/api/users/${id}`);
    },
    enabled: !!id,
  });

  const { isFollowing, toggleFollow } = useFollow(id);
  const { followers, following } = useFollowCounts(id);

  const handleMessage = async () => {
    const convId = await createConversation.mutateAsync({ targetUserId: id! });
    navigate(`/chat/${convId}`);
  };

  const getImageUrl = (url: string | undefined) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  const isOwnProfile = user?.id === Number(id);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center gap-3 h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">@{profile.username}</h1>
        </div>
      </header>

      <main className="pt-14 pb-20 max-w-lg mx-auto">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-primary/30 to-accent/30" />

        {/* Profile info */}
        <div className="px-4 -mt-10 relative">
          <div className="w-20 h-20 rounded-full knp-gradient-bg p-[3px] mb-3">
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden border-2 border-background">
              {profile.profile_picture ? (
                <img src={getImageUrl(profile.profile_picture)} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-foreground">{profile.full_name?.charAt(0) || "U"}</span>
              )}
            </div>
          </div>

          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            {profile.full_name}
            {profile.is_verified && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/15 text-primary">Verified</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-foreground/85 mt-2">{profile.bio}</p>}

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
            {profile.department_name && (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> {profile.department_name}
              </span>
            )}
            {profile.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{profile.posts_count || 0}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{followers}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{following}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>

          {/* Actions */}
          {!isOwnProfile && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => toggleFollow.mutate()}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isFollowing
                    ? "border border-border text-foreground hover:bg-secondary"
                    : "knp-gradient-bg text-primary-foreground hover:opacity-90"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button
                onClick={handleMessage}
                className="px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default UserProfile;
