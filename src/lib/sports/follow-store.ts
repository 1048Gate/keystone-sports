import { create } from "zustand";
import { TEAM_BY_SLUG } from "@/data/teams";

const KEY = "keystone-follows";

type FollowState = {
  slugs: string[];
  hydrated: boolean;
  hydrate: () => void;
  toggle: (slug: string) => void;
  follows: (slug: string) => boolean;
};

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { slugs?: unknown }).slugs)
        ? (data as { slugs: unknown[] }).slugs
        : [];
    return list.filter((s): s is string => typeof s === "string" && Boolean(TEAM_BY_SLUG[s]));
  } catch {
    return [];
  }
}

function write(slugs: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(slugs));
}

export const useFollows = create<FollowState>((set, get) => ({
  slugs: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ slugs: read(), hydrated: true });
  },
  toggle: (slug) => {
    if (!TEAM_BY_SLUG[slug]) return;
    const has = get().slugs.includes(slug);
    const slugs = has ? get().slugs.filter((s) => s !== slug) : [...get().slugs, slug];
    set({ slugs });
    write(slugs);
  },
  follows: (slug) => get().slugs.includes(slug),
}));
