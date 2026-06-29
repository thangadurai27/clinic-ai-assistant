// Global UI state (sidebar visibility)
import { create } from "zustand";

interface ClinicStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useClinicStore = create<ClinicStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
