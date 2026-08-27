import { logger } from './logger.js';

function getBoosterRolesKey(guildId) {
  return `guild:${guildId}:boosterRoles`;
}

function getBoosterHistoryKey(guildId) {
  return `guild:${guildId}:boosterHistory`;
}

function normalizeObject(data) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    return {};
  }

  return data;
}


// ============================================================
// CUSTOM BOOSTER ROLE DATA
// ============================================================

export async function getAllBoosterRoles(client, guildId) {
  try {
    if (
      !client?.db ||
      typeof client.db.get !== 'function'
    ) {
      logger.error(
        'Database client is not available for getAllBoosterRoles.'
      );

      return {};
    }

    const key =
      getBoosterRolesKey(guildId);

    const data =
      await client.db.get(
        key,
        {}
      );

    return normalizeObject(data);

  } catch (error) {

    logger.error(
      `Error getting booster roles for guild ${guildId}:`,
      error
    );

    return {};
  }
}


export async function getBoosterRole(
  client,
  guildId,
  userId
) {

  const roles =
    await getAllBoosterRoles(
      client,
      guildId
    );

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

    if (
      !client?.db ||
      typeof client.db.set !== 'function'
    ) {
      logger.error(
        'Database client is not available for saveBoosterRole.'
      );

      return false;
    }

    const key =
      getBoosterRolesKey(guildId);

    const roles =
      await getAllBoosterRoles(
        client,
        guildId
      );

    roles[userId] = {
      roleId,
      roleName,
      userId,
      createdAt:
        roles[userId]?.createdAt ||
        Date.now(),
      updatedAt:
        Date.now(),
    };

    await client.db.set(
      key,
      roles
    );

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

    if (
      !client?.db ||
      typeof client.db.set !== 'function'
    ) {
      logger.error(
        'Database client is not available for updateBoosterRole.'
      );

      return false;
    }

    const key =
      getBoosterRolesKey(guildId);

    const roles =
      await getAllBoosterRoles(
        client,
        guildId
      );

    if (!roles[userId]) {
      return false;
    }

    roles[userId] = {
      ...roles[userId],
      ...updates,
      updatedAt:
        Date.now(),
    };

    await client.db.set(
      key,
      roles
    );

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

    if (
      !client?.db ||
      typeof client.db.set !== 'function'
    ) {
      logger.error(
        'Database client is not available for removeBoosterRoleRecord.'
      );

      return false;
    }

    const key =
      getBoosterRolesKey(guildId);

    const roles =
      await getAllBoosterRoles(
        client,
        guildId
      );

    if (!roles[userId]) {
      return false;
    }

    delete roles[userId];

    await client.db.set(
      key,
      roles
    );

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

    const roles =
      await getAllBoosterRoles(
        client,
        guildId
      );

    let changed = false;

    for (
      const [userId, data]
      of Object.entries(roles)
    ) {

      if (!data?.roleId) {
        delete roles[userId];
        changed = true;
        continue;
      }

      const role =
        guild.roles.cache.get(
          data.roleId
        );

      if (!role) {
        delete roles[userId];
        changed = true;
      }
    }

    if (
      changed &&
      client?.db?.set
    ) {

      const key =
        getBoosterRolesKey(guildId);

      await client.db.set(
        key,
        roles
      );
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


// ============================================================
// BOOSTER HISTORY
// ============================================================

export async function getBoosterHistory(
  client,
  guildId
) {

  try {

    if (
      !client?.db ||
      typeof client.db.get !== 'function'
    ) {
      logger.error(
        'Database client is not available for getBoosterHistory.'
      );

      return {};
    }

    const key =
      getBoosterHistoryKey(guildId);

    const data =
      await client.db.get(
        key,
        {}
      );

    return normalizeObject(data);

  } catch (error) {

    logger.error(
      `Error getting booster history for guild ${guildId}:`,
      error
    );

    return {};
  }
}


export async function recordBooster(
  client,
  guildId,
  user
) {

  try {

    if (
      !client?.db ||
      typeof client.db.set !== 'function'
    ) {
      logger.error(
        'Database client is not available for recordBooster.'
      );

      return false;
    }

    const key =
      getBoosterHistoryKey(guildId);

    const history =
      await getBoosterHistory(
        client,
        guildId
      );

    const existing =
      history[user.id];

    history[user.id] = {
      userId:
        user.id,

      username:
        user.username ||
        existing?.username ||
        'Unknown User',

      displayName:
        user.globalName ||
        existing?.displayName ||
        user.username ||
        'Unknown User',

      firstBoostAt:
        existing?.firstBoostAt ||
        Date.now(),

      lastBoostAt:
        Date.now(),

      totalBoostSessions:
        existing?.totalBoostSessions ||
        0,

      currentlyBoosting:
        true,

      lastSeenAt:
        Date.now(),
    };

    if (!existing) {
      history[user.id].totalBoostSessions = 1;
    } else if (!existing.currentlyBoosting) {
      history[user.id].totalBoostSessions =
        (existing.totalBoostSessions || 0) + 1;
    }

    await client.db.set(
      key,
      history
    );

    return true;

  } catch (error) {

    logger.error(
      `Error recording booster ${user.id} in guild ${guildId}:`,
      error
    );

    return false;
  }
}


export async function markBoosterStopped(
  client,
  guildId,
  user
) {

  try {

    if (
      !client?.db ||
      typeof client.db.set !== 'function'
    ) {
      logger.error(
        'Database client is not available for markBoosterStopped.'
      );

      return false;
    }

    const key =
      getBoosterHistoryKey(guildId);

    const history =
      await getBoosterHistory(
        client,
        guildId
      );

    const existing =
      history[user.id];

    history[user.id] = {
      userId:
        user.id,

      username:
        user.username ||
        existing?.username ||
        'Unknown User',

      displayName:
        user.globalName ||
        existing?.displayName ||
        user.username ||
        'Unknown User',

      firstBoostAt:
        existing?.firstBoostAt ||
        Date.now(),

      lastBoostAt:
        existing?.lastBoostAt ||
        Date.now(),

      totalBoostSessions:
        existing?.totalBoostSessions ||
        1,

      currentlyBoosting:
        false,

      stoppedBoostingAt:
        Date.now(),

      lastSeenAt:
        Date.now(),
    };

    await client.db.set(
      key,
      history
    );

    return true;

  } catch (error) {

    logger.error(
      `Error marking booster ${user.id} as no longer boosting in guild ${guildId}:`,
      error
    );

    return false;
  }
}
