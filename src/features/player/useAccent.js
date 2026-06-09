import { usePlayerStore } from './player.store';

export function useAccent() {
  return usePlayerStore((s) => s.lockedAccent) ?? '#1e1e2e';
}
