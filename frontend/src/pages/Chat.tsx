import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Image, X, Loader2 } from "lucide-react";
import { useChatMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { UserResponse } from "@/lib/types";

const Chat = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, sendMessage, isLoading } = useChatMessages(id || "");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: otherUser } = useQuery({
    queryKey: ["chat-user", id],
    queryFn: async () => {
      return api.get<UserResponse>(`/api/users/${id}`);
    },
    enabled: !!id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage.trim());
    setNewMessage("");
  };

  const chatName = otherUser?.full_name || "Chat";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="bg-background/90 backdrop-blur-xl border-b border-border safe-top shrink-0">
        <div className="flex items-center gap-3 h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate("/messages")} className="p-2 rounded-xl text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full knp-gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
            {chatName?.charAt(0) || "C"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{chatName}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg: any) => {
            const isOwn = msg.sender?.id === user?.id || msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex mb-3 ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl text-sm overflow-hidden ${
                    isOwn
                      ? "knp-gradient-bg text-primary-foreground rounded-br-md"
                      : "bg-card border border-border text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content && (
                    <p className="leading-relaxed px-3.5 py-2">{msg.content}</p>
                  )}
                  <p className={`text-[10px] px-3.5 pb-1.5 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-background/90 backdrop-blur-xl safe-bottom shrink-0">
        <div className="flex items-center gap-2 px-4 py-3 max-w-lg mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 h-10 px-4 rounded-full bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full knp-gradient-bg flex items-center justify-center disabled:opacity-50 transition-opacity"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
