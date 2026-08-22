import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

import {
  resetGuildLevels,
  LEVEL_ROLES,
} from '../../services/levelingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset-all-levels')
    .setDescription('Reset every user's level.')
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {
    resetGuildLevels(
      interaction.guild.id
    );

    for (const member of interaction.guild.members.cache.values()) {
      for (const roleId of Object.values(LEVEL_ROLES)) {
        if (member.roles.cache.has(roleId)) {
          await member.roles
            .remove(roleId)
            .catch(() => {});
        }
      }
    }

    await interaction.reply({
      content:
        'All leveling data has been reset.',
    });
  },
};
