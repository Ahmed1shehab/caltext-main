"use client";

let muted = true;
const listeners = new Set<(next: boolean) => void>();

export function isDemoMuted() {
  return muted;
}

export function toggleDemoMute() {
  muted = !muted;
  for (const listener of listeners) {
    listener(muted);
  }
  return muted;
}

export function onDemoMuteChange(listener: (next: boolean) => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
