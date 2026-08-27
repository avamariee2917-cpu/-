import {
  PermissionFlagsBits,
} from 'discord.js';

import {
  getBoosterRole,
  removeBoosterRoleRecord,
  recordBooster,
  markBoosterStopped,
} from '../utils/boosterRoles.js';

const BOOSTER_ROLE_IDS = [
  '1532269323584802836',
  '1533675708193177700',
];

function isBooster(member) {
  return (
    member?.premiumSince != null ||
    BOOSTER_ROLE_IDS.some(roleId =>
      member.roles.cache.has(roleId)
    )
  );
}

export default {
  name: 'guildMemberUpdate',

  async execute(oldMember, newMember, client) {

    try {

      const previouslyBooster =
        isBooster(oldMember);

      const currentlyBooster =
        isBooster(newMember);

      // ======================================================
      // STARTED BOOSTING
      // ======================================================

      if (
        !previouslyBooster &&
        currentlyBooster
      ) {

        await recordBooster(
          client,
          newMember.guild.id,
          newMember.user
        );

        return;
      }

      // ======================================================
      // STILL BOOSTING
      // ======================================================

      if (
        previouslyBooster &&
        currentlyBooster
      ) {
        return;
      }

      // ======================================================
      // STOPPED BOOSTING
      // ======================================================

      if (
        previouslyBooster &&
        !currentlyBooster
      ) {

        // Keep permanent booster history.
        await markBoosterStopped(
          client,
          newMember.guild.id,
          newMember.user
        );

        // ----------------------------------------------------
        // Remove custom booster role automatically.
        // ----------------------------------------------------

        const record =
          await getBoosterRole(
            client,
            newMember.guild.id,
            newMember.id
          );

        if (!record?.roleId) {
          return;
        }

        const role =
          newMember.guild.roles.cache.get(
            record.roleId
          );

        const botMember =
          newMember.guild.members.me ||
          await newMember.guild.members.fetchMe();

        if (role) {

          if (
            botMember.permissions.has(
              PermissionFlagsBits.ManageRoles
            ) &&
            role.position <
              botMember.roles.highest.position
          ) {

            await newMember.roles.remove(
              role,
              'Member stopped boosting the server'
            ).catch(() => {});

            await role.delete(
              'Member stopped boosting the server'
            ).catch(() => {});

          }
        }

        await removeBoosterRoleRecord(
          client,
          newMember.guild.id,
          newMember.id
        );
      }

    } catch (error) {

      console.error(
        'Error handling booster history/custom role cleanup:',
        error
      );

    }
  },
};
