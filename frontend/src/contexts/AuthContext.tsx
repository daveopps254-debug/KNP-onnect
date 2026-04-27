import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import type { UserResponse } from "@/lib/types";

interface AuthContextType {
  user: UserResponse | null;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  login: (accessToken: string, refreshToken: string, user: UserResponse) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isModerator: false,
  loading: true,
  signOut: () => {},
  refreshProfile: async () => {},
  login: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  const updateRoles = (u: UserResponse | null) => {
    if (u) {
      setIsAdmin(u.role === "admin" || u.role === "head_admin");
      setIsModerator(u.role === "admin" || u.role === "head_admin");
    } else {
      setIsAdmin(false);
      setIsModerator(false);
    }
  };

  const login = (accessToken: string, refreshToken: string, userData: UserResponse) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    setUser(userData);
    updateRoles(userData);
  };

  const signOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setIsAdmin(false);
    setIsModerator(false);
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const userData = await api.get<UserResponse>("/api/auth/me");
      setUser(userData);
      updateRoles(userData);
    } catch {
      signOut();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.get<UserResponse>("/api/auth/me")
        .then((userData) => {
          setUser(userData);
          updateRoles(userData);
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, isModerator, loading, signOut, refreshProfile, login }}
    >
      {children}
    </AuthContext.Provider>
  );
};
