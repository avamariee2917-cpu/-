import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

import {
  resetUserLevel,
} from '../../services/levelingService.js';

import {
  LEVEL_ROLES,
} from '../../services/levelingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset-level')
    .setDescription('Reset one user to level 1.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to reset')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    const target =
      interaction.options.getUser('user');

    resetUserLevel(
      interaction.guild.id,
      target.id
    );

    const member =
      await interaction.guild.members
        .fetch(target.id)
        .catch(() => null);

    if (member) {
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
        `${target.username}'s level has been reset to **1**.`,
    });
  },
};
