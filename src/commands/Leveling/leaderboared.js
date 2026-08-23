import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    try {
      const client = interaction.client;
      const guild = interaction.guild;

      if (!guild) {
        return interaction.editReply(
          'This command can only be used inside a server.'
        );
      }

      /*
       * Make sure leveling data exists.
       */
      if (!client.levelingData) {
        client.levelingData = {};
      }

      const guildData =
        client.levelingData[guild.id] || {};

      /*
       * Fetch every member in the server.
       *
       * This is important because someone who has never
       * earned XP yet may not exist in levelingData.
       */
      const members =
        await guild.members.fetch();

      const users = [];

      for (const [, member] of members) {
        /*
         * Ignore bots.
         */
        if (member.user.bot) {
          continue;
        }

        /*
         * Get this member's saved leveling information.
         */
        const savedData =
          guildData[member.id] || {};

        const level =
          Number.isFinite(savedData.level)
            ? savedData.level
            : 1;

        const xp =
          Number.isFinite(savedData.xp)
            ? savedData.xp
            : 0;

        users.push({
          userId: member.id,
          level,
          xp,
        });
      }

      /*
       * Sort:
       *
       * 1. Highest level first
       * 2. Highest XP second
       */
      users.sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level;
        }

        if (b.xp !== a.xp) {
          return b.xp - a.xp;
        }

        return a.userId.localeCompare(b.userId);
      });

      /*
       * Show the top 50 members.
       */
      const topUsers =
        users.slice(0, 50);

      if (topUsers.length === 0) {
        return interaction.editReply(
          'There are currently no users on the leveling leaderboard.'
        );
      }

      /*
       * Build leaderboard lines.
       */
      const lines = topUsers.map((user, index) => {
        return (
          `**${index + 1}.** <@${user.userId}>` +
          ` — Level **${user.level}**` +
          ` — **${user.xp} XP**`
        );
      });

      /*
       * Discord messages have a character limit.
       * Split the leaderboard if necessary.
       */
      const header = '**Leveling Leaderboard**\n\n';

      let output = header;

      for (const line of lines) {
        if ((output + line + '\n').length > 1900) {
          break;
        }

        output += line + '\n';
      }

      await interaction.editReply(output.trim());

    } catch (error) {
      console.error(
        'Leaderboard command error:',
        error
      );

      await interaction.editReply(
        'I could not load the leveling leaderboard.'
      );
    }
  },
};
