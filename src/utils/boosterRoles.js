import { logger } from './logger.js';

function getBoosterRolesKey(guildId) {
  return `guild:${guildId}:boosterRoles`;
}

function normalizeData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }

  return data;
}

export async function getAllBoosterRoles(client, guildId) {
  try {
    if (!client?.db || typeof client.db.get !== 'function') {
      logger.error('Database client is not available for getAllBoosterRoles.');
      return {};
    }

    const key = getBoosterRolesKey(guildId);
    const data = await client.db.get(key, {});

    return normalizeData(data);
  } catch (error) {
    logger.error(
      `Error getting booster roles for guild ${guildId}:`,
      error
    );

    return {};
  }
}

export async function getBoosterRole(client, guildId, userId) {
  const roles = await getAllBoosterRoles(client, guildId);
  return roles[userId] || null;
}

export async function saveBoosterRole(
  client,
  guildId,
  userId,
  roleId,
  roleName
) {
  try {
    if (!client?.db || typeof client.db.set !== 'function') {
      logger.error('Database client is not available for saveBoosterRole.');
      return false;
    }

    const key = getBoosterRolesKey(guildId);
    const roles = await getAllBoosterRoles(client, guildId);

    roles[userId] = {
      roleId,
      roleName,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await client.db.set(key, roles);

    return true;
  } catch (error) {
    logger.error(
      `Error saving booster role for user ${userId} in guild ${guildId}:`,
      error
    );

    return false;
  }
}

export async function updateBoosterRole(
  client,
  guildId,
  userId,
  updates = {}
) {
  try {
    if (!client?.db || typeof client.db.set !== 'function') {
      logger.error('Database client is not available for updateBoosterRole.');
      return false;
    }

    const key = getBoosterRolesKey(guildId);
    const roles = await getAllBoosterRoles(client, guildId);

    if (!roles[userId]) {
      return false;
    }

    roles[userId] = {
      ...roles[userId],
      ...updates,
      updatedAt: Date.now(),
    };

    await client.db.set(key, roles);

    return true;
  } catch (error) {
    logger.error(
      `Error updating booster role for user ${userId} in guild ${guildId}:`,
      error
    );

    return false;
  }
}

export async function removeBoosterRoleRecord(
  client,
  guildId,
  userId
) {
  try {
    if (!client?.db || typeof client.db.set !== 'function') {
      logger.error(
        'Database client is not available for removeBoosterRoleRecord.'
      );

      return false;
    }

    const key = getBoosterRolesKey(guildId);
    const roles = await getAllBoosterRoles(client, guildId);

    if (!roles[userId]) {
      return false;
    }

    delete roles[userId];

    await client.db.set(key, roles);

    return true;
  } catch (error) {
    logger.error(
      `Error removing booster role record for user ${userId} in guild ${guildId}:`,
      error
    );

    return false;
  }
}

export async function cleanupMissingBoosterRoles(
  client,
  guildId,
  guild
) {
  try {
    const roles = await getAllBoosterRoles(client, guildId);
    let changed = false;

    for (const [userId, data] of Object.entries(roles)) {
      if (!data?.roleId) {
        delete roles[userId];
        changed = true;
        continue;
      }

      const role = guild.roles.cache.get(data.roleId);

      if (!role) {
        delete roles[userId];
        changed = true;
      }
    }

    if (changed && client?.db?.set) {
      const key = getBoosterRolesKey(guildId);
      await client.db.set(key, roles);
    }

    return roles;
  } catch (error) {
    logger.error(
      `Error cleaning missing booster roles for guild ${guildId}:`,
      error
    );

    return {};
  }
}
