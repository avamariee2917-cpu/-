import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    const client = interaction.client;

    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
    }

    if (!client.levelingData) {
      return interaction.reply({
        content: 'The leveling system is not currently available.',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;

    const guildData = client.levelingData[guildId] || {};

    const users = Object.entries(guildData)
      .filter(([userId, data]) => {
        return userId && data && typeof data.xp === 'number';
      })
      .sort(([, a], [, b]) => {
        return (b.xp || 0) - (a.xp || 0);
      });

    if (users.length === 0) {
      return interaction.reply({
        content: 'There are currently no users on the leveling leaderboard.',
        ephemeral: false
      });
    }

    const topUsers = users.slice(0, 10);

    const lines = topUsers.map(([userId, data], index) => {
      const level = data.level || 1;
      const xp = data.xp || 0;

      return `**${index + 1}.** <@${userId}> — Level **${level}** — **${xp} XP**`;
    });

    return interaction.reply({
      content: `**Leveling Leaderboard**\n\n${lines.join('\n')}`,
      ephemeral: false
    });
  }
};
