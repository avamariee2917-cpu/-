import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const levelingData = interaction.client.levelingData;

    if (!levelingData) {
      return interaction.editReply(
        'The leveling system is not currently available.'
      );
    }

    const guildData =
      levelingData[interaction.guild.id] || {};

    const users = Object.entries(guildData)
      .map(([userId, data]) => ({
        userId,
        level: data.level || 1,
        xp: data.xp || 0,
      }))
      .sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level;
        }

        return b.xp - a.xp;
      });

    if (users.length === 0) {
      return interaction.editReply(
        'There are currently no users on the leveling leaderboard.'
      );
    }

    const topUsers = users.slice(0, 20);

    const lines = topUsers.map((user, index) => {
      return `${index + 1}. <@${user.userId}> — Level **${user.level}** — **${user.xp} XP**`;
    });

    await interaction.editReply(
      `**Leveling Leaderboard**\n\n${lines.join('\n')}`
    );
  },
};
