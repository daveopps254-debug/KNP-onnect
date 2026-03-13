import { useState, useEffect } from "react";
import { X, Search, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateConversation } from "@/hooks/useMessages";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { UserResponse } from "@/lib/types";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

interface UserProfile {
  user_id: number;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

const CreateGroupModal = ({ open, onClose }: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const createConversation = useCreateConversation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      try {
        const data = await api.get<UserResponse[]>("/api/users", { limit: 50 });
        setUsers(
          data
            .filter((u) => u.id !== user?.id)
            .map((u) => ({
              user_id: u.id,
              username: u.username,
              full_name: u.full_name,
              avatar_url: u.profile_picture || null,
            }))
        );
      } catch {
        setUsers([]);
      }
    };
    fetchUsers();
  }, [open, user]);

  if (!open) return null;

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: number) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (selected.length < 1) {
      toast.error("Select at least 1 member");
      return;
    }
    setLoading(true);
    try {
      if (selected.length === 1) {
        // Direct message - just navigate to chat
        const convId = await createConversation.mutateAsync({ targetUserId: String(selected[0]) });
        onClose();
        navigate(`/chat/${convId}`);
      } else {
        // Group chat - use groups API
        const group = await api.post<{ id: number }>("/api/groups/", {
          name: groupName.trim() || "Group Chat",
          description: "Group chat",
        });
        // Add members
        for (const uid of selected) {
          try {
            await api.post(`/api/groups/${group.id}/members`, { user_id: uid });
          } catch {
            // ignore if already member
          }
        }
        toast.success("Group created!");
        onClose();
        navigate("/groups");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create chat";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-foreground">New Chat</h2>
          <button
            onClick={handleCreate}
            disabled={loading || selected.length < 1}
            className="px-3 py-1.5 rounded-full knp-gradient-bg text-primary-foreground text-xs font-semibold disabled:opacity-50"
          >
            {loading ? "..." : "Create"}
          </button>
        </div>

        {/* Group name (only for 2+ selected) */}
        {selected.length > 1 && (
          <div className="px-4 py-3 border-b border-border">
            <input
              type="text"
              placeholder="Group name (optional)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border">
            {selected.map((uid) => {
              const u = users.find((p) => p.user_id === uid);
              return (
                <button
                  key={uid}
                  onClick={() => toggleUser(uid)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium"
                >
                  {u?.full_name?.split(" ")[0] || "User"}
                  <X className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-2">
          {filtered.map((u) => {
            const isSelected = selected.includes(u.user_id);
            return (
              <button
                key={u.user_id}
                onClick={() => toggleUser(u.user_id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full knp-gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {u.full_name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-foreground truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "bg-primary border-primary" : "border-border"
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
