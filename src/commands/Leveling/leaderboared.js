import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    try {
      const guild = interaction.guild;
      const client = interaction.client;

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

      if (!client.levelingData[guild.id]) {
        client.levelingData[guild.id] = {};
      }

      const guildLevelingData =
        client.levelingData[guild.id];

      /*
       * Fetch every member in the server.
       */
      const members = await guild.members.fetch();

      const leaderboard = [];

      /*
       * Add EVERY non-bot member.
       *
       * Members who have never earned XP are automatically
       * treated as Level 1 with 0 XP.
       */
      for (const [, member] of members) {
        if (member.user.bot) {
          continue;
        }

        const savedData =
          guildLevelingData[member.id];

        const xp =
          savedData &&
          typeof savedData.xp === 'number'
            ? savedData.xp
            : 0;

        const level =
          savedData &&
          typeof savedData.level === 'number'
            ? savedData.level
            : 1;

        leaderboard.push({
          id: member.id,
          level,
          xp,
        });
      }

      /*
       * Sort the entire server:
       *
       * Highest level first.
       * If levels are equal, highest XP first.
       */
      leaderboard.sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level;
        }

        if (b.xp !== a.xp) {
          return b.xp - a.xp;
        }

        return a.id.localeCompare(b.id);
      });

      if (leaderboard.length === 0) {
        return interaction.editReply(
          'There are currently no members on the leveling leaderboard.'
        );
      }

      /*
       * Show the top 50 members.
       */
      const topUsers = leaderboard.slice(0, 50);

      const lines = topUsers.map((user, index) => {
        return (
          `**${index + 1}.** <@${user.id}>` +
          ` — Level **${user.level}**` +
          ` — **${user.xp} XP**`
        );
      });

      /*
       * Discord has a message character limit.
       * Keep the response safely below it.
       */
      let response = '**Leveling Leaderboard**\n\n';

      for (const line of lines) {
        if ((response + line + '\n').length > 1900) {
          break;
        }

        response += `${line}\n`;
      }

      await interaction.editReply(
        response.trim()
      );

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
