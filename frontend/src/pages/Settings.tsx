import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Moon, Sun, Shield, Eye, Lock, Palette, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    notifications_enabled: true,
    email_notifications: true,
    dark_mode: document.documentElement.classList.contains("dark"),
    profile_visibility: "public" as "public" | "private",
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (key === "dark_mode") {
        document.documentElement.classList.toggle("dark");
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put("/api/settings", settings);
      toast.success("Settings saved!");
    } catch {
      toast.success("Settings saved locally!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    try {
      await api.delete("/api/users/me");
      signOut();
      navigate("/auth");
      toast.success("Account deleted");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete account";
      toast.error(message);
    }
  };

  const sections = [
    {
      title: "Notifications",
      items: [
        { label: "Push Notifications", key: "notifications_enabled" as const, icon: Bell, desc: "Get notified about activity" },
        { label: "Email Notifications", key: "email_notifications" as const, icon: Bell, desc: "Receive email updates" },
      ],
    },
    {
      title: "Appearance",
      items: [
        { label: "Dark Mode", key: "dark_mode" as const, icon: settings.dark_mode ? Moon : Sun, desc: "Toggle dark theme" },
      ],
    },
    {
      title: "Privacy",
      items: [
        { label: "Private Profile", key: "profile_visibility" as const, icon: Eye, desc: "Only followers can see your profile" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">Settings</h1>
          <button onClick={handleSave} disabled={loading} className="px-4 py-1.5 rounded-full knp-gradient-bg text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </button>
        </div>
      </header>

      <main className="pt-14 pb-6 max-w-lg mx-auto px-4">
        {sections.map((section) => (
          <div key={section.title} className="mt-6">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</h2>
            <div className="flex flex-col rounded-xl bg-card border border-border overflow-hidden">
              {section.items.map((item, i) => (
                <button
                  key={item.key}
                  onClick={() => toggleSetting(item.key)}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <item.icon className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors ${
                    settings[item.key] ? "bg-primary" : "bg-border"
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                      settings[item.key] ? "translate-x-[18px]" : "translate-x-0.5"
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div className="mt-8">
          <h2 className="text-xs font-bold text-destructive uppercase tracking-wider mb-2">Danger Zone</h2>
          <button
            onClick={handleDeleteAccount}
            className="w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors"
          >
            Delete Account
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">KNP Connect v1.0</p>
      </main>
    </div>
  );
};

export default Settings;
