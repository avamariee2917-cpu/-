import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
    }

    const client = interaction.client;
    const guildId = interaction.guild.id;

    const guildData =
      client.levelingData?.[guildId] || {};

    const members = await interaction.guild.members
      .fetch()
      .catch(() => interaction.guild.members.cache);

    const users = [];

    for (const [, member] of members) {
      if (member.user.bot) {
        continue;
      }

      const data = guildData[member.id] || {};

      const xp =
        typeof data.xp === 'number'
          ? data.xp
          : 0;

      const level =
        typeof data.level === 'number'
          ? data.level
          : 1;

      users.push({
        id: member.id,
        username: member.user.username,
        level,
        xp
      });
    }

    users.sort((a, b) => {
      if (b.level !== a.level) {
        return b.level - a.level;
      }

      return b.xp - a.xp;
    });

    if (users.length === 0) {
      return interaction.reply({
        content: 'There are no human members to display on the leaderboard.',
        ephemeral: false
      });
    }

    const topUsers = users.slice(0, 10);

    const lines = topUsers.map((user, index) => {
      return `${index + 1}. <@${user.id}> — Level **${user.level}** — **${user.xp} XP**`;
    });

    return interaction.reply({
      content:
        `**Leveling Leaderboard**\n\n${lines.join('\n')}`,
      ephemeral: false
    });
  }
};
