import {
  PermissionFlagsBits,
} from 'discord.js';

import {
  getBoosterRole,
  removeBoosterRoleRecord,
} from '../utils/boosterRoles.js';

const BOOSTER_ROLE_IDS = [
  '1532269323584802836',
  '1533675708193177700',
];

function wasBooster(member) {
  return BOOSTER_ROLE_IDS.some(roleId =>
    member.roles.cache.has(roleId)
  );
}

export default {
  name: 'guildMemberUpdate',

  async execute(oldMember, newMember, client) {
    try {
      const previouslyBooster =
        wasBooster(oldMember);

      const currentlyBooster =
        wasBooster(newMember);

      // Nothing changed
      if (
        previouslyBooster ===
        currentlyBooster
      ) {
        return;
      }

      // Member stopped boosting
      if (
        previouslyBooster &&
        !currentlyBooster
      ) {
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
        'Error handling booster role cleanup:',
        error
      );
    }
  },
};
