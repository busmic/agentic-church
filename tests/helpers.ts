import { MemoryStore } from "../lib/store/memory";
import type { Store } from "../lib/store/types";

/** Fresh in-memory store per test (the module keeps one global; we reset it). */
export function freshStore(): Store {
  const g = globalThis as unknown as { __ac_mem?: unknown; __ac_store?: unknown; __ac_rl?: Map<string, number[]> };
  g.__ac_mem = undefined;
  g.__ac_store = undefined;
  g.__ac_rl?.clear();
  const store = new MemoryStore();
  g.__ac_store = store;
  return store;
}

export const ctx = { ip: "test-" + Math.random().toString(36).slice(2) };
