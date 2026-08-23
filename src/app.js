async giveLevelRole(member, level) {
  try {
    const guild = member.guild;

    const roleLevels = Object.keys(LEVEL_ROLES)
      .map(Number)
      .sort((a, b) => a - b);

    /*
     * Determine every role the user qualifies for.
     *
     * Example:
     * Level 54 receives:
     * 5, 10, 20, 30, 40, 50
     */
    const qualifyingRoleIds = roleLevels
      .filter(roleLevel => roleLevel <= level)
      .map(roleLevel => LEVEL_ROLES[roleLevel]);

    /*
     * Remove roles above the user's current level.
     */
    for (const roleLevel of roleLevels) {
      const roleId = LEVEL_ROLES[roleLevel];

      if (
        roleLevel > level &&
        member.roles.cache.has(roleId)
      ) {
        try {
          await member.roles.remove(
            roleId,
            `Current level is ${level}`
          );
        } catch (error) {
          logger.warn(
            `Could not remove level ${roleLevel} role from ${member.user.tag}:`,
            error.message
          );
        }
      }
    }

    /*
     * Give every role at or below the user's level.
     */
    for (const roleId of qualifyingRoleIds) {
      const role = guild.roles.cache.get(roleId);

      if (!role) {
        logger.warn(
          `Leveling role ${roleId} could not be found in guild ${guild.id}`
        );
        continue;
      }

      if (!member.roles.cache.has(roleId)) {
        try {
          await member.roles.add(
            role,
            `Reached level ${level}`
          );

          logger.info(
            `${member.user.tag} received leveling role ${role.name} at level ${level}`
          );
        } catch (error) {
          logger.warn(
            `Could not add role ${roleId} to ${member.user.tag}:`,
            error.message
          );
        }
      }
    }

  } catch (error) {
    logger.error(
      `Failed to update leveling roles for ${member.user.tag}:`,
      error
    );
  }
}
