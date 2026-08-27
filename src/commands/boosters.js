import {
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

import { getAllBoosterRoles } from '../utils/boosterRoles.js';

const OWNER_ID = '1531440557954437273';

const STAFF_ROLE_ID = '1532221464839848016';

const BOOSTER_ROLE_IDS = [
  '1532269323584802836',
  '1533675708193177700',
];

function isStaff(interaction) {
  return (
    interaction.user.id === OWNER_ID ||
    interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)
  );
}

function isBoosterMember(member) {
  return (
    member?.premiumSince != null ||
    BOOSTER_ROLE_IDS.some(roleId =>
      member.roles.cache.has(roleId)
    )
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('boosters')
    .setDescription('View the members currently boosting the server.'),

  async execute(interaction, guildConfig, client) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content:
          'Only staff and the server owner can use this command.',
        ephemeral: true,
      });
    }

    const members =
      await interaction.guild.members.fetch();

    const boosters =
      members.filter(member =>
        isBoosterMember(member)
      );

    if (boosters.size === 0) {
      return interaction.reply({
        content:
          'There are currently no server boosters.',
        ephemeral: true,
      });
    }

    const customRoles =
      await getAllBoosterRoles(
        client,
        interaction.guild.id
      );

    const lines = [];

    for (const member of boosters.values()) {
      const record =
        customRoles[member.id];

      let roleText = 'No custom role';

      if (record?.roleId) {
        const role =
          interaction.guild.roles.cache.get(
            record.roleId
          );

        if (role) {
          roleText = `<@&${role.id}>`;
        }
      }

      lines.push(
        `${member} — ${roleText}`
      );
    }

    const embed =
      new EmbedBuilder()
        .setTitle('✦ Server Boosters')
        .setDescription(
          lines.slice(0, 25).join('\n')
        )
        .setFooter({
          text: `${boosters.size} current booster${boosters.size === 1 ? '' : 's'}`,
        });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
