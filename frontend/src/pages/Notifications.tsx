import { ArrowLeft, Heart, MessageCircle, UserPlus, Bell, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import BottomNav from "@/components/BottomNav";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  message: MessageCircle,
  admin_announcement: Megaphone,
  system: Bell,
  group_invite: Bell,
  post_tag: Bell,
  department_post: Bell,
};

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, isLoading } = useNotifications();

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">Notifications</h1>
          <button onClick={() => markAsRead.mutate(undefined)} className="text-xs text-primary font-semibold">
            Read All
          </button>
        </div>
      </header>

      <main className="pt-14 pb-20 max-w-lg mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            No notifications yet
          </div>
        ) : (
          notifications.map((notif: any) => {
            const Icon = iconMap[notif.notification_type] || Bell;
            return (
              <button
                key={notif.id}
                onClick={() => {
                  markAsRead.mutate(notif.id);
                  if (notif.link) navigate(notif.link);
                  else if (notif.sender?.id) navigate(`/user/${notif.sender.id}`);
                }}
                className={`flex items-start gap-3 px-4 py-3 w-full hover:bg-secondary/50 transition-colors ${!notif.is_read ? "bg-primary/5" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{notif.sender?.full_name || "Someone"}</span>{" "}
                    {notif.message || notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatTime(notif.created_at)}</p>
                </div>
                {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
              </button>
            );
          })
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Notifications;
