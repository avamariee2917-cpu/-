import {
  SlashCommandBuilder,
} from 'discord.js';

import {
  getLeaderboard,
} from '../../services/levelingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    const leaderboard =
      getLeaderboard(
        interaction.guild.id,
        10
      );

    if (leaderboard.length === 0) {
      await interaction.reply({
        content:
          'The leveling leaderboard is empty.'
      });

      return;
    }

    const lines = [];

    for (
      let index = 0;
      index < leaderboard.length;
      index++
    ) {
      const entry =
        leaderboard[index];

      const member =
        await interaction.guild.members
          .fetch(entry.userId)
          .catch(() => null);

      const username =
        member?.user?.username ||
        `User ${entry.userId}`;

      lines.push(
        `**${index + 1}.** ${username} ` +
        `— Level **${entry.level}** ` +
        `(${entry.xp} XP)`
      );
    }

    await interaction.reply({
      content:
        `**Secret Éclipse Level Leaderboard**\n\n` +
        lines.join('\n'),
    });
  },
};
