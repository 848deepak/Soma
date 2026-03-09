/**
 * src/store/useUserStore.ts
 *
 * Lightweight Zustand store for ephemeral UI state.
 * Real user data (name, dates, settings) always comes from useProfile().
 * This store is kept as a thin convenience layer for components that need
 * fast synchronous access to non-critical UI state.
 */
import { create } from "zustand";

type UserState = {
  /** Transient override for the greeting name (empty = use profile data). */
  displayNameOverride: string;
  setDisplayNameOverride: (name: string) => void;
};

export const useUserStore = create<UserState>((set) => ({
  displayNameOverride: "",
  setDisplayNameOverride: (name) => set({ displayNameOverride: name }),
}));
