import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your current leveling information.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const levelingData = interaction.client.levelingData;

    if (!levelingData) {
      return interaction.editReply(
        'The leveling system is not currently available.'
      );
    }

    const guildData = levelingData[interaction.guild.id];

    if (!guildData) {
      return interaction.editReply(
        `You are currently level **1** with **0 XP**.`
      );
    }

    const userData = guildData[interaction.user.id];

    if (!userData) {
      return interaction.editReply(
        `You are currently level **1** with **0 XP**.`
      );
    }

    const level = userData.level || 1;
    const xp = userData.xp || 0;

    await interaction.editReply(
      `<@${interaction.user.id}> is currently level **${level}** with **${xp} XP**.`
    );
  },
};
