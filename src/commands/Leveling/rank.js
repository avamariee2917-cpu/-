import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your current level and XP.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose rank you want to view.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const client = interaction.client;

    const guildData = client.levelingData?.[interaction.guild.id] || {};
    const userData = guildData[target.id];

    if (!userData) {
      return interaction.reply({
        content: `${target} is currently level **1** with **0 XP**.`,
        ephemeral: false
      });
    }

    const xp = userData.xp || 0;
    const level = userData.level || 1;

    return interaction.reply({
      content:
        `${target} is currently level **${level}** with **${xp} XP**.`,
      ephemeral: false
    });
  }
};
