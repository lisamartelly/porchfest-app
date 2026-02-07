import { create } from "zustand";
import { api } from "../lib/api";
import type { Profile, UserRole } from "../types";

interface AuthState {
  user: Profile | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        const profile = await api.get("/api/auth/me");
        set({ user: profile, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      localStorage.removeItem("auth_token");
      set({ user: null, loading: false });
    }
  },

  signUp: async (email: string, password: string, role: UserRole) => {
    set({ loading: true, error: null });

    try {
      const { token, user } = await api.post("/api/auth/register", {
        email,
        password,
        role,
      });

      localStorage.setItem("auth_token", token);
      set({ user, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      const { token, user } = await api.post("/api/auth/login", {
        email,
        password,
      });

      localStorage.setItem("auth_token", token);
      set({ user, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  signOut: async () => {
    localStorage.removeItem("auth_token");
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
