import type { TodayBoard } from "./types";

const KEY = "keystone-board";
let mem: TodayBoard | null = null;

export function rememberBoard(board: TodayBoard) {
  mem = board;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), board }));
  } catch {
    /* quota */
  }
}

export function peekBoard(): TodayBoard | null {
  if (mem && Date.now() - Date.parse(mem.generatedAt) <= 90_000) return mem;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; board?: TodayBoard };
    if (!parsed.board || typeof parsed.at !== "number") return null;
    if (Date.now() - Date.parse(parsed.board.generatedAt) > 90_000) return null;
    mem = parsed.board;
    return mem;
  } catch {
    return null;
  }
}
