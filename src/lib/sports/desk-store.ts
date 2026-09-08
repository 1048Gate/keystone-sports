import { create } from "zustand";

export type DeskPick = {
  id: string;
  date: string;
  title: string;
  pick: string;
  notes: string;
};

export type DeskEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  sport: string;
  notes: string;
};

type DeskState = {
  hydrated: boolean;
  notes: Record<string, string>;
  featured: string;
  picks: DeskPick[];
  events: DeskEvent[];
  hydrate: () => void;
  setNote: (date: string, body: string) => void;
  setFeatured: (body: string) => void;
  addPick: (pick: Omit<DeskPick, "id">) => void;
  removePick: (id: string) => void;
  addEvent: (event: Omit<DeskEvent, "id">) => void;
  removeEvent: (id: string) => void;
  importJson: (raw: string) => void;
};

const KEY = "keystone-desk";
const uid = () => Math.random().toString(36).slice(2, 10);

type Saved = Pick<DeskState, "notes" | "featured" | "picks" | "events">;

function readSaved(): Saved | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Saved>;
    return {
      notes: data.notes ?? {},
      featured: typeof data.featured === "string" ? data.featured : "",
      picks: Array.isArray(data.picks) ? data.picks : [],
      events: Array.isArray(data.events) ? data.events : [],
    };
  } catch {
    return null;
  }
}

function writeSaved(state: Saved) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    KEY,
    JSON.stringify({
      notes: state.notes,
      featured: state.featured,
      picks: state.picks,
      events: state.events,
    }),
  );
}

export const useDesk = create<DeskState>((set, get) => ({
  hydrated: false,
  notes: {},
  featured: "",
  picks: [],
  events: [],
  hydrate: () => {
    if (get().hydrated) return;
    const saved = readSaved();
    if (saved) set({ ...saved, hydrated: true });
    else set({ hydrated: true });
  },
  setNote: (date, body) => {
    const notes = { ...get().notes, [date]: body };
    set({ notes });
    writeSaved({ ...get(), notes });
  },
  setFeatured: (body) => {
    set({ featured: body });
    writeSaved({ ...get(), featured: body });
  },
  addPick: (pick) => {
    const picks = [{ id: uid(), ...pick }, ...get().picks].slice(0, 40);
    set({ picks });
    writeSaved({ ...get(), picks });
  },
  removePick: (id) => {
    const picks = get().picks.filter((p) => p.id !== id);
    set({ picks });
    writeSaved({ ...get(), picks });
  },
  addEvent: (event) => {
    const events = [...get().events, { id: uid(), ...event }].sort((a, b) => a.date.localeCompare(b.date));
    set({ events });
    writeSaved({ ...get(), events });
  },
  removeEvent: (id) => {
    const events = get().events.filter((e) => e.id !== id);
    set({ events });
    writeSaved({ ...get(), events });
  },
  importJson: (raw) => {
    const data = JSON.parse(raw) as Partial<Saved>;
    const next: Saved = {
      notes: data.notes ?? get().notes,
      featured: typeof data.featured === "string" ? data.featured : get().featured,
      picks: Array.isArray(data.picks) ? data.picks : get().picks,
      events: Array.isArray(data.events) ? data.events : get().events,
    };
    set({ ...next, hydrated: true });
    writeSaved(next);
  },
}));

export function exportDesk(state: Saved): string {
  return JSON.stringify(
    { notes: state.notes, featured: state.featured, picks: state.picks, events: state.events },
    null,
    2,
  );
}
