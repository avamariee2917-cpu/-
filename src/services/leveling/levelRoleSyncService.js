import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIRECTORY = path.join(__dirname, '../../data');
const LEVELING_FILE = path.join(DATA_DIRECTORY, 'leveling.json');

export const LEVELING_CHANNELS = new Set([
  '1531439019529994283',
  '1531441681893691514',
  '1531444290054656091',
  '1531444326339575909',
  '1532518611812618350',
  '1533765592925081650',
  '1531444192214257744',
  '1531444263953498315',
  '1533649909839040592',
]);

export const LEVEL_ROLES = {
  5: '1532968053120307301',
  10: '1532969032557396018',
  20: '1532969099918053456',
  30: '1532969151419650099',
  40: '1532969195266904115',
  50: '1532969253005951117',
  60: '1532969414205509714',
  70: '1532969466353160232',
  80: '1532969543100793002',
  90: '1532969608452116601',
  100: '1532974501900451890',
};

export const MAX_LEVEL = 100;

export const MIN_XP_PER_MESSAGE = 15;
export const MAX_XP_PER_MESSAGE = 25;

export const XP_COOLDOWN = 60 * 1000;

export const ANNOUNCEMENT_LEVELS = new Set([
  10,
  20,
  30,
  40,
  50,
  60,
  70,
  80,
  90,
  100,
]);

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIRECTORY)) {
    fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  }

  if (!fs.existsSync(LEVELING_FILE)) {
    fs.writeFileSync(
      LEVELING_FILE,
      JSON.stringify({}, null, 2),
      'utf8'
    );
  }
}

export function loadLevelingData() {
  ensureDataFile();

  try {
    const data = fs.readFileSync(
      LEVELING_FILE,
      'utf8'
    );

    if (!data.trim()) {
      return {};
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(
      'Failed to load leveling data:',
      error
    );

    return {};
  }
}

export function saveLevelingData(data) {
  ensureDataFile();

  try {
    fs.writeFileSync(
      LEVELING_FILE,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    return true;
  } catch (error) {
    console.error(
      'Failed to save leveling data:',
      error
    );

    return false;
  }
}

export function getUserData(
  data,
  guildId,
  userId
) {
  if (!data[guildId]) {
    data[guildId] = {};
  }

  if (!data[guildId][userId]) {
    data[guildId][userId] = {
      xp: 0,
      level: 1,
    };
  }

  return data[guildId][userId];
}

export function getXPForLevel(level) {
  if (level <= 1) {
    return 0;
  }

  if (level > MAX_LEVEL) {
    level = MAX_LEVEL;
  }

  let totalXP = 0;

  for (let currentLevel = 2; currentLevel <= level; currentLevel++) {
    totalXP += 100 + ((currentLevel - 2) * 25);
  }

  return totalXP;
}

export function getXPRequiredForNextLevel(level) {
  if (level >= MAX_LEVEL) {
    return 0;
  }

  return 100 + ((level - 1) * 25);
}

export function calculateLevel(xp) {
  let level = 1;

  while (
    level < MAX_LEVEL &&
    xp >= getXPForLevel(level + 1)
  ) {
    level++;
  }

  return level;
}

export function getProgressToNextLevel(xp, level) {
  if (level >= MAX_LEVEL) {
    return {
      current: xp,
      required: 0,
      remaining: 0,
      percentage: 100,
    };
  }

  const currentLevelXP =
    getXPForLevel(level);

  const nextLevelXP =
    getXPForLevel(level + 1);

  const required =
    nextLevelXP - currentLevelXP;

  const current =
    Math.max(0, xp - currentLevelXP);

  const remaining =
    Math.max(0, required - current);

  const percentage =
    required === 0
      ? 100
      : Math.min(
          100,
          Math.floor(
            (current / required) * 100
          )
        );

  return {
    current,
    required,
    remaining,
    percentage,
  };
}

export function getRandomXP() {
  return Math.floor(
    Math.random() *
      (
        MAX_XP_PER_MESSAGE -
        MIN_XP_PER_MESSAGE +
        1
      )
  ) + MIN_XP_PER_MESSAGE;
}

export function getHighestRewardRole(level) {
  const rewardLevels = Object.keys(LEVEL_ROLES)
    .map(Number)
    .filter(rewardLevel => rewardLevel <= level)
    .sort((a, b) => b - a);

  if (rewardLevels.length === 0) {
    return null;
  }

  const highestLevel = rewardLevels[0];

  return {
    level: highestLevel,
    roleId: LEVEL_ROLES[highestLevel],
  };
}

export function getReachedAnnouncementLevels(
  oldLevel,
  newLevel
) {
  return Array.from(ANNOUNCEMENT_LEVELS)
    .filter(level =>
      level > oldLevel &&
      level <= newLevel
    )
    .sort((a, b) => a - b);
}

export async function giveLevelRole(
  member,
  level
) {
  const reward = getHighestRewardRole(level);

  if (!reward) {
    return false;
  }

  const role = member.guild.roles.cache.get(
    reward.roleId
  );

  if (!role) {
    return false;
  }

  const allLevelRoleIds =
    Object.values(LEVEL_ROLES);

  const oldLevelRoles =
    member.roles.cache.filter(
      currentRole =>
        allLevelRoleIds.includes(
          currentRole.id
        ) &&
        currentRole.id !== reward.roleId
    );

  for (const [, oldRole] of oldLevelRoles) {
    try {
      await member.roles.remove(
        oldRole,
        `Reached level ${reward.level}`
      );
    } catch (error) {
      console.error(
        `Failed to remove old level role ${oldRole.id}:`,
        error
      );
    }
  }

  if (!member.roles.cache.has(reward.roleId)) {
    try {
      await member.roles.add(
        role,
        `Reached level ${reward.level}`
      );
    } catch (error) {
      console.error(
        `Failed to add level role ${reward.roleId}:`,
        error
      );

      return false;
    }
  }

  return true;
}

export async function addXP(
  member,
  amount
) {
  const data = loadLevelingData();

  const userData = getUserData(
    data,
    member.guild.id,
    member.id
  );

  const oldLevel = calculateLevel(
    userData.xp
  );

  userData.xp = Math.max(
    0,
    userData.xp + amount
  );

  const newLevel = calculateLevel(
    userData.xp
  );

  userData.level = newLevel;

  saveLevelingData(data);

  if (newLevel > oldLevel) {
    await giveLevelRole(
      member,
      newLevel
    );
  }

  return {
    oldLevel,
    newLevel,
    xp: userData.xp,
    leveledUp: newLevel > oldLevel,
  };
}

export function setUserLevel(
  guildId,
  userId,
  level
) {
  const data = loadLevelingData();

  const safeLevel = Math.max(
    1,
    Math.min(
      MAX_LEVEL,
      Number(level)
    )
  );

  const userData = getUserData(
    data,
    guildId,
    userId
  );

  userData.level = safeLevel;
  userData.xp = getXPForLevel(
    safeLevel
  );

  saveLevelingData(data);

  return userData;
}

export function setUserXP(
  guildId,
  userId,
  xp
) {
  const data = loadLevelingData();

  const safeXP = Math.max(
    0,
    Number(xp)
  );

  const userData = getUserData(
    data,
    guildId,
    userId
  );

  userData.xp = safeXP;
  userData.level = calculateLevel(
    safeXP
  );

  saveLevelingData(data);

  return userData;
}

export function resetUserLevel(
  guildId,
  userId
) {
  const data = loadLevelingData();

  const userData = getUserData(
    data,
    guildId,
    userId
  );

  userData.xp = 0;
  userData.level = 1;

  saveLevelingData(data);

  return userData;
}

export function resetGuildLevels(
  guildId
) {
  const data = loadLevelingData();

  data[guildId] = {};

  saveLevelingData(data);

  return true;
}

export function getLeaderboard(
  guildId,
  limit = 10
) {
  const data = loadLevelingData();

  if (!data[guildId]) {
    return [];
  }

  return Object.entries(
    data[guildId]
  )
    .map(([userId, userData]) => ({
      userId,
      xp: Number(userData.xp) || 0,
      level: calculateLevel(
        Number(userData.xp) || 0
      ),
    }))
    .sort((a, b) => {
      if (b.xp !== a.xp) {
        return b.xp - a.xp;
      }

      return b.level - a.level;
    })
    .slice(0, limit);
}

export function getUserRank(
  guildId,
  userId
) {
  const leaderboard =
    getLeaderboard(
      guildId,
      Number.MAX_SAFE_INTEGER
    );

  const position =
    leaderboard.findIndex(
      user => user.userId === userId
    );

  if (position === -1) {
    return null;
  }

  return position + 1;
}
