import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

import {
  setUserXP,
  giveLevelRole,
  calculateLevel,
} from '../../services/levelingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set-xp')
    .setDescription('Set a user's total XP.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to modify')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('xp')
        .setDescription('Total XP')
        .setMinValue(0)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    const target =
      interaction.options.getUser('user');

    const xp =
      interaction.options.getInteger('xp');

    const member =
      await interaction.guild.members
        .fetch(target.id)
        .catch(() => null);

    const userData =
      setUserXP(
        interaction.guild.id,
        target.id,
        xp
      );

    if (member) {
      await giveLevelRole(
        member,
        calculateLevel(xp)
      );
    }

    await interaction.reply({
      content:
        `${target.username}'s XP has been set to **${userData.xp}** ` +
        `and their level is now **${userData.level}**.`,
    });
  },
};
