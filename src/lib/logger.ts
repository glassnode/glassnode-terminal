import { useState, useEffect } from 'react';

export interface LogEntry {
  time: number;
  level: 'info' | 'error' | 'ws';
  message: string;
}

const MAX_ENTRIES = 200;
const entries: LogEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function log(level: LogEntry['level'], message: string) {
  entries.push({ time: Date.now(), level, message });
  if (entries.length > MAX_ENTRIES) entries.shift();
  notify();
}

export function getEntries(): readonly LogEntry[] {
  return entries;
}

export function useLogs(): readonly LogEntry[] {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const cb = () => forceUpdate((n) => n + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return entries;
}
