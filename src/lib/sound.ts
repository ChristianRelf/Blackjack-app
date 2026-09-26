type SoundKind = 'chip' | 'card' | 'shuffle' | 'win' | 'tap';

let enabled = localStorage.getItem('afterdark-muted') !== 'true';
const picks: Record<SoundKind, string[]> = {
  chip: ['chip-lay-1.ogg', 'chip-lay-2.ogg', 'chips-stack-3.ogg'],
  card: ['card-slide-2.ogg', 'card-slide-4.ogg', 'card-place-2.ogg', 'card-place-3.ogg'],
  shuffle: ['card-shuffle.ogg', 'card-fan-1.ogg'],
  win: ['chips-stack-4.ogg', 'chips-stack-6.ogg'],
  tap: ['chips-handle-1.ogg', 'chips-handle-2.ogg'],
};

export function soundEnabled() {
  return enabled;
}

export function toggleSound() {
  enabled = !enabled;
  localStorage.setItem('afterdark-muted', String(!enabled));
  if (enabled) playSound('tap', 0.28);
  return enabled;
}

export function playSound(kind: SoundKind, volume = 0.42) {
  if (!enabled) return;
  const files = picks[kind];
  const audio = new Audio(`/Assets/Audio/${files[Math.floor(Math.random() * files.length)]}`);
  audio.volume = volume;
  void audio.play().catch(() => undefined);
}
