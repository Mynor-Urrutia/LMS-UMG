"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XP_LEVEL_THRESHOLDS = void 0;
exports.getLevelFromXp = getLevelFromXp;
exports.getXpForNextLevel = getXpForNextLevel;
exports.XP_LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000];
function getLevelFromXp(totalXp) {
    let level = 1;
    for (let i = 1; i < exports.XP_LEVEL_THRESHOLDS.length; i++) {
        if (totalXp >= exports.XP_LEVEL_THRESHOLDS[i])
            level = i + 1;
        else
            break;
    }
    return level;
}
function getXpForNextLevel(totalXp) {
    const level = getLevelFromXp(totalXp);
    if (level >= exports.XP_LEVEL_THRESHOLDS.length)
        return null;
    return exports.XP_LEVEL_THRESHOLDS[level] - totalXp;
}
//# sourceMappingURL=xp-levels.js.map