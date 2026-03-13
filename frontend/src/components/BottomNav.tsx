import { Home, Search, MessageCircle, User, Film } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { path: "/", icon: Home, label: "Feed" },
  { path: "/discover", icon: Search, label: "Discover" },
  { path: "/reels", icon: Film, label: "Reels" },
  { path: "/messages", icon: MessageCircle, label: "Chats" },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative ${isActive ? "scale-110" : ""} transition-transform duration-200`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
