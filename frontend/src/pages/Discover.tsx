import { Search, TrendingUp, Users, GraduationCap, Calendar, Briefcase } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useSuggestedUsers } from "@/hooks/useFollow";
import { useFollow } from "@/hooks/useFollow";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserResponse } from "@/lib/types";

const FollowButton = ({ userId }: { userId: number | string }) => {
  const { isFollowing, toggleFollow } = useFollow(userId);
  return (
    <button
      onClick={() => toggleFollow.mutate()}
      className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
        isFollowing
          ? "border border-border text-foreground hover:bg-secondary"
          : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      {isFollowing ? "Following" : "Connect"}
    </button>
  );
};

const Discover = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: suggestedUsers } = useSuggestedUsers();

  const { data: searchResults } = useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const data = await api.get<UserResponse[]>("/api/users", { search: searchQuery, limit: 10 });
      return data.map((u) => ({
        user_id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.profile_picture || null,
        department: u.department_name || null,
        is_verified: u.is_verified,
      }));
    },
    enabled: searchQuery.length > 1,
  });

  const displayUsers = searchQuery.trim() ? searchResults : suggestedUsers;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-14 pb-20 max-w-lg mx-auto">
        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        <section className="px-4">
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            {searchQuery ? "Search Results" : "Students to Connect With"}
          </h2>
          <div className="flex flex-col gap-2">
            {(displayUsers || []).length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                {searchQuery ? "No results found" : "No suggestions right now"}
              </p>
            ) : (
              (displayUsers || []).map((person: any, i: number) => (
                <div
                  key={person.user_id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                >
                  <button
                    onClick={() => navigate(`/user/${person.user_id}`)}
                    className="w-11 h-11 rounded-full knp-gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0 overflow-hidden"
                  >
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      person.full_name?.charAt(0) || "U"
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/user/${person.user_id}`)} className="text-sm font-semibold text-foreground truncate block hover:underline">
                      {person.full_name}
                    </button>
                    <p className="text-xs text-muted-foreground truncate">
                      @{person.username} {person.department && `· ${person.department}`}
                    </p>
                  </div>
                  <FollowButton userId={person.user_id} />
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default Discover;
