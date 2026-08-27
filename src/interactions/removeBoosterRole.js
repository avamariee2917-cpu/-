import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import {
  getAllBoosterRoles,
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
  name: 'br_remove_menu',

  async execute(interaction, client) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content:
          'Only staff and the server owner can use this.',
        ephemeral: true,
      });
    }

    const records =
      await getAllBoosterRoles(
        client,
        interaction.guild.id
      );

    const options = [];

    for (
      const [userId, record]
      of Object.entries(records).slice(0, 25)
    ) {
      const role =
        interaction.guild.roles.cache.get(
          record.roleId
        );

      if (!role) {
        continue;
      }

      const member =
        interaction.guild.members.cache.get(userId) ||
        await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

      options.push({
        label: role.name.slice(0, 100),
        description:
          member?.user?.tag?.slice(0, 100) ||
          `User ID: ${userId}`,
        value: userId,
      });
    }

    if (options.length === 0) {
      return interaction.reply({
        content:
          'There are no valid custom booster roles to remove.',
        ephemeral: true,
      });
    }

    const selectMenu =
      new StringSelectMenuBuilder()
        .setCustomId('br_remove_select')
        .setPlaceholder(
          'Select a custom booster role to remove'
        )
        .addOptions(options);

    const row =
      new ActionRowBuilder()
        .addComponents(selectMenu);

    return interaction.reply({
      content:
        'Select the custom booster role you want to remove:',
      components: [row],
      ephemeral: true,
    });
  },
};
