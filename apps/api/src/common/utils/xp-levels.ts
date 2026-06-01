export const XP_LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000] as const;

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  for (let i = 1; i < XP_LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= XP_LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getXpForNextLevel(totalXp: number): number | null {
  const level = getLevelFromXp(totalXp);
  if (level >= XP_LEVEL_THRESHOLDS.length) return null;
  return XP_LEVEL_THRESHOLDS[level] - totalXp;
}
