import knpLogo from "@/assets/knp-logo.png";
import { Bell, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

const AppHeader = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2.5">
          <img src={knpLogo} alt="KNP Connect" className="w-8 h-8 rounded-lg" />
          <div>
            <span className="text-base font-bold knp-gradient-text leading-none block">KNP Connect</span>
            <span className="text-[9px] text-muted-foreground font-medium leading-none">Kisii National Polytechnic</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/discover")}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
