import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Search, ArrowLeft, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

interface Group {
  id: number;
  name: string;
  description: string;
  created_by: number;
  member_count: number;
  created_at: string;
}

const Groups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      return api.get<Group[]>("/api/groups");
    },
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      return api.post<Group>("/api/groups/", {
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowCreate(false);
      setNewGroupName("");
      setNewGroupDesc("");
      toast.success("Group created!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const joinGroup = useMutation({
    mutationFn: async (groupId: number) => {
      return api.post(`/api/groups/${groupId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Joined group!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (groups || []).filter(
    (g) =>
      !searchQuery.trim() ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-14 pb-20 max-w-lg mx-auto">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Groups
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="p-2 rounded-xl text-primary hover:bg-secondary transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="px-4 flex flex-col gap-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{searchQuery ? "No groups found" : "No groups yet. Create one!"}</p>
            </div>
          ) : (
            filtered.map((group, i) => (
              <div
                key={group.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border animate-slide-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                <div className="w-12 h-12 rounded-xl knp-gradient-bg flex items-center justify-center text-lg font-bold text-primary-foreground shrink-0">
                  {group.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{group.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{group.description || "No description"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{group.member_count || 0} members</p>
                </div>
                <button
                  onClick={() => joinGroup.mutate(group.id)}
                  className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  Join
                </button>
              </div>
            ))
          )}
        </div>
      </main>
      <BottomNav />

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Create Group</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground text-sm">Cancel</button>
            </div>
            <input
              type="text"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
            />
            <textarea
              placeholder="Description (optional)"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="w-full h-20 px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
            />
            <button
              onClick={() => createGroup.mutate()}
              disabled={!newGroupName.trim() || createGroup.isPending}
              className="w-full h-11 rounded-xl knp-gradient-bg text-primary-foreground font-semibold text-sm disabled:opacity-50"
            >
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
