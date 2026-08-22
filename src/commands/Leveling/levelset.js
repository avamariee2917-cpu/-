import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

import {
  setUserLevel,
  giveLevelRole,
  MAX_LEVEL,
} from '../../services/levelingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set-level')
    .setDescription('Set a user's level.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to modify')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('Level from 1 to 100')
        .setMinValue(1)
        .setMaxValue(MAX_LEVEL)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    const target =
      interaction.options.getUser('user');

    const level =
      interaction.options.getInteger('level');

    const member =
      await interaction.guild.members
        .fetch(target.id)
        .catch(() => null);

    setUserLevel(
      interaction.guild.id,
      target.id,
      level
    );

    if (member) {
      await giveLevelRole(
        member,
        level
      );
    }

    await interaction.reply({
      content:
        `${target.username}'s level has been set to **${level}**.`,
    });
  },
};
