import { create } from "zustand";

interface UserState {
  collectionsInfo: any;
  loading: boolean;
  error: string | null;
  fetchCollections: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  collectionsInfo: null,
  loading: false,
  error: null,
  fetchCollections: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/user");
      if (!res.ok) {
        throw new Error("Failed to fetch collections info");
      }
      const data = await res.json();
      set({ collectionsInfo: data, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
}));
