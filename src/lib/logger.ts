import { useSyncExternalStore } from 'react';

export interface LogEntry {
  time: number;
  level: 'info' | 'error' | 'ws';
  message: string;
}

const MAX_ENTRIES = 200;
let entries: readonly LogEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function log(level: LogEntry['level'], message: string) {
  const next = [...entries, { time: Date.now(), level, message }];
  if (next.length > MAX_ENTRIES) next.shift();
  entries = next;
  notify();
}

export function getEntries(): readonly LogEntry[] {
  return entries;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): readonly LogEntry[] {
  return entries;
}

export function useLogs(): readonly LogEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
