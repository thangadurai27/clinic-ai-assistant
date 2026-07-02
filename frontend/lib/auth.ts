/**
 * Authentication utilities and API calls
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export interface User {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: "admin" | "doctor" | "receptionist" | "patient";
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

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

class AuthAPI {
  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }): Promise<AuthResponse> {
    console.log("[AuthAPI] Register called with payload:", data);
    console.log("[AuthAPI] API_BASE:", API_BASE);
    const url = `${API_BASE}/auth/register`;
    console.log("[AuthAPI] Making request to:", url);
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      console.log("[AuthAPI] Register response status:", res.status);
      
      if (!res.ok) {
        let errorDetail = "Registration failed. Please try again.";
        try {
          const error = await res.json();
          console.error("[AuthAPI] Register error JSON:", error);
          // Try to extract error details from different possible structures
          if (error.detail) {
            errorDetail = typeof error.detail === "string" ? error.detail : JSON.stringify(error.detail);
          } else if (error.message) {
            errorDetail = error.message;
          } else if (error.error) {
            errorDetail = error.error;
          } else {
            errorDetail = JSON.stringify(error);
          }
        } catch (parseErr) {
          console.error("[AuthAPI] Failed to parse error response:", parseErr);
          const textError = await res.text().catch(() => "");
          console.error("[AuthAPI] Error response text:", textError);
          if (textError) {
            errorDetail = textError;
          }
        }
        console.error("[AuthAPI] Final error detail:", errorDetail);
        throw new Error(errorDetail);
      }

      const result = await res.json();
      console.log("[AuthAPI] Register success:", result);
      return result;
    } catch (err) {
      console.error("[AuthAPI] Register request failed:", err);
      throw err;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Invalid credentials" }));
      throw new Error(error.detail);
    }

    return res.json();
  }

  async logout(token: string): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: this.getHeaders(token),
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      throw new Error("Token refresh failed");
    }

    return res.json();
  }

  async getCurrentUser(token: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) {
      throw new Error("Failed to get current user");
    }

    return res.json();
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email }),
    });

    return res.json();
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Reset failed" }));
      throw new Error(error.detail);
    }

    return res.json();
  }

  async changePassword(
    token: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Change password failed" }));
      throw new Error(error.detail);
    }

    return res.json();
  }
}

export const authAPI = new AuthAPI();

// Token management
const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

export const tokenManager = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  setUser(user: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    syncUserCookie(user);
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    syncUserCookie(null);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

// Role-based access control helpers
export const hasRole = (user: User | null, ...roles: string[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role);
};

export const isAdmin = (user: User | null): boolean => hasRole(user, "admin");
export const isDoctor = (user: User | null): boolean => hasRole(user, "doctor", "admin");
export const isReceptionist = (user: User | null): boolean => hasRole(user, "receptionist", "admin");
export const isPatient = (user: User | null): boolean => hasRole(user, "patient");
export const isStaff = (user: User | null): boolean => hasRole(user, "admin", "doctor", "receptionist");

// Dashboard routes by role
export const getDashboardRoute = (role: string): string => {
  switch (role) {
    case "receptionist": return "/dashboard";
    case "patient": return "/patient/dashboard";
    default: return "/dashboard";
  }
};
