"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authAPI, tokenManager, User, getDashboardRoute } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Sync user role to a cookie so Next.js middleware can read it (middleware runs server-side)
function syncUserCookie(user: User | null) {
  if (typeof document === "undefined") return;
  if (user) {
    // Encode minimal info needed by middleware — role only (no sensitive data)
    const payload = encodeURIComponent(JSON.stringify({ role: user.role, id: user.id }));
    // Set cookie to expire in 30 days
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `clinic_user=${payload}; path=/; SameSite=Lax; expires=${expires}`;
  } else {
    document.cookie = "clinic_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try stored user first for instant render
        const storedUser = tokenManager.getUser();
        if (storedUser) {
          setUser(storedUser);
          syncUserCookie(storedUser);
        }

        const token = tokenManager.getToken();
        if (token) {
          try {
            const { user: userData } = await authAPI.getCurrentUser(token);
            setUser(userData);
            tokenManager.setUser(userData);
            syncUserCookie(userData);
          } catch (err) {
            console.warn("Failed to get current user from API, using stored user if available:", err);
            // Don't clear everything—try to use stored user!
          }
        } else {
          syncUserCookie(null);
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        // Don't clear everything unless we have to!
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      void rememberMe;
      const response = await authAPI.login(email, password);

      if (response.success && response.user && response.access_token) {
        setUser(response.user);
        tokenManager.setToken(response.access_token);

        if (response.refresh_token) {
          tokenManager.setRefreshToken(response.refresh_token);
        }

        tokenManager.setUser(response.user);
        syncUserCookie(response.user);

        const dashboardRoute = getDashboardRoute(response.user.role);
        router.push(dashboardRoute);
      } else {
        throw new Error(response.message || "Login failed");
      }
    },
    [router]
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
    }) => {
      const response = await authAPI.register(data);

      if (response.success && response.user) {
        if (response.access_token) {
          // Auto-login with the session returned from registration
          setUser(response.user);
          tokenManager.setToken(response.access_token);
          if (response.refresh_token) {
            tokenManager.setRefreshToken(response.refresh_token);
          }
          tokenManager.setUser(response.user);
          syncUserCookie(response.user);
          router.push(getDashboardRoute(response.user.role));
        } else {
          // Fallback to manual login if no session was returned
          await login(data.email, data.password);
        }
      } else {
        throw new Error(response.message || "Registration failed");
      }
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      const token = tokenManager.getToken();
      if (token) {
        await authAPI.logout(token);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      tokenManager.clear();
      syncUserCookie(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
