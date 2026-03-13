import { Search, Edit, Users as UsersIcon } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import CreateGroupModal from "@/components/CreateGroupModal";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConversations } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

const Messages = () => {
  const [activeFilter, setActiveFilter] = useState<"all" | "personal" | "groups">("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { conversations, isLoading } = useConversations();
  const { user } = useAuth();
  const navigate = useNavigate();

  const getChatName = (conv: typeof conversations[0]) => {
    if (conv.is_group) return conv.name || "Group Chat";
    const other = conv.members.find((m) => m.user_id !== user?.id);
    return other?.full_name || "Chat";
  };

  const filtered = conversations
    .filter((c) => {
      if (activeFilter === "personal") return !c.is_group;
      if (activeFilter === "groups") return c.is_group;
      return true;
    })
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const name = getChatName(c).toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const getChatAvatar = (conv: typeof conversations[0]) => {
    if (conv.is_group) return conv.name?.charAt(0) || "G";
    const other = conv.members.find((m) => m.user_id !== user?.id);
    return other?.full_name?.charAt(0) || "C";
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-14 pb-20 max-w-lg mx-auto">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">Chats</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-xl text-primary hover:bg-secondary transition-colors"
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 pb-3">
          {(["all", "personal", "groups"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                activeFilter === filter
                  ? "knp-gradient-bg text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Chat list */}
        <div className="flex flex-col">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              <p className="text-2xl mb-2">💬</p>
              <p>{searchQuery ? "No chats found" : "No conversations yet"}</p>
              {!searchQuery && (
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-3 px-4 py-2 rounded-full knp-gradient-bg text-primary-foreground text-xs font-semibold"
                >
                  Start a Chat
                </button>
              )}
            </div>
          ) : (
            filtered.map((conv, i) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors animate-slide-up"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                    conv.is_group ? "bg-secondary text-foreground" : "knp-gradient-bg text-primary-foreground"
                  }`}>
                    {getChatAvatar(conv)}
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{getChatName(conv)}</p>
                      {conv.is_group && <UsersIcon className="w-3 h-3 text-muted-foreground shrink-0" />}
                    </div>
                    <span className={`text-[11px] shrink-0 ml-2 ${conv.unread_count > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {formatTime(conv.last_message?.created_at)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {conv.last_message?.content || "No messages yet"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </main>
      <BottomNav />
      <CreateGroupModal open={showNewChat} onClose={() => setShowNewChat(false)} />
    </div>
  );
};

export default Messages;
