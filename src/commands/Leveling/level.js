import {
  SlashCommandBuilder,
} from 'discord.js';

import {
  loadLevelingData,
  getUserData,
  calculateLevel,
  getXPForLevel,
} from '../../services/levelingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('View a user's current level.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target =
      interaction.options.getUser('user') ||
      interaction.user;

    const data =
      loadLevelingData();

    const userData =
      getUserData(
        data,
        interaction.guild.id,
        target.id
      );

    const level =
      calculateLevel(
        userData.xp
      );

    const levelXP =
      getXPForLevel(level);

    await interaction.reply({
      content:
        `**${target.username}** is level **${level}** ` +
        `with **${userData.xp} XP**.\n` +
        `XP earned toward this level: **${levelXP}**.`,
    });
  },
};
