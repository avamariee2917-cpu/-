import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    const client = interaction.client;

    const guildData =
      client.levelingData?.[interaction.guild.id] || {};

    const users = Object.entries(guildData);

    if (users.length === 0) {
      return interaction.reply({
        content: 'There are currently no users on the leveling leaderboard.',
        ephemeral: false
      });
    }

    users.sort((a, b) => {
      const xpA = a[1]?.xp || 0;
      const xpB = b[1]?.xp || 0;

      return xpB - xpA;
    });

    const topUsers = users.slice(0, 10);

    const lines = [];

    for (let i = 0; i < topUsers.length; i++) {
      const [userId, data] = topUsers[i];

      const user =
        await client.users.fetch(userId).catch(() => null);

      const username =
        user?.username || `Unknown User (${userId})`;

      const level = data?.level || 1;
      const xp = data?.xp || 0;

      lines.push(
        `**${i + 1}.** ${username} — Level **${level}** — ${xp} XP`
      );
    }

    return interaction.reply({
      content:
        `**Leveling Leaderboard**\n\n${lines.join('\n')}`,
      ephemeral: false
    });
  }
};
