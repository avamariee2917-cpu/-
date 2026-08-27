import {
  getBoosterRole,
  removeBoosterRoleRecord,
} from '../../utils/boosterRoles.js';

const OWNER_ID = '1531440557954437273';

const STAFF_ROLE_ID = '1532221464839848016';

function isStaff(interaction) {
  return (
    interaction.user.id === OWNER_ID ||
    interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)
  );
}

export default {
  name: 'br_remove_select',

  async execute(interaction, client) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content:
          'Only staff and the server owner can use this.',
        ephemeral: true,
      });
    }

    const targetUserId =
      interaction.values[0];

    if (!targetUserId) {
      return interaction.reply({
        content:
          'No booster was selected.',
        ephemeral: true,
      });
    }

    const record =
      await getBoosterRole(
        client,
        interaction.guild.id,
        targetUserId
      );

    if (!record) {
      return interaction.update({
        content:
          'That custom booster role no longer exists in the database.',
        components: [],
      });
    }

    const role =
      interaction.guild.roles.cache.get(
        record.roleId
      );

    const member =
      await interaction.guild.members
        .fetch(targetUserId)
        .catch(() => null);

    await removeBoosterRoleRecord(
      client,
      interaction.guild.id,
      targetUserId
    );

    if (member && role) {
      await member.roles.remove(
        role,
        `Custom booster role removed by ${interaction.user.tag}`
      ).catch(() => {});
    }

    if (role) {
      await role.delete(
        `Custom booster role removed by ${interaction.user.tag}`
      ).catch(() => {});
    }

    return interaction.update({
      content:
        `Custom booster role for <@${targetUserId}> has been removed.`,
      components: [],
    });
  },
};
