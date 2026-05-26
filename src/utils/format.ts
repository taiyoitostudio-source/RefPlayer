export const formatTime = (sec: number): string => {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec - Math.floor(sec)) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
};

export const formatKeyCombo = (combo: {
  key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean;
}): string => {
  const parts: string[] = [];
  if (combo.ctrl)  parts.push('Ctrl');
  if (combo.alt)   parts.push('Alt');
  if (combo.shift) parts.push('Shift');
  if (combo.meta)  parts.push('Meta');
  let key = combo.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join(' + ');
};
